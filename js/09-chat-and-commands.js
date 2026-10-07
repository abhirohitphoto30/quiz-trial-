        // Scroll helper
        function scrollToBottom() {
            setTimeout(() => {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }, 50);
        }

        // Print message in chat
        function printMsg(sender, text, isHtml = false, customButtons = null) {
            const wrapper = document.createElement('div');
            wrapper.className = `chat-message ${sender}`;
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            if (isHtml) {
                bubble.innerHTML = text;
            } else {
                bubble.innerText = text;
            }
            
            wrapper.appendChild(bubble);

            if (customButtons && Array.isArray(customButtons)) {
                const kb = document.createElement('div');
                kb.className = 'inline-keyboard';
                customButtons.forEach(btn => {
                    const k = document.createElement('button');
                    k.className = 'inline-key';
                    k.innerHTML = btn.label;
                    k.onclick = () => {
                        AudioEngine.click();
                        if (btn.command) {
                            chatInput.value = btn.command;
                            sendMessage();
                        } else if (btn.action) {
                            btn.action();
                        }
                    };
                    kb.appendChild(k);
                });
                wrapper.appendChild(kb);
            }
            
            chatHistory.appendChild(wrapper);
            scrollToBottom();
            return wrapper;
        }

        // Action menu command
        function sendMenuCommand(command) {
            chatInput.value = command;
            sendMessage();
        }

        // Send chat message
        function sendMessage() {
            const raw = chatInput.value.trim();
            if (!raw) return;

            chatInput.value = '';
            AudioEngine.click();

            if (currentGroup && !raw.startsWith('/')) {
                GroupSyncManager.sendChatMessage(raw);
            } else {
                printMsg('user', raw);
                // Process text as bot command
                processCommand(raw);
            }
        }

        // Command Routing System
        function processCommand(input) {
            const args = input.split(' ');
            const cmd = args[0].toLowerCase();
            const param = args.slice(1).join(' ').trim();

            // Status checks
            if (activeQuiz.running && !['/stop', '/pause', '/resume', '/skip', '/slow', '/fast', '/normal', '/result', '/leaderboard', '/pdf', '/html', '/stats', '/theme', '/video', '/mindmap', '/flashcard'].includes(cmd)) {
                printMsg('bot', "⚠️ A quiz is currently active! Please finish it, skip, or send `/stop` to end it before executing other commands.");
                return;
            }

            switch(cmd) {
                case '/start':
                    if (param) {
                        // Start quiz directly with id parameter
                        initiateQuizFlow(param);
                    } else {
                        printMsg('bot', "<b>🚀Welcome to Advance Quiz Bot🚀!</b> 🤖<br><br>\n\nI can create, host, and simulate premium Telegram Group tests.\n\nType <b>/help</b> to see all instructions or send <b>/create</b> to launch a new quiz creation session.<b>🎯 Create Quizzes</b><br><b>🧠 Practice MCQs</b><br><b>🏆 Compete & Improve</b><br><b>📊 Track Performance</b><br><b>📄 Convert PDFs to Quiz Format</b><br><br>━━━━━━━━━━━━━━━━━━━━<br><br><b>✨ WHAT I CAN DO ✨</b><br><br><b>📚 Create Unlimited Quizzes</b><br><b>⚡ Instant Quiz Hosting</b><br><b>🎮 Interactive Quiz Experience</b><br><b>📈 Performance Analytics</b><br><b>🏅 Leaderboards & Rankings</b><br><b>📄 PDF & HTML Exports</b><br><b>🤖 Automatic Quiz Generation</b><br><br>━━━━━━━━━━━━━━━━━━━━<br><br><b>📝 QUIZ FORMAT SAMPLE</b><br><br>Q1.With reference to the Sudan Virus Disease (SVD), consider the following statements:<br>1. Sudan Virus belongs to the same family as Ebola Virus .<br>2. SVD spreads when an infected person breathes out droplets and very small particles that contain the virus.<br>3. No effective antiviral and vaccine are available for SVD.<br>How many of the statements given above are correct?<br>😂<br>Only one<br>Only two ✅<br>All three<br>None<br>Ex: Context: Recently, the Ugandan Government and the WHO confirmed an outbreak of Sudan virus disease.<br><br>Q2.Consider the following pairs: Desert Continent<br>1. Atacama Desert : Africa<br>2. Great Victoria Desert : Australia<br>3. Sonoran Desert : North America<br>How many of the above pairs are correctly matched?<br>😂<br>Only one ✅<br>Only two<br>All three<br>None<br>Ex: Deserts are regions of scanty rainfall which may be hot deserts of Saharan type<br><br>Q3. Who is known as the Father of the Indian Constitution?<br>😂<br>Mahatma Gandhi<br>Dr. B. R. Ambedkar ✅<br>Jawaharlal Nehru<br>Sardar Patel<br>Ex: Dr. B. R. Ambedkar was the Chairman of the Drafting Committee of the Indian Constitution.<br><br>━━━━━━━━━━━━━━━━━━━━<br><br><b>⚠️ IMPORTANT RULES</b><br><br>✅ Start every question with Q1., Q2., Q3. etc.<br>✅ Use 😂 to separate Question & Options.<br>✅ Mark the Correct Option using ✅.<br>✅ Start Explanation with Ex:<br>✅ Upload TXT file after creating a quiz.<br><br>━━━━━━━━━━━━━━━━━━━━<br><br><b>📌 MAIN COMMANDS</b><br><br>🚀 <b>/create</b> → Create Quiz<br>📚 <b>/myquizzes</b> → View Quizzes<br>🎮 <b>/quiz [Quiz ID]</b> → Start Quiz<br>📊 <b>/stats</b> → Statistics<br>🏆 <b>/leaderboard</b> → Rankings<br>❓ <b>/help</b> → Command Guide<br><br>━━━━━━━━━━━━━━━━━━━━<br><br><b>🔥 Ready to become a Quiz Master? 🔥</b><br>👉 Type <b>/create</b> to create your first quiz now!<br><b>🏆 Learn • Practice • Compete • Succeed 🏆</b>", true, [
                            { label: "Create Quiz ➕", command: "/create" },
                            { label: "List Quizzes 📋", command: "/list" },
                            { label: "Help ℹ️", command: "/help" }
                        ]);
                    }
                    break;

                case '/help':
    let helpText = "<b>List of Available Commands:</b><br><br>";
    for(let key in COMMAND_LIST) {
        helpText += `<b>/${key}</b> - ${COMMAND_LIST[key]}<br>`;
    }
    printMsg('bot', helpText, true);
    break;

                case '/settings':
                    openSettingsModal();
                    printMsg('bot', "⚙️ Opened Database Settings Modal. You can override the default Firebase configuration here.");
                    break;

                case '/wallpaper':
                    openWallpaperModal();
                    printMsg('bot', "🎨 Default Anime wallpaper is active.");
                    break;

                case '/create':
                    if (creationState.active) {
                        printMsg('bot', "⚠️ You are already in a creation session! Upload a file or complete it with `/done`.");
                        break;
                    }
                    creationState = { active: true, name: '', questions: [] };
                    printMsg('bot', "✍️ <b>Enter Quiz Name:</b>\nPlease type the name for your new quiz:");
                    break;

                case '/done':
                    if (!creationState.active) {
                        printMsg('bot', "⚠️ No active creation session in progress. Send `/create` first.");
                        break;
                    }
                    if (!creationState.name) {
                        printMsg('bot', "⚠️ You must set a name for the quiz first.");
                        break;
                    }
                    if (creationState.questions.length === 0) {
                        printMsg('bot', "⚠️ No questions imported yet. Please upload a `.txt` file.");
                        break;
                    }
                    
                    // Generate Unique Quiz ID
                    const newId = Math.floor(100000 + Math.random() * 900000).toString();
                    const newQuizObj = {
                        id: newId,
                        name: creationState.name,
                        questions: creationState.questions
                    };
                    
                    // Save to memory DB
                    quizzesDb.push(newQuizObj);
                    // Save to LocalStorage
                    saveQuizzesToLocalStorage();
                    // Sync to Firebase Cloud
                    FirebaseSyncManager.pushQuizToCloud(newQuizObj);
                    
                    creationState.active = false;
                    
                    printMsg('bot', `🎉 <b>Quiz Created Successfully!</b>\n\n<b>Name:</b> ${newQuizObj.name}\n<b>ID:</b> <code>${newId}</code>\n<b>Questions:</b> ${newQuizObj.questions.length}\n\nLaunch this session by sending:\n<code>/quiz ${newId}</code>\n\n<i>⚠️ Click the <b>Save & Export HTML</b> button in the sidebar to persist it in your physical HTML file!</i>`, true, [
                        { label: "Play Quiz ⚡", command: `/quiz ${newId}` },
                        { label: "List Quizzes 📋", command: "/list" }
                    ]);
                    break;

                case '/cancel':
                    if (creationState.active) {
                        creationState.active = false;
                        printMsg('bot', "❌ Quiz creation discarded.");
                    } else {
                        printMsg('bot', "No active creation session to cancel.");
                    }
                    break;

                case '/list':
                case '/myquizzes':
                    if (quizzesDb.length === 0) {
                        printMsg('bot', "📭 No quizzes created yet. Send `/create` to start the first one!");
                        break;
                    }
                    let listText = "📋 <b>Available Quizzes:</b>\n\n";
                    quizzesDb.forEach((q, idx) => {
                        listText += `${idx+1}. <b>${q.name}</b> (ID: <code>${q.id}</code>) - ${q.questions.length} Qs\n`;
                    });
                    
                    const buttons = [];
                    quizzesDb.forEach(q => {
                        buttons.push({
                            label: `Play ${q.name} ⚡`,
                            command: `/quiz ${q.id}`
                        });
                        buttons.push({
                            label: `Delete 🗑️`,
                            action: () => confirmDeleteQuiz(q.id)
                        });
                    });
                    printMsg('bot', listText, true, buttons);
                    break;

                case '/info':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/info 123456`");
                        break;
                    }
                    const qObj = quizzesDb.find(q => q.id === param);
                    if (!qObj) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `ℹ️ <b>Quiz Details:</b>\n\n<b>Name:</b> ${qObj.name}\n<b>ID:</b> <code>${qObj.id}</code>\n<b>Total Qs:</b> ${qObj.questions.length}`, true, [
                            { label: "Play ⚡", command: `/quiz ${qObj.id}` },
                            { label: "Delete 🗑️", command: `/delete ${qObj.id}` }
                        ]);
                    }
                    break;

                case '/delete':
                case '/del':
                    if (!param) {
                        printMsg('bot', "⚠️ Specify the Quiz ID to delete. Example: `/delete 123456`");
                        break;
                    }
                    const idx = quizzesDb.findIndex(q => q.id === param);
                    if (idx === -1) {
                        printMsg('bot', "❌ Quiz ID not found.");
                    } else {
                        const name = quizzesDb[idx].name;
                        quizzesDb.splice(idx, 1);
                        saveQuizzesToLocalStorage();
                        FirebaseSyncManager.deleteQuizFromCloud(param);
                        printMsg('bot', `🗑️ Quiz <b>${name}</b> deleted successfully. Remember to export the HTML file to persist changes!`, true);
                    }
                    break;

                case '/add':
                    if (!param) {
                        printMsg('bot', "🔑 <b>Authorize Paid Quiz:</b>\nUsage: <code>/add [username/group_id]</code>\nThis authorizes a group/user to access paid quizzes.", true);
                    } else {
                        printMsg('bot', `✅ Authorized <b>${param}</b> successfully for Paid Quiz access.`, true);
                    }
                    break;

                case '/rem':
                    if (!param) {
                        printMsg('bot', "❌ <b>Remove Paid Quiz Authorization:</b>\nUsage: <code>/rem [username/group_id]</code>", true);
                    } else {
                        printMsg('bot', `✅ Removed Paid Quiz authorization for <b>${param}</b>.`, true);
                    }
                    break;

                case '/remall':
                    printMsg('bot', "🧹 <b>Clear All Paid Authorizations:</b>\nCleared all authorized users/groups.", true);
                    break;

                case '/edit':
                    if (!param) {
                        printMsg('bot', "⚠️ Specify the Quiz ID. Example: `/edit 123456`");
                        break;
                    }
                    const target = quizzesDb.find(q => q.id === param);
                    if (!target) {
                        printMsg('bot', "❌ Quiz ID not found.");
                    } else {
                        creationState = { active: true, name: target.name, questions: target.questions, editId: target.id };
                        printMsg('bot', `✏️ Editing Quiz (ID: <code>${target.id}</code>). Current name is <b>${target.name}</b>. Type the new name now:`, true);
                    }
                    break;

                case '/features':
                    printMsg('bot', "🌟 <b>Interactive Gamified Features:</b>\n\n" +
                                    "• <b>Real-time sound engine</b> synthesized directly in browser\n" +
                                    "• <b>Custom canvas confetti explosions</b> for streaks and victories\n" +
                                    "• <b>Floating points (+/- score)</b> appearing dynamic relative to choice cursor\n" +
                                    "• <b>Time Adjustments</b>: +/- 5 seconds during execution\n" +
                                    "• <b>Per-question countdowns</b> causing immediate scroll skips on timeouts\n" +
                                    "• <b>Self-contained exports</b>: Embeds the entire database inside the single HTML page!", true);
                    break;

                case '/stats':
                    openStatsPanel();
                    break;

                case '/quiz':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/quiz 123456`");
                        break;
                    }
                    initiateQuizFlow(param);
                    break;

                case '/wrong':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/wrong 123456`");
                        break;
                    }
                    initiateSubsetQuizFlow(param, 'wrong');
                    break;

                case '/correct':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/correct 123456`");
                        break;
                    }
                    initiateSubsetQuizFlow(param, 'correct');
                    break;

                case '/revise':
                    initiateReviseMode();
                    break;

                case '/random': {
                    const mins = parseInt(param) || 5;
                    initiateBlitzMode(mins);
                    break;
                }

                case '/survival':
                    initiateSurvivalMode();
                    break;

                case '/marathon': {
                    const mCount = parseInt(param) || 20;
                    initiateMarathonMode(mCount);
                    break;
                }

                case '/timer': {
                    // /timer [quizId] [time]
                    const tArgs = param.split(' ');
                    const tQuizId = tArgs[0];
                    const tTime = tArgs.slice(1).join(' ');
                    if (!tQuizId || !tTime) {
                        document.getElementById('sched-modal').classList.add('active');
                        printMsg('bot', '⏰ Opening scheduler... Enter Quiz ID and time in the popup.', true);
                    } else {
                        scheduleQuiz(tQuizId, tTime);
                    }
                    break;
                }

                case '/theme': {
                    const themes = ['anime'];
                    const t = param.toLowerCase();
                    if (!t || !themes.includes(t)) {
                        printMsg('bot', `🌈 Available themes: <b>${themes.join(', ')}</b><br>Usage: <code>/theme anime</code>`, true);
                        break;
                    }
                    document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
                    document.body.classList.add('theme-' + t);
                    localStorage.setItem('ui_theme', t);
                    reinitParticles();
                    printMsg('bot', `🌈 Theme switched to <b>${t.charAt(0).toUpperCase() + t.slice(1)}</b>!`, true);
                    break;
                }

                case '/stop':
                    if (activeQuiz.running) {
                        endQuizSession();
                    } else {
                        printMsg('bot', "No active quiz to stop.");
                    }
                    break;

                case '/pause':
                    if (activeQuiz.running && !activeQuiz.isPaused) {
                        activeQuiz.isPaused = true;
                        printMsg('bot', "⏸️ Quiz timer paused.");
                    } else {
                        printMsg('bot', "Timer is already paused or no quiz is active.");
                    }
                    break;

                case '/resume':
                    if (activeQuiz.running && activeQuiz.isPaused) {
                        activeQuiz.isPaused = false;
                        printMsg('bot', "▶️ Quiz timer resumed.");
                    } else {
                        printMsg('bot', "Timer is not paused or no quiz is active.");
                    }
                    break;

                case '/skip':
                    if (activeQuiz.running) {
                        printMsg('bot', "⏩ Current question skipped.");
                        clearInterval(timerInterval);
                        processTimeout();
                    } else {
                        printMsg('bot', "No active quiz running.");
                    }
                    break;

                case '/slow':
                    if (activeQuiz.running) {
                        activeQuiz.timeLeft += 5;
                        activeQuiz.timerLimit += 5;
                        runRunningTimer();
                        updateStickyStats();
                        printMsg('bot', `🐢 Added 5 seconds to timer. Current question time: ${activeQuiz.timeLeft}s. New quiz timer limit: ${activeQuiz.timerLimit}s.`);
                    }
                    break;

                case '/fast':
                    if (activeQuiz.running) {
                        activeQuiz.timeLeft = Math.max(1, activeQuiz.timeLeft - 5);
                        activeQuiz.timerLimit = Math.max(5, activeQuiz.timerLimit - 5);
                        runRunningTimer();
                        updateStickyStats();
                        printMsg('bot', `⚡ Subtracted 5 seconds from timer. Current question time: ${activeQuiz.timeLeft}s. New quiz timer limit: ${activeQuiz.timerLimit}s.`);
                        if (activeQuiz.timeLeft <= 0) {
                            clearInterval(timerInterval);
                            processTimeout();
                        }
                    }
                    break;

                case '/normal':
                    if (activeQuiz.running) {
                        activeQuiz.timerLimit = activeQuiz.initialTimerLimit || 30;
                        activeQuiz.timeLeft = activeQuiz.timerLimit;
                        activeQuiz.timerRate = 1000;
                        runRunningTimer();
                        updateStickyStats();
                        printMsg('bot', `⏱️ Reset timer limit to initial ${activeQuiz.timerLimit}s and tick rate to normal.`);
                    }
                    break;

                case '/leaderboard':
                    showMockLeaderboard();
                    break;

                case '/result':
                    if (activeQuiz.running) {
                        printMsg('bot', `📊 <b>Current Live Progress:</b>\n` +
                                        `• Score: ${activeQuiz.score.toFixed(2)}\n` +
                                        `• Correct: ${activeQuiz.correct}\n` +
                                        `• Incorrect: ${activeQuiz.incorrect}`, true);
                    } else {
                        printMsg('bot', "No active quiz session. Play one first!");
                    }
                    break;

                case '/compare':
                    printMsg('bot', "👥 Comparing stats with rival <b>@PolityKing</b>:\n\n" +
                                    `• <b>You:</b> Correct: ${localStats.totalCorrect} | Max Streak: ${localStats.bestStreakOverall}\n` +
                                    `• <b>@PolityKing:</b> Correct: 142 | Max Streak: 🔥 12\n\nKeep practicing to beat the master!`, true);
                    break;

                case '/check':
                    printMsg('bot', "⚙️ <b>System Diagnostics:</b>\n\n• Audio Context: active\n• LocalStorage space: OK\n• Canvas Confetti: loaded\n• Database status: healthy", true);
                    break;

                case '/cleanup':
                    printMsg('bot', "🧹 Forcing session cleanup. Resetting memory stacks.");
                    if (timerInterval) clearInterval(timerInterval);
                    activeQuiz.running = false;
                    stickyStatsBar.classList.remove('active');
                    break;

                case '/pdf':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/pdf 123456`");
                        break;
                    }
                    const pdfQuiz = quizzesDb.find(q => q.id === param);
                    if (!pdfQuiz) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `📄 Generating and downloading PDF for <b>${pdfQuiz.name}</b>...`, true);
                        generateAndDownloadPdf(pdfQuiz);
                    }
                    break;

                case '/html':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/html 123456`");
                        break;
                    }
                    const htmlQuiz = quizzesDb.find(q => q.id === param);
                    if (!htmlQuiz) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `🌐 Generating and downloading HTML for <b>${htmlQuiz.name}</b>...`, true);
                        generateAndDownloadHtml(htmlQuiz);
                    }
                    break;

                case '/video':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/video 123456`");
                        break;
                    }
                    const videoQuiz = quizzesDb.find(q => q.id === param);
                    if (!videoQuiz) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `🎬 Generating and downloading Classroom Video HTML for <b>${videoQuiz.name}</b>...`, true);
                        generateAndDownloadVideo(videoQuiz);
                    }
                    break;

                case '/mindmap':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/mindmap 123456`");
                        break;
                    }
                    const mindmapQuiz = quizzesDb.find(q => q.id === param);
                    if (!mindmapQuiz) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `🗺️ Generating and downloading Mindmap PDF for <b>${mindmapQuiz.name}</b>...`, true);
                        generateAndDownloadMindmap(mindmapQuiz);
                    }
                    break;

                case '/flashcard':
                    if (!param) {
                        printMsg('bot', "⚠️ Please specify a Quiz ID. Example: `/flashcard 123456`");
                        break;
                    }
                    const flashcardQuiz = quizzesDb.find(q => q.id === param);
                    if (!flashcardQuiz) {
                        printMsg('bot', `❌ Quiz with ID <code>${param}</code> not found!`, true);
                    } else {
                        printMsg('bot', `🎴 Generating and downloading Flashcards PDF for <b>${flashcardQuiz.name}</b>...`, true);
                        generateAndDownloadFlashcard(flashcardQuiz);
                    }
                    break;

                case '/vajiram':
                case '/vision':
                case '/sfg':
                case '/pw':
                    initiatePdfConverterFlow(cmd.slice(1));
                    break;

                default:
                    // Text handler (useful during quiz creation states)
                    handleTextResponse(input);
                    break;
            }
        }

        // In-chat text inputs
        function handleTextResponse(text) {
            if (creationState.active) {
                if (!creationState.name) {
                    creationState.name = text;
                    printMsg('bot', `Name set to: <b>${text}</b>\n\nChoose an option below to add questions to your quiz:`, true, [
                        { label: "Upload TXT(s) 📎", action: triggerFileUpload },
                        { label: "Open Creator UI ✍️", action: openQuizCreatorModal },
                        { label: "Done & Save 💾", command: "/done" },
                        { label: "Cancel ❌", command: "/cancel" }
                    ]);
                } else {
                    // Raw paste fallback
                    if (parseQuizFile(text)) {
                        creationState.questions = [...creationState.questions, ...parsedQuestions];
                        printMsg('bot', `📥 Successfully parsed and appended <b>${parsedQuestions.length} questions</b> from text input! Current total: <b>${creationState.questions.length} questions</b>.`, true, [
                            { label: "Upload TXT(s) 📎", action: triggerFileUpload },
                            { label: "Open Creator UI ✍️", action: openQuizCreatorModal },
                            { label: "Done & Save 💾", command: "/done" },
                            { label: "Cancel ❌", command: "/cancel" }
                        ]);
                    } else {
                        printMsg('bot', `⚠️ No questions parsed from text input. Current total: <b>${creationState.questions.length} questions</b>. You can add more questions:`, true, [
                            { label: "Upload TXT(s) 📎", action: triggerFileUpload },
                            { label: "Open Creator UI ✍️", action: openQuizCreatorModal },
                            { label: "Done & Save 💾", command: "/done" },
                            { label: "Cancel ❌", command: "/cancel" }
                        ]);
                    }
                }
            } else {
                printMsg('bot', `⚠️ Unknown command <b>${text}</b>. Send <b>/help</b> to see valid triggers.`, true);
            }
        }

        // File upload trigger helper supporting Multiple & Sequential Uploads
        function triggerFileUpload() {
            let input = document.getElementById('temp-file-input');
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'temp-file-input';
                input.multiple = true;
                input.accept = '.txt';
                input.style.display = 'none';
                document.body.appendChild(input);
            } else {
                input.multiple = true;
            }
            
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    let totalParsed = 0;
                    let filesParsed = 0;
                    
                    for (const file of files) {
                        try {
                            const content = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = (evt) => resolve(evt.target.result);
                                reader.onerror = (evt) => reject(evt.target.error);
                                reader.readAsText(file);
                            });
                            
                            if (parseQuizFile(content)) {
                                creationState.questions = [...creationState.questions, ...parsedQuestions];
                                totalParsed += parsedQuestions.length;
                                filesParsed++;
                            }
                        } catch (err) {
                            console.error(`Failed to read file ${file.name}:`, err);
                        }
                    }
                    
                    if (filesParsed > 0) {
                        printMsg('bot', `📥 Successfully parsed <b>${totalParsed} questions</b> from <b>${filesParsed} files</b>.\n\nCurrent total: <b>${creationState.questions.length} questions</b>. Send <b>/done</b> to save the quiz.`, true, [
                            { label: "Upload TXT(s) 📎", action: triggerFileUpload },
                            { label: "Open Creator UI ✍️", action: openQuizCreatorModal },
                            { label: "Done & Save 💾", command: "/done" },
                            { label: "Cancel ❌", command: "/cancel" }
                        ]);
                    } else {
                        printMsg('bot', "⚠️ No questions parsed from the selected files. Make sure they match standard formatting structure.", true, [
                            { label: "Upload TXT(s) 📎", action: triggerFileUpload },
                            { label: "Open Creator UI ✍️", action: openQuizCreatorModal },
                            { label: "Cancel ❌", command: "/cancel" }
                        ]);
                    }
                }
                // Reset input value to allow re-upload of the same file
                input.value = '';
            };
            
            input.click();
        }
