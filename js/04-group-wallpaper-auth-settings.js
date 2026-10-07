        // Group UI Button Click Handlers
        function openCreateGroupModal() {
            AudioEngine.click();
            document.getElementById('group-name-input').value = '';
            document.getElementById('group-nickname-input').value = localStorage.getItem('group_nickname') || '';
            document.getElementById('create-group-modal').classList.add('active');
        }

        function closeCreateGroupModal() {
            AudioEngine.click();
            document.getElementById('create-group-modal').classList.remove('active');
        }

        function submitCreateGroup() {
            const name = document.getElementById('group-name-input').value.trim();
            const nickname = document.getElementById('group-nickname-input').value.trim();
            
            if (!name || !nickname) {
                alert("Please enter both a Group Name and Nickname.");
                return;
            }
            
            closeCreateGroupModal();
            GroupSyncManager.createGroup(name, nickname);
        }

        function closeJoinGroupModal() {
            AudioEngine.click();
            document.getElementById('join-group-modal').classList.remove('active');
            // Clear URL param if cancel
            window.history.pushState({}, document.title, window.location.pathname);
        }

        function submitJoinGroup() {
            const nickname = document.getElementById('join-nickname-input').value.trim();
            const groupId = document.getElementById('join-group-modal').dataset.groupId;
            
            if (!nickname) {
                alert("Please enter your nickname.");
                return;
            }
            
            document.getElementById('join-group-modal').classList.remove('active');
            GroupSyncManager.joinGroup(groupId, nickname);
        }

        function copyGroupInviteLink() {
            AudioEngine.click();
            const link = GroupSyncManager.getInviteLink();
            if (link) {
                navigator.clipboard.writeText(link).then(() => {
                    alert("Invite link copied to clipboard: " + link);
                }).catch(err => {
                    alert("Failed to copy link: " + err);
                });
            }
        }

        function leaveCurrentGroup() {
            AudioEngine.click();
            if (confirm("Are you sure you want to leave the current group?")) {
                GroupSyncManager.leave();
            }
        }

        // --- WALLPAPER HANDLERS ---
        function openWallpaperModal() {
            AudioEngine.click();
            document.getElementById('wallpaper-modal').classList.add('active');
        }

        function closeWallpaperModal() {
            AudioEngine.click();
            document.getElementById('wallpaper-modal').classList.remove('active');
        }

        function setChatWallpaper(type, customData = null) {
            const chatHistory = document.getElementById('chat-history');
            const videoBg = document.getElementById('chat-video-bg');
            if (!chatHistory) return;

            // Reset styles to transparent/none to allow correct overrides
            chatHistory.style.backgroundImage = 'none';
            chatHistory.style.backgroundSize = '';
            chatHistory.style.backgroundPosition = '';
            chatHistory.style.animation = '';
            chatHistory.style.backgroundColor = 'transparent';
            chatHistory.style.backgroundBlendMode = '';

            if (videoBg) {
                videoBg.style.display = 'none';
                videoBg.src = '';
            }

            if (type.startsWith('solid-')) {
                const colorMap = {
                    'solid-dark': '#141f29',
                    'solid-charcoal': '#1e2833',
                    'solid-navy': '#0f1c2e'
                };
                chatHistory.style.backgroundColor = colorMap[type] || '#141f29';
            } else if (type.startsWith('grad-')) {
                const gradMap = {
                    'grad-aurora': 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
                    'grad-sunset': 'linear-gradient(135deg, #4b1212, #6b2d2d, #141f29)',
                    'grad-telegram': 'linear-gradient(135deg, #182533, #2b5278, #182533)'
                };
                chatHistory.style.backgroundImage = gradMap[type] || 'none';
            } else if (type === 'live-stars') {
                chatHistory.style.backgroundImage = 'linear-gradient(-45deg, #090a0f, #181d33, #0b0c16, #1f2747)';
                chatHistory.style.backgroundSize = '300% 300%';
                chatHistory.style.animation = 'gradientWave 15s ease infinite';
            } else if (type === 'live-wave') {
                chatHistory.style.backgroundImage = 'linear-gradient(-45deg, #1a2a6c, #b21f1f, #fdbb2d, #1a2a6c)';
                chatHistory.style.backgroundSize = '400% 400%';
                chatHistory.style.animation = 'gradientWave 10s ease infinite';
            } else if (type === 'pattern-telegram') {
                chatHistory.style.backgroundImage = "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')";
                chatHistory.style.backgroundBlendMode = 'overlay';
                chatHistory.style.backgroundColor = '#0e1621';
            } else if (type === 'custom' && customData) {
                if (customData.startsWith('data:video/')) {
                    if (videoBg) {
                        videoBg.src = customData;
                        videoBg.style.display = 'block';
                        videoBg.play().catch(e => console.warn("Video autoplay failed:", e));
                    }
                } else {
                    chatHistory.style.backgroundImage = `url(${customData})`;
                    chatHistory.style.backgroundSize = 'cover';
                    chatHistory.style.backgroundPosition = 'center';
                }
            }

            localStorage.setItem('chat_wallpaper_type', type);
            if (customData) {
                try {
                    localStorage.setItem('chat_wallpaper_data', customData);
                } catch(e) {
                    console.warn("Custom wallpaper file too large for LocalStorage!");
                }
            } else {
                localStorage.removeItem('chat_wallpaper_data');
            }
        }

        function uploadCustomWallpaper(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                alert("Please select a file smaller than 2MB to fit local browser storage limits!");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                setChatWallpaper('custom', base64Data);
            };
            reader.readAsDataURL(file);
        }

        function loadSavedWallpaper() {
            localStorage.removeItem('chat_wallpaper_type');
            localStorage.removeItem('chat_wallpaper_data');
            const chatHistory = document.getElementById('chat-history');
            if (chatHistory) {
                chatHistory.style.backgroundImage = 'none';
                chatHistory.style.backgroundColor = 'transparent';
                chatHistory.style.animation = 'none';
            }
        }

        // --- AUTH & SETTINGS MODAL UI HANDLERS ---
        function openAuthModal() {
            AudioEngine.click();
            document.getElementById('auth-email-input').value = '';
            document.getElementById('auth-password-input').value = '';
            document.getElementById('auth-nickname-input').value = '';
            setAuthMode('login');
            document.getElementById('auth-modal').classList.add('active');
        }
        function closeAuthModal() {
            AudioEngine.click();
            document.getElementById('auth-modal').classList.remove('active');
        }
        let authMode = 'login';
        function setAuthMode(mode) {
            authMode = mode;
            const titleEl = document.getElementById('auth-modal-title');
            const submitBtn = document.getElementById('auth-submit-btn');
            const toggleLink = document.getElementById('auth-toggle-link');
            const nickGroup = document.getElementById('auth-nickname-group');
            if (mode === 'login') {
                titleEl.innerHTML = `Cloud Login ☁️`;
                submitBtn.innerText = 'Log In';
                toggleLink.innerText = "Don't have an account? Sign Up";
                nickGroup.style.display = 'none';
            } else {
                titleEl.innerHTML = `Create Account ☁️`;
                submitBtn.innerText = 'Sign Up';
                toggleLink.innerText = "Already have an account? Log In";
                nickGroup.style.display = 'block';
            }
        }
        function toggleAuthMode(e) {
            if (e) e.preventDefault();
            AudioEngine.click();
            setAuthMode(authMode === 'login' ? 'signup' : 'login');
        }
        function submitAuthForm() {
            AudioEngine.click();
            const email = document.getElementById('auth-email-input').value.trim();
            const password = document.getElementById('auth-password-input').value.trim();
            const nickname = document.getElementById('auth-nickname-input').value.trim();
            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }
            if (authMode === 'signup' && !nickname) {
                alert("Please choose a nickname.");
                return;
            }
            const submitBtn = document.getElementById('auth-submit-btn');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Processing...';
            submitBtn.disabled = true;
            if (authMode === 'login') {
                FirebaseSyncManager.signIn(email, password, (err, user) => {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    if (err) {
                        alert("Login failed: " + err.message);
                    } else {
                        closeAuthModal();
                        printMsg('bot', `👋 Welcome back, <b>${FirebaseSyncManager.userNickname}</b>! Successfully logged in.`);
                    }
                });
            } else {
                FirebaseSyncManager.signUp(email, password, nickname, (err, user) => {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    if (err) {
                        alert("Sign up failed: " + err.message);
                    } else {
                        closeAuthModal();
                        printMsg('bot', `🎉 Account created successfully! Welcome, <b>${nickname}</b>.`);
                    }
                });
            }
        }

        function openSettingsModal() {
            AudioEngine.click();
            const configStr = localStorage.getItem('firebase_config') || '';
            document.getElementById('settings-config-input').value = configStr;
            document.getElementById('settings-modal').classList.add('active');
        }
        function closeSettingsModal() {
            AudioEngine.click();
            document.getElementById('settings-modal').classList.remove('active');
        }
        function submitSettingsForm() {
            AudioEngine.click();
            const configVal = document.getElementById('settings-config-input').value.trim();
            if (configVal) {
                try {
                    JSON.parse(configVal); // validate JSON
                    localStorage.setItem('firebase_config', configVal);
                    closeSettingsModal();
                    alert("Firebase configuration saved! The application will now initialize Firebase database mode.");
                    FirebaseSyncManager.init();
                } catch(e) {
                    alert("Invalid JSON format. Please paste a valid Firebase configuration JSON.");
                }
            } else {
                // Clear config
                localStorage.removeItem('firebase_config');
                closeSettingsModal();
                alert("Firebase configuration cleared. Switching back to Local Mode.");
                FirebaseSyncManager.dbEnabled = false;
                FirebaseSyncManager.currentUser = null;
                FirebaseSyncManager.updateAuthUI(null);
            }
        }
