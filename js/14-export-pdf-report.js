        function formatPdfDate(date) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const d = date.getDate();
            const m = months[date.getMonth()];
            const y = date.getFullYear();
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strHours = String(hours).padStart(2, '0');
            return `${d} ${m} ${y}, ${strHours}:${minutes} ${ampm} IST`;
        }

        function generatePdfReport(quiz, participantName, resultData) {
            // ── Pure jsPDF implementation (no html2canvas) ──
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

            const PW = 210, PH = 297;
            const ML = 14, MR = 14, MT = 15, MB = 15;
            const CW = PW - ML - MR; // 182 mm
            const quizName = quiz.name || 'Quiz';
            const formattedDate = formatPdfDate(new Date());
            let pageNum = 1;

            function safeText(t) {
                return (t || '').replace(/[^\x00-\xFF]/g, '');
            }
            function addPageHeader() {
                const nameShort = quizName.length > 45 ? quizName.slice(0, 42) + '...' : quizName;
                doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(160, 160, 160);
                doc.text(safeText(nameShort), PW - MR, MT - 4, { align: 'right' });
            }
            function addFooter() {
                doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
                doc.line(ML, PH - MB, PW - MR, PH - MB);
                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
                const nameShort = quizName.length > 45 ? quizName.slice(0, 42) + '...' : quizName;
                doc.text(safeText(nameShort), ML, PH - MB + 5);
                doc.text('Page ' + pageNum, PW - MR, PH - MB + 5, { align: 'right' });
            }

            // ── PAGE 1: Cover / Leaderboard ──
            addPageHeader();
            let y = MT + 12;

            doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
            const titleLines = doc.splitTextToSize(safeText(quizName), CW);
            doc.text(titleLines, PW / 2, y, { align: 'center' });
            y += titleLines.length * 9 + 4;

            doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 90, 110);
            const metaParts = [];
            if (quiz.id) metaParts.push(safeText(quiz.id));
            metaParts.push(safeText(formattedDate));
            metaParts.push(quiz.questions.length + ' Questions');
            metaParts.push('+' + marksPositive + ' / -' + marksNegative);
            doc.text(metaParts.join('  |  '), PW / 2, y, { align: 'center' });
            y += 5;

            doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.6);
            doc.line(ML, y, PW - MR, y);
            y += 9;

            if (resultData) {
                // ── REPORT CARD SECTION ──
                let yStart = y;
                
                // Section Title: PERFORMANCE REPORT CARD
                doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                doc.text('PERFORMANCE REPORT CARD', PW / 2, yStart, { align: 'center' });
                yStart += 5;
                
                doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
                doc.text('Participant: ' + safeText(participantName), PW / 2, yStart, { align: 'center' });
                yStart += 9;

                // 2x2 Grid of cards
                const gridY1 = yStart;
                const gridH = 20;
                const cardW = CW / 2 - 3; // 88 mm each
                const col1X = ML;
                const col2X = ML + cardW + 6;

                // Card 1: Score
                doc.setFillColor(240, 244, 255); doc.setDrawColor(165, 180, 252); doc.setLineWidth(0.3);
                doc.roundedRect(col1X, gridY1, cardW, gridH, 2, 2, 'FD');
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229);
                doc.text('FINAL SCORE', col1X + 5, gridY1 + 5.5);
                const totalQ = quiz.questions.length;
                const maxPossibleScore = totalQ * marksPositive;
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                doc.text(resultData.score.toFixed(2) + ' / ' + maxPossibleScore.toFixed(0), col1X + 5, gridY1 + 13.5);

                // Card 2: Accuracy
                const accVal = resultData.accuracy || 0;
                let accBg = [240, 253, 244]; // Light Green
                let accBorder = [134, 239, 172]; // Green 300
                let accText = [21, 128, 61]; // Green 700
                if (accVal < 50) {
                    accBg = [254, 242, 242]; // Light Red
                    accBorder = [252, 165, 165]; // Red 300
                    accText = [185, 28, 28]; // Red 700
                } else if (accVal < 75) {
                    accBg = [254, 243, 199]; // Light Amber
                    accBorder = [251, 207, 102]; // Amber 300
                    accText = [180, 83, 9]; // Amber 700
                }
                doc.setFillColor(accBg[0], accBg[1], accBg[2]);
                doc.setDrawColor(accBorder[0], accBorder[1], accBorder[2]);
                doc.roundedRect(col2X, gridY1, cardW, gridH, 2, 2, 'FD');
                
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(accText[0], accText[1], accText[2]);
                doc.text('ACCURACY', col2X + 5, gridY1 + 5.5);
                
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(accText[0], accText[1], accText[2]);
                let accTextStr = accVal.toFixed(1) + '%';
                let accLevel = 'Needs Practice';
                if (accVal >= 90) accLevel = 'Elite';
                else if (accVal >= 75) accLevel = 'Good';
                else if (accVal >= 50) accLevel = 'Average';
                doc.text(accTextStr + ' (' + accLevel + ')', col2X + 5, gridY1 + 13.5);

                const gridY2 = gridY1 + gridH + 3.5;

                // Card 3: Time Spent
                doc.setFillColor(254, 243, 199); doc.setDrawColor(253, 230, 138);
                doc.roundedRect(col1X, gridY2, cardW, gridH, 2, 2, 'FD');
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 83, 9);
                doc.text('TIME ELAPSED', col1X + 5, gridY2 + 5.5);
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14);
                doc.text(safeText(resultData.timeSpent || '---'), col1X + 5, gridY2 + 13.5);

                // Card 4: Avg Speed
                doc.setFillColor(245, 243, 255); doc.setDrawColor(221, 214, 254);
                doc.roundedRect(col2X, gridY2, cardW, gridH, 2, 2, 'FD');
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(109, 40, 217);
                doc.text('AVERAGE SPEED', col2X + 5, gridY2 + 5.5);
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(92, 36, 150);
                doc.text(safeText(resultData.avgSpeed || '---') + ' / Q', col2X + 5, gridY2 + 13.5);

                let yProgress = gridY2 + gridH + 7;

                // ── ACCURACY DISTRIBUTION BAR ──
                doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(31, 41, 55);
                doc.text('ANSWER DISTRIBUTION', ML, yProgress);
                yProgress += 3.5;

                // Draw segmented progress bar
                const barH = 5.5;
                const barW = CW;
                const totalAnswers = resultData.correct + resultData.incorrect + resultData.unattempted;
                const corrW = totalAnswers > 0 ? (resultData.correct / totalAnswers) * barW : 0;
                const incorrW = totalAnswers > 0 ? (resultData.incorrect / totalAnswers) * barW : 0;
                const unattW = totalAnswers > 0 ? (resultData.unattempted / totalAnswers) * barW : barW;

                doc.setFillColor(229, 231, 235);
                doc.roundedRect(ML, yProgress, barW, barH, 1.5, 1.5, 'F');

                let currentX = ML;
                if (corrW > 0) {
                    doc.setFillColor(34, 197, 94);
                    doc.rect(currentX, yProgress, corrW, barH, 'F');
                    currentX += corrW;
                }
                if (incorrW > 0) {
                    doc.setFillColor(239, 68, 68);
                    doc.rect(currentX, yProgress, incorrW, barH, 'F');
                    currentX += incorrW;
                }
                if (unattW > 0) {
                    doc.setFillColor(156, 163, 175);
                    doc.rect(currentX, yProgress, unattW, barH, 'F');
                }

                doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.35);
                doc.roundedRect(ML, yProgress, barW, barH, 1.5, 1.5, 'S');

                yProgress += barH + 4.5;

                // Legend markers
                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
                doc.setFillColor(34, 197, 94); doc.rect(ML + 5, yProgress - 2.2, 2.5, 2.5, 'F');
                doc.text('Correct: ' + resultData.correct, ML + 9, yProgress);

                doc.setFillColor(239, 68, 68); doc.rect(ML + 55, yProgress - 2.2, 2.5, 2.5, 'F');
                doc.text('Incorrect: ' + resultData.incorrect, ML + 59, yProgress);

                doc.setFillColor(156, 163, 175); doc.rect(ML + 110, yProgress - 2.2, 2.5, 2.5, 'F');
                doc.text('Unattempted: ' + resultData.unattempted, ML + 114, yProgress);
                
                doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text('Best Streak: ' + (quiz.bestStreak || 0), ML + 150, yProgress);

                let yBadges = yProgress + 10;

                // ── ACHIEVEMENTS / BADGES SECTION ──
                doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                doc.text('ACHIEVEMENTS & BADGES EARNED', ML, yBadges);
                
                doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.5);
                doc.line(ML, yBadges + 1.8, PW - MR, yBadges + 1.8);
                
                yBadges += 6.5;

                const badgesList = resultData.badges || [];
                if (badgesList.length === 0) {
                    doc.setFillColor(249, 250, 251); doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
                    doc.roundedRect(ML, yBadges, CW, 16, 1.5, 1.5, 'FD');
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(107, 114, 128);
                    doc.text('No badges earned in this attempt. Keep practice going with higher speed and accuracy to unlock achievements!', ML + 6, yBadges + 9.5);
                } else {
                    const badgeH = 14;
                    const badgeW = CW / 2 - 3;
                    doc.setFontSize(8.5);
                    badgesList.slice(0, 6).forEach((b, bIdx) => {
                        const colIdx = bIdx % 2;
                        const rowIdx = Math.floor(bIdx / 2);
                        const bx = colIdx === 0 ? ML : ML + badgeW + 6;
                        const by = yBadges + rowIdx * (badgeH + 3);

                        doc.setFillColor(255, 251, 235); doc.setDrawColor(253, 230, 138); doc.setLineWidth(0.25);
                        doc.roundedRect(bx, by, badgeW, badgeH, 1.5, 1.5, 'FD');

                        doc.setFillColor(245, 158, 11);
                        doc.circle(bx + 6.5, by + 7, 3.8, 'F');
                        
                        const initials = b.name ? b.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'B';
                        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                        doc.text(initials, bx + 6.5, by + 9.5, { align: 'center' });

                        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                        doc.text(safeText(b.name || 'Achievement'), bx + 13.5, by + 5.2);

                        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
                        const descTrunc = b.desc.length > 55 ? b.desc.slice(0, 52) + '...' : b.desc;
                        doc.text(safeText(descTrunc), bx + 13.5, by + 10.2);
                    });
                }
            } else {
                // ── BOOKLET COVER MODE ──
                let yStart = y;
                
                doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                doc.text('OFFICIAL QUESTION BOOKLET', PW / 2, yStart, { align: 'center' });
                yStart += 7;

                const boxH = 26;
                doc.setFillColor(248, 250, 252); doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
                doc.roundedRect(ML, yStart, CW, boxH, 2, 2, 'FD');

                doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
                doc.text('BOOKLET INFORMATION:', ML + 6, yStart + 6);
                
                doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
                const infoLines = [
                    'Total Questions: ' + quiz.questions.length,
                    'Marking Scheme: +' + marksPositive + ' for Correct  |  -' + marksNegative + ' for Incorrect',
                    'Generated on: ' + formattedDate + ' IST'
                ];
                infoLines.forEach((line, li) => {
                    doc.text('• ' + safeText(line), ML + 8, yStart + 11.5 + li * 4.5);
                });

                yStart += boxH + 10;

                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
                doc.text('GENERAL INSTRUCTIONS', ML, yStart);
                
                doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.5);
                doc.line(ML, yStart + 1.8, PW - MR, yStart + 1.8);
                
                yStart += 6.5;

                const insts = [
                    'All questions in this booklet are multiple choice questions (MCQs) with exactly one correct option.',
                    'Read the complete question text and references carefully before selecting your option.',
                    'The marking scheme applies strictly: positive marks are added for correct answers, and negative marks are deducted for wrong answers.',
                    'Unattempted questions receive zero marks and do not affect your scoring streak.',
                    'This booklet was generated automatically by the Quiz Bot Simulator and contains verified answer keys and explanations at the end of each question card.',
                    'Do not distribute or share answer keys prior to active group sessions.'
                ];

                doc.setFillColor(254, 254, 255); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25);
                doc.roundedRect(ML, yStart, CW, 75, 2, 2, 'FD');

                let iy = yStart + 7;
                insts.forEach((inst, insIdx) => {
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
                    const instSplit = doc.splitTextToSize((insIdx + 1) + '.  ' + inst, CW - 12);
                    doc.text(instSplit, ML + 6, iy);
                    iy += instSplit.length * 3.8 + 2.5;
                });
            }

            addFooter();

            // ── QUESTIONS PAGES (2-column layout) ──
            const COL_W = (CW - 6) / 2; // ~88 mm each
            const COL1_X = ML, COL2_X = ML + COL_W + 6;
            const PAGE_BOT = PH - MB - 12;
            const LINE_H = 4.0;
            const PAD = 3;

            let col = 0, cy = 0, firstQAPage = true;

            function getColX() { return col === 0 ? COL1_X : COL2_X; }
            function getTopY() { return firstQAPage ? MT + 12 : MT + 5; }

            function nextCol() {
                if (col === 0) { col = 1; cy = getTopY(); }
                else {
                    addFooter();
                    doc.addPage(); pageNum++;
                    addPageHeader();
                    col = 0; firstQAPage = false;
                    cy = MT + 5;
                }
            }

            // New page + banner
            doc.addPage(); pageNum++; addPageHeader();
            doc.setFillColor(30, 58, 138);
            doc.rect(ML, MT, CW, 7.5, 'F');
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text('QUESTIONS & ANSWERS', ML + 5, MT + 5.2);
            cy = MT + 12; col = 0;

            quiz.questions.forEach((q, idx) => {
                const qNum = idx + 1;
                const letters = ['A)', 'B)', 'C)', 'D)'];
                const correctIdx = q.options ? q.options.findIndex(o => o.isCorrect) : -1;
                const rawQ = safeText((q.question || '').replace(/^\s*Q\d+\.\s*/i, ''));
                const rawExp = safeText((q.explanation || '').replace(/^Ex:\s*/i, ''));

                // Correct answer label e.g. "ANSWER = A) Paris"
                const correctOptText = correctIdx >= 0 && q.options[correctIdx]
                    ? letters[correctIdx] + ' ' + safeText(q.options[correctIdx].text || '')
                    : '';
                const answerLabel = correctOptText ? 'ANSWER = ' + correctOptText : '';

                doc.setFontSize(8.5);
                const qLines = doc.splitTextToSize(rawQ, COL_W - PAD * 2);

                const parsedOpts = (q.options || []).map((opt, oi) => {
                    doc.setFontSize(8);
                    const lines = doc.splitTextToSize(letters[oi] + ' ' + safeText(opt.text || ''), COL_W - PAD * 2 - 2);
                    return { lines };
                });

                doc.setFontSize(7.5);
                const ansLines = answerLabel ? doc.splitTextToSize(answerLabel, COL_W - PAD * 2 - 2) : [];

                doc.setFontSize(7);
                const expLines = doc.splitTextToSize('Explanation: ' + rawExp, COL_W - PAD * 2 - 2).slice(0, 12);

                // Calculate card height
                doc.setFontSize(8.5);
                const qH = qLines.length * LINE_H;
                doc.setFontSize(8);
                const optsH = parsedOpts.reduce((s, o) => s + o.lines.length * LINE_H + 1, 0);
                doc.setFontSize(7.5);
                const ansH = ansLines.length > 0 ? ansLines.length * LINE_H + 2 : 0;
                doc.setFontSize(7);
                const expH = expLines.length * 3.8;
                const cardH = PAD + 6 + qH + 3 + optsH + 2 + ansH + 3 + expH + PAD;

                if (cy + cardH > PAGE_BOT) nextCol();

                const cx = getColX();

                // Card background + border
                doc.setFillColor(249, 251, 253);
                doc.roundedRect(cx, cy, COL_W, cardH, 1.5, 1.5, 'F');
                doc.setDrawColor(218, 225, 236); doc.setLineWidth(0.2);
                doc.roundedRect(cx, cy, COL_W, cardH, 1.5, 1.5, 'S');

                // Q# badge
                doc.setFillColor(30, 58, 138);
                doc.roundedRect(cx + PAD, cy + PAD - 0.5, 15, 5, 1, 1, 'F');
                doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                doc.text('Q' + qNum, cx + PAD + 7.5, cy + PAD + 3.2, { align: 'center' });

                let iy = cy + PAD + 7;

                // Question text
                doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text(qLines, cx + PAD, iy);
                iy += qLines.length * LINE_H + 2;

                // All options — no highlight, uniform style
                parsedOpts.forEach(({ lines }) => {
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
                    doc.text(lines, cx + PAD + 2, iy);
                    iy += lines.length * LINE_H + 1;
                });

                iy += 2;

                // ANSWER = ... line
                if (ansLines.length > 0) {
                    const ansBoxH = ansLines.length * LINE_H + 2;
                    doc.setFillColor(219, 234, 254);
                    doc.rect(cx + PAD, iy - 1.5, COL_W - PAD * 2, ansBoxH, 'F');
                    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.7);
                    doc.line(cx + PAD, iy - 1.5, cx + PAD, iy - 1.5 + ansBoxH);
                    doc.setLineWidth(0.2);
                    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 78, 216);
                    doc.text(ansLines, cx + PAD + 3, iy);
                    iy += ansBoxH + 1;
                }

                iy += 2;

                // Explanation box
                doc.setFontSize(7);
                const expBoxH = expLines.length * 3.8 + 2.5;
                doc.setFillColor(255, 251, 235);
                doc.rect(cx + PAD, iy - 1.5, COL_W - PAD * 2, expBoxH, 'F');
                doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.7);
                doc.line(cx + PAD, iy - 1.5, cx + PAD, iy - 1.5 + expBoxH);
                doc.setLineWidth(0.2);
                doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 40, 50);
                doc.text(expLines, cx + PAD + 3, iy);

                cy += cardH + 3;
            });

            addFooter();
            doc.save(safeText(quizName).replace(/\s+/g, '_') + '_Report.pdf');
            
            // Stagger download of themed mindmaps to avoid browser blocking
            setTimeout(() => {
                generateThemedMindmaps(quiz);
            }, 600);
            
            return; // ── END of new implementation ──
        }

        function generateAndDownloadHtml(quiz) {
            try {
                triggerHtmlDownload(quiz);
                printMsg('bot', `✅ Playable HTML booklet downloaded successfully for <b>${quiz.name}</b>.`, true);
            } catch(e) {
                console.error(e);
                printMsg('bot', `❌ Failed to download HTML booklet: ` + e.message);
            }
        }

        function generateAndDownloadPdf(quiz) {
            try {
                generatePdfReport(quiz, "Participant", null);
                printMsg('bot', `✅ PDF Booklet downloaded successfully for <b>${quiz.name}</b>.`, true);
            } catch(e) {
                console.error(e);
                printMsg('bot', `❌ Failed to download PDF booklet: ` + e.message);
            }
        }
