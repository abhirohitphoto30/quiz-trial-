        // Bot state
        let creationState = {
            active: false,
            name: '',
            questions: []
        };

        // Active Quiz running states
        let activeQuiz = {
            running: false,
            id: null,
            name: '',
            questions: [],
            currQIdx: 0,
            score: 0,
            streak: 0,
            bestStreak: 0,
            correct: 0,
            incorrect: 0,
            timerLimit: 30,
            initialTimerLimit: 30,
            timeLeft: 30,
            timerRate: 1000, // Tick rate in ms (can be fast or slow)
            isPaused: false,
            lifelines: {
                used5050: false,
                usedPoll: false,
                usedDouble: false
            },
            doubleDipActive: false,
            answersLog: []
        };

        const BADGES = {
            SPEED_DEMON: { id: 'SPEED_DEMON', name: 'Speed Demon', emoji: '⚡', desc: 'Correct answer under 3 seconds' },
            STREAK_MASTER: { id: 'STREAK_MASTER', name: 'Streak Master', emoji: '🔥', desc: 'Streak of 5 or more correct answers' },
            SCHOLAR: { id: 'SCHOLAR', name: 'Scholar', emoji: '🧠', desc: 'Accuracy > 90% in a quiz' },
            EMPEROR: { id: 'EMPEROR', name: 'Emperor', emoji: '👑', desc: 'Score > 95% of max possible score' },
            DEFENDER: { id: 'DEFENDER', name: 'Defender', emoji: '🛡️', desc: 'Answered negative marking questions safely' },
            SUPERSTAR: { id: 'SUPERSTAR', name: 'Superstar', emoji: '🌟', desc: 'Streak of 10 or more correct answers' },
            SNIPER: { id: 'SNIPER', name: 'Sniper', emoji: '🏹', desc: '100% accuracy on a quiz with 5+ questions' },
            ROCKET: { id: 'ROCKET', name: 'Rocket', emoji: '🚀', desc: 'Average answer time < 5 seconds' },
            DIAMOND: { id: 'DIAMOND', name: 'Diamond', emoji: '💎', desc: 'Achieved high score 3 times' },
            PUZZLE_SOLVER: { id: 'PUZZLE_SOLVER', name: 'Puzzle Solver', emoji: '🧩', desc: 'Got hard questions correct' },
            WIZARD: { id: 'WIZARD', name: 'Wizard', emoji: '🧙', desc: 'Viewed explanations 5+ times' },
            LUCKY_CHARM: { id: 'LUCKY_CHARM', name: 'Lucky Charm', emoji: '🍀', desc: 'Correct answer at the last second' },
            BRAVE_HEART: { id: 'BRAVE_HEART', name: 'Brave Heart', emoji: '🦁', desc: 'Attempted all questions without skipping' },
            TACTICIAN: { id: 'TACTICIAN', name: 'Tactician', emoji: '📊', desc: 'Score > 80% on hard quizzes' },
            GRADUATE: { id: 'GRADUATE', name: 'Graduate', emoji: '🎓', desc: 'Finished 10 quizzes' },
            MARKSMAN: { id: 'MARKSMAN', name: 'Marksman', emoji: '🎯', desc: 'Perfect accuracy on at least one quiz' },
            SPRINTER: { id: 'SPRINTER', name: 'Sprinter', emoji: '🏃', desc: 'Answered a question under 2 seconds' },
            WISE_OWL: { id: 'WISE_OWL', name: 'Wise Owl', emoji: '🦉', desc: 'Correct answer with less than 5 seconds left' },
            GLADIATOR: { id: 'GLADIATOR', name: 'Gladiator', emoji: '⚔️', desc: 'Played 5 group matches' },
            PHOENIX: { id: 'PHOENIX', name: '❤️‍🔥', desc: 'Correct answer immediately after a wrong answer' },
            MASTER_KEY: { id: 'MASTER_KEY', name: 'Master Key', emoji: '🔑', desc: 'Found hidden stats or completed all formats' },
            GOLD_MEDALIST: { id: 'GOLD_MEDALIST', name: 'Gold Medalist', emoji: '🏅', desc: 'First place in a group quiz' },
            SILVER_MEDALIST: { id: 'SILVER_MEDALIST', name: 'Silver Medalist', emoji: '🥈', desc: 'Second place in a group quiz' },
            BRONZE_MEDALIST: { id: 'BRONZE_MEDALIST', name: 'Bronze Medalist', emoji: '🥉', desc: 'Third place in a group quiz' },
            CYBORG: { id: 'CYBORG', name: 'Cyborg', emoji: '🤖', desc: 'Zero incorrect answers in a full quiz' }
        };

        const BadgeManager = {
            getUserBadges(userId) {
                if (userId === 'current' || userId === GroupSyncManager.clientId) {
                    try {
                        const list = JSON.parse(localStorage.getItem('unigram_user_badges') || '[]');
                        return list.map(id => BADGES[id]).filter(Boolean);
                    } catch(e) {
                        return [];
                    }
                }
                if (currentGroup) {
                    const member = currentGroup.members.find(m => m.id === userId);
                    if (member && member.badges) {
                        return member.badges.map(id => BADGES[id]).filter(Boolean);
                    }
                }
                return [];
            },
            awardBadge(badgeId) {
                if (!BADGES[badgeId]) return;
                try {
                    const list = JSON.parse(localStorage.getItem('unigram_user_badges') || '[]');
                    if (!list.includes(badgeId)) {
                        list.push(badgeId);
                        localStorage.setItem('unigram_user_badges', JSON.stringify(list));
                        printMsg('bot', `🎉 <b>New Achievement Unlocked!</b><br>You earned the badge: ${BADGES[badgeId].emoji} <b>${BADGES[badgeId].name}</b> (${BADGES[badgeId].desc})`, true);
                        if (FirebaseSyncManager.dbEnabled && FirebaseSyncManager.currentUser) {
                            firebase.database().ref(`users/${FirebaseSyncManager.currentUser.uid}/badges`).set(list);
                        }
                    }
                } catch(e) {}
            },
            checkSessionBadges(session, answersLog) {
                const totalQuestions = session.questions.length;
                const totalAttempted = session.correct + session.incorrect;
                const accuracy = totalAttempted > 0 ? (session.correct / totalAttempted) * 100 : 0;
                
                let hasFast = false;
                let hasSuperFast = false;
                let hasSlowCorrect = false;
                let hasLastSecond = false;
                let hasPhoenix = false;
                let prevWasWrong = false;
                let totalTimeSpent = 0;
                
                answersLog.forEach(log => {
                    totalTimeSpent += log.timeSpent;
                    if (log.isCorrect) {
                        if (log.timeSpent <= 2) hasFast = true;
                        if (log.timeSpent <= 3) hasSuperFast = true;
                        if (log.timeLeft <= 5) hasSlowCorrect = true;
                        if (log.timeLeft === 1) hasLastSecond = true;
                        if (prevWasWrong) hasPhoenix = true;
                        prevWasWrong = false;
                    } else {
                        prevWasWrong = true;
                    }
                });
                
                const avgTime = totalAttempted > 0 ? totalTimeSpent / totalAttempted : 0;
                
                if (hasSuperFast) this.awardBadge('SPEED_DEMON');
                if (session.bestStreak >= 5) this.awardBadge('STREAK_MASTER');
                if (accuracy > 90 && totalQuestions >= 5) this.awardBadge('SCHOLAR');
                
                const maxScore = totalQuestions * marksPositive;
                if (session.score > maxScore * 0.95 && totalQuestions >= 5) this.awardBadge('EMPEROR');
                if (session.incorrect === 0 && session.correct > 0) this.awardBadge('DEFENDER');
                if (session.bestStreak >= 10) this.awardBadge('SUPERSTAR');
                if (accuracy === 100 && totalQuestions >= 5) this.awardBadge('SNIPER');
                if (avgTime < 5 && totalAttempted >= 5) this.awardBadge('ROCKET');
                if (session.correct >= 5) this.awardBadge('PUZZLE_SOLVER');
                if (hasLastSecond) this.awardBadge('LUCKY_CHARM');
                if (totalAttempted === totalQuestions) this.awardBadge('BRAVE_HEART');
                if (accuracy === 100) this.awardBadge('MARKSMAN');
                if (hasFast) this.awardBadge('SPRINTER');
                if (hasSlowCorrect) this.awardBadge('WISE_OWL');
                if (hasPhoenix) this.awardBadge('PHOENIX');
                if (session.incorrect === 0 && totalQuestions >= 5) this.awardBadge('CYBORG');
                
                try {
                    let count = parseInt(localStorage.getItem('completed_quizzes_count') || '0') + 1;
                    localStorage.setItem('completed_quizzes_count', count);
                    if (count >= 1) this.awardBadge('GRADUATE');
                    if (count >= 10) this.awardBadge('GRADUATE');
                } catch(e) {}
            }
        };

        const VoiceEngine = {
            enabledQ: false,
            enabledExp: false,
            selectedVoice: null,
            
            init() {
                const qCheck = document.getElementById('tts-read-q');
                const expCheck = document.getElementById('tts-read-exp');
                
                if (qCheck) {
                    this.enabledQ = localStorage.getItem('tts_read_q') === 'true';
                    qCheck.checked = this.enabledQ;
                    qCheck.addEventListener('change', (e) => {
                        this.enabledQ = e.target.checked;
                        localStorage.setItem('tts_read_q', this.enabledQ);
                        AudioEngine.click();
                        if (this.enabledQ) {
                            this.speak("Voice enabled");
                        } else {
                            window.speechSynthesis.cancel();
                        }
                    });
                }
                
                if (expCheck) {
                    this.enabledExp = localStorage.getItem('tts_read_exp') === 'true';
                    expCheck.checked = this.enabledExp;
                    expCheck.addEventListener('change', (e) => {
                        this.enabledExp = e.target.checked;
                        localStorage.setItem('tts_read_exp', this.enabledExp);
                        AudioEngine.click();
                        if (this.enabledExp) {
                            this.speak("Explanation reader enabled");
                        } else {
                            window.speechSynthesis.cancel();
                        }
                    });
                }
                
                this.selectVoice();
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.onvoiceschanged = () => {
                        this.selectVoice();
                    };
                }
            },
            
            selectVoice() {
                if (typeof window === 'undefined' || !window.speechSynthesis) return;
                const voices = window.speechSynthesis.getVoices();
                let hiVoice = voices.find(v => v.lang.startsWith('hi') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('veena') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('zira')));
                if (!hiVoice) hiVoice = voices.find(v => v.lang.startsWith('hi'));
                
                let enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('samantha')));
                if (!enVoice) enVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
                if (!enVoice) enVoice = voices.find(v => v.lang.startsWith('en'));
                
                this.selectedVoice = hiVoice || enVoice || voices[0];
            },
            
            speak(text) {
                if (typeof window === 'undefined' || !window.speechSynthesis) return;
                window.speechSynthesis.cancel();
                if (!text) return;
                
                let cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
                                    .replace(/✅|❌|😂|🤖|⚙️|🎨|⚡|👑|🎯|🥇|🥈|🥉|🏅|🛡️|🌟|🏹|🚀|💎|🧩|🧙|🍀|🦁|📊|🎓|🏃|🦉|⚔️|🔥|🔑|🤖|👥|📂|🎮|🛠️|📤|💳|📄/g, "")
                                    .replace(/<[^>]*>/g, "")
                                    .trim();
                
                if (!cleanText) return;
                
                const utterance = new SpeechSynthesisUtterance(cleanText);
                if (this.selectedVoice) {
                    utterance.voice = this.selectedVoice;
                }
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
            },
            
            speakQuestion(questionObj) {
                if (!this.enabledQ) return;
                let speakStr = questionObj.question + ". ";
                if (questionObj.options && questionObj.options.length) {
                    questionObj.options.forEach((opt, idx) => {
                        const label = String.fromCharCode(65 + idx);
                        speakStr += `Option ${label}: ${opt.text}. `;
                    });
                }
                this.speak(speakStr);
            },
            
            speakExplanation(explanationStr) {
                if (!this.enabledExp) return;
                this.speak("Explanation: " + explanationStr);
            }
        };
        VoiceEngine.init();
