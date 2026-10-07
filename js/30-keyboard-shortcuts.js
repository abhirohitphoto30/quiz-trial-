    // ═══════════════════════════════════════════════════════════
    // ⌨️  KEYBOARD SHORTCUT SYSTEM
    // ═══════════════════════════════════════════════════════════

    let kbdHudVisible = false;

    function toggleKbdHud() {
        kbdHudVisible = !kbdHudVisible;
        const hud = document.getElementById('kbd-hud');
        const btn = document.getElementById('kbd-hud-toggle-btn');
        if (kbdHudVisible) {
            hud.classList.add('visible');
            if (btn) btn.style.color = 'var(--telegram-blue)';
        } else {
            hud.classList.remove('visible');
            if (btn) btn.style.color = '';
        }
        AudioEngine.click();
    }

    /* Flash a HUD key visually */
    function flashHudKey(keyId) {
        const el = document.getElementById('kkey-' + keyId);
        if (!el) return;
        el.classList.add('active-press');
        setTimeout(() => el.classList.remove('active-press'), 200);
    }

    /* Show floating toast */
    let toastTimeout = null;
    function showKbdToast(msg) {
        const toast = document.getElementById('kbd-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 1100);
    }

    /* Flash the answer button in the current card for keyboard selections */
    function flashOptionBtn(optIdx) {
        const qIdx = activeQuiz.currQIdx;
        const container = document.getElementById('opts-' + qIdx);
        if (!container) return;
        const btns = container.querySelectorAll('.quiz-opt-btn');
        if (!btns[optIdx]) return;
        btns[optIdx].classList.add('key-highlight');
        setTimeout(() => btns[optIdx].classList.remove('key-highlight'), 180);
    }

    /* Simulate clicking option index 0–3 on current question */
    function triggerOptionByKeyboard(optIdx) {
        if (!activeQuiz.running || activeQuiz.isPaused) return;
        const qIdx = activeQuiz.currQIdx;
        const container = document.getElementById('opts-' + qIdx);
        if (!container) return;
        const btns = container.querySelectorAll('.quiz-opt-btn:not(:disabled)');
        // Find visible buttons
        const visible = Array.from(container.querySelectorAll('.quiz-opt-btn')).filter(b => b.style.opacity !== '0');
        if (visible[optIdx] && !visible[optIdx].disabled) {
            AudioEngine.keyPress();
            visible[optIdx].click();
        }
    }

    /* Main keyboard listener — only hijacks keys when quiz is active
       and user is NOT typing in any input/textarea */
    document.addEventListener('keydown', function(e) {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isTyping = (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable);

        // K — toggle HUD (works anytime, not while typing)
        if (e.key === 'k' || e.key === 'K') {
            if (!isTyping) {
                flashHudKey('k');
                toggleKbdHud();
                return;
            }
        }

        // M — mute toggle (anytime, not while typing)
        if (e.key === 'm' || e.key === 'M') {
            if (!isTyping) {
                flashHudKey('m');
                AudioEngine.toggleMute();
                showKbdToast(AudioEngine.muted ? '🔇 Sound Muted' : '🔊 Sound On');
                return;
            }
        }

        // All quiz-active shortcuts below
        if (!activeQuiz.running) return;
        if (isTyping) return;

        switch (e.key) {
            case '1':
                flashHudKey('1');
                AudioEngine.keyPress();
                showKbdToast('⌨️ Option A');
                triggerOptionByKeyboard(0);
                e.preventDefault();
                break;
            case '2':
                flashHudKey('2');
                AudioEngine.keyPress();
                showKbdToast('⌨️ Option B');
                triggerOptionByKeyboard(1);
                e.preventDefault();
                break;
            case '3':
                flashHudKey('3');
                AudioEngine.keyPress();
                showKbdToast('⌨️ Option C');
                triggerOptionByKeyboard(2);
                e.preventDefault();
                break;
            case '4':
                flashHudKey('4');
                AudioEngine.keyPress();
                showKbdToast('⌨️ Option D');
                triggerOptionByKeyboard(3);
                e.preventDefault();
                break;
            case ' ':
            case 'Spacebar':
                flashHudKey('space');
                AudioEngine.skip();
                showKbdToast('⏭ Skipped');
                sendMenuCommand('/skip');
                e.preventDefault();
                break;
            case 'p':
            case 'P':
                flashHudKey('p');
                if (activeQuiz.isPaused) {
                    AudioEngine.resume();
                    showKbdToast('▶️ Resumed');
                    sendMenuCommand('/resume');
                } else {
                    AudioEngine.pause();
                    showKbdToast('⏸ Paused');
                    sendMenuCommand('/pause');
                }
                e.preventDefault();
                break;
            case 'Escape':
                flashHudKey('esc');
                if (confirm('Stop the current quiz?')) {
                    AudioEngine.click();
                    showKbdToast('🛑 Quiz Stopped');
                    sendMenuCommand('/stop');
                }
                e.preventDefault();
                break;
        }
    });
