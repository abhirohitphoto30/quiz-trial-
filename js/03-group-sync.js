        const GroupSyncManager = {
            clientId: 'client_' + Math.floor(Math.random() * 1000000),
            topics: {},
            
            get isFirebaseMode() {
                return FirebaseSyncManager.dbEnabled;
            },

            init() {
                // Check if there is a group parameter in URL
                const urlParams = new URLSearchParams(window.location.search);
                const groupId = urlParams.get('group');
                if (groupId) {
                    setTimeout(() => {
                        this.promptJoinGroup(groupId);
                    }, 800);
                }
                this.loadPersistedGroups();
            },
            
            promptJoinGroup(groupId) {
                document.getElementById('join-group-prompt-text').innerHTML = `You have been invited to join the Group (ID: <code>${groupId}</code>).<br>Enter your nickname to join:`;
                document.getElementById('join-nickname-input').value = localStorage.getItem('group_nickname') || '';
                const modal = document.getElementById('join-group-modal');
                modal.dataset.groupId = groupId;
                modal.classList.add('active');
            },
            
            createGroup(name, nickname) {
                const groupId = 'grp_' + Math.random().toString(36).substr(2, 9) + '_' + Math.floor(Math.random() * 100);
                localStorage.setItem('group_nickname', nickname);
                
                currentGroup = {
                    id: groupId,
                    name: name,
                    isHost: true,
                    myMemberId: this.clientId,
                    myNickname: nickname,
                    members: [{
                        id: this.clientId,
                        name: nickname,
                        score: 0,
                        correct: 0,
                        incorrect: 0,
                        streak: 0,
                        isOnline: true,
                        isHost: true
                    }]
                };
                
                this.saveGroupToLocalStorage(groupId, name, true, nickname);
                
                this.connect(groupId, () => {
                    this.updateGroupUI();
                    
                    if (this.isFirebaseMode) {
                        const initialMemberObj = {};
                        initialMemberObj[this.clientId] = {
                            id: this.clientId,
                            name: nickname,
                            score: 0,
                            correct: 0,
                            incorrect: 0,
                            streak: 0,
                            isOnline: true,
                            isHost: true
                        };
                        
                        this.fbRefs.group.set({
                            meta: {
                                id: groupId,
                                name: name,
                                hostId: this.clientId,
                                hostNickname: nickname
                            },
                            members: initialMemberObj,
                            control: { type: 'CREATED', senderId: this.clientId },
                            chat: {}
                        });
                    }

                    printMsg('bot', `🎉 <b>Group "${name}" Created!</b><br><br>Share this link with your friends to invite them:<br><code>${this.getInviteLink()}</code><br><br>Use the sidebar to manage the group, or start a quiz!`, true, [
                        { label: "Copy Invite Link 🔗", action: () => copyGroupInviteLink() }
                    ]);
                });
            },
            
            joinGroup(groupId, nickname) {
                localStorage.setItem('group_nickname', nickname);
                
                currentGroup = {
                    id: groupId,
                    name: 'Loading group...',
                    isHost: false,
                    myMemberId: this.clientId,
                    myNickname: nickname,
                    members: [{
                        id: this.clientId,
                        name: nickname,
                        score: 0,
                        correct: 0,
                        incorrect: 0,
                        streak: 0,
                        isOnline: true,
                        isHost: false
                    }]
                };
                
                this.connect(groupId, () => {
                    this.updateGroupUI();
                    
                    if (this.isFirebaseMode) {
                        const myMemberInfo = {
                            id: this.clientId,
                            name: nickname,
                            score: 0,
                            correct: 0,
                            incorrect: 0,
                            streak: 0,
                            isOnline: true,
                            isHost: false
                        };
                        this.fbRefs.members.child(this.clientId).set(myMemberInfo);
                        
                        this.fbRefs.chat.push({
                            senderId: 'system',
                            senderName: 'System',
                            text: `📢 <b>${nickname}</b> joined the group!`,
                            timestamp: Date.now()
                        });
                        
                        this.fbRefs.control.once('value').then(snapshot => {
                            const control = snapshot.val();
                            if (control && control.type === 'START_QUIZ' && !activeQuiz.running) {
                                return this.fbRefs.group.child('activeQuizState').once('value');
                            }
                        }).then(quizStateSnap => {
                            if (quizStateSnap && quizStateSnap.exists()) {
                                const state = quizStateSnap.val();
                                if (state && state.running) {
                                    this.syncActiveQuizState(state);
                                }
                            }
                        });
                        
                        printMsg('bot', `🔌 Connected to group chat via Cloud Database...`);
                    } else {
                        // Publish JOIN message
                        this.publish('control', {
                            type: 'JOIN',
                            memberId: this.clientId,
                            name: nickname
                        });
                        printMsg('bot', `🔌 Connecting to group chat...`);
                    }
                });
            },
            
            connect(groupId, onConnectCallback) {
                if (mqttClient) {
                    try { mqttClient.end(); } catch(e) {}
                    mqttClient = null;
                }
                
                this.topics = {
                    control: `unigram/quizbot/groups/${groupId}/control`,
                    chat: `unigram/quizbot/groups/${groupId}/chat`,
                    responses: `unigram/quizbot/groups/${groupId}/responses`
                };
                
                if (this.isFirebaseMode) {
                    console.log('Connecting to Firebase Database for group sync');
                    
                    this.fbRefs = {
                        group: firebase.database().ref(`groups/${groupId}`),
                        meta: firebase.database().ref(`groups/${groupId}/meta`),
                        members: firebase.database().ref(`groups/${groupId}/members`),
                        chat: firebase.database().ref(`groups/${groupId}/chat`),
                        control: firebase.database().ref(`groups/${groupId}/control`),
                        responses: firebase.database().ref(`groups/${groupId}/responses`)
                    };
                    
                    // Listen to meta
                    this.fbRefs.meta.on('value', (snapshot) => {
                        const meta = snapshot.val();
                        if (meta && currentGroup && !currentGroup.isHost) {
                            currentGroup.name = meta.name;
                            this.updateGroupUI();
                        }
                    });
                    
                    // Listen to members
                    this.fbRefs.members.on('value', (snapshot) => {
                        const membersVal = snapshot.val();
                        if (membersVal && currentGroup) {
                            const newMembers = [];
                            const mySelf = currentGroup.members.find(m => m.id === this.clientId);
                            
                            Object.keys(membersVal).forEach(mId => {
                                const m = membersVal[mId];
                                newMembers.push(m);
                            });
                            
                            if (mySelf && !newMembers.some(m => m.id === this.clientId)) {
                                newMembers.push(mySelf);
                            }
                            
                            currentGroup.members = newMembers;
                            this.updateGroupUI();
                        }
                    });
                    
                    // Listen to chat (only new messages)
                    const connectTime = Date.now();
                    this.fbRefs.chat.orderByChild('timestamp').startAt(connectTime).on('child_added', (snapshot) => {
                        const msg = snapshot.val();
                        if (msg && msg.senderId !== this.clientId) {
                            printMsg('other-user', `<b>${msg.senderName}:</b> ${msg.text}`, false);
                            AudioEngine.play(600, 'sine', 0.05, 0.02);
                        }
                    });
                    
                    // Listen to control
                    this.fbRefs.control.on('value', (snapshot) => {
                        const msg = snapshot.val();
                        if (msg && msg.senderId !== this.clientId) {
                            this.handleControlMessage(msg);
                        }
                    });
                    
                    if (onConnectCallback) onConnectCallback();
                } else {
                    // Connect to HiveMQ Public Secure WebSocket MQTT Broker
                    mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
                        clientId: this.clientId,
                        keepalive: 60,
                        clean: true
                    });
                    
                    mqttClient.on('connect', () => {
                        console.log('Connected to MQTT Broker');
                        mqttClient.subscribe(Object.values(this.topics), (err) => {
                            if (!err) {
                                console.log('Subscribed to all group topics');
                                if (onConnectCallback) onConnectCallback();
                            } else {
                                printMsg('bot', `❌ Failed to subscribe to group topics: ${err.message}`);
                            }
                        });
                    });
                    
                    mqttClient.on('message', (topic, message) => {
                        try {
                            const payload = JSON.parse(message.toString());
                            this.handleMessage(topic, payload);
                        } catch (e) {
                            console.error('Error handling MQTT message:', e);
                        }
                    });
                    
                    mqttClient.on('error', (err) => {
                        console.error('MQTT Error:', err);
                        printMsg('bot', `⚠️ Real-Time Sync Connection Error. Trying to reconnect...`);
                    });
                }
            },
            
            publish(channelKey, payload) {
                if (this.isFirebaseMode) {
                    if (!this.fbRefs) return;
                    
                    if (!payload.senderId) {
                        payload.senderId = this.clientId;
                    }
                    
                    if (channelKey === 'control') {
                        this.fbRefs.control.set(payload);
                    } else if (channelKey === 'chat') {
                        payload.timestamp = Date.now();
                        this.fbRefs.chat.push(payload);
                    } else if (channelKey === 'responses') {
                        this.fbRefs.responses.child(payload.memberId).set(payload);
                    }
                } else {
                    if (mqttClient && mqttClient.connected) {
                        const topic = this.topics[channelKey];
                        if (topic) {
                            mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
                        }
                    }
                }
            },
            
            handleMessage(topic, payload) {
                // Ignore messages sent by self
                if (payload.senderId === this.clientId) {
                    return;
                }
                
                if (topic === this.topics.chat) {
                    printMsg('other-user', `<b>${payload.senderName}:</b> ${payload.text}`, false);
                    AudioEngine.play(600, 'sine', 0.05, 0.02);
                } else if (topic === this.topics.control) {
                    this.handleControlMessage(payload);
                } else if (topic === this.topics.responses) {
                    this.handleResponseMessage(payload);
                }
            },
            
            handleControlMessage(msg) {
                switch(msg.type) {
                    case 'JOIN':
                        if (currentGroup.isHost) {
                            let member = currentGroup.members.find(m => m.id === msg.memberId);
                            if (!member) {
                                member = {
                                    id: msg.memberId,
                                    name: msg.name,
                                    score: 0,
                                    correct: 0,
                                    incorrect: 0,
                                    streak: 0,
                                    isOnline: true,
                                    isHost: false
                                };
                                currentGroup.members.push(member);
                            } else {
                                member.isOnline = true;
                            }
                            
                            this.sendWelcomeMessage();
                            printMsg('bot', `📢 <b>${msg.name}</b> joined the group!`, true);
                            this.updateGroupUI();
                        }
                        break;
                        
                    case 'WELCOME':
                        if (!currentGroup.isHost) {
                            currentGroup.name = msg.groupName;
                            const mySelf = currentGroup.members.find(m => m.id === this.clientId);
                            currentGroup.members = [mySelf];
                            
                            msg.members.forEach(m => {
                                if (m.id !== this.clientId) {
                                    currentGroup.members.push(m);
                                }
                            });
                            
                            this.updateGroupUI();
                            // Save to local storage for persistence
                            this.saveGroupToLocalStorage(currentGroup.id, msg.groupName, false, currentGroup.myNickname);
                            
                            document.getElementById('bot-status-subtext').innerHTML = `Group Chat: <b>${currentGroup.name}</b>`;
                            
                            if (msg.activeQuizState && msg.activeQuizState.running && !activeQuiz.running) {
                                this.syncActiveQuizState(msg.activeQuizState);
                            }
                        }
                        break;
                        
                    case 'LEAVE':
                        let leavingMem = currentGroup.members.find(m => m.id === msg.memberId);
                        if (leavingMem) {
                            leavingMem.isOnline = false;
                            printMsg('bot', `📢 <b>${leavingMem.name}</b> left the group.`, true);
                            this.updateGroupUI();
                        }
                        break;
                        
                    case 'START_QUIZ':
                        if (!currentGroup.isHost) {
                            activeQuiz.id = msg.quizId;
                            activeQuiz.name = msg.quizName;
                            activeQuiz.questions = msg.questions;
                            activeQuiz.timerLimit = msg.timerLimit;
                            activeQuiz.initialTimerLimit = msg.timerLimit;
                            marksPositive = msg.marksPositive;
                            marksNegative = msg.marksNegative;
                            
                            printMsg('bot', `🎬 <b>Group Quiz Started by Host!</b><br><b>Title:</b> ${msg.quizName}<br><b>Questions:</b> ${msg.questions.length}<br><b>Timer:</b> ${msg.timerLimit}s<br><br><i>Prepare to battle... 🧠</i>`, true);
                            
                            stickyStatsBar.classList.add('active');
                            
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
                            
                            updateStickyStats();
                        }
                        break;
                        
                    case 'QUESTION':
                        if (!currentGroup.isHost && activeQuiz.running) {
                            const targetIdx = msg.idx;
                            if (timerInterval) clearInterval(timerInterval);
                            if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
                            
                            activeQuiz.currQIdx = targetIdx;
                            loadChatQuestionCard(targetIdx);
                        }
                        break;

                    case 'MID_LEADERBOARD':
                        this.showMidLeaderboard(msg.questionNumber, msg.podium);
                        break;

                    case 'DELETE_GROUP':
                        if (!currentGroup.isHost) {
                            printMsg('bot', `⚠️ <b>This group has been permanently deleted by its owner.</b>`, true);
                            this.removeGroupFromLocalStorage(currentGroup.id);
                            
                            if (mqttClient) {
                                try { mqttClient.end(); } catch(e) {}
                            }
                            currentGroup = null;
                            document.getElementById('bot-status-subtext').innerText = 'bot (simulated)';
                            this.updateGroupUI();
                            window.history.pushState({}, document.title, window.location.pathname);
                        }
                        break;
                        
                    case 'END_QUIZ':
                        if (!currentGroup.isHost && activeQuiz.running) {
                            this.endGroupQuizSession(msg.podium);
                        }
                        break;
                }
            },
            
            handleResponseMessage(msg) {
                let member = currentGroup.members.find(m => m.id === msg.memberId);
                if (member) {
                    member.score = msg.score;
                    member.correct = msg.correct;
                    member.incorrect = msg.incorrect;
                    member.streak = msg.streak;
                    this.updateGroupUI();
                }
                
                // Attempts / correctness spam removed from chat feed as requested!
            },
            
            sendWelcomeMessage() {
                if (currentGroup && currentGroup.isHost) {
                    const cleanMembers = currentGroup.members.map(m => ({
                        id: m.id,
                        name: m.name,
                        score: m.score,
                        correct: m.correct,
                        incorrect: m.incorrect,
                        streak: m.streak,
                        isOnline: m.isOnline,
                        isHost: m.isHost
                    }));
                    
                    let activeQuizState = null;
                    if (activeQuiz.running) {
                        activeQuizState = {
                            running: true,
                            quizId: activeQuiz.id,
                            quizName: activeQuiz.name,
                            currQIdx: activeQuiz.currQIdx,
                            timerLimit: activeQuiz.timerLimit,
                            marksPositive: marksPositive,
                            marksNegative: marksNegative,
                            questions: activeQuiz.questions
                        };
                    }
                    
                    this.publish('control', {
                        type: 'WELCOME',
                        groupName: currentGroup.name,
                        members: cleanMembers,
                        activeQuizState: activeQuizState
                    });
                }
            },
            
            syncActiveQuizState(state) {
                activeQuiz.id = state.quizId;
                activeQuiz.name = state.quizName;
                activeQuiz.questions = state.questions;
                activeQuiz.timerLimit = state.timerLimit;
                activeQuiz.initialTimerLimit = state.timerLimit;
                marksPositive = state.marksPositive;
                marksNegative = state.marksNegative;
                
                activeQuiz.running = true;
                activeQuiz.currQIdx = state.currQIdx;
                activeQuiz.score = 0;
                activeQuiz.streak = 0;
                activeQuiz.bestStreak = 0;
                activeQuiz.correct = 0;
                activeQuiz.incorrect = 0;
                activeQuiz.isPaused = false;
                activeQuiz.timerRate = 1000;
                activeQuiz.startTime = Date.now();
                
                printMsg('bot', `🎬 Joined active group quiz: <b>${state.quizName}</b> (At Question ${state.currQIdx + 1})`);
                
                stickyStatsBar.classList.add('active');
                updateStickyStats();
                
                loadChatQuestionCard(state.currQIdx);
            },
            
            startQuiz(quizId, timerSec, pos, neg) {
                if (currentGroup && currentGroup.isHost) {
                    const quizObj = quizzesDb.find(q => q.id === quizId);
                    if (!quizObj) return;
                    
                    activeQuiz.id = quizId;
                    activeQuiz.name = quizObj.name;
                    activeQuiz.questions = quizObj.questions;
                    activeQuiz.timerLimit = timerSec;
                    activeQuiz.initialTimerLimit = timerSec;
                    marksPositive = pos;
                    marksNegative = neg;
                    
                    const quizPayload = {
                        type: 'START_QUIZ',
                        quizId: quizId,
                        quizName: quizObj.name,
                        timerLimit: timerSec,
                        marksPositive: pos,
                        marksNegative: neg,
                        questions: quizObj.questions,
                        senderId: this.clientId
                    };
                    
                    if (this.isFirebaseMode && this.fbRefs) {
                        // Clear responses
                        this.fbRefs.responses.remove();
                        // Reset all members scores/stats to 0 in database
                        currentGroup.members.forEach(m => {
                            this.fbRefs.members.child(m.id).update({
                                score: 0,
                                correct: 0,
                                incorrect: 0,
                                streak: 0
                            });
                        });
                        // Set activeQuizState in database
                        this.fbRefs.group.child('activeQuizState').set({
                            running: true,
                            quizId: quizId,
                            quizName: quizObj.name,
                            currQIdx: 0,
                            timerLimit: timerSec,
                            marksPositive: pos,
                            marksNegative: neg,
                            questions: quizObj.questions
                        });
                    }
                    
                    this.publish('control', quizPayload);
                    
                    startActiveQuizSession();
                }
            },
            
            publishQuestion(idx) {
                if (currentGroup && currentGroup.isHost) {
                    if (this.isFirebaseMode && this.fbRefs) {
                        this.fbRefs.group.child('activeQuizState/currQIdx').set(idx);
                    }
                    this.publish('control', {
                        type: 'QUESTION',
                        idx: idx,
                        senderId: this.clientId
                    });
                }
            },
            
            publishAnswer(score, correct, incorrect, streak, isCorrect) {
                if (currentGroup) {
                    const mySelf = currentGroup.members.find(m => m.id === this.clientId);
                    if (mySelf) {
                        mySelf.score = score;
                        mySelf.correct = correct;
                        mySelf.incorrect = incorrect;
                        mySelf.streak = streak;
                        this.updateGroupUI();
                    }
                    
                    if (this.isFirebaseMode && this.fbRefs) {
                        this.fbRefs.members.child(this.clientId).update({
                            score: score,
                            correct: correct,
                            incorrect: incorrect,
                            streak: streak
                        });
                    }
                    
                    this.publish('responses', {
                        memberId: this.clientId,
                        name: currentGroup.myNickname,
                        score: score,
                        correct: correct,
                        incorrect: incorrect,
                        streak: streak,
                        isCorrect: isCorrect,
                        senderId: this.clientId
                    });
                }
            },

            publishMidLeaderboard(questionNum) {
                if (currentGroup && currentGroup.isHost) {
                    const sorted = [...currentGroup.members].sort((a, b) => b.score - a.score);
                    const podium = sorted.map((m, idx) => ({
                        rank: idx + 1,
                        name: m.name,
                        score: m.score,
                        correct: m.correct,
                        incorrect: m.incorrect
                    }));
                    
                    this.publish('control', {
                        type: 'MID_LEADERBOARD',
                        podium: podium,
                        questionNumber: questionNum,
                        senderId: this.clientId
                    });
                    
                    this.showMidLeaderboard(questionNum, podium);
                }
            },

            showMidLeaderboard(qNum, podium) {
                let leadHtml = `📊 <b>Group Leaderboard (After Question ${qNum}):</b><br><br>`;
                podium.forEach(p => {
                    const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : "🔹";
                    leadHtml += `${medal} <b>${p.name}</b>: Score <b>${p.score.toFixed(2)}</b> (Correct: ${p.correct}, Incorrect: ${p.incorrect})<br>`;
                });
                printMsg('bot', leadHtml, true);
            },
            
            publishQuizEnd() {
                if (currentGroup && currentGroup.isHost) {
                    const sorted = [...currentGroup.members].sort((a, b) => b.score - a.score);
                    const podium = sorted.map((m, idx) => ({
                        rank: idx + 1,
                        name: m.name,
                        score: m.score,
                        correct: m.correct,
                        incorrect: m.incorrect
                    }));
                    
                    if (this.isFirebaseMode && this.fbRefs) {
                        this.fbRefs.group.child('activeQuizState').remove();
                    }
                    
                    this.publish('control', {
                        type: 'END_QUIZ',
                        podium: podium,
                        senderId: this.clientId
                    });
                    
                    endQuizSession();
                }
            },
            
            endGroupQuizSession(podium) {
                if (timerInterval) clearInterval(timerInterval);
                if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
                activeQuiz.running = false;
                stickyStatsBar.classList.remove('active');
                
                AudioEngine.fanfare();
                
                let podiumHtml = `🏆 <b>Group Quiz Finished! Final Rankings:</b><br><br>`;
                podium.forEach(p => {
                    const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : "🔹";
                    podiumHtml += `${medal} <b>${p.name}</b>: Score <b>${p.score.toFixed(2)}</b> (${p.correct} correct, ${p.incorrect} wrong)<br>`;
                });
                
                printMsg('bot', podiumHtml, true);
                
                const duration = 2.5 * 1000;
                const end = Date.now() + duration;
                (function frame() {
                    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#2481cc', '#ec4899', '#f59e0b'] });
                    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#2481cc', '#ec4899', '#f59e0b'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            },
            
            sendChatMessage(text) {
                if (currentGroup) {
                    const payload = {
                        senderId: this.clientId,
                        senderName: currentGroup.myNickname,
                        text: text
                    };
                    this.publish('chat', payload);
                    printMsg('user', text);
                }
            },
            
            leave() {
                if (currentGroup) {
                    if (this.isFirebaseMode && this.fbRefs) {
                        this.fbRefs.members.child(this.clientId).child('isOnline').set(false);
                        this.fbRefs.chat.push({
                            senderId: 'system',
                            senderName: 'System',
                            text: `📢 <b>${currentGroup.myNickname}</b> left the group.`,
                            timestamp: Date.now()
                        });
                        Object.keys(this.fbRefs).forEach(key => {
                            this.fbRefs[key].off();
                        });
                        this.fbRefs = null;
                    } else {
                        this.publish('control', {
                            type: 'LEAVE',
                            memberId: this.clientId,
                            senderId: this.clientId
                        });
                        if (mqttClient) {
                            try { mqttClient.end(); } catch(e) {}
                        }
                    }
                    
                    currentGroup = null;
                    document.getElementById('bot-status-subtext').innerText = 'bot (simulated)';
                    this.updateGroupUI();
                    
                    window.history.pushState({}, document.title, window.location.pathname);
                    
                    printMsg('bot', `🚪 You have left the group.`);
                }
            },
            
            getInviteLink() {
                if (currentGroup) {
                    const base = window.location.origin + window.location.pathname;
                    return `${base}?group=${currentGroup.id}`;
                }
                return '';
            },
            
            updateGroupUI() {
                const groupActiveInfo = document.getElementById('group-active-info');
                const groupSidebarControls = document.getElementById('group-sidebar-controls');
                const groupMembersListSection = document.getElementById('group-members-list-section');
                const groupMembersUl = document.getElementById('group-members-ul');
                const sidebarGroupName = document.getElementById('sidebar-group-name');
                const sidebarGroupMembersCount = document.getElementById('sidebar-group-members-count');
                
                if (currentGroup) {
                    groupActiveInfo.style.display = 'block';
                    groupSidebarControls.style.display = 'none';
                    groupMembersListSection.style.display = 'block';
                    
                    sidebarGroupName.innerText = currentGroup.name;
                    
                    const onlineCount = currentGroup.members.filter(m => m.isOnline).length;
                    sidebarGroupMembersCount.innerText = `${onlineCount} member${onlineCount !== 1 ? 's' : ''} online`;
                    
                    groupMembersUl.innerHTML = '';
                    const sortedMembers = [...currentGroup.members].sort((a, b) => b.score - a.score);
                    sortedMembers.forEach(m => {
                        const li = document.createElement('li');
                        li.style.display = 'flex';
                        li.style.justifyContent = 'space-between';
                        li.style.alignItems = 'center';
                        li.style.color = m.isOnline ? 'var(--text-main)' : 'var(--text-muted)';
                        
                        const nameSpan = document.createElement('span');
                        let statusDot = m.isOnline ? 
                            '<span style="color: var(--success); margin-right: 4px;">●</span>' : 
                            '<span style="color: var(--text-muted); margin-right: 4px;">○</span>';
                        
                        let nameText = m.name;
                        if (m.id === this.clientId) nameText += ' (You)';
                        if (m.isHost) nameText += ' 👑';
                        
                        nameSpan.innerHTML = statusDot + nameText;
                        
                        const scoreSpan = document.createElement('span');
                        scoreSpan.style.fontWeight = 'bold';
                        scoreSpan.innerText = `${m.score.toFixed(2)} pts`;
                        if (m.streak > 0) {
                            scoreSpan.innerHTML += ` <span style="color: var(--gold);" title="Streak">🔥${m.streak}</span>`;
                        }
                        
                        li.appendChild(nameSpan);
                        li.appendChild(scoreSpan);
                        groupMembersUl.appendChild(li);
                    });
                } else {
                    groupActiveInfo.style.display = 'none';
                    groupSidebarControls.style.display = 'block';
                    groupMembersListSection.style.display = 'none';
                    groupMembersUl.innerHTML = '';
                }
                this.loadPersistedGroups();
            },

            saveGroupToLocalStorage(groupId, name, isHost, nickname) {
                try {
                    let groups = JSON.parse(localStorage.getItem('unigram_groups') || '[]');
                    const idx = groups.findIndex(g => g.id === groupId);
                    if (idx !== -1) {
                        groups[idx] = { id: groupId, name, isHost, nickname };
                    } else {
                        groups.push({ id: groupId, name, isHost, nickname });
                    }
                    localStorage.setItem('unigram_groups', JSON.stringify(groups));
                    
                    if (FirebaseSyncManager.dbEnabled && FirebaseSyncManager.currentUser) {
                        FirebaseSyncManager.pushGroupToCloud(groupId, name, isHost, nickname);
                    }
                } catch(e) {
                    console.error("Error saving group to local storage", e);
                }
            },
            
            removeGroupFromLocalStorage(groupId) {
                try {
                    let groups = JSON.parse(localStorage.getItem('unigram_groups') || '[]');
                    groups = groups.filter(g => g.id !== groupId);
                    localStorage.setItem('unigram_groups', JSON.stringify(groups));
                    
                    if (FirebaseSyncManager.dbEnabled && FirebaseSyncManager.currentUser) {
                        FirebaseSyncManager.deleteGroupFromCloud(groupId);
                    }
                } catch(e) {
                    console.error("Error removing group from local storage", e);
                }
            },
            
            loadPersistedGroups() {
                const listContainer = document.getElementById('persisted-groups-list');
                if (!listContainer) return;
                
                let groups = [];
                try {
                    groups = JSON.parse(localStorage.getItem('unigram_groups') || '[]');
                } catch(e) {}
                
                listContainer.innerHTML = '';
                if (groups.length === 0) {
                    listContainer.innerHTML = '<p style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; text-align: center;">No saved groups</p>';
                    return;
                }
                
                groups.forEach(g => {
                    const wrap = document.createElement('div');
                    wrap.className = 'menu-btn';
                    wrap.style.display = 'flex';
                    wrap.style.justifyContent = 'space-between';
                    wrap.style.alignItems = 'center';
                    wrap.style.padding = '6px 10px';
                    wrap.style.marginTop = '2px';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.style.cursor = 'pointer';
                    nameSpan.style.flex = '1';
                    nameSpan.style.textOverflow = 'ellipsis';
                    nameSpan.style.overflow = 'hidden';
                    nameSpan.style.whiteSpace = 'nowrap';
                    nameSpan.innerHTML = `<i class="fa-solid fa-users"></i> ${g.name} ${g.isHost ? '👑' : ''}`;
                    nameSpan.onclick = () => {
                        AudioEngine.click();
                        if (g.isHost) {
                            GroupSyncManager.reconnectHost(g.id, g.name, g.nickname);
                        } else {
                            GroupSyncManager.joinGroup(g.id, g.nickname);
                        }
                    };
                    
                    const trash = document.createElement('i');
                    trash.className = 'fa-solid fa-trash';
                    trash.style.color = 'var(--danger)';
                    trash.style.cursor = 'pointer';
                    trash.style.marginLeft = '8px';
                    trash.title = g.isHost ? "Delete Group permanently" : "Remove from history";
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        AudioEngine.click();
                        if (g.isHost) {
                            if (confirm(`Are you sure you want to permanently delete the group "${g.name}"? This will clear it for everyone.`)) {
                                GroupSyncManager.deleteGroupPermanently(g.id);
                            }
                        } else {
                            if (confirm(`Remove the group "${g.name}" from your history?`)) {
                                GroupSyncManager.removeGroupFromLocalStorage(g.id);
                                if (currentGroup && currentGroup.id === g.id) {
                                    GroupSyncManager.leave();
                                } else {
                                    GroupSyncManager.loadPersistedGroups();
                                }
                            }
                        }
                    };
                    
                    wrap.appendChild(nameSpan);
                    wrap.appendChild(trash);
                    listContainer.appendChild(wrap);
                });
            },
            
            reconnectHost(groupId, name, nickname) {
                currentGroup = {
                    id: groupId,
                    name: name,
                    isHost: true,
                    myMemberId: this.clientId,
                    myNickname: nickname,
                    members: [{
                        id: this.clientId,
                        name: nickname,
                        score: 0,
                        correct: 0,
                        incorrect: 0,
                        streak: 0,
                        isOnline: true,
                        isHost: true
                    }]
                };
                
                this.connect(groupId, () => {
                    this.updateGroupUI();
                    
                    if (this.isFirebaseMode) {
                        this.fbRefs.members.child(this.clientId).child('isOnline').set(true);
                        this.fbRefs.chat.push({
                            senderId: 'system',
                            senderName: 'System',
                            text: `📢 Host <b>${nickname}</b> reconnected.`,
                            timestamp: Date.now()
                        });
                    } else {
                        this.sendWelcomeMessage();
                    }
                    
                    printMsg('bot', `🔌 Reconnected to your group <b>"${name}"</b> as Owner. Invite Link: <code>${this.getInviteLink()}</code>`, true);
                });
            },
            
            deleteGroupPermanently(groupId) {
                this.removeGroupFromLocalStorage(groupId);
                
                if (currentGroup && currentGroup.id === groupId) {
                    if (this.isFirebaseMode && this.fbRefs) {
                        this.publish('control', {
                            type: 'DELETE_GROUP',
                            senderId: this.clientId
                        });
                        
                        const dbRef = this.fbRefs.group;
                        Object.keys(this.fbRefs).forEach(key => {
                            this.fbRefs[key].off();
                        });
                        this.fbRefs = null;
                        
                        dbRef.remove()
                            .then(() => console.log("Group removed from Firebase DB"))
                            .catch(err => console.error("Error removing group from Firebase DB:", err));
                    } else {
                        this.publish('control', {
                            type: 'DELETE_GROUP',
                            senderId: this.clientId
                        });
                        if (mqttClient) {
                            try { mqttClient.end(); } catch(e) {}
                        }
                    }
                    
                    currentGroup = null;
                    document.getElementById('bot-status-subtext').innerText = 'bot (simulated)';
                    this.updateGroupUI();
                    window.history.pushState({}, document.title, window.location.pathname);
                } else {
                    this.loadPersistedGroups();
                }
                
                printMsg('bot', `🗑️ Group deleted permanently.`);
            }
        };
