        function generatePremiumHtmlFlashcards(quiz) {
            try {
                // Helpers for categorization, metadata extraction and keypoint summaries
                function autoCategorize(qText, expText) {
                    const combined = (qText + " " + expText).toLowerCase();
                    if (combined.includes("preamble") || combined.includes("objectives resolution")) return "preamble";
                    if (combined.includes("constituent assembly") || combined.includes("drafting committee") || combined.includes("assembly")) return "assembly";
                    if (combined.includes("secular") || combined.includes("secularism")) return "secularism";
                    if (combined.includes("amend") || combined.includes("amendment") || combined.includes("article 368") || combined.includes("86th")) return "amendment";
                    if (combined.includes("parliamentary") || combined.includes("cabinet") || combined.includes("democracy") || combined.includes("vote") || combined.includes("franchise") || combined.includes("elections")) return "democracy";
                    if (combined.includes("union of states") || combined.includes("federation") || combined.includes("territory") || combined.includes("boundary") || combined.includes("boundaries") || combined.includes("article 1") || combined.includes("article 2") || combined.includes("article 3") || combined.includes("article 4") || combined.includes("federal")) return "union";
                    if (combined.includes("presidential") || combined.includes("monarchy") || combined.includes("theocracy") || combined.includes("oligarchy") || combined.includes("aristocracy") || combined.includes("technocracy") || combined.includes("confederation") || combined.includes("unitary")) return "forms";
                    if (combined.includes("act of 1919") || combined.includes("act of 1935") || combined.includes("charter act") || combined.includes("councils act") || combined.includes("regulating act") || combined.includes("historical") || combined.includes("east india company")) return "history";
                    return "doctrine";
                }

                function extractMeta(card) {
                    const combined = (card.questionText + " " + card.explanation).toLowerCase();
                    if (combined.includes("42nd constitutional amendment") && combined.includes("preamble")) {
                        return { title: "The 42nd Amendment & Preamble", hook: "How three new ideals entered India's preamble in 1976" };
                    }
                    if (combined.includes("constituent assembly") && combined.includes("sovereign")) {
                        return { title: "Sovereignty of the Assembly", hook: "Was the Constituent Assembly a truly sovereign body?" };
                    }
                    if (combined.includes("basic structure")) {
                        return { title: "The Basic Structure Doctrine", hook: "What elements make up the unamendable core of the Constitution?" };
                    }
                    
                    let title = "Concept Card " + card.id;
                    let hook = "Important concept from your practice set";
                    
                    const topicMatch = card.questionText.match(/regarding\s+(?:the\s+)?([^.?:,]{5,35})/i) ||
                                       card.questionText.match(/with\s+reference\s+to\s+(?:the\s+)?([^.?:,]{5,35})/i) ||
                                       card.questionText.match(/context\s+of\s+(?:the\s+)?([^.?:,]{5,35})/i);
                                       
                    if (topicMatch && topicMatch[1]) {
                        title = topicMatch[1].trim();
                        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    } else {
                        let words = card.questionText.split(/\s+/).filter(w => w.length > 0).map(w => w.replace(/[^a-zA-Z]/g, ''));
                        let startIndex = 0;
                        const skipWords = ["which", "what", "how", "why", "who", "consider", "the", "following", "statements", "regarding", "with", "reference", "to", "of"];
                        while (startIndex < words.length && skipWords.includes(words[startIndex].toLowerCase())) {
                            startIndex++;
                        }
                        let slice = words.slice(startIndex, startIndex + 4);
                        if (slice.length > 0) {
                            title = slice.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        }
                    }
                    title = title.replace(/^(?:And|Or|But|Is|Are|Was|Were)\s+/i, '').trim();
                    if (title.length > 32) title = title.substring(0, 29) + "...";
                    
                    let firstSentence = card.questionText.split(/[.!?]/)[0].trim();
                    hook = firstSentence.length > 80 ? firstSentence.substring(0, 77) + "..." : firstSentence;
                    
                    return { title: title || ("Concept " + card.id), hook };
                }

                function extractKeyPoint(explanation) {
                    if (!explanation) return "Detailed explanation on reverse.";
                    const sentences = explanation.split(/(?<=[.!?])\s+(?=[A-Z])/);
                    let key = sentences[0].trim();
                    if (key.length < 45 && sentences.length > 1) {
                        key += " " + sentences[1].trim();
                    }
                    key = key.replace(/\s+/g, ' ');
                    return key.length > 130 ? key.substring(0, 127) + "..." : key;
                }

                // Map quiz.questions to premium CARDS array structure
                const cardsData = quiz.questions.map((q, idx) => {
                    const choices = q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }));
                    const correctOpt = q.options.find(o => o.isCorrect);
                    const correctAnswer = correctOpt ? correctOpt.text : (q.options[0] ? q.options[0].text : "");
                    const explanation = q.explanation || "No explanation provided.";
                    const questionText = q.question;
                    
                    const card = {
                        id: idx + 1,
                        sourceId: idx + 1,
                        questionText: questionText,
                        choices: choices,
                        correctAnswer: correctAnswer,
                        explanation: explanation,
                        cat: autoCategorize(questionText, explanation)
                    };
                    
                    const meta = extractMeta(card);
                    card.title = meta.title;
                    card.hook = meta.hook;
                    card.key = extractKeyPoint(explanation);
                    
                    return card;
                });

                const activeCatsCount = new Set(cardsData.map(c => c.cat)).size;

                // Built-in CSS Styles from premium generator
                const cssStyles = `
  :root{
    --ink:#1B2233; --ink-soft:#4A5273; --ink-faint:#7B8197;
    --paper:#FBF6EC; --paper-soft:#F1E9D8; --paper-deep:#E9DFC8;
    --line: rgba(27,34,51,0.14); --line-soft: rgba(27,34,51,0.08);
    --gold:#B8862E; --oxblood:#7A2E2E; --green:#3F6650; --teal:#2C6E73;
    --rust:#9C5234; --olive:#6E7A3D; --sepia:#7C6A4D; --steel:#3E5C76; --plum:#6B4C7A;
    --shadow: 0 1px 2px rgba(27,34,51,0.04), 0 8px 24px rgba(27,34,51,0.08);
    --shadow-lg: 0 4px 8px rgba(27,34,51,0.06), 0 24px 48px rgba(27,34,51,0.16);
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; min-height: 100vh; display: flex; flex-direction: column; }
  body{
    background: var(--paper);
    background-image: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(184,134,46,0.10), transparent), repeating-linear-gradient(0deg, rgba(27,34,51,0.012) 0px, rgba(27,34,51,0.012) 1px, transparent 1px, transparent 3px);
    color: var(--ink); font-family: 'Source Sans 3', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .mono{ font-family:'IBM Plex Mono', monospace; letter-spacing: 0.06em; }
  .hero{ position: relative; overflow: hidden; padding: 60px clamp(20px,5vw,64px) 40px; max-width: 1400px; margin: 0 auto; width: 100%; border-bottom: 1px solid var(--line); }
  .hero-seal{ position:absolute; top: -180px; right: -160px; width: 560px; height: 560px; opacity: 0.07; pointer-events: none; }
  .eyebrow{ font-size: 12px; text-transform: uppercase; color: var(--oxblood); font-weight: 600; margin: 0 0 18px; display:flex; align-items:center; gap: 10px; }
  .eyebrow::before{ content:""; width: 28px; height: 1px; background: var(--oxblood); display:inline-block; }
  .hero h1{ font-family:'Fraunces', serif; font-weight: 600; font-size: clamp(34px, 5.2vw, 54px); line-height: 1.1; margin: 0 0 18px; max-width: 20ch; letter-spacing: -0.01em; }
  .hero h1 em{ font-style: italic; color: var(--oxblood); font-weight: 500; }
  .hero p.lede{ font-size: 17px; line-height: 1.6; color: var(--ink-soft); max-width: 70ch; margin: 0 0 28px; }
  .hero-stats{ display:flex; gap: clamp(24px, 4vw, 56px); flex-wrap: wrap; }
  .stat .num{ font-family:'Fraunces', serif; font-size: 30px; font-weight: 600; color: var(--ink); line-height: 1; }
  .stat .label{ font-size: 12.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; }
  .controls{ position: sticky; top: 0; z-index: 30; background: rgba(251,246,236,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); padding: 16px clamp(20px,5vw,64px); width: 100%; }
  .controls-row{ max-width: 1400px; margin: 0 auto; display:flex; align-items:center; gap: 16px; flex-wrap: wrap; }
  .search-wrap{ position: relative; flex: 1 1 220px; max-width: 320px; }
  .search-wrap svg{ position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color: var(--ink-faint); }
  #searchInput{ width:100%; padding: 10px 14px 10px 36px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-family: inherit; font-size: 14px; outline: none; }
  #searchInput:focus{ border-color: var(--gold); box-shadow: 0 0 0 3px rgba(184,134,46,0.15); }
  .pills{ display:flex; gap: 8px; flex-wrap: wrap; flex: 1 1 auto; }
  .pill{ border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s ease; white-space: nowrap; display:flex; align-items:center; gap:6px; }
  .pill .dot{ width:7px; height:7px; border-radius:50%; background: var(--cat-color, var(--ink-faint)); }
  .pill.active{ background: var(--ink); color: var(--paper); border-color: var(--ink); }
  .pill.active .dot{ background: var(--paper); }
  .controls-right{ display:flex; align-items:center; gap: 14px; margin-left: auto; }
  .progress-wrap{ display:flex; flex-direction:column; gap:5px; min-width: 130px; }
  .progress-text{ font-size: 11.5px; color: var(--ink-faint); text-transform:uppercase; letter-spacing:0.04em; }
  .progress-track{ width: 100%; height: 5px; border-radius: 99px; background: var(--paper-deep); overflow: hidden; }
  .progress-fill{ height:100%; border-radius:99px; background: linear-gradient(90deg, var(--gold), var(--oxblood)); width:0%; transition: width .4s ease; }
  .icon-btn{ border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 999px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; display:flex; align-items:center; gap:7px; transition: all .15s; font-family: inherit; }
  .icon-btn:hover{ background: var(--ink); color: var(--paper); border-color: var(--ink); }
  .icon-btn svg{ width:14px; height:14px; }
  .deck-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 26px; padding: 40px clamp(20px,5vw,64px) 100px; max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; }
  .empty-state{ grid-column: 1/-1; text-align:center; padding: 80px 20px; color: var(--ink-faint); }
  .card{ perspective: 1800px; height: 380px; }
  .card.hidden-card{ display:none; }
  .card-inner{ position: relative; width:100%; height:100%; transform-style: preserve-3d; transition: transform .55s cubic-bezier(.45,.15,.2,1); cursor: pointer; }
  .card.flipped .card-inner{ transform: rotateY(180deg); }
  .card-face{ position:absolute; inset:0; backface-visibility: hidden; border-radius: 18px; border: 1px solid var(--line); display:flex; flex-direction: column; box-shadow: var(--shadow); overflow:hidden; }
  .card-front{ background: radial-gradient(circle at 88% 12%, rgba(0,0,0,0.035), transparent 45%), var(--paper); padding: 22px 24px; }
  .card-front::before{ content:""; position:absolute; right: -40px; bottom: -40px; width: 180px; height:180px; border: 1px solid var(--cat-color); border-radius: 50%; opacity: 0.10; pointer-events: none; }
  .card-front::after{ content:""; position:absolute; right: -10px; bottom: -10px; width: 120px; height:120px; border: 1px solid var(--cat-color); border-radius: 50%; opacity: 0.10; pointer-events: none; }
  .card-back{ background: var(--paper-soft); transform: rotateY(180deg); padding: 20px 22px 16px; }
  .card-top{ display:flex; align-items:center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .cat-tag{ display:flex; align-items:center; gap:7px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cat-color); }
  .cat-tag .icon{ width: 22px; height:22px; border-radius: 50%; background: color-mix(in srgb, var(--cat-color) 14%, transparent); display:flex; align-items:center; justify-content:center; }
  .cat-tag .icon svg{ width:13px; height:13px; color: var(--cat-color); }
  .expand-btn{ background: transparent; border: none; color: var(--ink-faint); cursor:pointer; width: 26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .expand-btn svg{ width:13px; height:13px; }
  .card-front h3{ font-family:'Fraunces', serif; font-weight: 600; font-size: 20px; line-height: 1.25; margin: 0 0 12px 0; color: var(--ink); }
  .front-scroll, .back-scroll{ flex:1; overflow-y: auto; padding-right: 6px; margin-right: -6px; }
  .front-scroll::-webkit-scrollbar, .back-scroll::-webkit-scrollbar{ width: 4px; }
  .front-scroll::-webkit-scrollbar-thumb, .back-scroll::-webkit-scrollbar-thumb{ background: var(--paper-deep); border-radius: 99px; }
  .card-front .question-text{ font-size: 14px; line-height: 1.5; color: var(--ink); margin: 0 0 14px 0; white-space: pre-wrap; }
  .choices-list { list-style: none; padding: 0; margin: 0 0 12px 0; }
  .choices-list li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; color: var(--ink-soft); }
  .choice-letter { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; background: var(--paper-deep); color: var(--ink); font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .choice-text { flex: 1; }
  .flip-hint{ font-size: 11px; color: var(--ink-faint); display:flex; align-items:center; gap:6px; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-top: 1px solid var(--line-soft); padding-top: 10px; }
  .flip-hint svg{ width:12px; height:12px; }
  .card-back h4{ font-family:'Fraunces', serif; font-size: 16px; font-weight: 600; margin: 0 0 10px 0; color: var(--ink); line-height: 1.3; }
  .correct-answer-box { background: rgba(63, 102, 80, 0.08); border-left: 3px solid var(--green); border-radius: 0 8px 8px 0; padding: 10px 12px; margin-bottom: 12px; }
  .ca-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--green); display: block; margin-bottom: 4px; }
  .correct-answer-box p { font-size: 13.5px; color: var(--ink); margin: 0; font-weight: 600; line-height: 1.4; }
  .back-scroll p{ font-size: 13px; line-height: 1.55; color: var(--ink-soft); margin: 0 0 10px; }
  .keypoint{ border-left: 3px solid var(--cat-color); background: color-mix(in srgb, var(--cat-color) 8%, var(--paper)); border-radius: 0 8px 8px 0; padding: 9px 12px; margin-top: 4px; }
  .keypoint .kp-label{ font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--cat-color); display:block; margin-bottom: 4px; }
  .keypoint p{ font-size: 12.5px; color: var(--ink); margin: 0; line-height: 1.45; font-weight: 500; }
  .flip-back-hint{ font-size: 11px; color: var(--ink-faint); text-align:center; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.04em; border-top: 1px solid var(--line-soft); padding-top: 8px; }
  .focus-overlay{ position: fixed; inset:0; background: rgba(27,34,51,0.82); backdrop-filter: blur(5px); z-index: 100; display:flex; align-items:center; justify-content:center; padding: 24px; opacity:0; pointer-events:none; transition: opacity .25s ease; }
  .focus-overlay.open{ opacity:1; pointer-events:all; }
  .focus-topbar{ position:absolute; top:24px; left:0; right:0; display:flex; align-items:center; justify-content:center; color: var(--paper); font-family:'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: 0.05em; }
  .focus-close{ position:absolute; top:20px; right:24px; background: rgba(251,246,236,0.12); border: 1px solid rgba(251,246,236,0.25); color: var(--paper); width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .focus-close svg{ width:16px; height:16px; }
  .focus-nav{ background: rgba(251,246,236,0.12); border: 1px solid rgba(251,246,236,0.25); color: var(--paper); width:44px; height:44px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: background .15s, opacity .15s; flex-shrink:0; }
  .focus-nav:disabled{ opacity: 0.3; cursor:default; }
  .focus-nav svg{ width:18px; height:18px; }
  .focus-stage{ display:flex; align-items:center; gap: 22px; max-width: 920px; width:100%; }
  .focus-card{ perspective: 2000px; width: 100%; max-width: 580px; height: min(82vh, 560px); margin: 0 auto; }
  .focus-card .card-face{ box-shadow: var(--shadow-lg); }
  .focus-card .card-front h3{ font-size: 24px; }
  .focus-card .card-front{ padding: 30px 34px; }
  .focus-card .card-back{ padding: 26px 30px 20px; }
  .focus-card .card-front .question-text{ font-size: 15px; }
  .focus-card .choices-list li { font-size: 14.5px; }
  .focus-card .back-scroll p{ font-size: 14px; line-height: 1.6; }
  .focus-card .card-back h4{ font-size: 18px; }
  .focus-card .keypoint p{ font-size: 13px; }
  .focus-card .correct-answer-box p { font-size: 14.5px; }
  footer{ text-align:center; padding: 40px 20px 40px; color: var(--ink-faint); font-size: 12.5px; border-top: 1px solid var(--line-soft); margin-top: auto; }
  @media (max-width: 720px){
    .controls-row{ flex-direction:column; align-items: stretch; }
    .search-wrap{ max-width: none; }
    .controls-right{ margin-left:0; justify-content: space-between; width:100%; }
    .pills{ overflow-x:auto; padding-bottom: 4px; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
    .card{ height: 400px; }
    .focus-card{ height: min(78vh, 500px); }
    .focus-nav{ width:38px; height:38px; }
  }
`;

                const categoriesData = {
                    preamble:    { name: "Preamble & Philosophy",      color: "var(--gold)",    icon: "quill" },
                    assembly:    { name: "Constituent Assembly",        color: "var(--oxblood)",icon: "gavel" },
                    forms:       { name: "Forms of Government",         color: "var(--green)",  icon: "globe" },
                    democracy:   { name: "Democracy & Parliament",      color: "var(--teal)",   icon: "columns" },
                    amendment:   { name: "Constitutional Amendment",     color: "var(--rust)",   icon: "pencil" },
                    union:       { name: "Union & Federal Structure",    color: "var(--olive)",  icon: "union" },
                    secularism:  { name: "Secularism",                   color: "var(--plum)",   icon: "venn" },
                    history:     { name: "Historical Evolution",         color: "var(--sepia)",  icon: "hourglass" },
                    doctrine:    { name: "Doctrines & Concepts",         color: "var(--steel)",  icon: "scale" },
                };

                const iconsData = {
                    quill: `<path d="M4 20l4.2-1.1L19.3 7.8a1.4 1.4 0 0 0 0-2l-1.1-1.1a1.4 1.4 0 0 0-2 0L5.1 15.8 4 20z"/><path d="M13.5 6.5l4 4"/>`,
                    gavel: `<path d="M9 4l6 6"/><path d="M3.5 13.5l6-6 6 6-6 6z"/><path d="M3 21h8"/>`,
                    globe: `<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>`,
                    columns: `<path d="M3 10l9-6 9 6"/><path d="M4 21h16"/><path d="M5 21V10M9.5 21V10M14.5 21V10M19 21V10"/>`,
                    pencil: `<path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>`,
                    union: `<rect x="3" y="3" width="11" height="11" rx="2.2"/><rect x="10" y="10" width="11" height="11" rx="2.2"/>`,
                    hourglass: `<path d="M6.5 3h11"/><path d="M6.5 21h11"/><path d="M7.5 3c0 5.2 5 6 5 9s-5 3.8-5 9"/><path d="M16.5 3c0 5.2-5 6-5 9s5 3.8 5 9"/>`,
                    scale: `<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 6h6l-3-6z"/><path d="M19 7l-3 6h6l-3-6z"/><path d="M8 21h8"/>`,
                    venn: `<circle cx="9.5" cy="12" r="6"/><circle cx="14.5" cy="12" r="6"/>`,
                };

                let template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE_PLAIN__ — Study Deck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
__CSS_STYLES__
</style>
</head>
<body class="theme-anime">
<header class="hero">
  <div class="hero-seal">
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="0.6">
      <circle cx="100" cy="100" r="92"/>
      <circle cx="100" cy="100" r="70"/>
      <circle cx="100" cy="100" r="6"/>
      <g id="spokes"></g>
    </svg>
  </div>
  <p class="eyebrow">Study Deck</p>
  <h1>__TITLE__</h1>
  <p class="lede">__DESC__</p>
  <div class="hero-stats">
    <div class="stat"><div class="num" id="statCards">__CARD_COUNT__</div><div class="label">Total Cards</div></div>
    <div class="stat"><div class="num" id="statCategories">__CAT_COUNT__</div><div class="label">Categories</div></div>
    <div class="stat"><div class="num" id="statUnreviewed">__CARD_COUNT__</div><div class="label">Unreviewed</div></div>
  </div>
</header>

<div class="controls">
  <div class="controls-row">
    <div class="search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="searchInput" type="text" placeholder="Search cards..." autocomplete="off">
    </div>
    <div class="pills" id="pillsRow"></div>
    <div class="controls-right">
      <div class="progress-wrap">
        <span class="progress-text"><span id="progressCount">0</span> / <span id="progressTotal">__CARD_COUNT__</span> reviewed</span>
        <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      </div>
      <button class="icon-btn" id="shuffleBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
        Shuffle
      </button>
    </div>
  </div>
</div>

<main class="deck-grid" id="deckGrid"></main>

<footer>
  <div style="margin-bottom: 8px;">Generated Flashcard Study Deck &bull; Fully Offline</div>
</footer>

<div class="focus-overlay" id="focusOverlay">
  <div class="focus-topbar"><span class="mono" id="focusCounter">0 / 0</span></div>
  <button class="focus-close" id="focusClose" aria-label="Close">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
  <div class="focus-stage">
    <button class="focus-nav" id="focusPrev" aria-label="Previous">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div class="focus-card" id="focusCardSlot"></div>
    <button class="focus-nav" id="focusNext" aria-label="Next">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </div>
</div>

<script>
const CARDS = __CARDS_DATA__;
const CATEGORIES = __CATEGORIES_DATA__;
const ICONS = __ICONS_DATA__;
const reviewed = new Set();
let activeCat = 'all';
let activeSearch = '';

function iconSvg(name){
  return \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">\${ICONS[name] || ICONS.scale}</svg>\`;
}

__CARD_FACE_HTML_JS__
__RENDER_GRID_JS__
__RENDER_PILLS_JS__
__APPLY_FILTERS_JS__
__UPDATE_PROGRESS_JS__

/* search */
document.getElementById('searchInput').addEventListener('input', (e) => {
  activeSearch = e.target.value.trim().toLowerCase();
  applyFilters();
});

/* shuffle */
document.getElementById('shuffleBtn').addEventListener('click', () => {
  const children = [...deckGrid.children].filter(c => c.classList.contains('card'));
  for (let i = children.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [children[i], children[j]] = [children[j], children[i]];
  }
  children.forEach(c => deckGrid.appendChild(c));
});

/* ===================== FOCUS MODE ===================== */
const focusOverlay = document.getElementById('focusOverlay');
const focusCardSlot = document.getElementById('focusCardSlot');
const focusCounter = document.getElementById('focusCounter');
let focusList = [];
let focusIndex = 0;

function currentVisibleIds(){
  return CARDS.filter(c => {
    const matchesCat = activeCat === 'all' || c.cat === activeCat;
    const haystack = (c.title + ' ' + c.questionText + ' ' + c.explanation).toLowerCase();
    return matchesCat && haystack.includes(activeSearch);
  }).map(c => c.id);
}

__OPEN_FOCUS_JS__
__RENDER_FOCUS_CARD_JS__

document.getElementById('focusPrev').addEventListener('click', () => {
  if (focusIndex > 0) { focusIndex--; renderFocusCard(); }
});
document.getElementById('focusNext').addEventListener('click', () => {
  if (focusIndex < focusList.length - 1) { focusIndex++; renderFocusCard(); }
});
document.getElementById('focusClose').addEventListener('click', closeFocus);
focusOverlay.addEventListener('click', (e) => {
  if (e.target === focusOverlay) closeFocus();
});
function closeFocus(){ focusOverlay.classList.remove('open'); }

document.addEventListener('keydown', (e) => {
  if (!focusOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeFocus();
  if (e.key === 'ArrowLeft' && focusIndex > 0) { focusIndex--; renderFocusCard(); }
  if (e.key === 'ArrowRight' && focusIndex < focusList.length - 1) { focusIndex++; renderFocusCard(); }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    const el = document.getElementById('focusCardEl');
    el.classList.toggle('flipped');
    const c = CARDS.find(x => x.id === focusList[focusIndex]);
    if (el.classList.contains('flipped')) { reviewed.add(c.id); updateProgress(); }
  }
});

/* decorative seal spokes */
(function drawSpokes(){
  const g = document.getElementById('spokes');
  if (!g) return;
  let html = '';
  for (let i = 0; i < 24; i++){
    const angle = (i * 15) * Math.PI / 180;
    const x1 = 100 + 14 * Math.cos(angle), y1 = 100 + 14 * Math.sin(angle);
    const x2 = 100 + 70 * Math.cos(angle), y2 = 100 + 70 * Math.sin(angle);
    html += \`<line x1="\${x1.toFixed(2)}" y1="\${y1.toFixed(2)}" x2="\${x2.toFixed(2)}" y2="\${y2.toFixed(2)}"/>\`;
  }
  g.innerHTML = html;
})();

// Initialize
renderPills();
renderGrid();
updateProgress();
<\/script>
</body>
</html>`;

                // Sub-functions to inject as strings
                const cardFaceHtmlStr = `function cardFaceHTML(c, isFocus){
  const cat = CATEGORIES[c.cat] || CATEGORIES.doctrine;
  let choicesHTML = '';
  if (c.choices && c.choices.length > 0) {
    choicesHTML = '<ul class="choices-list">';
    c.choices.forEach((choice, idx) => {
      const letter = String.fromCharCode(65 + idx);
      choicesHTML += '<li><span class="choice-letter">' + letter + '</span><span class="choice-text">' + choice.text + '</span></li>';
    });
    choicesHTML += '</ul>';
  }
  const paragraphs = c.explanation.split(/\\n\\n+/).map(t => '<p>' + t + '</p>').join('');
  return '<div class="card-face card-front"><div class="card-top"><span class="cat-tag"><span class="icon">' + iconSvg(cat.icon) + '</span>' + cat.name + '</span>' + (isFocus ? '' : '<button class="expand-btn" data-expand="' + c.id + '" aria-label="Open Focus Mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg></button>') + '</div><h3>' + c.title + '</h3><div class="front-scroll"><p class="question-text">' + c.questionText + '</p>' + choicesHTML + '</div><div class="flip-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 12v6h6"/></svg> Tap to reveal correct answer</div></div><div class="card-face card-back"><span class="cat-tag"><span class="icon">' + iconSvg(cat.icon) + '</span>' + cat.name + '</span><h4>' + c.title + '</h4><div class="back-scroll"><div class="correct-answer-box"><span class="ca-label">Correct Answer</span><p><strong>✅ ' + c.correctAnswer + '</strong></p></div>' + paragraphs + '<div class="keypoint"><span class="kp-label">Key takeaway</span><p>' + c.key + '</p></div></div><div class="flip-back-hint">Tap to flip back</div></div>';
}`;

                const renderGridStr = `function renderGrid(){
  const deckGrid = document.getElementById('deckGrid');
  deckGrid.innerHTML = '';
  if (CARDS.length === 0) {
    deckGrid.innerHTML = '<div class="empty-state"><div class="em-icon">&#128196;</div><div>No questions loaded.</div></div>';
    return;
  }
  CARDS.forEach(c => {
    const cat = CATEGORIES[c.cat] || CATEGORIES.doctrine;
    const el = document.createElement('div');
    el.className = 'card';
    el.id = 'card-' + c.id;
    el.style.setProperty('--cat-color', cat.color);
    el.innerHTML = '<div class="card-inner">' + cardFaceHTML(c, false) + '</div>';
    el.querySelector('.card-inner').addEventListener('click', (e) => {
      if (e.target.closest('[data-expand]')) return;
      el.classList.toggle('flipped');
      if (el.classList.contains('flipped')) { reviewed.add(c.id); updateProgress(); }
    });
    el.querySelector('[data-expand]').addEventListener('click', (e) => {
      e.stopPropagation();
      openFocus(c.id);
    });
    deckGrid.appendChild(el);
  });
  applyFilters();
}`;

                const renderPillsStr = `function renderPills(){
  const pillsRow = document.getElementById('pillsRow');
  pillsRow.innerHTML = '';
  if (CARDS.length === 0) return;
  const counts = { all: CARDS.length };
  CARDS.forEach(c => counts[c.cat] = (counts[c.cat]||0)+1);
  const allPill = document.createElement('button');
  allPill.className = 'pill active';
  allPill.dataset.cat = 'all';
  allPill.innerHTML = '<span class="dot" style="background:var(--ink-faint)"></span>All <span class="mono">(' + counts.all + ')</span>';
  pillsRow.appendChild(allPill);
  Object.keys(CATEGORIES).forEach(key => {
    if (counts[key]) {
      const cat = CATEGORIES[key];
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.dataset.cat = key;
      btn.style.setProperty('--cat-color', cat.color);
      btn.innerHTML = '<span class="dot"></span>' + cat.name + ' <span class="mono">(' + counts[key] + ')</span>';
      pillsRow.appendChild(btn);
    }
  });
  pillsRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    [...pillsRow.children].forEach(p => p.classList.toggle('active', p === btn));
    applyFilters();
  });
}`;

                const applyFiltersStr = `function applyFilters(){
  let visibleCount = 0;
  CARDS.forEach(c => {
    const el = document.getElementById('card-' + c.id);
    if (!el) return;
    const matchesCat = activeCat === 'all' || c.cat === activeCat;
    const catObj = CATEGORIES[c.cat] || CATEGORIES.doctrine;
    const haystack = (c.title + ' ' + c.questionText + ' ' + c.explanation + ' ' + catObj.name).toLowerCase();
    const matchesSearch = haystack.includes(activeSearch);
    const show = matchesCat && matchesSearch;
    el.classList.toggle('hidden-card', !show);
    if (show) visibleCount++;
  });
  const deckGrid = document.getElementById('deckGrid');
  let existingEmpty = deckGrid.querySelector('.empty-state');
  if (visibleCount === 0 && CARDS.length > 0) {
    if (!existingEmpty) {
      const div = document.createElement('div');
      div.className = 'empty-state';
      div.innerHTML = '<div class="em-icon">&#10059;</div><div>No cards match that search.</div>';
      deckGrid.appendChild(div);
    }
  } else if (existingEmpty) {
    existingEmpty.remove();
  }
}`;

                const updateProgressStr = `function updateProgress(){
  document.getElementById('progressCount').textContent = reviewed.size;
  document.getElementById('progressTotal').textContent = CARDS.length;
  const fillPercent = CARDS.length > 0 ? (reviewed.size / CARDS.length * 100) : 0;
  document.getElementById('progressFill').style.width = fillPercent + '%';
  const unreviewedEl = document.getElementById('statUnreviewed');
  if (unreviewedEl) unreviewedEl.textContent = CARDS.length - reviewed.size;
}`;

                const openFocusStr = `function openFocus(cardId){
  focusList = currentVisibleIds();
  focusIndex = focusList.indexOf(cardId);
  if (focusIndex === -1) focusIndex = 0;
  renderFocusCard();
  focusOverlay.classList.add('open');
}`;

                const renderFocusCardStr = `function renderFocusCard(){
  const c = CARDS.find(x => x.id === focusList[focusIndex]);
  const cat = CATEGORIES[c.cat] || CATEGORIES.doctrine;
  focusCardSlot.innerHTML = '<div class="card" id="focusCardEl" style="--cat-color:' + cat.color + '; height:100%;"><div class="card-inner">' + cardFaceHTML(c, true) + '</div></div>';
  focusCounter.textContent = (focusIndex+1) + ' / ' + focusList.length;
  document.getElementById('focusCardEl').querySelector('.card-inner').addEventListener('click', () => {
    const el = document.getElementById('focusCardEl');
    el.classList.toggle('flipped');
    if (el.classList.contains('flipped')) { reviewed.add(c.id); updateProgress(); }
  });
  document.getElementById('focusPrev').disabled = focusIndex === 0;
  document.getElementById('focusNext').disabled = focusIndex === focusList.length - 1;
}`;

                // Replace all placeholders
                template = template
                    .replace('__TITLE_PLAIN__', quiz.name.replace(/<[^>]*>/g, ''))
                    .replace('__TITLE__', quiz.name)
                    .replace('__DESC__', `Premium interactive study deck generated for the quiz "${quiz.name}". Features 3D card flips, filters, search, progress tracking, and full offline capability.`)
                    .replace('__CSS_STYLES__', cssStyles)
                    .replace(/__CARD_COUNT__/g, cardsData.length.toString())
                    .replace('__CAT_COUNT__', activeCatsCount.toString())
                    .replace('__CARDS_DATA__', JSON.stringify(cardsData))
                    .replace('__CATEGORIES_DATA__', JSON.stringify(categoriesData))
                    .replace('__ICONS_DATA__', JSON.stringify(iconsData))
                    .replace('__CARD_FACE_HTML_JS__', cardFaceHtmlStr)
                    .replace('__RENDER_GRID_JS__', renderGridStr)
                    .replace('__RENDER_PILLS_JS__', renderPillsStr)
                    .replace('__APPLY_FILTERS_JS__', applyFiltersStr)
                    .replace('__UPDATE_PROGRESS_JS__', updateProgressStr)
                    .replace('__OPEN_FOCUS_JS__', openFocusStr)
                    .replace('__RENDER_FOCUS_CARD_JS__', renderFocusCardStr);

                // Download the generated HTML file
                const blob = new Blob([template], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${quiz.name.replace(/\s+/g, '_')}_premium_flashcards.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                printMsg('bot', `✨ Premium Interactive Flashcards HTML downloaded successfully for <b>${quiz.name}</b>.`, true);
            } catch(err) {
                console.error("Error generating premium flashcards HTML: ", err);
                printMsg('bot', `❌ Failed to download Premium Flashcards HTML: ` + err.message);
            }
        }
