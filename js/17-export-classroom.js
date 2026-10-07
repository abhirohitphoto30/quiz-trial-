        function compileQuizToClassroomData(quiz) {
            const resolvedList = [];
            quiz.questions.forEach((q, idx) => {
                const qNum = "Q" + (idx + 1);
                const questionText = q.question;
                const options = q.options.map(o => o.text);
                const correctIndex = q.options.findIndex(o => o.isCorrect);
                const rawExplanation = q.explanation || "No explanation provided.";
                
                const numVal = idx + 1;
                let category = "History & Culture";
                if (numVal <= 25) category = "Polity & Constitution";
                else if (numVal <= 48) category = "Geography & Environment";
                else if (numVal <= 75) category = "Economy & Development";
                
                let title = `Lecture ${numVal}: ` + questionText.substring(0, 35) + "...";
                let central = qNum;
                
                const qTextLower = questionText.toLowerCase();
                if (qTextLower.includes("freedom")) { title = "Definition of Freedom"; central = "Freedom"; }
                else if (qTextLower.includes("constituent assembly")) { title = "Constituent Assembly of India"; central = "Assembly"; }
                else if (qTextLower.includes("right to property")) { title = "Right to Property Abolition"; central = "Property Right"; }
                else if (qTextLower.includes("borrowed") || qTextLower.includes("source")) { title = "Sources of the Constitution"; central = "Sources"; }
                else if (qTextLower.includes("article 32") || qTextLower.includes("remedies")) { title = "Right to Constitutional Remedies"; central = "Article 32"; }
                else if (qTextLower.includes("federalism")) { title = "Features of Indian Federalism"; central = "Federalism"; }
                else if (qTextLower.includes("73rd") || qTextLower.includes("panchayati")) { title = "73rd Amendment Act"; central = "Panchayati Raj"; }
                else if (qTextLower.includes("insolation") || qTextLower.includes("solar")) { title = "Insolation & Solar Radiation"; central = "Insolation"; }
                else if (qTextLower.includes("gdp") || qTextLower.includes("domestic product")) { title = "Gross Domestic Product (GDP)"; central = "GDP"; }
                
                const sentences = rawExplanation.split(/\. (?=[A-Z0-9\"\'“])/).map(s => s.trim()).filter(s => s.length > 5);
                if (sentences.length === 0) sentences.push(rawExplanation);
                
                const branches = [];
                const totalS = sentences.length;
                
                if (totalS >= 4) {
                    const chunkSize = Math.max(1, Math.floor(totalS / 4));
                    const labels = ["Core Definition", "Key Analysis", "Detailed Insight", "Additional Facts"];
                    for (let i = 0; i < 4; i++) {
                        const chunk = (i === 3) ? sentences.slice(i * chunkSize) : sentences.slice(i * chunkSize, (i + 1) * chunkSize);
                        let summary = chunk[0] + ".";
                        let detail = chunk.join(". ") + ".";
                        
                        branches.push({
                            label: labels[i],
                            title: summary.substring(0, 45) + "...",
                            text: summary,
                            detail: detail
                        });
                    }
                } else if (totalS >= 3) {
                    const labels = ["Core Concept", "Key Analysis", "Detailed Insight"];
                    const chunks = [ [sentences[0]], [sentences[1]], sentences.slice(2) ];
                    for (let i = 0; i < 3; i++) {
                        let summary = chunks[i][0] + ".";
                        let detail = chunks[i].join(". ") + ".";
                        branches.push({
                            label: labels[i],
                            title: summary.substring(0, 45) + "...",
                            text: summary,
                            detail: detail
                        });
                    }
                } else {
                    let summary = sentences[0] + ".";
                    branches.push({
                        label: "Core Concept",
                        title: summary.substring(0, 45) + "...",
                        text: summary,
                        detail: rawExplanation
                    });
                    if (totalS > 1) {
                        let summary2 = sentences[1] + ".";
                        branches.push({
                            label: "Key Details",
                            title: summary2.substring(0, 45) + "...",
                            text: summary2,
                            detail: sentences.slice(1).join(". ") + "."
                        });
                    }
                }
                
                const scriptParts = [];
                scriptParts.push(`Hello class! Today we are studying the mindmap on the board for ${title}. Look at the center of the board, our core subject is ${central}.`);
                scriptParts.push(`Let's check our first branch, the ${branches[0].label}. We learn that: ${branches[0].text}`);
                if (branches[0].detail.length > 30) {
                    scriptParts.push(`To explain this logically, ${branches[0].detail}`);
                }
                if (branches.length > 1) {
                    scriptParts.push(`Now, let's move to the second branch, the ${branches[1].label}. The core point here is: ${branches[1].text}`);
                    if (branches[1].detail.length > 30) {
                        scriptParts.push(`If we look at the connections, this means that ${branches[1].detail}`);
                    }
                }
                if (branches.length > 2) {
                    scriptParts.push(`Next, let's explore the ${branches[2].label} branch on the right. Here is what you need to note: ${branches[2].text}`);
                    if (branches[2].detail.length > 30) {
                        scriptParts.push(`In simple terms, ${branches[2].detail}`);
                    }
                }
                if (branches.length > 3) {
                    scriptParts.push(`Finally, let's look at the ${branches[3].label} node. This is a very useful fact to remember: ${branches[3].text}`);
                    if (branches[3].detail.length > 30) {
                        scriptParts.push(`Remember, ${branches[3].detail}`);
                    }
                }
                scriptParts.push(`And that completes our logical breakdown of ${central}. Review the connections on the board and write down your thoughts in your study notebook!`);
                
                resolvedList.push({
                    id: qNum,
                    category: category,
                    title: title,
                    central: central,
                    question_text: questionText,
                    options: options,
                    correct_index: correctIndex !== -1 ? correctIndex : 0,
                    branches: branches,
                    teacher_script: scriptParts.join(" "),
                    raw_explanation: rawExplanation
                });
            });
            return resolvedList;
        }

        function generateClassroomHtml(quiz, dataList) {
            const cssEl = document.getElementById("css-template");
            const jsEl = document.getElementById("js-template");
            if (!cssEl || !jsEl) {
                throw new Error("Classroom template elements not found in the simulator DOM!");
            }
            const css = cssEl.textContent;
            const appJs = jsEl.textContent;
            const dataJson = JSON.stringify(dataList, null, 2);

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="GS Test Interactive Mindmap Classroom - Study NCERT Polity, Geography, Economics, and History with a digital teacher and logical mindmaps.">
    <title>GS Mindmap Classroom - ${quiz.name}</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Short+Stack&display=swap" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
    ${css}
    </style>
</head>
<body class="theme-anime">
    <div class="app-container">
        <!-- Top Navigation Bar / Dashboard Stats -->
        <header class="app-header">
            <div class="logo-area">
                <i class="fa-solid fa-chalkboard-user logo-icon"></i>
                <div class="logo-text">
                    <h1>GS Mindmap Classroom</h1>
                    <span class="logo-sub">${quiz.name}</span>
                </div>
            </div>
            
            <div class="header-stats">
                <div class="stat-card" id="stat-progress">
                    <span class="stat-label">Syllabus Progress</span>
                    <div class="stat-progress-bar-container">
                        <div class="stat-progress-bar" id="header-progress-bar" style="width: 0%;"></div>
                    </div>
                    <span class="stat-value" id="header-progress-text">0 / ${dataList.length} Lectures</span>
                </div>
                
                <div class="stat-card" id="stat-score">
                    <span class="stat-label">Quiz Performance</span>
                    <span class="stat-value text-accent" id="header-score-text">0%</span>
                </div>
                
                <div class="stat-card" id="stat-timer">
                    <span class="stat-label">Study Time</span>
                    <span class="stat-value" id="header-timer-text">00:00:00</span>
                </div>
            </div>
        </header>

        <!-- Main Body Layout -->
        <main class="app-main">
            <!-- Left Sidebar: Lecture Syllabus Navigation -->
            <aside class="sidebar-aside" id="sidebar-container">
                <div class="sidebar-search">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" id="search-input" placeholder="Search topics or keywords...">
                </div>

                <div class="sidebar-filters">
                    <button class="filter-btn active" id="filter-all" data-filter="all">Syllabus</button>
                    <button class="filter-btn" id="filter-unvisited" data-filter="unvisited">Unstudied</button>
                    <button class="filter-btn" id="filter-incorrect" data-filter="incorrect">Failed Quiz</button>
                    <button class="filter-btn" id="filter-bookmarked" data-filter="bookmarked">Bookmarks</button>
                </div>

                <div class="question-list-scroll">
                    <ul class="question-list" id="question-list-ul">
                        <li class="loading-item">Loading lecture syllabus...</li>
                    </ul>
                </div>
            </aside>

            <!-- Center Content: Classroom Interactive Simulator -->
            <section class="player-section">
                <!-- Classroom Background Frame -->
                <div class="classroom-stage">
                    
                    <!-- Left Side: Teacher avatar standing next to chalkboard -->
                    <div class="classroom-teacher-podium">
                        <div class="podium-teacher-avatar" id="teacher-avatar">👨‍🏫</div>
                        <div class="podium-teacher-bubble" id="teacher-bubble">
                            Welcome students! Today, we are going to learn using logic maps. Please click on a topic in the syllabus to begin the class!
                        </div>
                    </div>

                    <!-- Center: Chalkboard Projection Screen -->
                    <div class="chalkboard-frame">
                        <div class="chalkboard-surface" id="video-canvas">
                            
                            <!-- Confetti Canvas Layer -->
                            <canvas id="confetti-canvas" style="position: absolute; inset: 0; pointer-events: none; z-index: 10;"></canvas>
                            
                            <!-- SVG Connector Lines Layer -->
                            <svg id="mindmap-svg" class="mindmap-connections-layer">
                                <!-- Paths are drawn dynamically by JS -->
                            </svg>

                            <!-- Watermarks -->
                            <div class="chalkboard-watermark">
                                <span>GS CLASSROOM SIMULATOR</span>
                                <span class="lecture-mode-badge"><i class="fa-solid fa-chalkboard dot-live"></i> Interactive Mindmap</span>
                            </div>

                            <!-- MINDMAP BOARD INTERFACE -->
                            <div class="mindmap-board-wrapper" id="mindmap-board">
                                <!-- Central Subject Node -->
                                <div class="mindmap-node central-node" id="node-central">
                                    <div class="node-badge">CORE TOPIC</div>
                                    <h2 class="node-title" id="mindmap-core-title">Syllabus Topic</h2>
                                </div>

                                <!-- Four Surrounding Branch Nodes -->
                                <div class="mindmap-node branch-node" id="node-b1" style="display: none;">
                                    <div class="node-badge badge-b1">1. DEFINITION</div>
                                    <h3 class="node-title" id="node-b1-title">Branch 1</h3>
                                    <p class="node-desc" id="node-b1-desc">Details...</p>
                                </div>

                                <div class="mindmap-node branch-node" id="node-b2" style="display: none;">
                                    <div class="node-badge badge-b2">2. KEY FACTS</div>
                                    <h3 class="node-title" id="node-b2-title">Branch 2</h3>
                                    <p class="node-desc" id="node-b2-desc">Details...</p>
                                </div>

                                <div class="mindmap-node branch-node" id="node-b3" style="display: none;">
                                    <div class="node-badge badge-b3">3. DETAILED INSIGHT</div>
                                    <h3 class="node-title" id="node-b3-title">Branch 3</h3>
                                    <p class="node-desc" id="node-b3-desc">Details...</p>
                                </div>

                                <div class="mindmap-node branch-node" id="node-b4" style="display: none;">
                                    <div class="node-badge badge-b4">4. CONTEXT NOTE</div>
                                    <h3 class="node-title" id="node-b4-title">Branch 4</h3>
                                    <p class="node-desc" id="node-b4-desc">Details...</p>
                                </div>

                                <!-- Blackboard Controls (e.g. Pop Quiz / Notes) -->
                                <div class="chalkboard-footer-controls">
                                    <button class="classroom-action-btn" id="pop-quiz-btn" style="display: none;">
                                        <i class="fa-solid fa-circle-question"></i> Take Pop Quiz
                                    </button>
                                </div>
                            </div>

                            <!-- POP QUIZ OVERLAY INTERFACE (slides down) -->
                            <div class="quiz-overlay-panel" id="quiz-overlay" style="display: none;">
                                <div class="quiz-panel-header">
                                    <i class="fa-solid fa-circle-question quiz-header-icon"></i>
                                    <h2>Pop Quiz Checkpoint</h2>
                                    <button class="quiz-close-btn" id="quiz-close-btn" title="Back to Mindmap">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                                <div class="quiz-panel-body">
                                    <h3 class="quiz-question-text" id="quiz-question-text">Question text here...</h3>
                                    
                                    <div class="quiz-statements-box" id="quiz-statements" style="display: none;">
                                        <!-- Populated dynamically -->
                                    </div>

                                    <div class="quiz-options-grid" id="quiz-options-grid">
                                        <!-- Loaded Dynamically -->
                                    </div>

                                    <!-- Explanation shown in Quiz Mode after solving -->
                                    <div class="quiz-explanation-box" id="quiz-explanation-box" style="display: none;">
                                        <h4 class="explanation-title"><i class="fa-solid fa-chalkboard-user"></i> Blackboard Explanation</h4>
                                        <p id="quiz-explanation-text">Explanation details...</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Floating Canvas Soundwave Visualizer Overlay (bottom of chalkboard) -->
                            <div class="visualizer-container" id="visualizer-wrapper">
                                <canvas id="soundwave-canvas"></canvas>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Study Notes / Clipboard Panel -->
                <div class="student-notes-card" id="student-notes-card" style="display: none;">
                    <div class="notes-header">
                        <i class="fa-solid fa-pen-to-square notes-icon"></i>
                        <h3>My Classroom Study Notebook</h3>
                    </div>
                    <textarea id="student-notes-textarea" placeholder="Summarize what you've learned in class today... These notes are saved locally for this lecture!"></textarea>
                </div>

                <!-- Lecture Video-Style Controller Panel -->
                <div class="player-controls-panel">
                    <!-- Playback Progress Slider -->
                    <div class="progress-bar-wrapper">
                        <span class="time-stamp" id="current-speech-time">0:00</span>
                        <div class="progress-slider-container" id="progress-slider-track">
                            <div class="progress-slider-fill" id="progress-slider-fill" style="width: 0%;"></div>
                            <div class="progress-slider-handle" id="progress-slider-handle" style="left: 0%;"></div>
                        </div>
                        <span class="time-stamp" id="total-speech-time">0:00</span>
                    </div>

                    <!-- Button Control Dashboard -->
                    <div class="controls-dashboard">
                        <!-- Left: Speed & Voice Controls -->
                        <div class="controls-left">
                            <div class="dropdown-control speed-control">
                                <label for="speed-select"><i class="fa-solid fa-gauge-high"></i></label>
                                <select id="speed-select" title="Narration Speed">
                                    <option value="1.0" selected>1.0x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="1.75">1.75x</option>
                                    <option value="2.0">2.0x</option>
                                </select>
                            </div>
                            
                            <div class="dropdown-control voice-control">
                                <label for="voice-select"><i class="fa-solid fa-microphone"></i></label>
                                <select id="voice-select" title="Voice Selection">
                                    <option value="">Loading system voices...</option>
                                </select>
                            </div>
                        </div>

                        <!-- Center: Playback Buttons -->
                        <div class="controls-center">
                            <button class="player-btn btn-sec" id="prev-btn" title="Previous Topic">
                                <i class="fa-solid fa-backward-step"></i>
                            </button>
                            
                            <button class="player-btn btn-main" id="play-btn" title="Play Lecture">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            
                            <button class="player-btn btn-sec" id="next-btn" title="Next Topic">
                                <i class="fa-solid fa-forward-step"></i>
                            </button>
                        </div>

                        <!-- Right: Volume, Autoplay & Settings -->
                        <div class="controls-right">
                            <div class="volume-control-wrapper">
                                <button class="player-btn btn-icon" id="mute-btn" title="Mute/Unmute">
                                    <i class="fa-solid fa-volume-high"></i>
                                </button>
                                <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="0.8" title="Volume">
                            </div>

                            <div class="toggle-control">
                                <label class="switch">
                                    <input type="checkbox" id="autoplay-toggle" checked>
                                    <span class="slider round"></span>
                                </label>
                                <span class="toggle-label">Auto-Play</span>
                            </div>
                            
                            <button class="bookmark-btn" id="bookmark-toggle-btn" title="Bookmark Topic">
                                <i class="fa-regular fa-bookmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- Core App Scripts -->
    <script>
    window.mindmapData = ${dataJson};
    <\/script>
    
    <script>
    // Global Error Handler for user diagnostics
    window.onerror = function(msg, url, line, col, error) {
        const errDiv = document.createElement('div');
        errDiv.style.position = 'fixed';
        errDiv.style.top = '0';
        errDiv.style.left = '0';
        errDiv.style.width = '100%';
        errDiv.style.background = 'rgba(239, 68, 68, 0.95)';
        errDiv.style.color = 'white';
        errDiv.style.padding = '12px';
        errDiv.style.zIndex = '999999';
        errDiv.style.fontFamily = 'monospace';
        errDiv.style.fontSize = '12px';
        errDiv.style.borderBottom = '2px solid #b91c1c';
        errDiv.innerHTML = '<strong>Classroom Loading Diagnostic:</strong> ' + msg + ' on line ' + line + ' col ' + col + ' <br><small>' + (error ? error.stack : '') + '</small>';
        document.body.appendChild(errDiv);
        return false;
    };
    
    ${appJs}
    <\/script>
</body>
</html>`;
        }
