    // ── Auto-show HUD for 4s when quiz starts, then hide ──
    const _origStartSession = typeof startActiveQuizSession !== 'undefined' ? startActiveQuizSession : null;
    // We patch into the quiz start by intercepting the next invocation
    (function patchQuizStart() {
        const orig = window.startActiveQuizSession;
        if (!orig) { setTimeout(patchQuizStart, 300); return; }
        window.startActiveQuizSession = function() {
            orig.apply(this, arguments);
            // Show HUD briefly
            const hud = document.getElementById('kbd-hud');
            if (hud && !kbdHudVisible) {
                hud.classList.add('visible');
                showKbdToast('⌨️ Keyboard shortcuts active!');
                setTimeout(() => {
                    if (!kbdHudVisible) hud.classList.remove('visible');
                }, 4000);
            }
            // Play quiz start sound
            AudioEngine.quizStart();
        };
    })();

    // ── Update sound toggle button to match saved state ──
    (function syncSoundBtn() {
        const btn = document.getElementById('sound-toggle-btn');
        if (!btn) { setTimeout(syncSoundBtn, 100); return; }
        if (AudioEngine.muted) {
            btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            btn.title = 'Sound Off — Click to Enable';
            btn.style.color = 'var(--danger)';
        }
    })();

    // ── Inject key-hint badges into option buttons when they render ──
    // We patch loadChatQuestionCard to add number hints to options
    (function patchLoadCard() {
        const orig = window.loadChatQuestionCard;
        if (!orig) { setTimeout(patchLoadCard, 300); return; }
        window.loadChatQuestionCard = function(idx) {
            orig.apply(this, arguments);
            // After a tick (so DOM is built), inject key hint spans
            setTimeout(() => {
                const container = document.getElementById('opts-' + idx);
                if (!container) return;
                const btns = container.querySelectorAll('.quiz-opt-btn');
                btns.forEach((btn, i) => {
                    if (i >= 4) return;
                    const hint = document.createElement('span');
                    hint.className = 'opt-key-hint';
                    hint.textContent = (i + 1).toString();
                    hint.title = `Press ${i + 1} to select`;
                    btn.insertBefore(hint, btn.firstChild);
                });
            }, 30);
        };
    })();

    // ── Patch fanfare to use new rich version ──
    // (Already replaced in AudioEngine above — nothing needed)

    // ── Patch pause/resume commands to play sounds ──
    (function patchPauseResume() {
        const origSend = window.sendMessage;
        if (!origSend) { setTimeout(patchPauseResume, 300); return; }
        // sounds are triggered by keyboard handler already; 
        // sidebar buttons will benefit from AudioEngine.click which is already called
    })();

    // ════════════════════════════════════════════════════════
    // NEW FEATURES BLOCK
    // ════════════════════════════════════════════════════════

    // ── Restore saved theme on load ──
    (function restoreTheme() {
        localStorage.setItem('ui_theme', 'anime');
        document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
        document.body.classList.add('theme-anime');
    })();
