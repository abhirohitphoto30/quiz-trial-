        // ==========================================
        // NAMESPACED PDF PARSERS CORE
        // ==========================================
        
        // 1. VISION IAS PARSER
        const VisionParser = {
            HF_PATTERNS: [
                /visionias/i, /vision\s*ias/i, /www\.visionias/i, /©\s*vision/i,
                /general\s+studies\s*\(p\)/i, /test\s+booklet/i,
                /answers?\s*[&and]*\s*explanations?/i,
                /^https?:\/\//i, /upscpdf\.com/i, /^www\./i, /iasscore/i,
                /time\s+allowed/i, /maximum\s+marks/i,
                /do\s+not\s+open/i, /rough\s+work/i, /invigilator/i,
                /permitted\s+to\s+take/i, /hand\s+over/i,
                /answer\s+sheet/i, /roll\s+number/i,
                /test\s+booklet\s+series/i,
                /^\d{1,3}\s*$/, /^[A-D]\s*$/,
                /IMMEDIATELY\s+AFTER/i, /ENCODE\s+CLEARLY/i,
                /this\s+test\s+booklet\s+contains\s+\d+\s+items/i,
                /you\s+have\s+to\s+(mark|enter)/i,
                /all\s+items\s+carry\s+equal/i,
                /before\s+you\s+proceed\s+to\s+mark/i,
                /after\s+you\s+have\s+completed\s+filling/i,
                /sheet\s+for\s+rough/i,
                /^\d+(st|nd|rd|th)\s*of\s*the\s*allotted/i,
                /^responses?\s*\(answers?\)/i,
                /check\s+that\s+this\s+booklet/i,
                /do\s+not\s+write\s+anything/i,
                /select\s+the\s+response/i,
                /separate\s+answer\s+sheet/i,
                /only\s+on\s+the\s+separate/i,
                /each\s+item\s+(is\s+)?printed\s+in/i,
            ],
            isHF(t) {
                const s = t.trim();
                return s.length === 0 || this.HF_PATTERNS.some(r => r.test(s));
            },
            async extractPdfPages(file) {
                const ab = await file.arrayBuffer();
                let pdf;
                try {
                    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
                } catch (e) {
                    if (e && (e.name === 'PasswordException' || (e.message && e.message.toLowerCase().includes('password')))) {
                        throw new Error(`"${file.name}" is password-protected. Please unlock the PDF first.`);
                    }
                    throw new Error(`Could not open "${file.name}": ${e.message || e}`);
                }

                const pages = [];
                let totalItems = 0;
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const vp = page.getViewport({ scale: 1 });
                    const tc = await page.getTextContent();
                    const items = tc.items
                        .filter(i => i.str && i.str.trim())
                        .map(i => ({
                            text: i.str,
                            x: Math.round(i.transform[4]),
                            y: Math.round(vp.height - i.transform[5]),
                            w: i.width,
                            h: i.height || 10
                        }));
                    totalItems += items.length;
                    pages.push({ items, pageW: vp.width, pageH: vp.height, num: p });
                }

                if (totalItems === 0) {
                    throw new Error(
                        `"${file.name}" appears to be a scanned image PDF — no text layer found. ` +
                        `This converter requires a text-based (selectable) PDF.`
                    );
                }
                return pages;
            },
            itemsToLines(items, yTol = 6) {
                if (!items.length) return [];
                const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
                const rows = [];
                let cur = [sorted[0]];
                for (let i = 1; i < sorted.length; i++) {
                    if (Math.abs(sorted[i].y - cur[0].y) <= yTol) cur.push(sorted[i]);
                    else { rows.push(cur); cur = [sorted[i]]; }
                }
                rows.push(cur);
                return rows.map(r => ({
                    y: Math.round(r[0].y),
                    x: Math.round(r.reduce((mn, i) => Math.min(mn, i.x), Infinity)),
                    text: r.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s{2,}/g, ' ').trim()
                })).filter(l => l.text.length > 0);
            },
            pageToText(page) {
                const midX = page.pageW * 0.52;
                const leftItems = page.items.filter(i => i.x < midX);
                const rightItems = page.items.filter(i => i.x >= midX);
                const leftLines = this.itemsToLines(leftItems);
                const rightLines = this.itemsToLines(rightItems);

                if (leftLines.length >= 5 && rightLines.length >= 5) {
                    const lTxt = leftLines.map(l => l.text);
                    const rTxt = rightLines.map(l => l.text);
                    return [...lTxt, ...rTxt].join('\n');
                }
                return this.itemsToLines(page.items).map(l => l.text).join('\n');
            },
            isItemStem(line) {
                const STEM_RE = /^(which\s+of\s+the|how\s+many\s+of\s+the|how\s+many\s+are|how\s+many\s+among|how\s+many\s+provisions|how\s+many\s+of\s+above|select\s+the\s+correct|choose\s+the\s+correct|in\s+how\s+many|arrange\s+the\s+following|what\s+is\s+the\s+correct|which\s+one\s+of\s+the)/i;
                if (STEM_RE.test(line)) return true;
                if (/\?\s*$/.test(line)) return true;
                if (/\bhow\s+many\b/i.test(line)) return true;
                if (/select\s+the\s+correct\s+answer/i.test(line)) return true;
                return false;
            },
            parseBody(rawLines) {
                let mainParts = [], subItems = [], subStem = '', matchHeader = '';
                let state = 'main', curItem = '';

                const SUBITEM_RE = /^(\d{1,2})\.\s+(.+)$/;
                const MATCH_HEADER_RE = /^[^0-9\(].+\|.+$/;
                const MATCH_ROW_RE = /^(\d{1,2})\.\s+.+\|.+$/;
                const STMT1_RE = /^statement[- ]i\s*:/i;
                const STMT2_RE = /^statement[- ]ii\s*:/i;

                const flushItem = () => {
                    const t = curItem.trim();
                    if (t) subItems.push(t);
                    curItem = '';
                };

                for (const raw of rawLines) {
                    const line = raw.trim();
                    if (!line) continue;

                    const isMatchHeader = MATCH_HEADER_RE.test(line) && !SUBITEM_RE.test(line);
                    const isMatchRow    = MATCH_ROW_RE.test(line);
                    const sm            = line.match(SUBITEM_RE);
                    const isSubItem     = !isMatchRow && sm && parseInt(sm[1]) >= 1 && parseInt(sm[1]) <= 15;
                    const isStmt1       = STMT1_RE.test(line);
                    const isStmt2       = STMT2_RE.test(line);

                    if (state === 'main') {
                        if (isMatchHeader && subItems.length === 0 && !matchHeader) {
                            matchHeader = line;
                            state = 'items';
                        } else if (isSubItem || isMatchRow || isStmt1) {
                            state = 'items';
                            curItem = line;
                        } else {
                            mainParts.push(line);
                        }
                    } else if (state === 'items') {
                        if (this.isItemStem(line)) {
                            flushItem(); subStem = line; state = 'stem';
                        } else if (isMatchHeader && !matchHeader) {
                            flushItem(); matchHeader = line;
                        } else if (isSubItem || isMatchRow || isStmt1 || isStmt2) {
                            flushItem(); curItem = line;
                        } else {
                            curItem += ' ' + line;
                        }
                    } else {
                        subStem += ' ' + line;
                    }
                }
                flushItem();

                let mainQ = mainParts.join(' ').replace(/\s{2,}/g, ' ').trim();
                let stem  = subStem.replace(/\s{2,}/g, ' ').trim();

                if (/how\s+many/i.test(mainQ) && subItems.length > 0 && /select\s+the\s+correct\s+answer/i.test(stem)) {
                    stem = 'How many of the above are correct?';
                }

                return { mainQ, subItems, subStem: stem, matchHeader };
            },
            parseTestPdf(pages, addLog) {
                const OPT_RE  = /^\(([a-d])\)\s+(.+)$/i;
                const QNUM_RE = /^(\d{1,3})\.\s+(.+)$/;
                const qMap = {};
                const allLines = [];

                for (const page of pages) {
                    const txt = this.pageToText(page);
                    if (!/\(\s*[abcd]\s*\)/i.test(txt)) continue;
                    const ls = txt.split('\n')
                        .map(l => l.trim())
                        .filter(l => l && !this.isHF(l));
                    allLines.push(...ls);
                }

                addLog(`  Total lines after HF removal: ${allLines.length}`, 'info');

                const aIdxs = [];
                for (let i = 0; i < allLines.length; i++) {
                    const m = allLines[i].match(OPT_RE);
                    if (m && m[1].toLowerCase() === 'a') aIdxs.push(i);
                }
                addLog(`  "(a)" anchors found: ${aIdxs.length}`, 'ok');

                for (let ai = 0; ai < aIdxs.length; ai++) {
                    const aIdx = aIdxs[ai];
                    const candidates = [];
                    for (let j = aIdx - 1; j >= Math.max(0, aIdx - 80); j--) {
                        const line = allLines[j];
                        const om = line.match(OPT_RE);
                        if (om && om[1].toLowerCase() !== 'a') break;
                        const m = line.match(QNUM_RE);
                        if (m) {
                            const n = parseInt(m[1]);
                            if (n >= 1 && n <= 100) candidates.push({ n, idx: j, text: m[2].trim() });
                        }
                    }
                    if (!candidates.length) continue;

                    const { n: qNum, idx: qLineIdx, text: qFirstLine } = candidates[candidates.length - 1];

                    const bodyLines = [qFirstLine];
                    for (let j = qLineIdx + 1; j < aIdx; j++) {
                        const line = allLines[j];
                        const bm = line.match(OPT_RE);
                        if (bm && bm[1].toLowerCase() !== 'a') break;
                        bodyLines.push(line);
                    }

                    const options = [];
                    let curOpt = null;
                    const nextAIdx = ai + 1 < aIdxs.length ? aIdxs[ai + 1] : allLines.length;
                    const scanEnd = Math.min(nextAIdx, aIdx + 40);

                    for (let j = aIdx; j < scanEnd; j++) {
                        const m = allLines[j].match(OPT_RE);
                        if (m) {
                            if (curOpt) options.push(curOpt);
                            curOpt = { letter: m[1].toLowerCase(), text: m[2].trim() };
                            if (m[1].toLowerCase() === 'd') {
                                options.push(curOpt);
                                curOpt = null;
                                break;
                            }
                        } else if (curOpt) {
                            if (QNUM_RE.test(allLines[j]) && options.length < 3) break;
                            if (j !== aIdx && aIdxs.includes(j)) break;
                            curOpt.text += ' ' + allLines[j];
                        }
                    }
                    if (curOpt && !options.find(o => o.letter === curOpt.letter)) options.push(curOpt);

                    if (options.length >= 2) {
                        const parsed = this.parseBody(bodyLines);
                        if (!qMap[qNum] || options.length > qMap[qNum].options.length) {
                            qMap[qNum] = { parsed, options };
                        }
                    }
                }

                addLog(`  Questions parsed: ${Object.keys(qMap).length}`, 'ok');
                return qMap;
            },
            async parseSolPdf(pages, addLog) {
                const answers = {}, explanations = {};
                const allLines = [];
                for (const page of pages) {
                    const ls = this.itemsToLines(page.items)
                        .filter(l => !this.isHF(l.text))
                        .map(l => l.text);
                    allLines.push(...ls);
                }
                const fullText = allLines.join('\n');

                const markerRe = /^Q\s*(\d{1,3})\s*\.\s*([A-D])\s*$/gm;
                const blocks = [];
                let m;
                while ((m = markerRe.exec(fullText)) !== null) {
                    blocks.push({ num: parseInt(m[1]), letter: m[2].toLowerCase(), start: m.index, end: m.index + m[0].length });
                }

                if (blocks.length < 5) {
                    addLog('  Trying inline answer pattern…', 'warn');
                    const inlineRe = /\bQ\s*(\d{1,3})\s*\.\s*([A-D])\b/g;
                    while ((m = inlineRe.exec(fullText)) !== null) {
                        const n = parseInt(m[1]);
                        if (n >= 1 && n <= 100 && !blocks.find(b => b.num === n))
                            blocks.push({ num: n, letter: m[2].toLowerCase(), start: m.index, end: m.index + m[0].length });
                    }
                    blocks.sort((a, b) => a.start - b.start);
                }

                addLog(`  Answer blocks found: ${blocks.length}`, blocks.length >= 90 ? 'ok' : 'warn');

                for (const b of blocks) answers[b.num] = b.letter;

                for (let i = 0; i < blocks.length; i++) {
                    const { num, end } = blocks[i];
                    const nextPos = i + 1 < blocks.length ? blocks[i + 1].start : fullText.length;
                    const raw = fullText.slice(end, nextPos);
                    const cl = this.cleanExplanation(raw);
                    if (cl.length > 10) explanations[num] = cl;
                }

                addLog(`  Explanations extracted: ${Object.keys(explanations).length}`, 'ok');
                return { answers, explanations };
            },
            cleanExplanation(raw) {
                let t = raw;
                t = t.replace(/Hence[,\s]+option\s*\([a-d]\)\s*is\s*(the\s+)?correct\s*(answer)?\.?[^\n]*/gi, '');
                t = t.replace(/Hence\s+option\s*\(?[a-d]\)?\s*is[^.\n]*\.\s*/gi, '');
                t = t.replace(/Hence\s+option\s*\d[^.]*\.\s*/gi, '');
                t = t.replace(/Therefore[,\s]+option\s*\(?[a-d]\)?[^.]*\.\s*/gi, '');
                t = t.replace(/Hence\s+the\s+correct\s+(answer|option)[^.]*\.\s*/gi, '');
                t = t.replace(/Hence\s+statement\s+\d+\s+is\s+(correct|not\s+correct)\.\s*/gi, '');
                t = t.replace(/Hence\s+(the\s+)?statement\s+\d+\s+is[^.]*\.\s*/gi, '');
                t = t.replace(/Hence\s+option\s+\d+\s+is\s+(correct|not\s+correct)\.\s*/gi, '');
                t = t.replace(/^(Source|Note|Reference)\s*:[^\n]*/gmi, '');
                t = t.replace(/[●○•▪◆▸▹→‣]/g, '');
                t = t.replace(/^\s*o\s+/gm, ' ');
                t = t.replace(/^Q\s*\d{1,3}\s*\.\s*[A-D]\s*$/gm, '');
                const lines = t.split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 3 && !this.isHF(l));
                return lines.join(' ').replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
            },
            buildOutput(qMap, answers, explanations) {
                const nums = Object.keys(qMap).map(Number).sort((a, b) => a - b);
                const lines = [];
                let matched = 0, noAns = 0, noExpl = 0;

                for (const num of nums) {
                    const { parsed, options } = qMap[num];
                    const { mainQ, subItems, subStem, matchHeader } = parsed;
                    const ansLetter = answers[num];
                    const expl = explanations[num] || '';

                    if (!ansLetter) noAns++;
                    if (!expl) noExpl++;
                    if (ansLetter && expl) matched++;

                    if (mainQ) {
                        lines.push(`Q${num}.${mainQ}`);
                        if (matchHeader) lines.push(matchHeader);
                        for (const item of subItems) lines.push(item);
                        if (subStem) lines.push(subStem);
                    } else if (subStem) {
                        lines.push(`Q${num}.${subStem}`);
                        if (matchHeader) lines.push(matchHeader);
                        for (const item of subItems) lines.push(item);
                    } else {
                        lines.push(`Q${num}.`);
                    }

                    lines.push('😂');

                    for (const lt of ['a', 'b', 'c', 'd']) {
                        const opt = options.find(o => o.letter === lt);
                        if (!opt) continue;
                        const txt = opt.text
                            .replace(/\s{2,}/g, ' ')
                            .replace(/^\s*\(([a-d])\)\s*/i, '')
                            .trim();
                        const mark = (ansLetter && opt.letter === ansLetter) ? ' ✅' : '';
                        lines.push(txt + mark);
                    }

                    lines.push(expl ? `Ex: ${expl}` : `Ex: [Explanation not extracted for Q${num}]`);
                    lines.push('');
                }

                return { text: lines.join('\n'), total: nums.length, matched, noAns, noExpl };
            },
            async run(testFile, solFile, setProgress, addLog) {
                setProgress(5, 'Extracting Test PDF…');
                addLog('📋 Extracting Test PDF…');
                const testPages = await this.extractPdfPages(testFile);
                addLog(`  ${testPages.length} pages found`, 'ok');

                setProgress(22, 'Parsing questions (anchor-on-option method)…');
                addLog('🔍 Parsing questions from Test PDF…');
                const qMap = this.parseTestPdf(testPages, addLog);
                const qCount = Object.keys(qMap).length;

                if (qCount === 0) {
                    throw new Error('No questions found in Test PDF.');
                }

                setProgress(46, 'Extracting Solution PDF…');
                addLog('💡 Extracting Solution PDF…');
                const solPages = await this.extractPdfPages(solFile);
                addLog(`  ${solPages.length} pages found`, 'ok');

                setProgress(68, 'Parsing answers and explanations…');
                addLog('🔗 Parsing answers and explanations…');
                const { answers, explanations } = await this.parseSolPdf(solPages, addLog);

                setProgress(88, 'Building .txt output…');
                addLog('🛠️ Assembling output in required format…');
                const result = this.buildOutput(qMap, answers, explanations);

                setProgress(100, `Done! ${result.total} questions`);
                return result;
            }
        };
