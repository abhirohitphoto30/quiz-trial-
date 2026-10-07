        // ── Telegram Quiz Creator Modal Event Handlers ──
        let creatorBase64Image = null;

        function openQuizCreatorModal() {
            document.getElementById('quiz-creator-modal').classList.add('active');
            resetQuizCreatorForm();
        }

        function closeQuizCreatorModal() {
            document.getElementById('quiz-creator-modal').classList.remove('active');
        }

        function resetQuizCreatorForm() {
            document.getElementById('creator-q-text').value = '';
            document.getElementById('creator-q-explanation').value = '';
            removeCreatorImage();
            
            const container = document.getElementById('creator-options-container');
            container.innerHTML = '';
            for (let i = 0; i < 2; i++) {
                addOptionRow(i, '', i === 0);
            }
            updateAddOptionButtonState();
        }

        function addOptionRow(index, value = '', isCorrect = false) {
            const container = document.getElementById('creator-options-container');
            const row = document.createElement('div');
            row.className = 'creator-option-row';
            row.dataset.index = index;

            // Radio input for correct option selection
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'creator-option-correct';
            radio.className = 'creator-option-correct';
            radio.checked = isCorrect;
            radio.title = "Mark as correct answer";

            // Text input for option content
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'creator-input creator-opt-input';
            input.placeholder = `Option ${index + 1}`;
            input.value = value;

            row.appendChild(radio);
            row.appendChild(input);

            // Delete button for optional rows (index > 1)
            if (index > 1) {
                const delBtn = document.createElement('button');
                delBtn.className = 'creator-option-delete';
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = () => {
                    row.remove();
                    reindexOptions();
                };
                row.appendChild(delBtn);
            }

            container.appendChild(row);
        }

        function addCreatorOption() {
            const container = document.getElementById('creator-options-container');
            const rows = container.querySelectorAll('.creator-option-row');
            if (rows.length >= 10) return;
            addOptionRow(rows.length);
            updateAddOptionButtonState();
        }

        function reindexOptions() {
            const container = document.getElementById('creator-options-container');
            const rows = container.querySelectorAll('.creator-option-row');
            rows.forEach((row, index) => {
                row.dataset.index = index;
                const input = row.querySelector('.creator-opt-input');
                input.placeholder = `Option ${index + 1}`;
                
                const delBtn = row.querySelector('.creator-option-delete');
                if (index <= 1 && delBtn) {
                    delBtn.remove();
                }
            });
            
            const radios = container.querySelectorAll('.creator-option-correct');
            let anyChecked = false;
            radios.forEach(r => {
                if (r.checked) anyChecked = true;
            });
            if (!anyChecked && radios.length > 0) {
                radios[0].checked = true;
            }
            updateAddOptionButtonState();
        }

        function updateAddOptionButtonState() {
            const container = document.getElementById('creator-options-container');
            const rows = container.querySelectorAll('.creator-option-row');
            const addBtn = document.getElementById('creator-add-opt-btn');
            if (rows.length >= 10) {
                addBtn.style.display = 'none';
            } else {
                addBtn.style.display = 'flex';
            }
        }

        function handleCreatorImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            document.getElementById('creator-image-name').textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Compress image by scaling down
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const MAX_SIZE = 600;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    creatorBase64Image = canvas.toDataURL('image/jpeg', 0.7);
                    
                    const preview = document.getElementById('creator-image-preview');
                    preview.src = creatorBase64Image;
                    document.getElementById('creator-image-preview-wrap').style.display = 'block';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function removeCreatorImage() {
            creatorBase64Image = null;
            document.getElementById('creator-image-name').textContent = 'No file chosen';
            const fileInput = document.getElementById('creator-file-input');
            if (fileInput) fileInput.value = '';
            const previewWrap = document.getElementById('creator-image-preview-wrap');
            if (previewWrap) previewWrap.style.display = 'none';
            const previewImg = document.getElementById('creator-image-preview');
            if (previewImg) previewImg.src = '';
        }

        function saveCreatorQuestion() {
            const qText = document.getElementById('creator-q-text').value.trim();
            const explanation = document.getElementById('creator-q-explanation').value.trim();
            
            if (!qText) {
                alert("⚠️ Please enter a question text!");
                return;
            }
            
            const optionRows = document.querySelectorAll('.creator-option-row');
            const options = [];
            let correctIndex = -1;
            
            optionRows.forEach((row, idx) => {
                const text = row.querySelector('.creator-opt-input').value.trim();
                const isCorrect = row.querySelector('.creator-option-correct').checked;
                
                if (text) {
                    options.push({ text: text, isCorrect: isCorrect });
                    if (isCorrect) {
                        correctIndex = options.length - 1;
                    }
                }
            });
            
            if (options.length < 2) {
                alert("⚠️ Please fill in at least 2 options!");
                return;
            }
            
            if (correctIndex === -1) {
                alert("⚠️ Please select a correct answer option!");
                return;
            }
            
            const newQuestion = {
                question: qText,
                options: options,
                explanation: explanation || "No explanation provided.",
                image: creatorBase64Image
            };
            
            creationState.questions.push(newQuestion);
            
            showKbdToast(`🎉 Question ${creationState.questions.length} Created!`);
            
            // Clear inputs for next rapid entry
            document.getElementById('creator-q-text').value = '';
            document.getElementById('creator-q-explanation').value = '';
            removeCreatorImage();
            
            const container = document.getElementById('creator-options-container');
            container.innerHTML = '';
            for (let i = 0; i < 2; i++) {
                addOptionRow(i, '', i === 0);
            }
            updateAddOptionButtonState();
        }

        // Save Db to IndexedDB using localforage
        async function saveQuizzesToLocalStorage() {
            // Find quizzes that were added locally (meaning they aren't pre-embedded)
            const localOnly = quizzesDb.filter(q => {
                if (typeof EMBEDDED_QUIZZES === 'undefined') return true;
                return !EMBEDDED_QUIZZES.some(emb => emb.id === q.id);
            });
            try {
                await localforage.setItem('local_quizzes', localOnly);
            } catch (e) {
                console.error("Failed to save quizzes to IndexedDB:", e);
                alert("⚠️ Storage Error: Failed to save quiz data. Storage quota might be exceeded.");
            }
        }
