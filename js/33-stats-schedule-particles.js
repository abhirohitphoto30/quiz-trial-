    // ══════════════════════════════════════════
    // MEGA WIN ANIMATION
    // ══════════════════════════════════════════
    function triggerMegaWin(score, accuracy) {
        const overlay = document.getElementById('mega-win-overlay');
        const title = document.getElementById('mw-title');
        const sub = document.getElementById('mw-sub');
        const trophy = overlay.querySelector('.mw-trophy');

        if (accuracy >= 90) {
            trophy.textContent = '&#127942;';
            title.textContent = 'Legendary Performance!';
        } else if (accuracy >= 70) {
            trophy.textContent = '&#129351;';
            title.textContent = 'Excellent Work!';
        } else if (accuracy >= 50) {
            trophy.textContent = '&#129352;';
            title.textContent = 'Good Job!';
        } else {
            trophy.textContent = '&#127891;';
            title.textContent = 'Quiz Complete!';
        }
        sub.textContent = 'Score: ' + (typeof score === 'number' ? score.toFixed(2) : score) + ' | Accuracy: ' + accuracy.toFixed(1) + '%';

        overlay.classList.add('active');

        // Screen shake
        document.getElementById('app').classList.add('screen-shake');
        setTimeout(() => document.getElementById('app').classList.remove('screen-shake'), 500);

        // Confetti burst (existing library)
        const end = Date.now() + 3000;
        (function frame() {
            confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#2481cc','#ec4899','#f59e0b','#4fae5e'] });
            confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#2481cc','#ec4899','#f59e0b','#4fae5e'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();

        // Fireworks bursts
        setTimeout(() => confetti({ particleCount: 120, spread: 120, origin: { y: 0.4 }, colors: ['#f59e0b','#fff','#2481cc'] }), 400);
        setTimeout(() => confetti({ particleCount: 80, spread: 90, origin: { x: 0.3, y: 0.5 }, colors: ['#ec4899','#f59e0b','#4fae5e'] }), 900);
        setTimeout(() => confetti({ particleCount: 80, spread: 90, origin: { x: 0.7, y: 0.5 }, colors: ['#2481cc','#fff','#ec4899'] }), 1400);

        // Hide after 4s
        setTimeout(() => { overlay.classList.remove('active'); }, 4200);
    }

    // ══════════════════════════════════════════
    // STATS DASHBOARD PANEL
    // ══════════════════════════════════════════
    function openStatsPanel() {
        const panel = document.getElementById('stats-panel');
        const content = document.getElementById('stats-panel-content');
        panel.classList.add('open');

        // Compute stats
        const totalQ = quizzesDb.reduce((s, q) => s + q.questions.length, 0);
        const acc = localStats.totalAttempts > 0 ? ((localStats.totalCorrect / localStats.totalAttempts) * 100).toFixed(1) : '0.0';
        const survBest = localStorage.getItem('survival_best') || '0';

        // Subject detection: scan all questions for keywords
        const subjects = { Polity: 0, History: 0, Geography: 0, Science: 0, Economy: 0, Environment: 0, Current: 0 };
        const keywords = {
            Polity: ['constitution','article','parliament','president','governor','supreme court','high court','lok sabha','rajya sabha','amendment','directive','fundamental right'],
            History: ['battle','mughal','british','ancient','medieval','dynasty','revolt','independence','ruler','emperor','emperor','war','colonial'],
            Geography: ['river','mountain','desert','ocean','climate','continent','plateau','peninsula','lake','forest','soil','rainfall','monsoon'],
            Science: ['atom','molecule','cell','biology','physics','chemistry','element','compound','energy','force','light','dna','virus'],
            Economy: ['gdp','inflation','bank','rbi','budget','tax','fiscal','monetary','market','trade','import','export','poverty','growth'],
            Environment: ['species','wildlife','biodiversity','pollution','carbon','ecosystem','ozone','forest','wetland','conservation','climate change'],
            Current: ['recently','2024','2025','summit','launched','agreement','treaty','initiative','yojana','scheme']
        };

        quizzesDb.forEach(quiz => {
            quiz.questions.forEach(q => {
                const text = (q.question + ' ' + q.explanation).toLowerCase();
                Object.keys(keywords).forEach(subj => {
                    if (keywords[subj].some(kw => text.includes(kw))) subjects[subj]++;
                });
            });
        });

        // Gather speed vs accuracy data from localStorage attempt logs
        const scatterData = [];
        quizzesDb.forEach(quiz => {
            const rec = localStorage.getItem('quiz_attempt_' + quiz.id);
            if (rec) {
                try {
                    const p = JSON.parse(rec);
                    const total = (p.incorrectIndices || []).length + (p.correctIndices || []).length;
                    const correct = (p.correctIndices || []).length;
                    if (total > 0) {
                        scatterData.push({
                            acc: (correct / total) * 100,
                            name: quiz.name.substring(0, 12)
                        });
                    }
                } catch(e) {}
            }
        });

        // Build HTML
        const subjectChips = Object.entries(subjects)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `<span class="subject-chip">${k} (${v})</span>`)
            .join('') || '<span style="color:var(--text-muted);font-size:0.8rem;">No data yet</span>';

        const maxSubj = Math.max(...Object.values(subjects), 1);

        const subjBarsHtml = Object.entries(subjects)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => {
                const pct = Math.round((v / totalQ) * 100) || 0;
                const hue = k === 'Polity' ? '#2481cc' : k === 'History' ? '#ec4899' : k === 'Geography' ? '#4fae5e' : k === 'Science' ? '#f59e0b' : k === 'Economy' ? '#9b59b6' : k === 'Environment' ? '#1abc9c' : '#7f8c8d';
                return `<div class="stat-row"><div class="stat-label">${k}</div><div class="stat-value" style="color:${hue}">${v}</div></div>
                        <div class="mini-bar-wrap"><div class="mini-bar-fill" style="width:${pct}%;background:${hue};"></div></div>`;
            }).join('');

        const scatterCanvasId = 'scatter-canvas-' + Date.now();

        content.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-title"><i class="fa-solid fa-chart-simple"></i> Overall Performance</div>
            <div class="stat-row"><div class="stat-label">Total Quizzes</div><div class="stat-value">${quizzesDb.length}</div></div>
            <div class="stat-row"><div class="stat-label">Total Questions</div><div class="stat-value">${totalQ}</div></div>
            <div class="stat-row"><div class="stat-label">Answers Given</div><div class="stat-value">${localStats.totalAttempts}</div></div>
            <div class="stat-row"><div class="stat-label">Correct</div><div class="stat-value" style="color:var(--success)">${localStats.totalCorrect}</div></div>
            <div class="stat-row"><div class="stat-label">Incorrect</div><div class="stat-value" style="color:var(--danger)">${localStats.totalIncorrect || (localStats.totalAttempts - localStats.totalCorrect)}</div></div>
            <div class="stat-row"><div class="stat-label">Accuracy</div><div class="stat-value" style="color:var(--gold)">${acc}%</div></div>
            <div class="mini-bar-wrap" style="margin-top:8px;"><div class="mini-bar-fill" style="width:${acc}%;background:linear-gradient(90deg,var(--danger),var(--gold),var(--success));"></div></div>
            <div class="stat-row" style="margin-top:8px;"><div class="stat-label">Best Streak</div><div class="stat-value">&#128293; ${localStats.bestStreakOverall}</div></div>
            <div class="stat-row"><div class="stat-label">Survival Best Run</div><div class="stat-value">&#10084; ${survBest}</div></div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title"><i class="fa-solid fa-book"></i> Subject Breakdown (auto-detected)</div>
            ${subjBarsHtml || '<div style="color:var(--text-muted);font-size:0.82rem;">Play quizzes to see subject breakdown</div>'}
            <div style="margin-top:10px;">${subjectChips}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title"><i class="fa-solid fa-scatter-chart"></i> Speed vs Accuracy (per quiz)</div>
            <canvas id="${scatterCanvasId}" class="scatter-canvas" width="400" height="160"></canvas>
            <div class="speed-accuracy-label">Each dot = one quiz attempt (bigger circle = more attempted)</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title"><i class="fa-solid fa-list"></i> Quiz Library</div>
            ${quizzesDb.length === 0 ? '<div style="color:var(--text-muted);font-size:0.82rem;">No quizzes created yet.</div>' : quizzesDb.map(q => `<div class="stat-row"><div class="stat-label">${q.name}</div><div class="stat-value">${q.questions.length}Q</div></div>`).join('')}
        </div>`;

        // Draw scatter plot
        setTimeout(() => {
            const canvas = document.getElementById(scatterCanvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const W = canvas.offsetWidth; const H = 160;
            canvas.width = W; canvas.height = H;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, W, H);
            // Axes
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(30, 10); ctx.lineTo(30, H-24); ctx.lineTo(W-10, H-24); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
            ctx.fillText('Accuracy %', W/2, H-4);
            ctx.save(); ctx.translate(12, H/2); ctx.rotate(-Math.PI/2); ctx.fillText('Score', 0, 0); ctx.restore();
            if (scatterData.length === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center'; ctx.font = '11px Inter';
                ctx.fillText('Complete quizzes to see scatter plot', W/2, H/2);
                return;
            }
            scatterData.forEach((d, i) => {
                const x = 30 + (d.acc / 100) * (W - 45);
                const y = (H-24) - ((i+1) / scatterData.length) * (H - 40);
                const hue = d.acc > 75 ? '#4fae5e' : d.acc > 50 ? '#f59e0b' : '#d14e4e';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = hue + 'cc';
                ctx.fill();
                ctx.strokeStyle = hue;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '8px Inter'; ctx.textAlign = 'center';
                ctx.fillText(d.name, x, y - 9);
            });
        }, 80);
    }

    function closeStatsPanel() {
        document.getElementById('stats-panel').classList.remove('open');
    }

    // ══════════════════════════════════════════
    // QUIZ SCHEDULER
    // ══════════════════════════════════════════
    const scheduledTimers = [];

    function confirmSchedule() {
        const qId = document.getElementById('sched-quiz-id').value.trim();
        const timeStr = document.getElementById('sched-time-input').value.trim();
        const status = document.getElementById('sched-status');
        if (!qId || !timeStr) { status.textContent = 'Please fill both fields.'; return; }
        const result = scheduleQuiz(qId, timeStr);
        if (result) {
            status.textContent = '✓ Scheduled! Quiz will auto-start at ' + result;
            setTimeout(() => document.getElementById('sched-modal').classList.remove('active'), 2000);
        } else {
            status.textContent = '⚠️ Invalid time format or quiz not found.';
        }
    }

    function scheduleQuiz(quizId, timeStr) {
        const quiz = quizzesDb.find(q => q.id === quizId);
        if (!quiz) { printMsg('bot', '&#10060; Quiz ID <code>' + quizId + '</code> not found!', true); return null; }

        // Parse time: "19:00", "7PM", "7:30PM", "07:30"
        let hours = -1, mins = 0;
        const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        const match12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
        if (match24) {
            hours = parseInt(match24[1]); mins = parseInt(match24[2]);
        } else if (match12) {
            hours = parseInt(match12[1]); mins = match12[2] ? parseInt(match12[2]) : 0;
            if (match12[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (match12[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        if (hours < 0 || hours > 23) return null;

        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        const ms = target - now;

        const label = hours.toString().padStart(2,'0') + ':' + mins.toString().padStart(2,'0');
        printMsg('bot', '&#9200; <b>Quiz Scheduled!</b><br><b>' + quiz.name + '</b> will auto-start at <b>' + label + '</b> (in ' + Math.round(ms/60000) + ' min).', true);

        const t = setTimeout(() => {
            printMsg('bot', '&#9200; <b>Scheduled Start!</b> Launching <b>' + quiz.name + '</b> now!', true);
            initiateQuizFlow(quizId);
        }, ms);
        scheduledTimers.push(t);
        return label;
    }

    // ══════════════════════════════════════════
    // LIVE PARTICLE BACKGROUND
    // ══════════════════════════════════════════
    let particleAnimFrame = null;
    const particles = [];
    const PARTICLE_TYPES = ['star','gem','spark','energy'];

    function initParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles.length = 0;
        for (let i = 0; i < 40; i++) {
            spawnParticle(canvas);
        }
        if (particleAnimFrame) cancelAnimationFrame(particleAnimFrame);
        animateParticles();
    }

    function spawnParticle(canvas) {
        const types = ['star','gem','spark','energy'];
        const type = types[Math.floor(Math.random() * types.length)];
        const glyphs = { star: '&#10022;', gem: '&#9830;', spark: '&#10022;', energy: '&#9889;' };
        particles.push({
            x: Math.random() * (canvas || document.getElementById('particle-canvas')).width,
            y: Math.random() * (canvas || document.getElementById('particle-canvas')).height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -(Math.random() * 0.5 + 0.1),
            size: Math.random() * 10 + 8,
            alpha: Math.random() * 0.5 + 0.2,
            type: type,
            glyph: glyphs[type],
            life: Math.random() * 200 + 100,
            maxLife: 300
        });
    }

    function animateParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const colors = {
            star: '#f59e0b', gem: '#2481cc', spark: '#ec4899', energy: '#4fae5e'
        };
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            const fade = p.life < 60 ? (p.life / 60) : 1;
            ctx.globalAlpha = p.alpha * fade;
            ctx.fillStyle = colors[p.type] || '#fff';
            ctx.font = p.size + 'px serif';
            ctx.fillText(p.type === 'star' ? '&#x2726;' : p.type === 'gem' ? '&#x25C6;' : p.type === 'spark' ? '&#x2728;' : '&#x26A1;', p.x, p.y);
            if (p.life <= 0) {
                particles.splice(i, 1);
                spawnParticle(canvas);
            }
        }
        ctx.globalAlpha = 1;
        particleAnimFrame = requestAnimationFrame(animateParticles);
    }

    function reinitParticles() {
        initParticles();
    }

    window.addEventListener('resize', () => {
        const canvas = document.getElementById('particle-canvas');
        if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    });

    // ── Use Unicode via textContent instead of HTML entities ──
    (function fixParticleGlyphs() {
        // We'll use direct Unicode characters for particles
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) { setTimeout(fixParticleGlyphs, 200); return; }
        particles.length = 0;
        const glyphMap = ['&#9733;', '&#9830;', '&#10024;', '&#9889;'];
        for (let i = 0; i < 40; i++) {
            const type = PARTICLE_TYPES[i % 4];
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: -(Math.random() * 0.45 + 0.1),
                char: ['★', '♦', '✨', '⚡'][i % 4],
                color: ['#f59e0b', '#2481cc', '#ec4899', '#4fae5e'][i % 4],
                size: Math.random() * 10 + 8,
                alpha: Math.random() * 0.45 + 0.15,
                life: Math.random() * 200 + 100,
                type
            });
        }
        if (particleAnimFrame) cancelAnimationFrame(particleAnimFrame);
        (function loopParticles() {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.life--;
                const fade = p.life < 60 ? (p.life / 60) : 1;
                ctx.globalAlpha = p.alpha * fade;
                ctx.fillStyle = p.color;
                ctx.font = p.size + 'px serif';
                ctx.fillText(p.char, p.x, p.y);
                if (p.life <= 0 || p.y < -20) {
                    p.x = Math.random() * canvas.width;
                    p.y = canvas.height + 10;
                    p.life = Math.random() * 200 + 100;
                    p.vx = (Math.random() - 0.5) * 0.35;
                    p.vy = -(Math.random() * 0.45 + 0.1);
                }
            }
            ctx.globalAlpha = 1;
            particleAnimFrame = requestAnimationFrame(loopParticles);
        })();
    })();
