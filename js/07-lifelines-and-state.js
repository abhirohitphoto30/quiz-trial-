        // Lifelines Controller
        function useLifeline(type) {
            if (!activeQuiz.running) return;
            AudioEngine.click();
            
            const qIdx = activeQuiz.currQIdx;
            const data = activeQuiz.questions[qIdx];
            const card = document.getElementById(`chat-card-${qIdx}`);
            if (!card) return;
            
            const optsContainer = card.querySelector(`#opts-${qIdx}`);
            if (!optsContainer) return;
            const btns = optsContainer.querySelectorAll('.quiz-opt-btn');
            
            if (type === '5050') {
                if (activeQuiz.lifelines.used5050) return;
                activeQuiz.lifelines.used5050 = true;
                document.getElementById('ll-5050').disabled = true;
                
                const incorrectIndices = [];
                data.options.forEach((opt, idx) => {
                    if (!opt.isCorrect) incorrectIndices.push(idx);
                });
                
                const toHide = [];
                while (toHide.length < 2 && incorrectIndices.length > 0) {
                    const randIdx = Math.floor(Math.random() * incorrectIndices.length);
                    toHide.push(incorrectIndices.splice(randIdx, 1)[0]);
                }
                
                toHide.forEach(idx => {
                    if (btns[idx]) {
                        btns[idx].style.opacity = '0';
                        btns[idx].style.pointerEvents = 'none';
                    }
                });
                
                printMsg('bot', "🌓 <b>50:50 Lifeline Used!</b> Two incorrect options have been hidden.", true);
                AudioEngine.lifeline();
            } 
            else if (type === 'poll') {
                if (activeQuiz.lifelines.usedPoll) return;
                activeQuiz.lifelines.usedPoll = true;
                document.getElementById('ll-poll').disabled = true;
                AudioEngine.lifeline();
                
                const pollData = [];
                let correctPct = Math.floor(Math.random() * 25) + 50; 
                let remaining = 100 - correctPct;
                
                const optPcts = [0, 0, 0, 0];
                const correctIdx = data.options.findIndex(o => o.isCorrect);
                
                optPcts[correctIdx] = correctPct;
                
                const otherIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
                const p1 = Math.floor(Math.random() * (remaining - 5));
                remaining -= p1;
                const p2 = Math.floor(Math.random() * remaining);
                const p3 = remaining - p2;
                
                optPcts[otherIndices[0]] = p1;
                optPcts[otherIndices[1]] = p2;
                optPcts[otherIndices[2]] = p3;
                
                const container = document.getElementById('poll-bars-container');
                container.innerHTML = '';
                
                data.options.forEach((opt, idx) => {
                    const label = String.fromCharCode(65 + idx);
                    const pct = optPcts[idx];
                    
                    const barWrap = document.createElement('div');
                    barWrap.className = 'poll-bar-wrapper';
                    
                    const barColor = opt.isCorrect ? 'var(--success)' : 'var(--telegram-blue)';
                    
                    barWrap.innerHTML = `
                        <div class="poll-bar-label">
                            <span>Option ${label}: ${opt.text.slice(0, 30)}${opt.text.length > 30 ? '...' : ''}</span>
                            <span>${pct}%</span>
                        </div>
                        <div class="poll-bar-track">
                            <div class="poll-bar-fill" style="width: 0%; background: ${barColor};"></div>
                        </div>
                    `;
                    
                    container.appendChild(barWrap);
                    
                    setTimeout(() => {
                        const barFill = barWrap.querySelector('.poll-bar-fill');
                        if (barFill) barFill.style.width = pct + '%';
                    }, 100);
                });
                
                document.getElementById('poll-modal').classList.add('active');
                printMsg('bot', "📊 <b>Audience Poll Used!</b> Check the results in the popup.", true);
            } 
            else if (type === 'double') {
                if (activeQuiz.lifelines.usedDouble) return;
                activeQuiz.lifelines.usedDouble = true;
                activeQuiz.doubleDipActive = true;
                document.getElementById('ll-double').disabled = true;
                
                printMsg('bot', "2️⃣ <b>Double Dip Used!</b> You can now select up to 2 options for this question. If the first choice is wrong, you will get another chance.", true);
                AudioEngine.lifeline();
            }
        }
        
        function closePollModal() {
            AudioEngine.click();
            document.getElementById('poll-modal').classList.remove('active');
        }

        let timerInterval = null;
        let nextQuestionTimeout = null;
        let marksPositive = 2;
        let marksNegative = 0.66;

        // Command mapping list for display
        const COMMAND_LIST = {
            start: "Start the bot and see welcome message",
            create: "Create a new quiz by importing a file",
            done: "Finish and save the current quiz",
            cancel: "Cancel quiz creation in progress",
            list: "List all your quizzes",
            info: "Get details about a quiz by ID",
            edit: "Rename a quiz by ID",
            delete: "Delete a quiz by ID",
            help: "Show all available commands",
            features: "View full feature list",
            stats: "Open interactive analytics dashboard",
            quiz: "Launch a quiz session",
            stop: "Stop the running quiz",
            pause: "Pause the current quiz",
            resume: "Resume a paused quiz",
            skip: "Skip the current question",
            slow: "Add 5 seconds to the current question timer",
            fast: "Subtract 5 seconds from the current question timer",
            normal: "Reset quiz speed to normal",
            leaderboard: "Show current quiz leaderboard",
            result: "Show your personal quiz result",
            compare: "Compare results with another user",
            check: "Show system health and stats",
            cleanup: "Force clean up stale sessions",
            vajiram: "Vajiram PDF converter (Test + Solution)",
            vision: "VisionIAS PDF converter (Test + Solution)",
            sfg: "ForumIAS SFG PDF converter (Solution only)",
            pw: "OnlyIAS PW PDF converter (Test + Solution)",
            pdf: "Generate and download a study booklet PDF for a quiz by ID",
            html: "Generate and download a playable HTML page for a quiz by ID",
            video: "Generate and download an interactive chalkboard simulator HTML for a quiz by ID",
            mindmap: "Generate and download a visual mindmap PDF for a quiz by ID",
            flashcard: "Generate and download printable study flashcards PDF for a quiz by ID",
            settings: "Open Database Settings override modal",
            wallpaper: "Open Chat Wallpaper customization modal",
            wrong: "Start quiz with your incorrectly answered questions",
            correct: "Start quiz with your correctly answered questions",
            revise: "Revision mode — shows only wrong questions from ALL past attempts",
            "random [x]": "Timed Blitz mode — answer as many as possible in x minutes",
            survival: "Survival mode — keep answering until 3 wrong answers",
            "marathon [x]": "Marathon mode — x random questions from all quizzes",
            "timer [id] [time]": "Schedule a quiz to auto-start at a specific time",
            "theme [name]": "Switch UI theme: cyberpunk, neon, space, galaxy, anime, matrix, default"
        };

        // DOM elements
        const chatHistory = document.getElementById('chat-history');
        const chatInput = document.getElementById('chat-input');
        const stickyStatsBar = document.getElementById('sticky-stats-bar');
        const configModal = document.getElementById('config-modal');
