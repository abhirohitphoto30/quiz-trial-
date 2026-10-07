        let currentGroup = null;
        let mqttClient = null;

        // ==========================================
        // BUILT-IN FIREBASE CONFIGURATION (CLOUD SYNC)
        // ==========================================
        const FIREBASE_CONFIG = {
            apiKey: "AIzaSyAtWtCgne3_jl34XqMhQwx2HCuo1PuK9YA",
            authDomain: "advancequizbot.firebaseapp.com",
            databaseURL: "https://advancequizbot-default-rtdb.firebaseio.com",
            projectId: "advancequizbot",
            storageBucket: "advancequizbot.firebasestorage.app",
            messagingSenderId: "38770439833",
            appId: "1:38770439833:web:5f2397eb5289dd1f3e2a08",
            measurementId: "G-P9CYKNWBST"
        };

        const FirebaseSyncManager = {
            dbEnabled: false,
            currentUser: null,
            userNickname: 'Guest',

            init() {
                let config = null;
                const configStr = localStorage.getItem('firebase_config');
                if (configStr) {
                    try {
                        config = JSON.parse(configStr);
                    } catch(e) {}
                }
                
                // Fallback to built-in FIREBASE_CONFIG
                if (!config && typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY") {
                    config = FIREBASE_CONFIG;
                }

                if (config) {
                    try {
                        if (firebase.apps.length === 0) {
                            firebase.initializeApp(config);
                        }
                        this.dbEnabled = true;
                        console.log("Firebase initialized successfully");
                        
                        firebase.auth().onAuthStateChanged((user) => {
                            this.handleAuthStateChange(user);
                        });
                    } catch (e) {
                        console.error("Failed to initialize Firebase", e);
                        localStorage.removeItem('firebase_config');
                        this.dbEnabled = false;
                        this.updateAuthUI(null);
                    }
                } else {
                    this.dbEnabled = false;
                    this.updateAuthUI(null);
                }
            },

            handleAuthStateChange(user) {
                if (user) {
                    this.currentUser = user;
                    firebase.database().ref(`users/${user.uid}/nickname`).once('value')
                        .then((snapshot) => {
                            const nick = snapshot.val();
                            this.userNickname = nick || user.email.split('@')[0];
                            localStorage.setItem('group_nickname', this.userNickname);
                            this.updateAuthUI(user);
                            this.syncQuizzesFromCloud();
                            this.syncGroupsFromCloud();
                        })
                        .catch(() => {
                            this.userNickname = user.email.split('@')[0];
                            localStorage.setItem('group_nickname', this.userNickname);
                            this.updateAuthUI(user);
                            this.syncQuizzesFromCloud();
                            this.syncGroupsFromCloud();
                        });
                } else {
                    this.currentUser = null;
                    this.userNickname = 'Guest';
                    this.updateAuthUI(null);
                }
            },

            updateAuthUI(user) {
                const nameEl = document.getElementById('user-profile-name');
                const statusEl = document.getElementById('user-profile-status');
                const actionBtn = document.getElementById('auth-action-btn');

                if (user) {
                    nameEl.innerText = this.userNickname;
                    statusEl.innerHTML = `<span style="color: var(--success); font-weight: bold;">●</span> Cloud Mode (Online)`;
                    actionBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout`;
                    actionBtn.onclick = () => FirebaseSyncManager.signOut();
                } else {
                    nameEl.innerText = 'Guest User';
                    if (this.dbEnabled) {
                        statusEl.innerHTML = `<span style="color: var(--gold); font-weight: bold;">●</span> Cloud Mode (Logged Out)`;
                        actionBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login`;
                        actionBtn.onclick = () => openAuthModal();
                    } else {
                        statusEl.innerText = 'Local Mode (Offline)';
                        actionBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login`;
                        actionBtn.onclick = () => {
                            alert("Welcome! Cloud database is not configured yet.\n\nTo enable cloud sync, please edit the index.html file and replace the FIREBASE_CONFIG placeholders with your Firebase credentials, or configure it via /settings.");
                            openSettingsModal();
                        };
                    }
                }
                
                if (typeof GroupSyncManager !== 'undefined' && GroupSyncManager.loadPersistedGroups) {
                    GroupSyncManager.loadPersistedGroups();
                }
            },

            syncQuizzesFromCloud() {
                if (!this.dbEnabled || !this.currentUser) return;
                
                printMsg('bot', "🔄 Synchronizing quizzes from cloud database...");
                
                // Sync quizzes
                firebase.database().ref(`users/${this.currentUser.uid}/quizzes`).once('value')
                    .then((snapshot) => {
                        const cloudQuizzes = snapshot.val();
                        if (cloudQuizzes) {
                            let addedCount = 0;
                            Object.keys(cloudQuizzes).forEach((qId) => {
                                const qObj = cloudQuizzes[qId];
                                const existingIdx = quizzesDb.findIndex(q => q.id === qId);
                                if (existingIdx !== -1) {
                                    quizzesDb[existingIdx] = qObj;
                                } else {
                                    quizzesDb.push(qObj);
                                    addedCount++;
                                }
                            });
                            saveQuizzesToLocalStorage();
                            printMsg('bot', `✅ Cloud synchronization complete! Synced ${Object.keys(cloudQuizzes).length} quizzes.`);
                        } else {
                            // First time login - push existing local quizzes to cloud
                            this.pushAllLocalQuizzesToCloud();
                        }
                    })
                    .catch((err) => {
                        console.error("Cloud quiz sync failed", err);
                    });
            },

            pushQuizToCloud(quiz) {
                if (this.dbEnabled && this.currentUser) {
                    firebase.database().ref(`users/${this.currentUser.uid}/quizzes/${quiz.id}`).set(quiz)
                        .then(() => console.log("Quiz pushed to cloud successfully"))
                        .catch(err => console.error("Failed to push quiz to cloud", err));
                }
            },

            deleteQuizFromCloud(quizId) {
                if (this.dbEnabled && this.currentUser) {
                    firebase.database().ref(`users/${this.currentUser.uid}/quizzes/${quizId}`).remove()
                        .then(() => console.log("Quiz removed from cloud successfully"))
                        .catch(err => console.error("Failed to remove quiz from cloud", err));
                }
            },

            pushAllLocalQuizzesToCloud() {
                if (this.dbEnabled && this.currentUser && quizzesDb.length > 0) {
                    const quizzesObj = {};
                    quizzesDb.forEach(q => {
                        quizzesObj[q.id] = q;
                    });
                    firebase.database().ref(`users/${this.currentUser.uid}/quizzes`).update(quizzesObj)
                        .then(() => console.log("All local quizzes synced to cloud"))
                        .catch(err => console.error("Failed syncing all local quizzes", err));
                }
            },

            syncGroupsFromCloud() {
                if (!this.dbEnabled || !this.currentUser) return;
                
                firebase.database().ref(`users/${this.currentUser.uid}/groups`).once('value')
                    .then((snapshot) => {
                        const cloudGroups = snapshot.val();
                        if (cloudGroups) {
                            let localGroups = [];
                            try {
                                localGroups = JSON.parse(localStorage.getItem('unigram_groups') || '[]');
                            } catch(e) {}
                            
                            Object.keys(cloudGroups).forEach((gId) => {
                                const gObj = cloudGroups[gId];
                                const existingIdx = localGroups.findIndex(g => g.id === gId);
                                if (existingIdx !== -1) {
                                    localGroups[existingIdx] = gObj;
                                } else {
                                    localGroups.push(gObj);
                                }
                            });
                            localStorage.setItem('unigram_groups', JSON.stringify(localGroups));
                            
                            if (typeof GroupSyncManager !== 'undefined' && GroupSyncManager.loadPersistedGroups) {
                                GroupSyncManager.loadPersistedGroups();
                            }
                        } else {
                            // First time login - push existing local groups to cloud
                            this.pushAllLocalGroupsToCloud();
                        }
                    })
                    .catch((err) => {
                        console.error("Cloud group sync failed", err);
                    });
            },

            pushGroupToCloud(groupId, name, isHost, nickname) {
                if (this.dbEnabled && this.currentUser) {
                    const groupData = { id: groupId, name, isHost, nickname };
                    firebase.database().ref(`users/${this.currentUser.uid}/groups/${groupId}`).set(groupData)
                        .then(() => console.log("Group reference pushed to cloud successfully"))
                        .catch(err => console.error("Failed to push group to cloud", err));
                }
            },

            deleteGroupFromCloud(groupId) {
                if (this.dbEnabled && this.currentUser) {
                    firebase.database().ref(`users/${this.currentUser.uid}/groups/${groupId}`).remove()
                        .then(() => console.log("Group reference removed from cloud successfully"))
                        .catch(err => console.error("Failed to remove group from cloud", err));
                }
            },

            pushAllLocalGroupsToCloud() {
                let localGroups = [];
                try {
                    localGroups = JSON.parse(localStorage.getItem('unigram_groups') || '[]');
                } catch(e) {}
                
                if (this.dbEnabled && this.currentUser && localGroups.length > 0) {
                    const groupsObj = {};
                    localGroups.forEach(g => {
                        groupsObj[g.id] = g;
                    });
                    firebase.database().ref(`users/${this.currentUser.uid}/groups`).update(groupsObj)
                        .then(() => console.log("All local groups synced to cloud"))
                        .catch(err => console.error("Failed syncing all local groups", err));
                }
            },

            signIn(email, password, callback) {
                if (!this.dbEnabled) return;
                firebase.auth().signInWithEmailAndPassword(email, password)
                    .then((result) => {
                        callback(null, result.user);
                    })
                    .catch((err) => {
                        callback(err);
                    });
            },

            signUp(email, password, nickname, callback) {
                if (!this.dbEnabled) return;
                firebase.auth().createUserWithEmailAndPassword(email, password)
                    .then((result) => {
                        const user = result.user;
                        firebase.database().ref(`users/${user.uid}/nickname`).set(nickname)
                            .then(() => {
                                this.userNickname = nickname;
                                localStorage.setItem('group_nickname', nickname);
                                callback(null, user);
                            })
                            .catch((err) => {
                                // Fallback if nickname save fails
                                callback(null, user);
                            });
                    })
                    .catch((err) => {
                        callback(err);
                    });
            },

            signOut() {
                if (!this.dbEnabled) return;
                firebase.auth().signOut()
                    .then(() => {
                        printMsg('bot', "🚪 You have logged out of your cloud account.");
                    });
            }
        };
