        let quizzesDb = [];

        let localStats = {
            totalAttempts: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            bestStreakOverall: 0
        };

        // Initialize DB from LocalStorage/IndexedDB or Embedded DB
        async function initDatabase() {
            // Load embedded quizzes first
            if (typeof EMBEDDED_QUIZZES !== 'undefined' && Array.isArray(EMBEDDED_QUIZZES)) {
                quizzesDb = [...EMBEDDED_QUIZZES];
            }
            
            // Backward Compatibility: Migrate old data from localStorage to localforage
            const stored = localStorage.getItem('local_quizzes');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        await localforage.setItem('local_quizzes', parsed);
                        console.log("Successfully migrated quizzes from localStorage to IndexedDB via localforage.");
                    }
                    localStorage.removeItem('local_quizzes');
                } catch(e) {
                    console.error("Failed to migrate quizzes from localStorage", e);
                }
            }

            // Load IndexedDB additions via localforage
            try {
                const storedQuizzes = await localforage.getItem('local_quizzes');
                if (storedQuizzes && Array.isArray(storedQuizzes)) {
                    storedQuizzes.forEach(q => {
                        if (!quizzesDb.some(dbQ => dbQ.id === q.id)) {
                            quizzesDb.push(q);
                        }
                    });
                }
            } catch(e) {
                console.error("Failed to load IndexedDB quizzes via localforage", e);
            }

            // Load local stats
            const stats = localStorage.getItem('local_quiz_stats');
            if (stats) {
                try {
                    localStats = JSON.parse(stats);
                } catch(e) {}
            }
        }

        // Graceful State Management: Wait for database initialization to complete
        (async function() {
            try {
                await initDatabase();
            } catch(e) {
                console.error("Database initialization failed", e);
            }
            FirebaseSyncManager.init();
            GroupSyncManager.init();
            loadSavedWallpaper();
        })();

        // Keyboard Shortcut: Press '/' to focus chat input
        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const isInputFocused = activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable;
            
            if (e.key === '/' && !isInputFocused) {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    e.preventDefault();
                    chatInput.focus();
                    chatInput.value = '/';
                    setTimeout(() => {
                        chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
                    }, 0);
                }
            }
        });
