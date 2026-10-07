        // 4. PW ONLYIAS PARSER
        const PwParser = {
            DEVA_RE: /[\u0900-\u097F]/g,
            OPT_RE: /^\(\s*([a-d])\s*\)\s+([\s\S]+)/i,
            NUM_RE: /^(\d{1,3})\.\s+([\s\S]+)/,
            STMT_RE: /^Statement\s+(I{1,3}|IV|V|VI)\s*:/i,
            AR_RE: /^(Assertion|Reason)\s*[: (]/i,
            PAIRS_HDR_RE: /^consider\s+the\s+following\s+pairs/i,
            STEM_RES: [
                /^which\s+(one\s+)?of\s+the\s+(above|following)/i,
                /^which\s+of\s+the\s+statements/i,
                /^which\s+of\s+the\s+(pairs|countries|items)/i,
                /^how\s+many\s+(of\s+the|pairs|statements|rows|items|above|countries)/i,
                /^select\s+the\s+(correct|most)/i,
                /^identify\s+the\s+(correct|incorrect)/i,
                /^given\s+the\s+above\s+(statements|context)/i,
                /^in\s+the\s+light\s+of\s+the\s+above/i,
                /^which\s+(of\s+the\s+)?above\s+statement/i,
                /^arrange\s+the\s+following/i,
                /^choose\s+the\s+(correct|best)\s+(option|answer)/i,
            ],
            TBL_HDR_SKIP: /^(Phenomenon|Description|Experiment|Characteristic|Mission|System|Trajectory|Orbital|Period|Column)\s*(I{0,3}|[1-9])?\s*$/i,

            isHindi(s) { if(!s) return false; return ((s.match(this.DEVA_RE)||[]).length/s.length)>0.18; },
            isSkip(s) {
                const SKIP_RES = [
                    /srijan\s+(prelims|program|test)/i,
                    /sectional\s+full\s+length/i,
                    /target\s+-\s+20\d\d/i,
                    /test\s+duration/i,
                    /total\s+marks/i,
                    /sdps\d/i, /spp\s*\d/i,
                    /pwonlyias/i,
                    /if\s+you\s+have\s+any\s+queries/i,
                    /please\s+mail\s+us/i,
                    /^\s*\d+\s*$/,
                ];
                return SKIP_RES.some(r => r.test(s));
            },
            isInstrBody(s) {
                const INSTR_BODY_RES = [
                    /^The\s+test\s+paper\s+contains/i,
                    /^All\s+items\s+carry/i,
                    /^All\s+Questions\s+are\s+objective/i,
                    /^Penalty\s+for\s+wrong/i,
                    /^THERE\s+WILL\s+BE\s+PENALTY/i,
                    /candidate\s+will\s+select\s+the\s+response/i,
                    /^Each\s+Question\s+carries/i,
                    /^Each\s+item\s+comprises/i,
                    /more\s+than\s+one\s+correct\s+response/i,
                    /^candidate\s+feels\s+that/i,
                    /^four\s+alternatives\s+for/i,
                ];
                return INSTR_BODY_RES.some(r => r.test(s));
            },
            isInstructionPage(page) {
                const txt = page.items.map(i => i.str).join(' ');
                return /Test\s+Instructions|Test\s+Duration|THERE\s+WILL\s+BE\s+PENALTY|pwonlyias/i.test(txt)
                    || /Sectional\s+Full\s+Length\s+Test/i.test(txt);
            },
            isStem(s) { return this.STEM_RES.some(r => r.test(s.trim())); },
            cleanStr(s) { return (s||'').replace(/\s+/g,' ').trim(); },
            
            async extractPdf(file) {
                const buf = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({data:buf, verbosity:0}).promise;
                const pages = [];
                for (let pn=1; pn<=pdf.numPages; pn++) {
                    const pg = await pdf.getPage(pn);
                    const vp = pg.getViewport({scale:1});
                    const tc = await pg.getTextContent({normalizeWhitespace:false});
                    const items = tc.items
                        .filter(it => it.str && it.str.trim())
                        .map(it => {
                            const tx = it.transform;
                            return { str:it.str, x:tx[4], y:vp.height-tx[5], w:it.width||0, h:Math.abs(it.height)||10 };
                        });
                    pages.push({num:pn, width:vp.width, height:vp.height, items});
                }
                return pages;
            },
            joinItems(its) {
                if(!its.length) return '';
                let s = its[0].str;
                for(let i=1; i<its.length; i++){
                    const gap = its[i].x-(its[i-1].x+its[i-1].w);
                    s += (gap>2?' ':'') + its[i].str;
                }
                return s;
            },
            pageToLines(page) {
                const {items, width} = page;
                if(!items.length) return [];
                const midX = width*0.5;

                const rows = [];
                const sorted = [...items].sort((a,b)=>a.y-b.y);
                for(const it of sorted){
                    const row = rows.find(r=>Math.abs(r.y-it.y)<5);
                    if(row) row.items.push(it);
                    else rows.push({y:it.y, items:[it]});
                }

                const has2col = rows.some(r=>{
                    return r.items.some(i=>i.x<midX) && r.items.some(i=>i.x>=midX);
                });

                if(!has2col){
                    return rows.map(r=>{
                        const s = [...r.items].sort((a,b)=>a.x-b.x);
                        return {text:this.joinItems(s), rawItems:s, y:r.y};
                    }).filter(l=>l.text.trim());
                }

                const leftRows=[], rightRows=[];
                for(const row of rows){
                    const li = row.items.filter(i=>i.x<midX).sort((a,b)=>a.x-b.x);
                    const ri = row.items.filter(i=>i.x>=midX).sort((a,b)=>a.x-b.x);
                    if(li.length) leftRows.push({y:row.y, items:li, text:this.joinItems(li)});
                    if(ri.length) rightRows.push({y:row.y, items:ri, text:this.joinItems(ri)});
                }
                const toLine = r => ({text:r.text, rawItems:r.items, y:r.y});
                return [
                    ...leftRows.filter(r=>r.text.trim()).map(toLine),
                    ...rightRows.filter(r=>r.text.trim()).map(toLine)
                ];
            },
            rebuildPair(allItems) {
                if(!allItems||allItems.length<2) return null;
                const s = [...allItems].sort((a,b)=>a.x-b.x);
                let maxGap = 0, gapIdx = 0;
                for(let i=1; i<s.length; i++){
                    const g = s[i].x-(s[i-1].x+s[i-1].w);
                    if(g>maxGap){maxGap=g; gapIdx=i;}
                }
                if(maxGap<20) return null;
                const left = this.joinItems(s.slice(0,gapIdx)).replace(/^\d+\.\s*/,'').trim();
                const right = this.joinItems(s.slice(gapIdx)).trim();
                if(!left||!right) return null;
                return left+' — '+right;
            },
            getPairText(si) {
                const raw = (si.text||'').replace(/\s+/g,' ').trim();
                if(raw.includes('|')) return raw.replace(/\s*\|\s*/g,' | ');
                if(/[—–]/.test(raw)) return raw.replace(/\s*[—–]\s*/g,' — ');
                if(si.allItems&&si.allItems.length>1){
                    const r = this.rebuildPair(si.allItems);
                    if(r) return r;
                }
                return raw;
            },
            parseAnswerKey(pages) {
                const map={};
                const reAns = /(\d+)\.\s*Ans\s*[:\-]\s*\(?([a-d])\)?/i;
                const reTable = /(\d+)\.\s*\(([a-d])\)/gi;
                
                for(const page of pages){
                    const lines = this.pageToLines(page);
                    for(const line of lines){
                        const t = line.text.trim();
                        if(!t) continue;
                        
                        const mAns = t.match(reAns);
                        if(mAns){
                            map[parseInt(mAns[1],10)] = mAns[2].toLowerCase();
                            continue;
                        }
                        
                        let mTable;
                        while((mTable = reTable.exec(t)) !== null){
                            map[parseInt(mTable[1],10)] = mTable[2].toLowerCase();
                        }
                    }
                }
                return map;
            },
            parseExplanations(pages) {
                const map={};
                const allLines=[];
                for(const page of pages){
                    for(const {text} of this.pageToLines(page)){
                        const t = text.trim();
                        if(t && !this.isHindi(t)) allLines.push(t);
                    }
                }
                let curNum = null, inExp = false, buf = [];
                const flush = () => { if(curNum && buf.length) map[curNum] = buf.join(' ').replace(/\s+/g,' ').trim(); };
                const ANS_RE = /^(\d+)\.\s*Ans\s*[:\-]\s*\(([a-dA-D])\)/i;
                const EXP_RE = /^Exp\s*[:\-]/i;
                for(const line of allLines){
                    const am = line.match(ANS_RE);
                    if(am){ flush(); curNum = parseInt(am[1],10); inExp = false; buf = []; continue; }
                    if(EXP_RE.test(line)){ inExp = true; const a = line.replace(EXP_RE,'').trim(); if(a) buf.push(a); continue; }
                    if(inExp && curNum) buf.push(line);
                }
                flush();
                return map;
            },
            generateTxt(qs, answers, exps) {
                return qs.map(q=>{
                    const body = this.buildDisplayLines(q);
                    let block = `Q${q.num}. ${body[0]||''}\n`;
                    for(let i=1; i<body.length; i++) block += body[i]+'\n';
                    block += '😂\n';
                    const ans = answers[q.num]||'';
                    for(const opt of q.opts) block += opt.text+(opt.letter===ans?' ✅':'')+'\n';
                    const exp = exps[q.num]||'';
                    if(exp) block += `Ex: ${exp}\n`;
                    return block.trimEnd();
                }).join('\n\n')+'\n';
            },
            buildDisplayLines(q) {
                const lines = [];
                for(const il of q.intro) { const s = this.cleanStr(il); if(s) lines.push(s); }
                for(const st of q.stmts) lines.push(this.cleanStr(st));
                for(const si of q.subs){
                    lines.push(si.num+'. '+(q.isPairs ? this.getPairText(si) : this.cleanStr(si.text)));
                }
                if(q.stem) lines.push(this.cleanStr(q.stem));
                return lines;
            },
            async run(testFile, solFile, setProgress, addLog) {
                let q = null;
                let parserState = 'SEEKING';

                const mkQ = (num, introText) => {
                    return {
                        num,
                        intro:[introText],
                        stmts:[],
                        subs:[],
                        stem:'',
                        opts:[],
                        isPairs:false,
                    };
                };

                const classifyNum = (num) => {
                    if(!q || parserState==='SEEKING') return 'NEW_Q';
                    if(parserState==='IN_OPTS') return num>q.num?'NEW_Q':'BODY';
                    const sc=q.subs.length;
                    if(num===1 && sc===0) return 'SUB';
                    if(sc>0 && num===sc+1) return 'SUB';
                    if(num>q.num) return 'NEW_Q';
                    return 'BODY';
                };

                const appendToBody = (text, rawItems) => {
                    if(q.stem){ q.stem=this.cleanStr(q.stem+' '+text); return; }
                    if(this.isStem(text)){ q.stem=text; return; }
                    if(q.stmts.length>0){
                        const ls=q.stmts[q.stmts.length-1];
                        if(!/[.!?]\s*$/.test(ls)&&!this.STMT_RE.test(text)&&!this.AR_RE.test(text)){
                            q.stmts[q.stmts.length-1]=this.cleanStr(ls+' '+text);
                            return;
                        }
                    }
                    if(q.subs.length>0){
                        const ls=q.subs[q.subs.length-1];
                        ls.text=this.cleanStr(ls.text+' '+text);
                        if(rawItems&&rawItems.length) ls.allItems.push(...rawItems);
                        return;
                    }
                    const lastIntro=q.intro[q.intro.length-1]||'';
                    if(lastIntro.trim().endsWith(':')||text.includes('|')){
                        q.intro.push(text);
                    } else {
                        q.intro[q.intro.length-1]=this.cleanStr(lastIntro+' '+text);
                    }
                };

                const finalise = (arr) => {
                    if(!q) return;
                    if(q.subs.length>0 && !q.stem){
                        const ls=q.subs[q.subs.length-1];
                        for(const sr of this.STEM_RES){
                            const m=ls.text.match(new RegExp('(.+?)\\s+('+sr.source+'.*)', 'i'));
                            if(m){ ls.text=this.cleanStr(m[1]); q.stem=this.cleanStr(m[2]); break; }
                        }
                    }
                    arr.push(q);
                };

                const parseTest = (pages) => {
                    const qs=[];
                    q=null; parserState='SEEKING';
                    for(const page of pages){
                        if(this.isInstructionPage(page)) continue;
                        const lines=this.pageToLines(page);
                        for(const {text, rawItems} of lines){
                            const t=text.trim();
                            if(!t||this.isHindi(t)||this.isSkip(t)) continue;
                            const optM=t.match(this.OPT_RE);
                            if(optM){
                                if(!q) continue;
                                parserState='IN_OPTS';
                                q.opts.push({letter:optM[1].toLowerCase(), text:optM[2].trim(), allItems:rawItems||[]});
                                continue;
                            }
                            const numM=t.match(this.NUM_RE);
                            if(numM){
                                const num=parseInt(numM[1],10);
                                const body=numM[2].trim();
                                if(this.isInstrBody(body)) continue;
                                const cls=classifyNum(num);
                                if(cls==='NEW_Q'){
                                    finalise(qs);
                                    q=mkQ(num, body);
                                    q.isPairs=this.PAIRS_HDR_RE.test(body);
                                    parserState='IN_BODY';
                                } else if(cls==='SUB'){
                                    if(q) q.subs.push({num, text:body, allItems:rawItems?[...rawItems]:[]});
                                } else {
                                    if(q) appendToBody(body, rawItems||[]);
                                }
                                continue;
                            }
                            if(this.STMT_RE.test(t)||this.AR_RE.test(t)){
                                if(q){ q.stmts.push(t); }
                                continue;
                            }
                            if(this.isStem(t)){
                                if(q){
                                    if(q.stem) q.stem=this.cleanStr(q.stem+' '+t);
                                    else q.stem=t;
                                }
                                continue;
                            }
                            if(this.TBL_HDR_SKIP.test(t)) continue;
                            if(q){
                                if(parserState==='IN_OPTS'){
                                    const lo=q.opts[q.opts.length-1];
                                    if(lo) lo.text=this.cleanStr(lo.text+' '+t);
                                } else {
                                    appendToBody(t, rawItems||[]);
                                }
                            }
                        }
                    }
                    finalise(qs);
                    return qs;
                };

                addLog('📋 Extracting PW OnlyIAS Test PDF…');
                setProgress(10, 'Loading test PDF…');
                const testPages = await this.extractPdf(testFile);

                addLog('🔍 Parsing questions from PW Test PDF…');
                setProgress(35, 'Parsing questions…');
                const parsedQuestions = parseTest(testPages);
                addLog(`  Parsed ${parsedQuestions.length} questions`, 'ok');

                addLog('📋 Extracting PW OnlyIAS Solution PDF…');
                setProgress(55, 'Loading solution PDF…');
                const solPages = await this.extractPdf(solFile);

                addLog('🔗 Parsing PW answer key…');
                setProgress(75, 'Parsing answer key…');
                const answerMap = this.parseAnswerKey(solPages);

                addLog('🔗 Parsing PW explanations…');
                setProgress(85, 'Parsing explanations…');
                const explanationMap = this.parseExplanations(solPages);

                addLog('🛠️ Assembling PW formatted output…');
                setProgress(95, 'Generating output…');
                const txt = this.generateTxt(parsedQuestions, answerMap, explanationMap);

                setProgress(100, `Done! ${parsedQuestions.length} questions`);
                addLog(`✓ PW Conversion completed: ${parsedQuestions.length} questions processed.`, 'ok');

                return {
                    text: txt,
                    total: parsedQuestions.length
                };
            }
        };
