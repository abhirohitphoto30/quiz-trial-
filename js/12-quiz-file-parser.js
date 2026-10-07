        // Parse Quiz File Content supporting format A and B
        let parsedQuestions = [];
        function parseQuizFile(text) {
            parsedQuestions = [];
            if (!text) return false;
            
            const blocks = text.split(/(?=^\s*Q\s*\.?\s*\d+\s*[\.)])/gim);
            
            for (let block of blocks) {
                block = block.trim();
                if (!block) continue;
                
                const qPattern = /^\s*Q\s*\.?\s*\d+\s*[\.)]/i;
                if (!qPattern.test(block)) {
                    continue;
                }
                
                let questionText = "";
                let options = [];
                let explanation = "";
                
                if (block.includes('😂')) {
                    // Format B: Converted format with 😂 separator
                    const parts = block.split('😂');
                    questionText = parts[0].trim();
                    questionText = questionText.replace(/^\s*Q\s*\.?\s*\d+\s*[\.)]\s*/i, '');
                    
                    const rest = parts[1] || '';
                    const lines = rest.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    
                    let explanationStarted = false;
                    let explanationLines = [];
                    
                    for (let line of lines) {
                        if (/^Ex\s*:\s*/i.test(line)) {
                            explanationStarted = true;
                            explanationLines.push(line);
                        } else if (explanationStarted) {
                            explanationLines.push(line);
                        } else {
                            const isCorrect = line.includes('✅');
                            const cleanText = line.replace(/✅/g, '').trim();
                            options.push({ text: cleanText, isCorrect: isCorrect });
                        }
                    }
                    explanation = explanationLines.join('\n').trim();
                } else {
                    // Format A: Raw format without 😂
                    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length < 2) continue;
                    
                    let firstLine = lines[0];
                    questionText = firstLine.replace(/^\s*Q\s*\.?\s*\d+\s*[\.)]\s*/i, '').trim();
                    
                    let explanationStarted = false;
                    let explanationLines = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        if (/^Ex\s*:\s*/i.test(line)) {
                            explanationStarted = true;
                            explanationLines.push(line);
                        } else if (explanationStarted) {
                            explanationLines.push(line);
                        } else {
                            const isCorrect = line.includes('✅');
                            const cleanText = line.replace(/✅/g, '').trim();
                            options.push({ text: cleanText, isCorrect: isCorrect });
                        }
                    }
                    explanation = explanationLines.join('\n').trim();
                }
                
                if (questionText && options.length >= 2) {
                    if (!options.some(o => o.isCorrect)) {
                        options[0].isCorrect = true;
                    }
                    parsedQuestions.push({
                        question: questionText,
                        options: options,
                        explanation: explanation || "No explanation provided."
                    });
                }
            }
            return parsedQuestions.length > 0;
        }

        function showMockLeaderboard() {
            const userScore = activeQuiz.id ? activeQuiz.score : 0;
            const mockUsers = [
                { username: "@PolityKing", score: 92.50, streak: 15 },
                { username: "@IAS_Dreamer", score: 81.33, streak: 10 },
                { username: "@AntigravityBot", score: 76.66, streak: 9 },
                { username: "You 👤", score: userScore, streak: activeQuiz.bestStreak || 0 },
                { username: "@NewtonJr", score: 54.00, streak: 5 }
            ];
            
            // Sort
            mockUsers.sort((a,b) => b.score - a.score);
            
            let leadText = "🥇 <b>Leaderboard Results:</b>\n\n";
            mockUsers.forEach((u, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🔹";
                leadText += `${medal} <b>${u.username}</b> - Score: <b>${u.score.toFixed(2)}</b> (Streak: 🔥 ${u.streak})\n`;
            });
            printMsg('bot', leadText, true);
        }
