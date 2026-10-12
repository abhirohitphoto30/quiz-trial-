    // ═══════════════════════════════════════════════════════════
    // 📝  POST-ANSWER DISPLAY MODE  (Explanation  /  Notes)
    //     Notes = per-question notes built with the Notes Generator logic
    // ═══════════════════════════════════════════════════════════
    var postAnswerMode = 'exp';     // 'exp' = explanation | 'notes' = notes inside chat card | 'full' = notes in full chat area
    var autoNextQuestion = true;    // true = next question loads automatically, false = wait for "Next Question" button

    function setPostAnswerMode(mode) {
        postAnswerMode = (mode === 'notes' || mode === 'full') ? mode : 'exp';
        document.querySelectorAll('#qn-mode-toggle .qn-mode-btn').forEach(function (b) {
            b.classList.toggle('active', b.dataset.mode === postAnswerMode);
        });
        syncNotesSecsField();
        try { AudioEngine.click(); } catch (e) {}
    }

    // "Notes time" field matters only for Notes Full Page + Auto Next ON
    function syncNotesSecsField() {
        var g = document.getElementById('qn-notes-secs-group');
        if (g) g.style.display = (postAnswerMode === 'full' && autoNextQuestion) ? 'block' : 'none';
    }

    function setAutoNext(on) {
        autoNextQuestion = !!on;
        document.querySelectorAll('#qn-auto-toggle .qn-mode-btn').forEach(function (b) {
            b.classList.toggle('active', (b.dataset.auto === 'on') === autoNextQuestion);
        });
        syncNotesSecsField();
        try { AudioEngine.click(); } catch (e) {}
    }

    var QuizNotes = (function () {
    'use strict';

    var NOTES_CSS = ":host{all:initial;display:block}\n:host{--font-title:Georgia,\"Bookman Old Style\",\"Times New Roman\",serif;--font-body:\"Segoe UI\",Calibri,Arial,sans-serif;--cream:#faf6ee;--cream2:#f3ead8;--paper:#fefcf6;--navy:#1a3a6b;--maroon:#8b1a1a;--green:#1a6b3a;--purple:#5a1a8b;--teal:#1a6b6b;--mustard:#8b6a00;--indigo:#2d2d8b;--rose:#8b2d5a;--navy-bg:#e8eef7;--maroon-bg:#f7e8e8;--green-bg:#e8f7ee;--purple-bg:#f0e8f7;--teal-bg:#e8f7f7;--mustard-bg:#f7f3e8;--indigo-bg:#eeeef7;--rose-bg:#f7e8ef;--sidebar-w:270px;--header-h:56px;--radius:10px;--shadow:0 2px 10px rgba(0,0,0,.10);--shadow-sm:0 1px 4px rgba(0,0,0,.08)}\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n.qn-root{font-family:var(--font-body);font-size:15px;background:#e8e2d8;color:#1a1a1a;padding:12px;border-radius:12px;overflow-x:hidden;container-type:inline-size}\n.note-page{background:#fefcf6;background-image:repeating-linear-gradient(transparent,transparent 27px,rgba(0,0,0,.055) 27px,rgba(0,0,0,.055) 28px);border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.13),0 1px 3px rgba(0,0,0,.08);padding:28px 32px 36px;max-width:960px;margin:0 auto;position:relative}\n.parse-warning{position:absolute;top:10px;right:14px;background:#fff3cd;border:1px solid #ffc107;color:#856404;font-size:.72rem;padding:3px 9px;border-radius:12px}\n.note-header{display:grid;grid-template-columns:200px 1fr;gap:20px;margin-bottom:22px;align-items:start}\n.note-title-card{border:2px solid var(--navy);border-radius:var(--radius);padding:14px 16px;background:linear-gradient(135deg,#e8eef7,#dde5f5);text-align:center}\n.crown-icon{font-size:1.8rem;display:block;margin-bottom:6px}\n.q-label-card{font-size:.68rem;font-weight:700;color:var(--navy);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}\n.q-title-card{font-family:var(--font-title);font-size:1.05rem;color:var(--navy);line-height:1.3;font-weight:700}\n.q-subject-card{font-size:.68rem;color:#8b6a00;margin-top:6px;font-style:italic;border-top:1px solid rgba(26,58,107,.2);padding-top:5px}\n.note-header-right{display:flex;flex-direction:column;gap:12px}\n.note-question-box{background:var(--navy-bg);border:1.5px solid var(--navy);border-radius:var(--radius);padding:12px 16px}\n.qb-label{font-size:.68rem;font-weight:700;color:var(--navy);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}\n.qb-text{font-size:.87rem;line-height:1.55;color:#222}\n.note-index-box{background:var(--mustard-bg);border:1.5px solid var(--mustard);border-radius:var(--radius);padding:10px 14px}\n.ib-label{font-size:.68rem;font-weight:700;color:var(--mustard);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px}\n.ib-list{list-style:none;padding:0;columns:2;column-gap:12px}\n.ib-list li{font-size:.76rem;color:#444;margin-bottom:3px;break-inside:avoid}\n.ib-list li a{color:#8b6a00;text-decoration:none}\n.ib-list li a:hover{color:#1a3a6b;text-decoration:underline}\n.section-box{border-radius:var(--radius);border:1.5px solid;padding:14px 16px;margin-bottom:15px;box-shadow:var(--shadow-sm)}\n.sb-heading{font-family:var(--font-title);font-size:.88rem;font-weight:700;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:7px;padding-bottom:6px;border-bottom:1px dashed rgba(0,0,0,.12)}\n.sh-icon{font-size:1rem}\n.section-box.navy{border-color:var(--navy);background:var(--navy-bg)}.section-box.navy .sb-heading{color:var(--navy)}\n.section-box.maroon{border-color:var(--maroon);background:var(--maroon-bg)}.section-box.maroon .sb-heading{color:var(--maroon)}\n.section-box.green{border-color:var(--green);background:var(--green-bg)}.section-box.green .sb-heading{color:var(--green)}\n.section-box.purple{border-color:var(--purple);background:var(--purple-bg)}.section-box.purple .sb-heading{color:var(--purple)}\n.section-box.teal{border-color:var(--teal);background:var(--teal-bg)}.section-box.teal .sb-heading{color:var(--teal)}\n.section-box.mustard{border-color:var(--mustard);background:var(--mustard-bg)}.section-box.mustard .sb-heading{color:var(--mustard)}\n.section-box.indigo{border-color:var(--indigo);background:var(--indigo-bg)}.section-box.indigo .sb-heading{color:var(--indigo)}\n.section-box.rose{border-color:var(--rose);background:var(--rose-bg)}.section-box.rose .sb-heading{color:var(--rose)}\n.def-box{background:linear-gradient(135deg,#fff8e1,#fff3cd);border:2px solid #ffb300;border-radius:var(--radius);padding:12px 16px;margin-bottom:14px}\n.def-box-label{font-size:.68rem;font-weight:700;color:#7a5000;letter-spacing:1px;margin-bottom:7px;display:block}\n.def-box p{font-size:.88rem;line-height:1.6;color:#333;font-style:italic}\n.key-points-list{list-style:none;padding:0}\n.key-points-list li{display:flex;align-items:flex-start;gap:8px;font-size:.87rem;line-height:1.55;color:#2a2a2a;margin-bottom:7px}\n.kp-bullet{flex-shrink:0;margin-top:2px;color:var(--navy);font-size:.8rem}\n.verdict-table{width:100%;border-collapse:collapse;font-size:.84rem;margin-top:4px}\n.verdict-table th{background:#1a3a6b;color:#fff;padding:7px 10px;text-align:left;font-size:.75rem}\n.verdict-table td{padding:7px 10px;border-bottom:1px solid rgba(0,0,0,.08);vertical-align:top}\n.verdict-table tr:nth-child(even) td{background:rgba(0,0,0,.03)}\n.verdict-table tr:hover td{background:rgba(26,58,107,.06)}\n.tag-correct{display:inline-flex;align-items:center;gap:4px;background:#d4edda;color:#155724;border:1px solid #c3e6cb;border-radius:12px;padding:2px 9px;font-size:.74rem;font-weight:700;white-space:nowrap}\n.tag-incorrect{display:inline-flex;align-items:center;gap:4px;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;border-radius:12px;padding:2px 9px;font-size:.74rem;font-weight:700;white-space:nowrap}\n.comp-table{width:100%;border-collapse:collapse;font-size:.84rem}\n.comp-table th{background:var(--green);color:#fff;padding:6px 10px;text-align:left;font-size:.75rem}\n.comp-table td{padding:6px 10px;border-bottom:1px solid rgba(0,0,0,.08)}\n.comp-table tr:nth-child(even) td{background:rgba(26,107,58,.04)}\n.conclusion-box{background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border:2px solid #388e3c;border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;align-items:flex-start}\n.cb-icon{font-size:1.4rem;flex-shrink:0}\n.cb-label{font-size:.68rem;font-weight:700;color:#1b5e20;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px}\n.conclusion-box p{font-size:.87rem;line-height:1.5;color:#1b5e20;font-weight:600}\n.answer-box{background:#faf6ee;border:2px solid var(--navy);border-radius:var(--radius);padding:14px 16px;margin-bottom:15px}\n.ab-label{font-size:.68rem;font-weight:700;color:#1a3a6b;letter-spacing:1px;text-transform:uppercase;margin-bottom:9px}\n.options-list{list-style:none;padding:0}\n.options-list li{padding:6px 12px;border-radius:7px;font-size:.85rem;margin-bottom:5px;border:1.5px solid transparent;display:flex;align-items:center;gap:8px}\n.opt-letter{font-weight:700;font-size:.78rem;width:20px;text-align:center;flex-shrink:0}\n.options-list li.correct{background:#d4edda;border-color:#28a745;color:#155724;font-weight:600}\n.options-list li.wrong{background:#f8f9fa;border-color:#dee2e6;color:#666}\n.opt-tick{margin-left:auto;font-size:.95rem}\n.timeline{position:relative;padding-left:28px}\n.timeline::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--navy),var(--teal));border-radius:1px}\n.tl-item{position:relative;margin-bottom:14px}\n.tl-item::before{content:'';position:absolute;left:-22px;top:6px;width:10px;height:10px;background:var(--navy);border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px var(--navy)}\n.tl-year{font-weight:700;font-size:.78rem;color:var(--navy);display:inline-block;background:var(--navy-bg);border:1px solid var(--navy);border-radius:4px;padding:1px 7px;margin-bottom:4px}\n.tl-text{font-size:.84rem;color:#333;line-height:1.4}\n.terms-strip{display:flex;flex-wrap:wrap;gap:7px;padding-top:4px}\n.term-chip{background:#f3ead8;border:1.5px solid #b8a980;border-radius:20px;padding:4px 12px;font-size:.78rem;font-weight:600;color:#5a4500}\n.term-chip:hover{background:var(--mustard-bg);border-color:var(--mustard)}\n.revision-box{background:linear-gradient(135deg,#ede7d5,#e8eef7);border:2px dashed #1a3a6b;border-radius:var(--radius);padding:14px 18px;margin-top:18px}\n.rb-title{font-family:var(--font-title);font-size:.95rem;color:var(--navy);margin-bottom:10px;display:flex;align-items:center;gap:7px}\n.revision-list{list-style:none;padding:0}\n.revision-list li{display:flex;align-items:flex-start;gap:8px;font-size:.85rem;color:#333;margin-bottom:7px;line-height:1.45}\n.chk{font-size:1rem;flex-shrink:0;color:#666}\n.quote-box{background:#f3ead8;border-left:4px solid var(--mustard);padding:10px 16px;margin-top:16px;border-radius:0 8px 8px 0;font-style:italic;font-size:.88rem;color:#555}\n.quote-box cite{display:block;font-style:normal;font-size:.76rem;color:#888;margin-top:5px}\n.kw-article{color:var(--maroon);font-weight:700}\n.kw-year{color:var(--indigo);font-weight:700}\n.kw-act{color:var(--purple);font-weight:700}\n.kw-pct{color:var(--teal);font-weight:700}\n.qn-root.full{padding:20px 24px;border-radius:0;min-height:100%}\n@container (max-width:768px){.note-page{padding:16px}.note-header{grid-template-columns:1fr}}\n@container (max-width:560px){.ib-list{columns:1}.note-header{grid-template-columns:1fr}}";

    /* ===== BEGIN: copied as-is from Notes Generator ===== */
function splitSentences(text){
  var s=text;
  var abbrs=['e.g','i.e','etc','vs','Dr','Mr','Mrs','Prof','No','Art','Sec'];
  var phs={};
  abbrs.forEach(function(a,idx){
    var rx=new RegExp('\\b'+a.replace('.','\\.')+'\\.'+'(?=\\s)','g');
    var ph='__A'+idx+'__';phs[ph]=a+'.';
    s=s.replace(rx,ph);
  });
  s=s.replace(/(\d)\.(\d)/g,'$1__D__$2');
  var parts=s.split(/(?<=[.!?])\s+(?=[A-Z"])/);
  return parts.map(function(p){
    var r=p;
    Object.keys(phs).forEach(function(ph){r=r.split(ph).join(phs[ph]);});
    return r.replace(/__D__/g,'.').trim();
  }).filter(function(x){return x.length>10;});
}

function extractDefinition(text){
  var pats=[
    /^([^.]{5,120})\s+(?:is|are|was|were|refers to|means|defined as|known as|called)\s+(.{10,250}[.!?])/i,
    /([^.]{5,80})\s+(?:is defined as|is referred to as|is known as)\s+([^.]{10,250}\.)/i
  ];
  for(var i=0;i<pats.length;i++){var m=text.match(pats[i]);if(m)return m[0];}
  return null;
}

function extractVerdicts(text){
  var results=[],seen={};
  var pats=[
    {rx:/[Ss]tatement[\s-]*([I1-9]+)\s+is\s+(correct|not correct|incorrect|true|false)/gi,t:'Statement'},
    {rx:/[Pp]air\s+(\d+)\s+is\s+(correctly matched|not correctly matched|incorrectly matched)/gi,t:'Pair'},
    {rx:/[Hh]ence[,]?\s+[Ss]tatement[\s-]*([I1-9]+)\s+is\s+(correct|not correct|incorrect)/gi,t:'Statement'},
    {rx:/[Hh]ence[,]?\s+[Pp]air\s+(\d+)\s+is\s+(correctly matched|not correctly matched|incorrectly matched)/gi,t:'Pair'}
  ];
  pats.forEach(function(p){
    var rxc=new RegExp(p.rx.source,p.rx.flags),m;
    while((m=rxc.exec(text))!==null){
      var k=p.t+'-'+m[1];
      if(!seen[k]){
        seen[k]=1;
        var vt=m[2].toLowerCase();
        var ok=(vt.indexOf('not')===-1&&vt.indexOf('in')===-1&&(vt.indexOf('correct')!==-1||vt.indexOf('true')!==-1));
        results.push({label:p.t+' '+m[1],verdict:ok,raw:m[0]});
      }
    }
  });
  return results;
}

function extractYears(text){
  var evts=[],seen={};
  var rx=/\b(1[6-9]\d{2}|20[0-2]\d)\b[^.!\n]{0,160}/g,m;
  while((m=rx.exec(text))!==null){
    var yr=m[1];
    if(!seen[yr]){
      seen[yr]=1;
      var tt=m[0].replace(yr,'').replace(/^[\s,\-]+/,'').trim();
      if(tt.length>3)evts.push({year:yr,text:tt.slice(0,150)});
    }
  }
  return evts.slice(0,8);
}

function extractKeyTerms(text){
  var freq={};
  var rx=/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g;
  var stops={The:1,This:1,That:1,These:1,Those:1,Such:1,Some:1,Most:1,Many:1,Both:1,Each:1,Which:1,When:1,Where:1,Hence:1,Thus:1,Therefore:1,India:1,Indian:1,Also:1,However:1,Although:1,Because:1,Since:1,After:1,During:1,While:1,Though:1,Even:1,About:1,Only:1,More:1,Less:1,Other:1,First:1,Second:1,Third:1,North:1,South:1,East:1,West:1,Upper:1,Lower:1,Government:1,Statement:1,Statements:1,Correct:1,Incorrect:1,Given:1,Above:1,Its:1,Their:1,They:1,Have:1,Been:1,Were:1,Here:1,There:1};
  var m;
  while((m=rx.exec(text))!==null){var t=m[1].trim();if(!stops[t]&&t.length>3)freq[t]=(freq[t]||0)+1;}
  return Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];}).slice(0,7);
}

function extractConclusion(sents){
  return sents.filter(function(s){return /^(Hence|Therefore|Thus|So,|As a result|Consequently|In conclusion)/i.test(s.trim());});
}

function extractItems(qText){
  var items=[],rx=/^\s*(\d+)[.)]\s*(.+)$/gm,m;
  while((m=rx.exec(qText))!==null)items.push({num:m[1],text:m[2].trim()});
  return items;
}

function hl(h){
  h=h.replace(/\b(Article[s]?\s+\d+(?:[A-Za-z])?(?:\s*(?:and|to|,)\s*\d+[A-Za-z]?)*)\b/g,'<span class="kw-article">$1</span>');
  h=h.replace(/\b(1[6-9]\d{2}|20[0-2]\d)\b/g,'<span class="kw-year">$1</span>');
  h=h.replace(/\b(\d{4}\s+(?:Act|Amendment|Constitution|Bill))\b/g,'<span class="kw-act">$1</span>');
  h=h.replace(/\b((?:Act|Amendment|Bill)\s+of\s+\d{4})\b/g,'<span class="kw-act">$1</span>');
  h=h.replace(/(\d+(?:\.\d+)?%)/g,'<span class="kw-pct">$1</span>');
  return h;
}

function esc(s){
  if(!s)return'';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

var CC=['navy','maroon','green','purple','teal','mustard','indigo','rose'];

function getTitle(q){
  var qt=q.questionText||'';
  var acStop={THE:1,AND:1,FOR:1,ARE:1,WITH:1,THAT:1,FROM:1,THIS:1,WHICH:1,BOTH:1,ABOVE:1,GIVEN:1,FOLLOWING:1,CONSIDER:1,REGARDING:1,REFERENCE:1,STATEMENTS:1,CORRECT:1,STATEMENT:1,RESPECT:1,SELECT:1,ANSWER:1,CODE:1,INDIA:1,NOT:1,HOW:1,MANY:1,ONLY:1};
  var m,rx=/\b([A-Z]{3,8}(?:\s+[A-Z]{2,8}){0,2})\b/g;
  while((m=rx.exec(qt))!==null){var a=m[1].trim();if(!acStop[a])return toTC(a);}
  var qm=qt.match(/"([^"]{3,40})"/);if(qm)return qm[1].trim();
  var propStop={Consider:1,Which:1,Statement:1,Both:1,Following:1,India:1,Select:1,Correct:1,Regarding:1,Reference:1,Statements:1,Given:1,Above:1,Answer:1,How:1,Many:1,Other:1,Most:1,Recent:1,Using:1,Code:1,With:1,What:1,Where:1,When:1,The:1,This:1,That:1,These:1};
  var props=[],prx=/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})\b/g;
  while((m=prx.exec(qt))!==null){var p=m[1].trim();if(!propStop[p])props.push(p);}
  if(props.length>0){props.sort(function(a,b){return b.split(' ').length-a.split(' ').length;});return props[0];}
  return qt.replace(/[^\w\s]/g,' ').split(/\s+/).filter(Boolean).slice(0,6).join(' ')||'Q'+q.num;
}

function toTC(s){return s.replace(/\w\S*/g,function(t){return t.charAt(0).toUpperCase()+t.substr(1).toLowerCase();});}
function buildPage(q){
  var title=getTitle(q),et=q.explanationText||'',qt=q.questionText||'';
  var sents=splitSentences(et),def=extractDefinition(et),verdicts=extractVerdicts(et);
  var years=extractYears(et),terms=extractKeyTerms(et),concls=extractConclusion(sents);
  var pts=sents.filter(function(s){return concls.indexOf(s)===-1;}),items=extractItems(qt);
  var ci=0;function nc(){return CC[ci++%CC.length];}
  var secs=[];
  if(q.options.length>0)secs.push({id:'sa',label:'Correct Answer'});
  if(def)secs.push({id:'sd',label:'Definition'});
  if(verdicts.length>0)secs.push({id:'sv',label:'Statement Verdicts'});
  if(pts.length>0)secs.push({id:'sp',label:'Key Points'});
  if(items.length>1)secs.push({id:'si',label:'Item Analysis'});
  if(concls.length>0)secs.push({id:'sc',label:'Conclusion'});
  if(years.length>0)secs.push({id:'st',label:'Timeline'});
  if(terms.length>0)secs.push({id:'sk',label:'Key Terms'});
  secs.push({id:'sr',label:'Quick Revision'});
  var n=q.num,h='<div class="note-page" id="qpage-'+n+'">';
  if(q.warnings&&q.warnings.length>0)h+='<div class="parse-warning">&#9888; '+esc(q.warnings.join(', '))+'</div>';

  /* Header */
  h+='<div class="note-header">';
  h+='<div class="note-title-card"><span class="crown-icon">&#128218;</span><div class="q-label-card">Q '+n+'</div><div class="q-title-card">'+esc(title.slice(0,60))+'</div><div class="q-subject-card">UPSC Study Notes</div></div>';
  h+='<div class="note-header-right">';
  if(qt){h+='<div class="note-question-box"><div class="qb-label">&#10022; Question</div><div class="qb-text">'+hl(esc(qt))+'</div></div>';}
  if(secs.length>0){
    h+='<div class="note-index-box"><div class="ib-label">&#128203; Index</div><ol class="ib-list">';
    secs.forEach(function(s,i){h+='<li>'+(i+1)+'. <a href="#'+s.id+'-'+n+'">'+esc(s.label)+'</a></li>';});
    h+='</ol></div>';
  }
  h+='</div></div>';

  /* Answer box */
  if(q.options.length>0){
    var ltrs=['A','B','C','D','E','F'];
    h+='<div id="sa-'+n+'" class="answer-box"><div class="ab-label">&#9989; MCQ Options &amp; Correct Answer</div><ul class="options-list">';
    q.options.forEach(function(o,i){
      h+='<li class="'+(o.correct?'correct':'wrong')+'"><span class="opt-letter">'+(ltrs[i]||(i+1))+'</span>'+hl(esc(o.text))+(o.correct?'<span class="opt-tick">&#9989;</span>':'')+'</li>';
    });
    h+='</ul></div>';
  }

  /* Definition */
  if(def){h+='<div id="sd-'+n+'" class="def-box"><span class="def-box-label">&#128214; DEFINITION</span><p>'+hl(esc(def))+'</p></div>';}

  /* Verdicts */
  if(verdicts.length>0){
    var c=nc();
    h+='<div id="sv-'+n+'" class="section-box '+c+'"><div class="sb-heading"><span class="sh-icon">&#9878;</span> Statement-wise Verdict</div>';
    h+='<table class="verdict-table"><thead><tr><th>Statement / Pair</th><th>Verdict</th><th>Details</th></tr></thead><tbody>';
    verdicts.forEach(function(v){
      var tag=v.verdict?'<span class="tag-correct">&#9989; Correct</span>':'<span class="tag-incorrect">&#10060; Incorrect</span>';
      h+='<tr><td><strong>'+esc(v.label)+'</strong></td><td>'+tag+'</td><td style="font-size:.78rem;color:#555">'+hl(esc(v.raw))+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }

  /* Key Points */
  if(pts.length>0){
    var c2=nc();
    var icons=['&#10022;','&#9733;','&#10148;','&#128313;','&#9670;','&#9656;','&#8226;'];
    h+='<div id="sp-'+n+'" class="section-box '+c2+'"><div class="sb-heading"><span class="sh-icon">&#128204;</span> Key Points</div><ul class="key-points-list">';
    pts.slice(0,12).forEach(function(p,i){h+='<li><span class="kp-bullet">'+icons[i%icons.length]+'</span><span>'+hl(esc(p))+'</span></li>';});
    h+='</ul></div>';
  }

  /* Item Analysis */
  if(items.length>1){
    var c3=nc();
    h+='<div id="si-'+n+'" class="section-box '+c3+'"><div class="sb-heading"><span class="sh-icon">&#128202;</span> Item Analysis</div>';
    h+='<table class="comp-table"><thead><tr><th>#</th><th>Item</th><th>Note from Explanation</th></tr></thead><tbody>';
    items.forEach(function(it){
      var rel='';
      for(var si=0;si<sents.length;si++){
        var wds=it.text.split(/\s+/).slice(0,4),found=false;
        for(var wi=0;wi<wds.length;wi++){if(wds[wi].length>3&&sents[si].toLowerCase().indexOf(wds[wi].toLowerCase())!==-1){found=true;break;}}
        if(found){rel=sents[si];break;}
      }
      h+='<tr><td><strong>'+esc(it.num)+'</strong></td><td>'+hl(esc(it.text))+'</td><td style="font-size:.78rem;color:#444">'+hl(esc(rel.slice(0,140)))+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }

  /* Conclusion */
  if(concls.length>0){
    h+='<div id="sc-'+n+'" class="conclusion-box"><div class="cb-icon">&#128161;</div><div><div class="cb-label">Conclusion / Answer Rationale</div>';
    concls.forEach(function(c){h+='<p>'+hl(esc(c))+'</p>';});
    h+='</div></div>';
  }

  /* Timeline */
  if(years.length>0){
    var c4=nc();
    h+='<div id="st-'+n+'" class="section-box '+c4+'"><div class="sb-heading"><span class="sh-icon">&#128197;</span> Timeline / Key Dates</div><div class="timeline">';
    years.forEach(function(y){h+='<div class="tl-item"><div class="tl-year">'+esc(y.year)+'</div><div class="tl-text">'+hl(esc(y.text.slice(0,160)))+'</div></div>';});
    h+='</div></div>';
  }

  /* Key Terms */
  if(terms.length>0){
    var c5=nc();
    h+='<div id="sk-'+n+'" class="section-box '+c5+'"><div class="sb-heading"><span class="sh-icon">&#128273;</span> Key Terms</div><div class="terms-strip">';
    terms.forEach(function(t){h+='<span class="term-chip">'+esc(t)+'</span>';});
    h+='</div></div>';
  }

  /* Quick Revision */
  var revPts=sents.slice(0,5);
  if(revPts.length>0){
    h+='<div id="sr-'+n+'" class="revision-box"><div class="rb-title">&#9744; Quick Revision Checklist</div><ul class="revision-list">';
    revPts.forEach(function(p){h+='<li><span class="chk">&#9744;</span><span>'+hl(esc(p.slice(0,200)))+'</span></li>';});
    h+='</ul></div>';
  }

  /* Quote */
  var last=sents[sents.length-1]||'';
  if(last&&last.length>20&&last.length<200&&sents.length>3){
    h+='<div class="quote-box">&ldquo;'+esc(last)+'&rdquo;<cite>&mdash; Explanation, Q'+n+'</cite></div>';
  }
  h+='</div>';
  return h;
}
    /* ===== END: copied from Notes Generator ===== */

    /* Convert a quiz-bot question into the object the Notes Generator's buildPage() expects */
    function toNoteQuestion(data, idx) {
        var expText = String(data.explanation || '').replace(/Ex:\s*/i, '').trim();
        if (/^No explanation provided\.?$/i.test(expText)) expText = '';
        var qText = String(data.question || '').replace(/\r\n?/g, '\n').split('\n')
            .filter(function (l) { return l.trim(); }).join('\n').trim();
        var opts = [], ca = null, warnings = [];
        (data.options || []).forEach(function (o) {
            var t = String(o.text == null ? '' : o.text).trim();
            if (t) { opts.push({ text: t, correct: !!o.isCorrect }); if (o.isCorrect) ca = t; }
        });
        if (!qText) warnings.push('Question text missing');
        if (!expText) warnings.push('Explanation (Ex:) missing');
        if (opts.length > 0 && !ca) warnings.push('No correct answer detected');
        if (opts.length === 0) warnings.push('Options not found');
        return { num: idx + 1, questionText: qText, options: opts, correctAnswer: ca,
                 explanationText: expText, warnings: warnings };
    }

    /* Render the notes of ONE question into the given panel (isolated in a Shadow DOM) */
    function mount(panel, data, idx, full) {
        try {
            var html = buildPage(toNoteQuestion(data, idx));
            var host = document.createElement('div');
            host.className = 'qn-host';
            var root = host.attachShadow({ mode: 'open' });
            root.innerHTML = '<style>' + NOTES_CSS + '</style><div class="qn-root' + (full ? ' full' : '') + '">' + html + '</div>';
            // Index links (#sa-3, #sp-3 ...) -> scroll inside this note only
            root.addEventListener('click', function (e) {
                var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
                if (!a) return;
                e.preventDefault();
                var t = root.getElementById(a.getAttribute('href').slice(1));
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            panel.appendChild(host);
            return true;
        } catch (err) {
            console.error('Notes build failed, falling back to explanation:', err);
            return false;
        }
    }

    /* ---------- Full-page notes viewer ---------- */
    var _ov = null, _onKey = null;

    function closeFull(silent) {
        if (!_ov) return;
        var cb = _ov._onClose;
        if (_ov._tick) { clearInterval(_ov._tick); _ov._tick = null; }
        if (_onKey) { document.removeEventListener('keydown', _onKey, true); _onKey = null; }
        _ov.remove(); _ov = null;
        if (!silent && typeof cb === 'function') cb();
    }

    function openFull(data, idx, onClose, autoSecs) {
        closeFull(true);
        var ov = document.createElement('div');
        ov.className = 'qn-overlay';
        var isLast = !(typeof activeQuiz !== 'undefined' && activeQuiz && activeQuiz.questions && idx + 1 < activeQuiz.questions.length);
        ov.innerHTML =
            '<div class="qn-bar">' +
              '<span class="qn-bar-title">📝 Notes — Q' + (idx + 1) + '</span>' +
              '<span class="qn-spacer"></span>' +
              '<span class="qn-count" style="display:none"></span>' +
              '<button type="button" class="qn-pause" style="display:none" title="Pause / resume auto next">⏸</button>' +
              '<button type="button" class="qn-next">' + (onClose ? (isLast ? 'Finish ➜' : 'Next Question ➜') : '✕ Close') + '</button>' +
            '</div>' +
            '<div class="qn-body"></div>';
        var body = ov.querySelector('.qn-body');
        if (!mount(body, data, idx, true)) { if (typeof onClose === 'function') onClose(); return false; }
        ov._onClose = onClose;
        if (typeof onClose === 'function' && autoSecs > 0) {
            var left = autoSecs, paused = false;
            var cnt = ov.querySelector('.qn-count'), pb = ov.querySelector('.qn-pause');
            var show = function () { cnt.textContent = paused ? 'Paused' : ('Next in ' + left + 's'); };
            cnt.style.display = ''; pb.style.display = ''; show();
            pb.addEventListener('click', function () { paused = !paused; pb.textContent = paused ? '▶' : '⏸'; show(); });
            ov._tick = setInterval(function () {
                if (paused) return;
                left--;
                if (left <= 0) { closeFull(false); return; }
                show();
            }, 1000);
        }
        ov.querySelector('.qn-next').addEventListener('click', function () { closeFull(false); });
        _onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFull(false); } };
        document.addEventListener('keydown', _onKey, true);
        // Cover only the chat area (the message feed region), not the whole browser page
        var hist = document.getElementById('chat-history');
        var viewport = hist && hist.parentElement;
        if (viewport) { viewport.appendChild(ov); }
        else { ov.classList.add('qn-fixed'); document.body.appendChild(ov); }
        _ov = ov;
        return true;
    }

    // Re-open notes of an already answered question (button inside the chat card)
    function openByIndex(idx) {
        var data = activeQuiz && activeQuiz.questions && activeQuiz.questions[idx];
        if (data) openFull(data, idx, null);
    }

    return { mount: mount, openFull: openFull, openByIndex: openByIndex, close: closeFull };
    })();

    // After an answer:
    //  - 'full' notes mode  -> full chat-area notes viewer; Auto Next ON closes it after N sec, OFF waits for Next button
    //  - Auto Next ON       -> next question loads by itself (original timing)
    //  - Auto Next OFF      -> a "Next Question" button appears under the card
    function scheduleNextQuestion(delay) {
        var answeredIdx = activeQuiz.currQIdx - 1;
        var token = activeQuiz.startTime;
        var go = function () {
            if (activeQuiz.running && activeQuiz.startTime === token) loadChatQuestionCard(activeQuiz.currQIdx);
        };
        if (postAnswerMode === 'full' && typeof QuizNotes !== 'undefined') {
            nextQuestionTimeout = setTimeout(function () {
                var secsEl = document.getElementById('qn-notes-secs');
                var secs = autoNextQuestion ? Math.max(3, parseInt(secsEl && secsEl.value) || 20) : 0;
                QuizNotes.openFull(activeQuiz.questions[answeredIdx], answeredIdx, go, secs);
            }, 700);
            return;
        }
        if (autoNextQuestion) {
            nextQuestionTimeout = setTimeout(function () { loadChatQuestionCard(activeQuiz.currQIdx); }, delay);
            return;
        }
        var card = document.getElementById('chat-card-' + answeredIdx);
        if (!card) { go(); return; }
        var isLast = answeredIdx + 1 >= activeQuiz.questions.length;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qn-next-inline';
        btn.textContent = isLast ? 'Finish ➜' : 'Next Question ➜';
        btn.onclick = function () { btn.remove(); go(); };
        card.appendChild(btn);
        if (typeof scrollToBottom === 'function') scrollToBottom();
    }
