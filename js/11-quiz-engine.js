        // Launch quiz parameters
        function initiateQuizFlow(id) {
            if (currentGroup && !currentGroup.isHost) {
                printMsg('bot', "⚠️ Only the Group Creator can start a live quiz!");
                return;
            }
            const quizObj = quizzesDb.find(q => q.id === id);
            if (!quizObj) {
                printMsg('bot', `❌ Quiz with ID <code>${id}</code> does not exist.`, true);
                return;
            }
            activeQuiz.id = id;
            activeQuiz.name = quizObj.name;
            activeQuiz.questions = quizObj.questions;
            
            // Set modal info & show
            document.getElementById('config-quiz-title').textContent = `Configuration for: ${quizObj.name}`;
            configModal.classList.add('active');
        }

        function initiateSubsetQuizFlow(quizId, type) {
            if (currentGroup && !currentGroup.isHost) {
                printMsg('bot', "⚠️ Only the Group Creator can start a live quiz!");
                return;
            }
            const quizObj = quizzesDb.find(q => q.id === quizId);
            if (!quizObj) {
                printMsg('bot', `❌ Quiz with ID <code>${quizId}</code> does not exist.`, true);
                return;
            }
            
            const recordStr = localStorage.getItem(`quiz_attempt_${quizId}`);
            if (!recordStr) {
                printMsg('bot', `❌ No previous attempt records found for Quiz ID: <code>${quizId}</code>. Play it once first!`, true);
                return;
            }
            
            let record;
            try {
                record = JSON.parse(recordStr);
            } catch(e) {
                printMsg('bot', `❌ Error reading attempt records.`);
                return;
            }
            
            const indices = type === 'wrong' ? record.incorrectIndices : record.correctIndices;
            if (!indices || indices.length === 0) {
                printMsg('bot', `ℹ️ No ${type === 'wrong' ? 'incorrect' : 'correct'} questions recorded in your last attempt for Quiz ID: <code>${quizId}</code>.`, true);
                return;
            }
            
            const filteredQuestions = quizObj.questions.filter((q, idx) => indices.includes(idx));
            
            activeQuiz.id = quizId;
            activeQuiz.name = `${quizObj.name} (${type === 'wrong' ? 'Wrong' : 'Correct'} Qs)`;
            activeQuiz.questions = filteredQuestions;
            
            // Set modal info & show
            document.getElementById('config-quiz-title').textContent = `Configuration for: ${activeQuiz.name}`;
            configModal.classList.add('active');
        }

        function submitQuizConfig() {
            const sec = parseInt(document.getElementById('timer-sec').value) || 30;
            marksPositive = parseFloat(document.getElementById('marks-positive').value) || 2;
            marksNegative = parseFloat(document.getElementById('marks-negative').value) || 0.66;
            
            activeQuiz.timerLimit = sec;
            activeQuiz.initialTimerLimit = sec;
            
            // Hide config modal
            configModal.classList.remove('active');

            // Show shuffle modal (unless it's a special mode that already handled shuffle)
            if (!activeQuiz._skipShuffleModal) {
                document.getElementById('shuffle-modal').classList.add('active');
            } else {
                activeQuiz._skipShuffleModal = false;
                _launchAfterShuffle();
            }
        }

        function applyShuffleAndStart(mode) {
            document.getElementById('shuffle-modal').classList.remove('active');
            // Shuffle questions
            if (mode === 'questions' || mode === 'both') {
                activeQuiz.questions = shuffleArray([...activeQuiz.questions]);
            }
            // Shuffle options within each question
            if (mode === 'options' || mode === 'both') {
                activeQuiz.questions = activeQuiz.questions.map(q => {
                    const correctText = q.options.find(o => o.isCorrect)?.text;
                    const shuffled = shuffleArray([...q.options]);
                    // Re-mark correct after shuffle
                    shuffled.forEach(o => { o.isCorrect = (o.text === correctText); });
                    return { ...q, options: shuffled };
                });
            }
            _launchAfterShuffle();
        }

        function _launchAfterShuffle() {
            if (currentGroup) {
                if (!currentGroup.isHost) {
                    printMsg('bot', "⚠️ Only the Group Creator can configure and start the quiz!");
                    return;
                }
                GroupSyncManager.startQuiz(activeQuiz.id, activeQuiz.timerLimit, marksPositive, marksNegative);
            } else {
                startActiveQuizSession();
            }
        }

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }


        // Quiz session starts
        function startActiveQuizSession() {
            activeQuiz.running = true;
            activeQuiz.currQIdx = 0;
            activeQuiz.score = 0;
            activeQuiz.streak = 0;
            activeQuiz.bestStreak = 0;
            activeQuiz.correct = 0;
            activeQuiz.incorrect = 0;
            activeQuiz.isPaused = false;
            activeQuiz.timerRate = 1000;
            activeQuiz.startTime = Date.now();
            activeQuiz.answersLog = [];
            activeQuiz.doubleDipActive = false;
            activeQuiz.lifelines = {
                used5050: false,
                usedPoll: false,
                usedDouble: false
            };

            // Enable lifeline buttons
            const l50 = document.getElementById('ll-5050');
            const lpl = document.getElementById('ll-poll');
            const ldb = document.getElementById('ll-double');
            if (l50) l50.disabled = false;
            if (lpl) lpl.disabled = false;
            if (ldb) ldb.disabled = false;

            printMsg('bot', `🎬 <b>Launching Battle: ${activeQuiz.name}!</b>\n\nTotal Questions: ${activeQuiz.questions.length}\nTimer: ${activeQuiz.timerLimit}s / Q\nCorrect: +${marksPositive} | Wrong: -${marksNegative}\n\n<i>Get ready... 🧠</i>`, true);

            // Play dramatic quiz-start sound
            AudioEngine.quizStart();

            // Display header stats
            stickyStatsBar.classList.add('active');
            updateStickyStats();

            // Load Q1
            nextQuestionTimeout = setTimeout(() => {
                loadChatQuestionCard(0);
            }, 1000);
        }

        function updateStickyStats() {
            document.getElementById('hdr-score').textContent = activeQuiz.score.toFixed(2);
            document.getElementById('hdr-streak').textContent = activeQuiz.streak;
            
            const m = Math.floor(activeQuiz.timeLeft / 60);
            const s = activeQuiz.timeLeft % 60;
            document.getElementById('hdr-timer').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            
            const timerDisp = document.getElementById('hdr-timer');
            if (activeQuiz.timeLeft <= 10) {
                timerDisp.style.color = 'var(--danger)';
            } else {
                timerDisp.style.color = 'var(--telegram-blue)';
            }
        }

        // Load Question inside chat feed
        function loadChatQuestionCard(idx) {
            if (!activeQuiz.running) return;

            // Check if we need to show mid-quiz leaderboard (every 5 questions)
            if (currentGroup && currentGroup.isHost && idx > 0 && idx % 5 === 0) {
                GroupSyncManager.publishMidLeaderboard(idx);
            }

            if (idx >= activeQuiz.questions.length) {
                if (currentGroup && currentGroup.isHost) {
                    nextQuestionTimeout = setTimeout(() => GroupSyncManager.publishQuizEnd(), 1200);
                } else if (!currentGroup) {
                    nextQuestionTimeout = setTimeout(endQuizSession, 1200);
                }
                return;
            }

            const data = activeQuiz.questions[idx];
            
            const wrap = document.createElement('div');
            wrap.className = 'chat-message bot';
            
            const card = document.createElement('div');
            card.className = 'quiz-card-bubble';
            card.id = `chat-card-${idx}`;
            
            card.innerHTML = `
                <div class="q-meta">
                    <span>Question ${idx + 1} of ${activeQuiz.questions.length}</span>
                    <span>Reward: +${marksPositive} / -${marksNegative}</span>
                </div>
                ${data.image ? `<div class="q-image" style="margin-bottom:12px; text-align:center;"><img src="${data.image}" style="max-width:100%; max-height:220px; border-radius:10px; border:1px solid var(--glass-border); object-fit:contain;"></div>` : ''}
                <div class="q-text">${data.question}</div>
                <div class="quiz-options" id="opts-${idx}"></div>
                <div class="explanation-panel" id="exp-${idx}">
                    <strong>💡 Explanation:</strong><br><div style="margin-top: 8px;">${data.explanation.replace(/Ex:\s*/i, '')}</div>
                </div>
            `;
            
            wrap.appendChild(card);
            chatHistory.appendChild(wrap);
            
            // Build options buttons
            const optsContainer = card.querySelector(`#opts-${idx}`);
            data.options.forEach((opt, optIdx) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerHTML = `<span>${opt.text}</span>`;
                btn.onclick = (e) => handleChatQuizAnswer(e, idx, optIdx, btn, optsContainer, card);
                optsContainer.appendChild(btn);
            });
            
            scrollToBottom();
            
            // Speak question via TTS
            if (activeQuiz.running && VoiceEngine.enabledQ) {
                VoiceEngine.speakQuestion(data);
            }

            // Run countdown
            activeQuiz.timeLeft = activeQuiz.timerLimit;
            updateStickyStats();
            runRunningTimer();

            // Host publishes the question to the group
            if (currentGroup && currentGroup.isHost) {
                GroupSyncManager.publishQuestion(idx);
            }
        }

        function runRunningTimer() {
            if (timerInterval) clearInterval(timerInterval);
            
            timerInterval = setInterval(() => {
                if (activeQuiz.isPaused) return;

                activeQuiz.timeLeft--;
                updateStickyStats();
                
                if (activeQuiz.timeLeft <= 0) {
                    clearInterval(timerInterval);
                    processTimeout();
                } else if (activeQuiz.timeLeft <= 3) {
                    AudioEngine.urgentTick();
                } else if (activeQuiz.timeLeft <= 6) {
                    AudioEngine.tick();
                }
            }, activeQuiz.timerRate);
        }

        // User clicked an answer
        function handleChatQuizAnswer(e, qIdx, optIdx, selectedBtn, container, card) {
            if (!activeQuiz.running) return;

            const data = activeQuiz.questions[qIdx];
            const isCorrect = data.options[optIdx].isCorrect;

            // Handle Double Dip lifeline active
            if (activeQuiz.doubleDipActive) {
                if (!isCorrect) {
                    // It is a wrong choice, but we have double dip!
                    selectedBtn.classList.add('wrong');
                    selectedBtn.disabled = true;
                    AudioEngine.wrong();
                    
                    // Show a quick notification bubble
                    const dipBubble = document.createElement('span');
                    dipBubble.className = 'score-bubble minus';
                    dipBubble.textContent = `Try Again!`;
                    card.appendChild(dipBubble);
                    dipBubble.style.left = `${e.clientX - card.getBoundingClientRect().left}px`;
                    dipBubble.style.top = `${e.clientY - card.getBoundingClientRect().top}px`;
                    setTimeout(() => dipBubble.remove(), 800);
                    
                    // Consume the lifeline
                    activeQuiz.doubleDipActive = false;
                    
                    // Keep the timer running or resume it
                    return;
                } else {
                    // Correct! Just consume the double dip state
                    activeQuiz.doubleDipActive = false;
                }
            }

            clearInterval(timerInterval);

            // Lock options
            const btns = container.querySelectorAll('.quiz-opt-btn');
            btns.forEach(b => b.disabled = true);

            // Log answer details for achievements
            if (activeQuiz.answersLog) {
                activeQuiz.answersLog.push({
                    qIdx: qIdx,
                    isCorrect: isCorrect,
                    timeLeft: activeQuiz.timeLeft,
                    timeSpent: activeQuiz.timerLimit - activeQuiz.timeLeft
                });
            }

            // Floating feedback bubble
            const bubble = document.createElement('span');
            bubble.className = 'score-bubble';

            if (isCorrect) {
                selectedBtn.classList.add('correct');
                activeQuiz.score += marksPositive;
                activeQuiz.correct++;
                activeQuiz.streak++;
                if (activeQuiz.streak > activeQuiz.bestStreak) activeQuiz.bestStreak = activeQuiz.streak;

                AudioEngine.correct();
                triggerOptionConfetti(selectedBtn);

                bubble.classList.add('plus');
                bubble.textContent = `+${marksPositive}`;

                if (activeQuiz.streak % 5 === 0) {
                    AudioEngine.streak(activeQuiz.streak / 5);
                    triggerStreakConfetti();
                }
            } else {
                selectedBtn.classList.add('wrong');
                activeQuiz.score -= marksNegative;
                activeQuiz.incorrect++;
                activeQuiz.streak = 0;

                AudioEngine.wrong();

                // Shake the card on wrong answer
                const wrongCard = document.getElementById('chat-card-' + qIdx);
                if (wrongCard) {
                    wrongCard.classList.add('shake-anim');
                    setTimeout(() => wrongCard.classList.remove('shake-anim'), 500);
                }

                const correctIdx = data.options.findIndex(o => o.isCorrect);
                if (correctIdx !== -1) {
                    btns[correctIdx].classList.add('correct');
                }

                bubble.classList.add('minus');
                bubble.textContent = `-${marksNegative}`;
            }

            // Append floating point animation bubble
            card.appendChild(bubble);
            bubble.style.left = `${e.clientX - card.getBoundingClientRect().left}px`;
            bubble.style.top = `${e.clientY - card.getBoundingClientRect().top}px`;
            setTimeout(() => bubble.remove(), 800);

            // Update stats
            updateStickyStats();

            // Reveal explanation panel
            const exp = card.querySelector('.explanation-panel');
            exp.style.display = 'block';

            // Voice synthesis explanation readout
            if (VoiceEngine.enabledExp) {
                VoiceEngine.speakExplanation(data.explanation);
            }

            if (currentGroup) {
                GroupSyncManager.publishAnswer(activeQuiz.score, activeQuiz.correct, activeQuiz.incorrect, activeQuiz.streak, isCorrect);
                
                if (currentGroup.isHost) {
                    activeQuiz.currQIdx++;
                    nextQuestionTimeout = setTimeout(() => {
                        loadChatQuestionCard(activeQuiz.currQIdx);
                    }, 2500);
                }
            } else {
                // Next question loaded automatically
                activeQuiz.currQIdx++;
                nextQuestionTimeout = setTimeout(() => {
                    loadChatQuestionCard(activeQuiz.currQIdx);
                }, 1500);
            }
        }

        // Timeout skipped question handler
        function processTimeout() {
            if (!activeQuiz.running) return;
            AudioEngine.wrong();
            
            const card = document.getElementById(`chat-card-${activeQuiz.currQIdx}`);
            const container = card.querySelector('.quiz-options');
            const btns = container.querySelectorAll('.quiz-opt-btn');
            
            btns.forEach(b => b.disabled = true);

            // Highlight the correct choice
            const data = activeQuiz.questions[activeQuiz.currQIdx];
            const correctIdx = data.options.findIndex(o => o.isCorrect);
            if (correctIdx !== -1) {
                btns[correctIdx].classList.add('correct');
            }

            // Log timeout in answersLog
            if (activeQuiz.answersLog) {
                activeQuiz.answersLog.push({
                    qIdx: activeQuiz.currQIdx,
                    isCorrect: false,
                    timeLeft: 0,
                    timeSpent: activeQuiz.timerLimit
                });
            }

            activeQuiz.streak = 0;
            updateStickyStats();

            // Show explanation
            const exp = card.querySelector('.explanation-panel');
            exp.style.display = 'block';

            // Voice synthesis explanation readout
            if (VoiceEngine.enabledExp) {
                VoiceEngine.speakExplanation(data.explanation);
            }

            // Show floating text
            const bubble = document.createElement('span');
            bubble.className = 'score-bubble minus';
            bubble.textContent = `Time's Up!`;
            card.appendChild(bubble);
            bubble.style.left = '50%';
            bubble.style.top = '40%';
            setTimeout(() => bubble.remove(), 1200);

            if (currentGroup) {
                GroupSyncManager.publishAnswer(activeQuiz.score, activeQuiz.correct, activeQuiz.incorrect, activeQuiz.streak, false);
                if (currentGroup.isHost) {
                    activeQuiz.currQIdx++;
                    nextQuestionTimeout = setTimeout(() => {
                        loadChatQuestionCard(activeQuiz.currQIdx);
                    }, 4000);
                }
            } else {
                activeQuiz.currQIdx++;
                nextQuestionTimeout = setTimeout(() => {
                    loadChatQuestionCard(activeQuiz.currQIdx);
                }, 3000);
            }
        }

        // End Quiz Session
        function endQuizSession() {
            if (timerInterval) clearInterval(timerInterval);
            if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
            
            if (currentGroup && currentGroup.isHost && activeQuiz.running) {
                GroupSyncManager.publishQuizEnd();
                return;
            }
            
            activeQuiz.running = false;
            stickyStatsBar.classList.remove('active');

            // Save attempt question indices for wrong/correct re-play subset
            if (activeQuiz.answersLog && activeQuiz.id) {
                const incorrectIndices = activeQuiz.answersLog.filter(l => !l.isCorrect).map(l => l.qIdx);
                const correctIndices = activeQuiz.answersLog.filter(l => l.isCorrect).map(l => l.qIdx);
                
                const sessionRecord = {
                    quizId: activeQuiz.id,
                    incorrectIndices: incorrectIndices,
                    correctIndices: correctIndices
                };
                localStorage.setItem(`quiz_attempt_${activeQuiz.id}`, JSON.stringify(sessionRecord));
            }

            // Log statistics internally
            localStats.totalAttempts += (activeQuiz.correct + activeQuiz.incorrect);
            localStats.totalCorrect += activeQuiz.correct;
            localStats.totalIncorrect += activeQuiz.incorrect;
            if (activeQuiz.bestStreak > localStats.bestStreakOverall) {
                localStats.bestStreakOverall = activeQuiz.bestStreak;
            }
            localStorage.setItem('local_quiz_stats', JSON.stringify(localStats));

            // Run Badge checks and award achievements
            if (activeQuiz.answersLog) {
                BadgeManager.checkSessionBadges(activeQuiz, activeQuiz.answersLog);
            }

            AudioEngine.fanfare();

            // Prompt user for name (for report card)
            const participantName = prompt("Enter your name for the report card:", "Participant") || "Participant";
            
            // Calculate session result statistics
            const elapsedMs = Date.now() - (activeQuiz.startTime || Date.now());
            const elapsedMin = Math.floor(elapsedMs / 60000);
            const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
            const timeSpent = `${elapsedMin}m ${elapsedSec}s`;
            
            const totalAttempted = activeQuiz.correct + activeQuiz.incorrect;
            const accuracy = totalAttempted > 0 ? (activeQuiz.correct / totalAttempted) * 100 : 0;
            const unattempted = activeQuiz.questions.length - totalAttempted;

            // Calculate average answer time
            let totalTimeSpent = 0;
            if (activeQuiz.answersLog) {
                activeQuiz.answersLog.forEach(l => totalTimeSpent += l.timeSpent);
            }
            const avgSpeed = totalAttempted > 0 ? (totalTimeSpent / totalAttempted).toFixed(1) + 's' : '0.0s';
            const userBadges = BadgeManager.getUserBadges('current');

            const resultData = {
                score: activeQuiz.score,
                correct: activeQuiz.correct,
                incorrect: activeQuiz.incorrect,
                unattempted: unattempted,
                accuracy: accuracy,
                timeSpent: timeSpent,
                avgSpeed: avgSpeed,
                badges: userBadges
            };

            // Trigger downloads automatically
            setTimeout(() => {
                triggerHtmlDownload(activeQuiz);
            }, 100);

            setTimeout(() => {
                generatePdfReport(activeQuiz, participantName, resultData);
            }, 600);

            setTimeout(() => {
                generateAndDownloadVideo(activeQuiz);
            }, 1100);

            setTimeout(() => {
                generateAndDownloadMindmap(activeQuiz);
            }, 1600);

            setTimeout(() => {
                generateAndDownloadFlashcard(activeQuiz);
            }, 2100);

            printMsg('bot', `🏆 <b>Quiz Session Finished!</b>\n\n<b>Quiz:</b> ${activeQuiz.name}\n<b>Final Score:</b> ${activeQuiz.score.toFixed(2)}\n<b>Correct:</b> ${activeQuiz.correct}\n<b>Incorrect:</b> ${activeQuiz.incorrect}\n<b>Best Streak:</b> 🔥 ${activeQuiz.bestStreak}\n\n📥 <i>Report downloads (HTML, PDF, Video, Mindmap, Flashcards) started automatically. If they didn't start, use the buttons below:</i>`, true, [
                { label: "HTML Report 📄", action: () => triggerHtmlDownload(activeQuiz) },
                { label: "PDF Booklet 📕", action: () => generatePdfReport(activeQuiz, participantName, resultData) },
                { label: "Video Simulator 🎬", action: () => generateAndDownloadVideo(activeQuiz) },
                { label: "Mindmap PDF 🗺️", action: () => generateAndDownloadMindmap(activeQuiz) },
                { label: "Flashcards PDF 🎴", action: () => generateAndDownloadFlashcard(activeQuiz) },
                { label: "Show Leaderboard 🥇", command: "/leaderboard" },
                { label: "Stats 📊", command: "/stats" }
            ]);

            // Victory mega win animation
            const accuracy2 = totalAttempted > 0 ? (activeQuiz.correct / totalAttempted) * 100 : 0;
            triggerMegaWin(activeQuiz.score, accuracy2);
        }

        // Custom local confetti
        function triggerOptionConfetti(element) {
            const rect = element.getBoundingClientRect();
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;
            
            confetti({
                particleCount: 20,
                spread: 40,
                origin: { x: x, y: y },
                colors: ['#2481cc', '#4fae5e', '#ec4899']
            });
        }

        function triggerStreakConfetti() {
            confetti({
                particleCount: 70,
                spread: 70,
                origin: { y: 0.65 },
                colors: ['#f59e0b', '#ec4899', '#2481cc']
            });
        }

        // Quiz Deletion with confirmation
        function confirmDeleteQuiz(id) {
            const q = quizzesDb.find(item => item.id === id);
            if (!q) {
                printMsg('bot', "❌ Quiz not found.");
                return;
            }
            
            printMsg('bot', `⚠️ <b>Are you sure you want to delete the quiz "${q.name}" (ID: ${q.id})?</b>`, true, [
                {
                    label: "Yes, Delete ✅",
                    action: () => executeDeleteQuiz(id)
                },
                {
                    label: "No, Cancel ❌",
                    action: () => {
                        printMsg('bot', "Deletion cancelled.");
                    }
                }
            ]);
        }
        
        function executeDeleteQuiz(id) {
            const idx = quizzesDb.findIndex(item => item.id === id);
            if (idx === -1) {
                printMsg('bot', "❌ Quiz not found.");
                return;
            }
            const name = quizzesDb[idx].name;
            quizzesDb.splice(idx, 1);
            saveQuizzesToLocalStorage();
            FirebaseSyncManager.deleteQuizFromCloud(id);
            printMsg('bot', `🗑️ Quiz <b>${name}</b> deleted successfully. Remember to export the HTML file to persist changes!`, true, [
                { label: "List Quizzes 📋", command: "/list" }
            ]);
        }
