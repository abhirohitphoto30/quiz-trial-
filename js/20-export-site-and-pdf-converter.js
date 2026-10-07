        // Exporter Implementation
        function exportUpdatedHtml() {
            AudioEngine.click();
            let source = document.documentElement.outerHTML;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(source, 'text/html');
            
            // Reset configurations and clean dynamically altered UI elements
            doc.getElementById('config-modal').classList.remove('active');
            doc.getElementById('sticky-stats-bar').classList.remove('active');
            
            // Inject database array into scripts
            const dbScript = doc.getElementById('database-script');
            if (dbScript) {
                dbScript.textContent = `\n        // DATABASE_START\n        const EMBEDDED_QUIZZES = ${JSON.stringify(quizzesDb, null, 4)};\n        // DATABASE_END\n    `;
            }
            
            // Clear dynamically generated feed elements
            doc.getElementById('chat-history').innerHTML = `
                <div class="chat-message bot">
                    <div class="message-bubble">
                        <strong>Telegram Quiz Bot 🤖</strong><br>
                        Welcome! I am your interactive Telegram Quiz Bot. You can create, manage, and play gamified quizzes directly here.<br><br>
                        Type <strong>/help</strong> to see all available commands or use the shortcut buttons below!
                    </div>
                </div>
            `;
            
            const updatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
            
            const blob = new Blob([updatedHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'index.html';
            a.click();
            URL.revokeObjectURL(url);
            
            printMsg('bot', "💾 <b>HTML exported successfully!</b>\nReplace your existing <code>index.html</code> with the downloaded file to make all your quizzes permanent.", true);
        }

        // ==========================================
        // PDF CONVERTER FLOWS & CONTROLLER LOGIC
        // ==========================================
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const activeConverterSessions = {};

        function initiatePdfConverterFlow(type) {
            const cardId = `cvt-${Date.now()}`;
            activeConverterSessions[cardId] = {
                type: type,
                testFile: null,
                solFile: null,
                finalTxt: '',
                filename: '',
                logLines: [],
                logOpen: false
            };

            const title = type === 'vision' ? 'VisionIAS PDF → TXT' :
                          type === 'vajiram' ? 'Vajiram PDF → TXT' :
                          type === 'sfg' ? 'ForumIAS SFG PDF → TXT' :
                          type === 'pw' ? 'OnlyIAS PW PDF → TXT' : 'PDF → TXT';

            const desc = type === 'sfg' 
                ? 'Upload 1 Solutions PDF (which contains both questions and answers).'
                : 'Upload Test PDF (Booklet) + Solution PDF (with Answers & Explanations).';

            const inputsHtml = type === 'sfg' ? `
                <div class="upload-btn-wrap">
                    <button class="inline-key" onclick="triggerCardFile('sol', '${cardId}')">Upload Solution PDF 💡</button>
                    <span class="file-name" id="file-sol-${cardId}">Click to upload file</span>
                </div>
            ` : `
                <div class="upload-btn-wrap">
                    <button class="inline-key" onclick="triggerCardFile('test', '${cardId}')">Upload Test PDF 📋</button>
                    <span class="file-name" id="file-test-${cardId}">Click to upload file</span>
                </div>
                <div class="upload-btn-wrap">
                    <button class="inline-key" onclick="triggerCardFile('sol', '${cardId}')">Upload Solution PDF 💡</button>
                    <span class="file-name" id="file-sol-${cardId}">Click to upload file</span>
                </div>
            `;

            const cardHtml = `
                <div class="converter-card" id="converter-${cardId}">
                    <div class="converter-header">
                        <i class="fa-solid fa-file-pdf"></i>
                        <h4>${title} Converter</h4>
                    </div>
                    <div class="converter-desc">${desc}</div>
                    <div class="converter-inputs">
                        ${inputsHtml}
                    </div>
                    <button class="primary-btn" id="run-${cardId}" disabled onclick="runConverter('${cardId}')" style="background: linear-gradient(135deg, var(--telegram-blue), #50a2e3); margin-top: 5px;">
                        ⚙️ Convert to TXT
                    </button>
                    <div class="converter-progress" id="progress-${cardId}" style="display:none;">
                        <div class="progress-bar-wrap">
                            <div class="progress-bar-fill" id="fill-${cardId}"></div>
                        </div>
                        <span class="progress-lbl" id="lbl-${cardId}">Processing…</span>
                    </div>
                    <div class="converter-logs-section" id="logs-container-${cardId}" style="display:none;">
                        <button class="log-toggle-btn" onclick="toggleCardLog('${cardId}')">
                            <span>🔍 Processing Logs</span>
                            <span id="arrow-${cardId}">▾</span>
                        </button>
                        <div class="log-body-box" id="log-${cardId}" style="display:none;"></div>
                    </div>
                    <div class="converter-actions" id="actions-${cardId}" style="display:none; margin-top: 5px;">
                        <button class="primary-btn" id="dl-${cardId}" onclick="downloadConvertedTxt('${cardId}')" style="background: linear-gradient(135deg, var(--success), #2ecc71);">
                            ⬇️ Download .txt File
                        </button>
                    </div>
                </div>
            `;

            printMsg('bot', cardHtml, true);
        }

        function triggerCardFile(fileType, cardId) {
            const session = activeConverterSessions[cardId];
            if (!session) return;

            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = '.pdf';
            tempInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
                    if (fileType === 'test') {
                        session.testFile = file;
                        const fnLabel = document.getElementById(`file-test-${cardId}`);
                        if (fnLabel) fnLabel.textContent = `✓ ${file.name} (${sizeInMb} MB)`;
                    } else if (fileType === 'sol') {
                        session.solFile = file;
                        const fnLabel = document.getElementById(`file-sol-${cardId}`);
                        if (fnLabel) fnLabel.textContent = `✓ ${file.name} (${sizeInMb} MB)`;
                    }
                    
                    // Enable run button if ready
                    const runBtn = document.getElementById(`run-${cardId}`);
                    if (runBtn) {
                        if (session.type === 'sfg') {
                            runBtn.disabled = !session.solFile;
                        } else {
                            runBtn.disabled = !(session.testFile && session.solFile);
                        }
                    }
                }
            };
            tempInput.click();
        }

        function toggleCardLog(cardId) {
            const session = activeConverterSessions[cardId];
            if (!session) return;
            session.logOpen = !session.logOpen;
            
            const logBody = document.getElementById(`log-${cardId}`);
            const arrow = document.getElementById(`arrow-${cardId}`);
            if (logBody && arrow) {
                logBody.style.display = session.logOpen ? 'block' : 'none';
                arrow.textContent = session.logOpen ? '▴' : '▾';
            }
        }

        function addCardLog(cardId, msg, type = '') {
            const session = activeConverterSessions[cardId];
            if (!session) return;
            
            // Show log section
            const logContainer = document.getElementById(`logs-container-${cardId}`);
            if (logContainer) logContainer.style.display = 'block';

            const logBody = document.getElementById(`log-${cardId}`);
            if (logBody) {
                const div = document.createElement('div');
                if (type) div.className = 'log-' + type;
                div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
                logBody.appendChild(div);
                logBody.scrollTop = logBody.scrollHeight;
            }
        }

        function setCardProgress(cardId, pct, text) {
            const progressWrap = document.getElementById(`progress-${cardId}`);
            if (progressWrap) progressWrap.style.display = 'flex';

            const fill = document.getElementById(`fill-${cardId}`);
            const label = document.getElementById(`lbl-${cardId}`);
            if (fill) fill.style.width = pct + '%';
            if (label) label.textContent = text;
        }

        function downloadConvertedTxt(cardId) {
            const session = activeConverterSessions[cardId];
            if (!session || !session.finalTxt) return;
            
            const blob = new Blob([session.finalTxt], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = session.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async function runConverter(cardId) {
            const session = activeConverterSessions[cardId];
            if (!session) return;

            const runBtn = document.getElementById(`run-${cardId}`);
            if (runBtn) runBtn.disabled = true;

            const addLog = (msg, type = '') => addCardLog(cardId, msg, type);
            const setProgress = (pct, text) => setCardProgress(cardId, pct, text);

            try {
                if (session.type === 'vision') {
                    session.filename = session.testFile.name.replace(/\.pdf$/i, '') + '_VISION_CONVERTED.txt';
                    const result = await VisionParser.run(session.testFile, session.solFile, setProgress, addLog);
                    session.finalTxt = result.text;
                } else if (session.type === 'vajiram') {
                    session.filename = session.testFile.name.replace(/\.pdf$/i, '') + '_VAJIRAM_CONVERTED.txt';
                    const result = await VajiramParser.run(session.testFile, session.solFile, setProgress, addLog);
                    session.finalTxt = result.text;
                } else if (session.type === 'sfg') {
                    session.filename = session.solFile.name.replace(/\.pdf$/i, '') + '_SFG_CONVERTED.txt';
                    const result = await SfgParser.run(session.solFile, setProgress, addLog);
                    session.finalTxt = result.text;
                } else if (session.type === 'pw') {
                    session.filename = session.testFile.name.replace(/\.pdf$/i, '') + '_PW_CONVERTED.txt';
                    const result = await PwParser.run(session.testFile, session.solFile, setProgress, addLog);
                    session.finalTxt = result.text;
                }

                // Show download button
                const actionsSec = document.getElementById(`actions-${cardId}`);
                if (actionsSec) actionsSec.style.display = 'block';

                addLog('✓ Conversion completed successfully!', 'ok');
            } catch (err) {
                console.error(err);
                addLog('❌ Conversion failed: ' + (err.message || err), 'err');
                setProgress(0, 'Failed');
            } finally {
                if (runBtn) runBtn.disabled = false;
            }
        }
