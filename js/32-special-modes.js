    // ── Helper: collect all questions from all quizzes ──
    function getAllQuestions() {
        const all = [];
        quizzesDb.forEach(quiz => {
            quiz.questions.forEach((q, i) => {
                all.push({ ...q, _quizId: quiz.id, _quizName: quiz.name, _qIdx: i });
            });
        });
        return all;
    }

    // ── REVISE MODE ──
    function initiateReviseMode() {
        // Gather all wrong questions from ALL quiz attempts stored in localStorage
        const wrongPool = [];
        quizzesDb.forEach(quiz => {
            const rec = localStorage.getItem('quiz_attempt_' + quiz.id);
            if (rec) {
                try {
                    const parsed = JSON.parse(rec);
                    (parsed.incorrectIndices || []).forEach(idx => {
                        if (quiz.questions[idx]) {
                            wrongPool.push({ ...quiz.questions[idx], _quizName: quiz.name });
                        }
                    });
                } catch(e) {}
            }
        });
        if (wrongPool.length === 0) {
            printMsg('bot', '&#128218; <b>Revision Mode:</b> No wrong answers recorded yet! Play some quizzes first.', true);
            return;
        }
        // Shuffle pool for randomness
        for (let i = wrongPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wrongPool[i], wrongPool[j]] = [wrongPool[j], wrongPool[i]];
        }
        activeQuiz.id = 'revise';
        activeQuiz.name = 'Revision Mode (Wrong Questions)';
        activeQuiz.questions = wrongPool;
        activeQuiz._skipShuffleModal = true;
        document.getElementById('config-quiz-title').textContent = 'Revision: ' + wrongPool.length + ' wrong questions';
        document.getElementById('config-modal').classList.add('active');
        printMsg('bot', '&#128256; <b>Revision Mode:</b> Found <b>' + wrongPool.length + '</b> wrong questions from past attempts. Configure and start!', true);
    }

    // ── BLITZ MODE ──
    let blitzInterval = null;
    let blitzEndTime = 0;
    let blitzCount = 0;

    function initiateBlitzMode(minutes) {
        const allQ = getAllQuestions();
        if (allQ.length === 0) {
            printMsg('bot', '&#9888;&#65039; No quizzes found. Create a quiz first!', true);
            return;
        }
        // Shuffle
        for (let i = allQ.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
        }
        activeQuiz.id = 'blitz';
        activeQuiz.name = minutes + '-Minute Blitz';
        activeQuiz.questions = allQ;
        activeQuiz._blitzMinutes = minutes;
        activeQuiz._skipShuffleModal = true;
        document.getElementById('config-quiz-title').textContent = minutes + '-Minute Blitz — Answer as many as you can!';
        document.getElementById('config-modal').classList.add('active');
        printMsg('bot', '&#9889; <b>' + minutes + '-Minute Blitz:</b> Random questions from all your quizzes. Timer starts when quiz begins!', true);
    }

    function startBlitzTimer(minutes) {
        blitzEndTime = Date.now() + minutes * 60000;
        blitzCount = 0;
        const bar = document.getElementById('special-mode-bar');
        const label = document.getElementById('smb-label');
        const val = document.getElementById('smb-val');
        const lives = document.getElementById('smb-lives');
        if (bar) { bar.style.display = 'flex'; }
        if (label) label.textContent = 'BLITZ';
        if (lives) lives.innerHTML = '';
        blitzInterval = setInterval(() => {
            const rem = Math.max(0, blitzEndTime - Date.now());
            const m = Math.floor(rem / 60000);
            const s = Math.floor((rem % 60000) / 1000);
            if (val) val.textContent = m + ':' + s.toString().padStart(2, '0');
            if (rem <= 0) {
                clearInterval(blitzInterval);
                if (val) val.textContent = '0:00';
                if (bar) bar.style.display = 'none';
                printMsg('bot', 'BLITZ OVER! You answered <b>' + blitzCount + '</b> questions!', true);
                endQuizSession();
            }
        }, 500);
    }

    // ── SURVIVAL MODE ──
    let survivalLives = 3;
    let survivalRun = 0;
    let survivalBest = 0;

    function initiateSurvivalMode() {
        const allQ = getAllQuestions();
        if (allQ.length === 0) {
            printMsg('bot', '&#9888;&#65039; No quizzes found. Create a quiz first!', true);
            return;
        }
        // Create an infinite pool by looping
        const bigPool = [];
        for (let i = 0; i < Math.max(200, allQ.length * 3); i++) {
            bigPool.push(allQ[i % allQ.length]);
        }
        // Shuffle
        for (let i = bigPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bigPool[i], bigPool[j]] = [bigPool[j], bigPool[i]];
        }
        survivalLives = 3;
        survivalRun = 0;
        survivalBest = parseInt(localStorage.getItem('survival_best') || '0');
        activeQuiz.id = 'survival';
        activeQuiz.name = 'Survival Mode';
        activeQuiz.questions = bigPool;
        activeQuiz._isSurvival = true;
        activeQuiz._skipShuffleModal = true;
        document.getElementById('config-quiz-title').textContent = 'Survival Mode — 3 lives, keep going!';
        document.getElementById('config-modal').classList.add('active');
        printMsg('bot', '&#10084;&#65039; <b>Survival Mode:</b> Answer until 3 wrong! Best Run: <b>' + survivalBest + '</b>', true);
    }

    function updateSurvivalBar() {
        const bar = document.getElementById('special-mode-bar');
        const label = document.getElementById('smb-label');
        const val = document.getElementById('smb-val');
        const lives = document.getElementById('smb-lives');
        if (bar) bar.style.display = 'flex';
        if (label) label.textContent = 'SURVIVAL';
        if (val) val.textContent = 'Run: ' + survivalRun + ' | Best: ' + survivalBest;
        if (lives) {
            lives.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const h = document.createElement('span');
                h.className = 'smb-heart';
                h.textContent = i < survivalLives ? '\u2764\uFE0F' : '\u{1F5A4}';
                lives.appendChild(h);
            }
        }
    }

    // ── MARATHON MODE ──
    function initiateMarathonMode(count) {
        const allQ = getAllQuestions();
        if (allQ.length === 0) {
            printMsg('bot', '&#9888;&#65039; No quizzes found. Create a quiz first!', true);
            return;
        }
        // Shuffle and pick count questions
        for (let i = allQ.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
        }
        const selected = allQ.slice(0, Math.min(count, allQ.length));
        activeQuiz.id = 'marathon';
        activeQuiz.name = 'Marathon (' + selected.length + ' Questions)';
        activeQuiz.questions = selected;
        activeQuiz._skipShuffleModal = true;
        document.getElementById('config-quiz-title').textContent = 'Marathon: ' + selected.length + ' random questions non-stop!';
        document.getElementById('config-modal').classList.add('active');
        printMsg('bot', '&#127939; <b>Marathon Mode:</b> <b>' + selected.length + '</b> random questions from all quizzes — non-stop!', true);
    }

    // ── Patch startActiveQuizSession to init special modes ──
    (function patchStartForSpecialModes() {
        const orig = window.startActiveQuizSession;
        if (!orig) { setTimeout(patchStartForSpecialModes, 300); return; }
        window.startActiveQuizSession = function() {
            orig.apply(this, arguments);
            if (activeQuiz.id === 'blitz' && activeQuiz._blitzMinutes) {
                startBlitzTimer(activeQuiz._blitzMinutes);
            }
            if (activeQuiz._isSurvival) {
                survivalRun = 0;
                survivalLives = 3;
                updateSurvivalBar();
            }
        };
    })();

    // ── Patch handleChatQuizAnswer to handle survival deduction ──
    (function patchAnswerForSurvival() {
        const orig = window.handleChatQuizAnswer;
        if (!orig) { setTimeout(patchAnswerForSurvival, 300); return; }
        window.handleChatQuizAnswer = function(e, qIdx, optIdx, selectedBtn, container, card) {
            if (activeQuiz._isSurvival) {
                const data = activeQuiz.questions[qIdx];
                const isCorrect = data.options[optIdx].isCorrect;
                if (!isCorrect) {
                    survivalLives--;
                    if (survivalLives < 0) survivalLives = 0;
                }
                survivalRun = qIdx + (isCorrect ? 1 : 0);
                if (survivalRun > survivalBest) {
                    survivalBest = survivalRun;
                    localStorage.setItem('survival_best', survivalBest);
                }
                updateSurvivalBar();
                if (survivalLives <= 0) {
                    orig.apply(this, arguments);
                    setTimeout(() => {
                        printMsg('bot', '&#128420; <b>Survival Ended!</b><br>Current Run: <b>' + survivalRun + '</b><br>Best Run: <b>' + survivalBest + '</b>', true);
                        endQuizSession();
                    }, 1800);
                    return;
                }
                // Also track blitz answers
                if (activeQuiz.id === 'blitz') blitzCount++;
            } else if (activeQuiz.id === 'blitz') {
                blitzCount++;
            }
            orig.apply(this, arguments);
        };
    })();

    // ── Clean up special mode bar when quiz ends ──
    (function patchEndForSpecialModes() {
        const orig = window.endQuizSession;
        if (!orig) { setTimeout(patchEndForSpecialModes, 300); return; }
        window.endQuizSession = function() {
            if (blitzInterval) { clearInterval(blitzInterval); blitzInterval = null; }
            const smbBar = document.getElementById('special-mode-bar');
            if (smbBar) smbBar.style.display = 'none';
            activeQuiz._isSurvival = false;
            orig.apply(this, arguments);
        };
    })();
