        // ═══════════════════════════════════════════════
        // 🎵 ENHANCED AUDIO ENGINE — Rich Sound Design
        // ═══════════════════════════════════════════════
        const AudioEngine = {
            ctx: null,
            muted: false,

            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            },

            toggleMute() {
                this.muted = !this.muted;
                const btn = document.getElementById('sound-toggle-btn');
                if (btn) {
                    btn.innerHTML = this.muted
                        ? '<i class="fa-solid fa-volume-xmark"></i>'
                        : '<i class="fa-solid fa-volume-high"></i>';
                    btn.title = this.muted ? 'Sound Off — Click to Enable' : 'Sound On — Click to Mute';
                    btn.style.color = this.muted ? 'var(--danger)' : 'var(--text-muted)';
                }
                localStorage.setItem('audio_muted', this.muted);
                if (!this.muted) this.click();
            },

            /* Core synthesizer: oscillator + optional detune for richness */
            _osc(freq, type, dur, vol = 0.08, detune = 0, delay = 0) {
                if (this.muted) return;
                try {
                    this.init();
                    const t = this.ctx.currentTime + delay;
                    const osc  = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, t);
                    if (detune) osc.detune.setValueAtTime(detune, t);
                    gain.gain.setValueAtTime(0.001, t);
                    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + dur);
                } catch(e) {}
            },

            /* Layered note: sine + triangle for warmth */
            _chord(freq, dur, vol = 0.07, delay = 0) {
                this._osc(freq,       'sine',     dur, vol,      0,  delay);
                this._osc(freq,       'triangle', dur, vol*0.4, +5,  delay);
                this._osc(freq * 2,   'sine',     dur, vol*0.15, 0,  delay);
            },

            /* ✅ CORRECT — uplifting major triad arpeggio */
            correct() {
                const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
                notes.forEach((n, i) => this._chord(n, 0.25, 0.09, i * 0.07));
            },

            /* ❌ WRONG — descending thud with buzzy sawtooth */
            wrong() {
                this._osc(300, 'sawtooth', 0.08, 0.10);
                this._osc(220, 'sawtooth', 0.18, 0.09, 0, 0.06);
                this._osc(180, 'sine',     0.30, 0.07, 0, 0.12);
            },

            /* ⏱ TICK — sharp click for final countdown */
            tick() {
                this._osc(1200, 'square', 0.025, 0.03);
            },

            /* ⚡ URGENT TICK — double-click pulse at last 5s */
            urgentTick() {
                this._osc(1400, 'square', 0.02, 0.04);
                this._osc(1400, 'square', 0.02, 0.04, 0, 0.08);
            },

            /* 🖱 CLICK — soft UI interaction sound */
            click() {
                this._osc(900, 'sine', 0.045, 0.035);
            },

            /* ⌨️ KEY — keyboard shortcut press feedback */
            keyPress() {
                this._osc(660, 'sine',  0.06, 0.05);
                this._osc(880, 'sine',  0.04, 0.02, 0, 0.03);
            },

            /* ⏸ PAUSE — gentle descending whoosh */
            pause() {
                [440, 392, 349].forEach((n, i) => this._osc(n, 'sine', 0.12, 0.06, 0, i * 0.06));
            },

            /* ▶️ RESUME — ascending whoosh */
            resume() {
                [349, 392, 440, 523].forEach((n, i) => this._chord(n, 0.10, 0.055, i * 0.05));
            },

            /* ⏭ SKIP — quick swipe sound */
            skip() {
                this._osc(500, 'sine', 0.05, 0.06);
                this._osc(700, 'sine', 0.05, 0.05, 0, 0.04);
                this._osc(900, 'sine', 0.05, 0.04, 0, 0.07);
            },

            /* 🔥 STREAK — sizzling ascending burst */
            streak(n) {
                const base = [523, 659, 784, 1046, 1318];
                const count = Math.min(n, 5);
                base.slice(0, count).forEach((f, i) => this._chord(f, 0.18, 0.07, i * 0.06));
            },

            /* 🏆 FANFARE — triumphant quiz end */
            fanfare() {
                const melody = [523, 523, 659, 523, 784, 740, 523, 523, 659, 523, 880, 784];
                const timing = [0, 0.12, 0.24, 0.36, 0.48, 0.66, 0.84, 0.96, 1.08, 1.20, 1.32, 1.50];
                melody.forEach((n, i) => this._chord(n, 0.18, 0.08, timing[i]));
            },

            /* 🌟 LIFELINE — magical shimmer */
            lifeline() {
                [1046, 1318, 1568, 2093].forEach((n, i) => {
                    this._osc(n, 'sine', 0.20, 0.05, 0,   i * 0.05);
                    this._osc(n, 'sine', 0.20, 0.02, +15, i * 0.05);
                });
            },

            /* 🎬 QUIZ START — dramatic countdown beeps */
            quizStart() {
                [300, 350, 400, 600].forEach((n, i) => this._chord(n, 0.15, 0.06, i * 0.18));
            }
        };

        // Restore mute preference
        AudioEngine.muted = localStorage.getItem('audio_muted') === 'true';
