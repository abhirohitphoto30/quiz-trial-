        // --- Flashcards PDF Generation (Portrait A4) ---
        function generateFlashcards(quizName, questions) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            
            const pageWidth = 595.27;
            const pageHeight = 841.89;
            const leftMargin = 36;
            const rightMargin = 36;
            const innerWidth = pageWidth - leftMargin - rightMargin; // 523
            
            const cardWidth = 245;
            const cardPadding = 12;
            const textWidth = cardWidth - (2 * cardPadding); // 221
            
            let y = 54; // Vertical cursor
            let pageNum = 1;
            
            function drawPageDecoration(pageIndex, totalPagesEstimate) {
                doc.setPage(pageIndex);
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9);
                setTextColorHex(doc, "#64748B");
                
                // Header
                doc.text(safePdfText(quizName) + " - Quiz Flashcards", 36, 36);
                setDrawColorHex(doc, "#E2E8F0");
                doc.setLineWidth(0.5);
                doc.line(36, 42, 559, 42);
                
                // Footer
                doc.line(36, 800, 559, 800);
                doc.text("Fold along the vertical dashed line. Cut along the solid outer border.", 36, 815);
                doc.text(`Page ${pageIndex}`, 559, 815, { align: 'right' });
            }

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                const qHeaderLines = doc.splitTextToSize(safePdfText(`${q.number}: ${q.topic}`), textWidth);
                const qHeaderHeight = qHeaderLines.length * 13;
                
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9.5);
                const qBodyLines = doc.splitTextToSize(safePdfText(q.question), textWidth);
                const qBodyHeight = qBodyLines.length * 12.5;
                
                let optsHeight = 0;
                const optLinesList = [];
                if (q.options) {
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    q.options.forEach((opt, oIdx) => {
                        const l = letters[oIdx] || String(oIdx + 1);
                        doc.setFont("Helvetica", "normal");
                        doc.setFontSize(8.5);
                        const lines = doc.splitTextToSize(safePdfText(`${l}. ${opt}`), textWidth - 8);
                        optLinesList.push(lines);
                        optsHeight += lines.length * 11 + 4;
                    });
                }
                const leftHeight = qHeaderHeight + 6 + qBodyHeight + 10 + optsHeight + (2 * cardPadding);
                
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(10.5);
                const ansLines = doc.splitTextToSize(safePdfText(`Correct Answer: ${q.correct_answer}`), textWidth);
                const ansHeight = ansLines.length * 12.5;
                
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(8.5);
                const expLines = doc.splitTextToSize(safePdfText(`Explanation: ${q.explanation}`), textWidth);
                const expHeight = expLines.length * 11;
                
                const rightHeight = ansHeight + 6 + expHeight + (2 * cardPadding);
                const cardHeight = Math.max(leftHeight, rightHeight) + 10;
                
                if (y + cardHeight > 780) {
                    doc.addPage();
                    y = 54;
                    pageNum++;
                }
                
                setFillColorHex(doc, "#F8FAFC");
                doc.rect(leftMargin, y, cardWidth, cardHeight, 'F');
                
                setFillColorHex(doc, "#FFFFFF");
                doc.rect(leftMargin + cardWidth + 10, y, cardWidth, cardHeight, 'F');
                
                setDrawColorHex(doc, "#CBD5E1");
                doc.setLineWidth(1);
                doc.rect(leftMargin, y, innerWidth, cardHeight, 'S');
                
                setDrawColorHex(doc, "#94A3B8");
                if (typeof doc.setLineDashPattern === 'function') {
                    doc.setLineDashPattern([3, 3], 0);
                } else if (typeof doc.setLineDash === 'function') {
                    doc.setLineDash([3, 3], 0);
                }
                doc.line(leftMargin + cardWidth, y, leftMargin + cardWidth, y + cardHeight);
                doc.line(leftMargin + cardWidth + 10, y, leftMargin + cardWidth + 10, y + cardHeight);
                if (typeof doc.setLineDashPattern === 'function') {
                    doc.setLineDashPattern([], 0);
                } else if (typeof doc.setLineDash === 'function') {
                    doc.setLineDash([]);
                }
                
                let leftY = y + cardPadding;
                setTextColorHex(doc, "#1E3A8A");
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                qHeaderLines.forEach(line => {
                    doc.text(line, leftMargin + cardPadding, leftY + 9);
                    leftY += 13;
                });
                leftY += 4;
                
                setTextColorHex(doc, "#1E293B");
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9.5);
                qBodyLines.forEach(line => {
                    doc.text(line, leftMargin + cardPadding, leftY + 8);
                    leftY += 12.5;
                });
                leftY += 8;
                
                if (q.options) {
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    q.options.forEach((opt, oIdx) => {
                        const l = letters[oIdx] || String(oIdx + 1);
                        setTextColorHex(doc, "#334155");
                        doc.setFont("Helvetica", "bold");
                        doc.setFontSize(8.5);
                        doc.text(`${l}.`, leftMargin + cardPadding, leftY + 7);
                        
                        doc.setFont("Helvetica", "normal");
                        const lines = optLinesList[oIdx];
                        lines.forEach(line => {
                            doc.text(line, leftMargin + cardPadding + 12, leftY + 7);
                            leftY += 11;
                        });
                        leftY += 4;
                    });
                }
                
                let rightY = y + cardPadding;
                const rightColX = leftMargin + cardWidth + 10 + cardPadding;
                
                setTextColorHex(doc, "#15803D");
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(10.5);
                ansLines.forEach(line => {
                    doc.text(line, rightColX, rightY + 9);
                    rightY += 12.5;
                });
                rightY += 6;
                
                setTextColorHex(doc, "#475569");
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(8.5);
                expLines.forEach(line => {
                    doc.text(line, rightColX, rightY + 7);
                    rightY += 11;
                });
                
                y += cardHeight + 20;
            }
            
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                drawPageDecoration(p, totalPages);
            }
            
            return doc;
        }

        // --- Mind Maps PDF Generation (Landscape A4) ---
        function generateMindMaps(quizName, questions) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            
            const pageWidth = 841.89;
            const pageHeight = 595.27;
            
            const dx = 46;
            const dy = 67;
            const canvasW = 750;
            const canvasH = 460;
            
            function drawPageDecoration(pageIndex, totalPages) {
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9);
                setTextColorHex(doc, "#64748B");
                
                // Header
                doc.text(safePdfText(quizName) + " - Visual Mind Maps", 36, 36);
                setDrawColorHex(doc, "#E2E8F0");
                doc.setLineWidth(0.5);
                doc.line(36, 42, 805, 42);
                
                // Footer
                doc.line(36, 550, 805, 550);
                doc.text("Visual representation of the question framework and explanation logic.", 36, 565);
                doc.text(`Page ${pageIndex} of ${totalPages}`, 805, 565, { align: 'right' });
            }

            for (let i = 0; i < questions.length; i++) {
                if (i > 0) {
                    doc.addPage();
                }
                
                const q = questions[i];
                
                setFillColorHex(doc, "#FAFAFA");
                setDrawColorHex(doc, "#E2E8F0");
                doc.setLineWidth(1);
                doc.roundedRect(dx, dy, canvasW, canvasH, 8, 8, 'FD');
                
                setFillColorHex(doc, "#EFF6FF");
                setDrawColorHex(doc, "#BFDBFE");
                doc.roundedRect(dx + 15, dy + 10, 200, 35, 4, 4, 'FD');
                
                setTextColorHex(doc, "#1E40AF");
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                doc.text(safePdfText(`${q.number}: ${q.topic}`), dx + 25, dy + 22);
                
                setTextColorHex(doc, "#15803D");
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(8.5);
                doc.text(safePdfText(`Correct Option: ${q.correct_answer.substring(0, 32)}...`), dx + 25, dy + 33);
                
                const qSnippet = q.question.substring(0, 110) + (q.question.length > 110 ? "..." : "");
                doc.setFont("Helvetica", "normal");
                doc.setFontSize(8);
                const qLines = doc.splitTextToSize(safePdfText(qSnippet), 480);
                const qBoxHeight = qLines.length * 11 + 16;
                
                setFillColorHex(doc, "#F8FAFC");
                setDrawColorHex(doc, "#E2E8F0");
                doc.roundedRect(dx + 230, dy + 10, 505, qBoxHeight, 4, 4, 'FD');
                
                setTextColorHex(doc, "#475569");
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(8);
                doc.text("Question Focus:", dx + 240, dy + 20);
                
                doc.setFont("Helvetica", "oblique");
                setTextColorHex(doc, "#64748B");
                qLines.forEach((line, j) => {
                    doc.text(line, dx + 240, dy + 31 + j * 11);
                });
                
                const cx = 375;
                const cy = 240;
                const cw = 170;
                const ch = 50;
                
                setFillColorHex(doc, "#1E3A8A");
                setDrawColorHex(doc, "#1D4ED8");
                doc.setLineWidth(1.5);
                doc.roundedRect(dx + cx - cw/2, dy + cy - ch/2, cw, ch, 6, 6, 'FD');
                
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(10);
                setTextColorHex(doc, "#FFFFFF");
                const topicLines = doc.splitTextToSize(safePdfText(q.topic), cw - 20);
                const startY = cy - ((topicLines.length - 1) * 6.5) + 3;
                topicLines.forEach((tLine, j) => {
                    doc.text(tLine, dx + cx, dy + startY + j * 13, { align: 'center' });
                });
                
                const branches = q.branches;
                const nBranches = branches.length;
                const boxW = 220;
                
                let positions = [];
                if (nBranches === 1) {
                    positions = [["right", 620, 240]];
                } else if (nBranches === 2) {
                    positions = [["left", 130, 240], ["right", 620, 240]];
                } else if (nBranches === 3) {
                    positions = [["left", 130, 240], ["right", 620, 155], ["right", 620, 325]];
                } else if (nBranches === 4) {
                    positions = [["left", 130, 155], ["left", 130, 325], ["right", 620, 155], ["right", 620, 325]];
                } else if (nBranches === 5) {
                    positions = [["left", 130, 155], ["left", 130, 325], ["right", 620, 130], ["right", 620, 240], ["right", 620, 350]];
                }
                
                branches.forEach((branch, idx) => {
                    if (idx >= positions.length) return;
                    
                    const [side, bx, by] = positions[idx];
                    const title = branch.title;
                    const text = branch.text;
                    
                    doc.setFont("Helvetica", "normal");
                    doc.setFontSize(7.5);
                    let wrappedLines = doc.splitTextToSize(safePdfText(text), boxW - 20);
                    if (wrappedLines.length > 7) {
                        wrappedLines = wrappedLines.slice(0, 6);
                        wrappedLines.push("[... truncated for length]");
                    }
                    
                    const boxH = wrappedLines.length * 11 + 25;
                    const nodeTopY = by - boxH / 2;
                    
                    let headerBg = "#F1F5F9";
                    let borderColor = "#CBD5E1";
                    let titleColor = "#1E293B";
                    const textColor = "#334155";
                    
                    const lowerTitle = title.toLowerCase();
                    if (lowerTitle.includes("statement") || lowerTitle.includes("point") || lowerTitle.includes("pair")) {
                        headerBg = "#ECFDF5";
                        borderColor = "#A7F3D0";
                        titleColor = "#065F46";
                    } else if (lowerTitle.includes("knowledge")) {
                        headerBg = "#FEF3C7";
                        borderColor = "#FDE68A";
                        titleColor = "#92400E";
                    }
                    
                    const leftX = bx - boxW / 2;
                    setFillColorHex(doc, "#FFFFFF");
                    setDrawColorHex(doc, borderColor);
                    doc.setLineWidth(1);
                    doc.roundedRect(dx + leftX, dy + nodeTopY, boxW, boxH, 5, 5, 'FD');
                    
                    setFillColorHex(doc, headerBg);
                    doc.roundedRect(dx + leftX, dy + nodeTopY, boxW, 18, 5, 5, 'F');
                    doc.rect(dx + leftX, dy + nodeTopY + 12, boxW, 6, 'F');
                    doc.line(dx + leftX, dy + nodeTopY + 18, dx + leftX + boxW, dy + nodeTopY + 18);
                    
                    setTextColorHex(doc, titleColor);
                    doc.setFont("Helvetica", "bold");
                    doc.setFontSize(9);
                    doc.text(safePdfText(title), dx + leftX + 10, dy + nodeTopY + 12);
                    
                    setTextColorHex(doc, textColor);
                    doc.setFont("Helvetica", "normal");
                    doc.setFontSize(7.5);
                    wrappedLines.forEach((line, j) => {
                        doc.text(line, dx + leftX + 10, dy + nodeTopY + 28 + j * 11);
                    });
                    
                    let startX, endX;
                    if (side === 'left') {
                        startX = cx - cw/2;
                        endX = bx + boxW/2;
                    } else {
                        startX = cx + cw/2;
                        endX = bx - boxW/2;
                    }
                    
                    const midX = (startX + endX) / 2;
                    setDrawColorHex(doc, "#94A3B8");
                    doc.setLineWidth(1.5);
                    
                    doc.line(dx + startX, dy + cy, dx + midX, dy + cy);
                    doc.line(dx + midX, dy + cy, dx + midX, dy + by);
                    doc.line(dx + midX, dy + by, dx + endX, dy + by);
                    
                    setFillColorHex(doc, "#3B82F6");
                    doc.circle(dx + startX, dy + cy, 2.5, 'F');
                    
                    setFillColorHex(doc, "#10B981");
                    doc.circle(dx + endX, dy + by, 2.5, 'F');
                });
            }
            
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                drawPageDecoration(p, totalPages);
            }
            
            return doc;
        }

        function prepareQuestionsForMindmapAndFlashcards(quiz) {
            return quiz.questions.map((q, idx) => {
                const qNum = "Q" + (idx + 1);
                const correctOptObj = q.options.find(o => o.isCorrect);
                const correctText = correctOptObj ? correctOptObj.text : (q.options[0] ? q.options[0].text : "");
                const rawExplanation = q.explanation || "No explanation provided.";
                
                const topic = pdfExtractTopic(q.question);
                const cleanedExp = pdfCleanText(rawExplanation);
                const branches = pdfParseExplanationBranches(cleanedExp);
                
                return {
                    number: qNum,
                    topic: topic,
                    question: q.question,
                    options: q.options.map(o => o.text),
                    correct_answer: correctText,
                    explanation: cleanedExp,
                    branches: branches
                };
            });
        }
