// TEXT FILE PARSER
        function parseInputText(text) {
            text = text.replace(/\r\n/g, '\n');
            const lines = text.split('\n');
            const questions = [];
            let currentQuestion = null;
            let state = 'none'; 
            
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                
                const qMatch = line.match(/^Q(\d+)\s*\.\s*(.*)/i);
                if (qMatch) {
                    if (currentQuestion) {
                        questions.push(finalizeQuestion(currentQuestion));
                    }
                    currentQuestion = {
                        id: parseInt(qMatch[1]),
                        rawId: qMatch[1],
                        questionText: qMatch[2],
                        lines: [line],
                        options: [],
                        correctOption: '',
                        explanation: '',
                        explanationLines: []
                    };
                    state = 'question';
                    continue;
                }
                
                if (!currentQuestion) continue;
                
                if (line.includes('😂')) {
                    state = 'options';
                    currentQuestion.lines.push(line);
                    continue;
                }
                
                if (line.startsWith('Ex:')) {
                    state = 'explanation';
                    currentQuestion.explanationLines.push(line.substring(3).trim());
                    currentQuestion.lines.push(line);
                    continue;
                }
                
                if (state === 'question') {
                    currentQuestion.questionText += '\n' + line;
                    currentQuestion.lines.push(line);
                } else if (state === 'options') {
                    if (line) {
                        if (line.includes('✅')) {
                            const cleanOpt = line.replace('✅', '').trim();
                            currentQuestion.options.push(cleanOpt);
                            currentQuestion.correctOption = cleanOpt;
                        } else {
                            currentQuestion.options.push(line);
                        }
                    }
                    currentQuestion.lines.push(line);
                } else if (state === 'explanation') {
                    currentQuestion.explanationLines.push(line);
                    currentQuestion.lines.push(line);
                }
            }
            
            if (currentQuestion) {
                questions.push(finalizeQuestion(currentQuestion));
            }
            
            return questions;
        }

        function finalizeQuestion(q) {
            q.questionText = q.questionText.trim();
            q.explanation = q.explanationLines.join('\n').trim();
            
            const coreSubject = extractCoreSubject(q.questionText);
            q.tree = parseExplanationToTree(q.explanation, `Q${q.id}: ${coreSubject}`);
            return q;
        }

        function extractCoreSubject(questionText) {
            let text = questionText.split('\n')[0].trim();
            text = text.replace(/^[Q0-9\.\s]+/, '');
            text = text.replace(/^(With reference to the|With reference to|Consider the following statements regarding the|Consider the following statements regarding|Consider the following statements about|Consider the following|Regarding the|About the)\s+/i, '');
            text = text.replace(/(when:|is\/are correct\??|is not correct\??|are correct\??|which of the following|which one of the following)/i, '');
            
            text = text.trim().replace(/[:,\?\-\s]+$/, '');
            
            if (text.length > 70) {
                text = text.substring(0, 67) + '...';
            }
            return text || "Main Topic";
        }

        // NO-TRUNCATION HIERARCHICAL PARSER
        function parseExplanationToTree(explanationText, topicText) {
            const root = {
                id: 'root',
                text: topicText,
                children: []
            };
            
            if (!explanationText) return root;
            
            let cleanText = explanationText.replace(/DARKHORSE/gi, '').trim();
            
            const lines = cleanText.split('\n');
            const segments = [];
            
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                
                let subLines = line.split(/(?=[o•▪−\*]\s+)/g);
                for (let sl of subLines) {
                    sl = sl.trim();
                    if (!sl) continue;
                    
                    let numberedSub = sl.split(/(?=\b\d+\.\s+)/g);
                    for (let ns of numberedSub) {
                        ns = ns.trim();
                        if (ns) segments.push(ns);
                    }
                }
            }
            
            const finalSegments = [];
            for (let seg of segments) {
                let isBullet = /^[o•▪−\*]\s+/.test(seg);
                let isNumbered = /^\d+\.\s+/.test(seg);
                let cleanSeg = seg.replace(/^[o•▪−\*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
                
                if (!cleanSeg) continue;
                
                if (!isBullet && !isNumbered && cleanSeg.includes('. ')) {
                    let sentences = cleanSeg.split(/(?<=\. )/g);
                    for (let j = 0; j < sentences.length; j++) {
                        let s = sentences[j].trim();
                        if (s) {
                            finalSegments.push({
                                text: s,
                                isBullet: j === 0 ? isBullet : false,
                                isNumbered: j === 0 ? isNumbered : false
                            });
                        }
                    }
                } else {
                    finalSegments.push({
                        text: cleanSeg,
                        isBullet: isBullet,
                        isNumbered: isNumbered
                    });
                }
            }
            
            let currentParent = root;
            let lastLevel1Node = null;
            let nodeCounter = 1;
            
            function createNode(text) {
                return {
                    id: 'node_' + (nodeCounter++),
                    text: text, 
                    children: []
                };
            }
            
            for (let i = 0; i < finalSegments.length; i++) {
                const seg = finalSegments[i];
                const text = seg.text;
                
                if (/^Hence,?\s+statement\s+\d+\s+is\s+(correct|not\s+correct|incorrect)/i.test(text)) {
                    continue;
                }
                
                let colonIdx = text.indexOf(':');
                let title = "";
                let detail = "";
                if (colonIdx > 0 && colonIdx < 35) {
                    title = text.substring(0, colonIdx).trim();
                    detail = text.substring(colonIdx + 1).trim();
                }
                
                if (title && detail) {
                    let subtopicNode = createNode(title);
                    root.children.push(subtopicNode);
                    lastLevel1Node = subtopicNode;
                    
                    if (detail) {
                        let detailNode = createNode(detail);
                        subtopicNode.children.push(detailNode);
                        if (detail.endsWith('if') || detail.endsWith('if:') || detail.endsWith('are:') || detail.endsWith('following:')) {
                            currentParent = detailNode;
                        } else {
                            currentParent = subtopicNode;
                        }
                    } else {
                        currentParent = subtopicNode;
                    }
                } else {
                    if (seg.isBullet || seg.isNumbered) {
                        if (currentParent !== root) {
                            currentParent.children.push(createNode(text));
                        } else if (lastLevel1Node) {
                            lastLevel1Node.children.push(createNode(text));
                            currentParent = lastLevel1Node;
                        } else {
                            let node = createNode(text);
                            root.children.push(node);
                            lastLevel1Node = node;
                        }
                    } else {
                        if (currentParent !== root) {
                            currentParent.children.push(createNode(text));
                        } else {
                            let node = createNode(text);
                            root.children.push(node);
                            lastLevel1Node = node;
                            
                            if (text.endsWith('if') || text.endsWith('if:') || text.endsWith('are:') || text.endsWith('following:') || text.endsWith(':')) {
                                currentParent = node;
                            }
                        }
                    }
                }
            }
            
            if (root.children.length === 0) {
                root.children.push(createNode(cleanText));
            }
            
            // Safety limit node counts
            if (root.children.length > 5) {
                root.children = root.children.slice(0, 5);
            }
            for (let child of root.children) {
                if (child.children.length > 4) {
                    child.children = child.children.slice(0, 4);
                }
            }
            
            return root;
        }

        // HEIGHT ESTIMATOR IN PDF MILLIMETERS
        function estimateNodeHeightMM(pdf, text, boxWidth, fontSize) {
            pdf.setFontSize(fontSize);
            const lines = pdf.splitTextToSize(text, boxWidth - 6); 
            const lineHeight = fontSize * 0.3528 * 1.3; 
            return Math.max(9, lines.length * lineHeight + 4.5); 
        }

        // DIRECT PDF COORDINATES LAYOUT ENGINE
        function calculateDirectLayout(pdf, rootNode) {
            const cx = 148.5; 
            const cy = 105;   
            
            const children = rootNode.children || [];
            const leftChildren = [];
            const rightChildren = [];
            
            children.forEach((c, idx) => {
                if (idx % 2 === 0) {
                    rightChildren.push(c);
                } else {
                    leftChildren.push(c);
                }
            });
            
            let fontSize = 7.5;
            let fontSizeRoot = 9.5;
            let blockSpacing = 7;
            let l2Spacing = 3;
            
            let coords = {};
            let fits = false;
            let iterations = 0;
            
            while (!fits && iterations < 5) {
                coords = {};
                
                const rootHeight = estimateNodeHeightMM(pdf, rootNode.text, 56, fontSizeRoot);
                coords[rootNode.id] = { x: cx, y: cy, w: 56, h: rootHeight, fontSize: fontSizeRoot, class: 'root' };
                
                const rightHeights = rightChildren.map(node => {
                    const h1 = estimateNodeHeightMM(pdf, node.text, 46, fontSize);
                    const l2Heights = (node.children || []).map(c => estimateNodeHeightMM(pdf, c.text, 46, fontSize));
                    const l2Total = l2Heights.reduce((s, h) => s + h, 0) + (l2Heights.length - 1) * l2Spacing;
                    return {
                        node: node,
                        h1: h1,
                        h2Total: l2Total,
                        l2Heights: l2Heights,
                        blockHeight: Math.max(h1, l2Total)
                    };
                });
                
                const leftHeights = leftChildren.map(node => {
                    const h1 = estimateNodeHeightMM(pdf, node.text, 46, fontSize);
                    const l2Heights = (node.children || []).map(c => estimateNodeHeightMM(pdf, c.text, 46, fontSize));
                    const l2Total = l2Heights.reduce((s, h) => s + h, 0) + (l2Heights.length - 1) * l2Spacing;
                    return {
                        node: node,
                        h1: h1,
                        h2Total: l2Total,
                        l2Heights: l2Heights,
                        blockHeight: Math.max(h1, l2Total)
                    };
                });
                
                const totalHeightRight = rightHeights.reduce((s, b) => s + b.blockHeight, 0) + (rightHeights.length - 1) * blockSpacing;
                const totalHeightLeft = leftHeights.reduce((s, b) => s + b.blockHeight, 0) + (leftHeights.length - 1) * blockSpacing;
                
                const maxHeight = Math.max(totalHeightRight, totalHeightLeft);
                
                if (maxHeight <= 170 || fontSize <= 5.5) {
                    fits = true;
                    
                    if (rightHeights.length > 0) {
                        const startY = cy - totalHeightRight / 2;
                        let currentY = startY;
                        rightHeights.forEach(b => {
                            const blockCenterY = currentY + b.blockHeight / 2;
                            coords[b.node.id] = { x: cx + 54, y: blockCenterY, w: 46, h: b.h1, fontSize: fontSize, class: 'level1' };
                            
                            const level2 = b.node.children || [];
                            if (level2.length > 0) {
                                const l2StartY = blockCenterY - b.h2Total / 2;
                                let currentL2Y = l2StartY;
                                level2.forEach((subNode, sIdx) => {
                                    const subH = b.l2Heights[sIdx];
                                    coords[subNode.id] = { x: cx + 104, y: currentL2Y + subH / 2, w: 46, h: subH, fontSize: fontSize, class: 'level2' };
                                    currentL2Y += subH + l2Spacing;
                                });
                            }
                            currentY += b.blockHeight + blockSpacing;
                        });
                    }
                    
                    if (leftHeights.length > 0) {
                        const startY = cy - totalHeightLeft / 2;
                        let currentY = startY;
                        leftHeights.forEach(b => {
                            const blockCenterY = currentY + b.blockHeight / 2;
                            coords[b.node.id] = { x: cx - 54, y: blockCenterY, w: 46, h: b.h1, fontSize: fontSize, class: 'level1' };
                            
                            const level2 = b.node.children || [];
                            if (level2.length > 0) {
                                const l2StartY = blockCenterY - b.h2Total / 2;
                                let currentL2Y = l2StartY;
                                level2.forEach((subNode, sIdx) => {
                                    const subH = b.l2Heights[sIdx];
                                    coords[subNode.id] = { x: cx - 104, y: currentL2Y + subH / 2, w: 46, h: subH, fontSize: fontSize, class: 'level2' };
                                    currentL2Y += subH + l2Spacing;
                                });
                            }
                            currentY += b.blockHeight + blockSpacing;
                        });
                    }
                } else {
                    fontSize -= 0.5;
                    fontSizeRoot -= 0.5;
                    blockSpacing = Math.max(4, blockSpacing - 1);
                    l2Spacing = Math.max(2, l2Spacing - 0.5);
                    iterations++;
                }
            }
            
            return coords;
        }

        // COMPILE AND DOWNLOAD ALL 6 THEMES AS SEPARATE FILES
        async function generateAllPDFs(questions) {
            const themes = [
                { id: 'dark-forest', name: 'Dark_Forest' },
                { id: 'retro-sketch', name: 'Retro_Sketch' },
                { id: 'orange-hex', name: 'Orange_Hex' },
                { id: 'cyber-neon', name: 'Cyber_Neon' },
                { id: 'pastel-breeze', name: 'Pastel_Breeze' },
                { id: 'cyber-sketch', name: 'Cyber_Sketch' } // 6th theme added
            ];
            
            const total = questions.length;
            const chunkSize = 20; 
            
            for (let t = 0; t < themes.length; t++) {
                const themeInfo = themes[t];
                
                showProgress(`Compiling PDF ${t + 1} of 6`, `Theme: ${themeInfo.name}...`);
                updateProgress(0);
                await new Promise(r => setTimeout(r, 80));
                
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                for (let i = 0; i < total; i++) {
                    if (i > 0) pdf.addPage();
                    const q = questions[i];
                    
                    drawSingleMindmapDirect(pdf, q.tree, themeInfo.id);
                    
                    if (i % chunkSize === 0 && i > 0) {
                        modalHeading.textContent = `Compiling Theme: ${themeInfo.name} (${i + 1}/${total})`;
                        modalSub.textContent = `Processing: Q${q.id}`;
                        updateProgress((i / total) * 100);
                        await new Promise(r => setTimeout(r, 10)); // UI paint yield
                    }
                }
                
                updateProgress(95);
                modalSub.textContent = `Writing Unigram_Mindmaps_${themeInfo.name}.pdf to downloads...`;
                await new Promise(r => setTimeout(r, 100));
                
                pdf.save(`Unigram_Mindmaps_${themeInfo.name}.pdf`);
            }
            
            hideProgress();
        }

        // DRAW DIRECTLY INTO PDF PAGE CANVAS (Pure Vector Shapes)
        function drawSingleMindmapDirect(pdf, rootNode, theme) {
            drawPageBackground(pdf, theme);
            drawPageTitle(pdf, theme);
            
            const coords = calculateDirectLayout(pdf, rootNode);
            drawDirectLines(pdf, rootNode, coords, theme);
            drawDirectNodes(pdf, rootNode, coords, theme);
        }

        function drawPageBackground(pdf, theme) {
            if (theme === 'dark-forest') {
                pdf.setFillColor(13, 30, 21);
                pdf.rect(0, 0, 297, 210, 'F');
            } else if (theme === 'retro-sketch') {
                pdf.setFillColor(247, 243, 232);
                pdf.rect(0, 0, 297, 210, 'F');
                
                pdf.setDrawColor(210, 225, 245);
                pdf.setLineWidth(0.06);
                for (let x = 0; x < 297; x += 7.5) {
                    pdf.line(x, 0, x, 210);
                }
                for (let y = 0; y < 210; y += 7.5) {
                    pdf.line(0, y, 297, y);
                }
            } else if (theme === 'orange-hex') {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, 297, 210, 'F');
                
                pdf.setFillColor(230, 230, 230);
                for (let x = 7; x < 297; x += 9) {
                    for (let y = 7; y < 210; y += 9) {
                        pdf.circle(x, y, 0.2, 'F');
                    }
                }
            } else if (theme === 'cyber-neon' || theme === 'cyber-sketch') {
                pdf.setFillColor(6, 6, 15);
                pdf.rect(0, 0, 297, 210, 'F');
                
                pdf.setDrawColor(24, 18, 54);
                pdf.setLineWidth(0.08);
                for (let x = 0; x < 297; x += 15) {
                    pdf.line(x, 0, x, 210);
                }
                for (let y = 0; y < 210; y += 15) {
                    pdf.line(0, y, 297, y);
                }
            } else {
                pdf.setFillColor(248, 249, 250);
                pdf.rect(0, 0, 297, 210, 'F');
            }
        }

        function drawPageTitle(pdf, theme) {
            pdf.setFont("courier", "italic");
            
            if (theme === 'dark-forest') {
                pdf.setTextColor(255, 204, 102);
                pdf.setFontSize(15);
            } else if (theme === 'retro-sketch') {
                pdf.setTextColor(17, 17, 17);
                pdf.setFont("courier", "bolditalic");
                pdf.setFontSize(17);
            } else if (theme === 'cyber-sketch') {
                pdf.setTextColor(0, 245, 212); // Neon cyan cursive title
                pdf.setFont("courier", "bolditalic");
                pdf.setFontSize(17);
            } else if (theme === 'orange-hex') {
                pdf.setTextColor(44, 62, 80);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
            } else if (theme === 'cyber-neon') {
                pdf.setTextColor(0, 245, 212);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
            } else {
                pdf.setTextColor(52, 58, 64);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
            }
            
            pdf.text("Explanation — samajhte hain vajah", 15, 14);
        }

        function drawDirectLines(pdf, rootNode, coords, theme) {
            pdf.setLineWidth(0.38);
            
            if (theme === 'dark-forest') {
                pdf.setDrawColor(62, 184, 154);
            } else if (theme === 'retro-sketch') {
                pdf.setDrawColor(217, 56, 58);
                pdf.setLineWidth(0.46);
            } else if (theme === 'cyber-sketch') {
                pdf.setDrawColor(247, 37, 133); // Neon pink sketchy lines
                pdf.setLineWidth(0.46);
            } else if (theme === 'orange-hex') {
                pdf.setDrawColor(255, 122, 0);
                pdf.setLineWidth(0.5);
            } else if (theme === 'cyber-neon') {
                pdf.setDrawColor(0, 245, 212);
            } else {
                pdf.setDrawColor(173, 181, 189);
            }
            
            function drawConnection(node) {
                const p = coords[node.id];
                if (!p || !node.children) return;
                
                node.children.forEach(child => {
                    const c = coords[child.id];
                    if (c) {
                        let x1, y1, x2, y2;
                        
                        if (c.x > p.x) {
                            x1 = p.x + p.w / 2;
                            y1 = p.y;
                            x2 = c.x - c.w / 2;
                            y2 = c.y;
                        } else {
                            x1 = p.x - p.w / 2;
                            y1 = p.y;
                            x2 = c.x + c.w / 2;
                            y2 = c.y;
                        }
                        
                        const midX = (x1 + x2) / 2;
                        pdf.line(x1, y1, midX, y1);
                        pdf.line(midX, y1, midX, y2);
                        pdf.line(midX, y2, x2, y2);
                        
                        if (theme === 'retro-sketch' || theme === 'cyber-sketch') {
                            const size = 1.3;
                            const dir = x2 > x1 ? 1 : -1;
                            
                            if (theme === 'retro-sketch') {
                                pdf.setFillColor(217, 56, 58); // red
                            } else {
                                pdf.setFillColor(247, 37, 133); // neon pink arrow heads
                            }
                            
                            pdf.triangle(
                                x2, y2,
                                x2 - dir * size * 1.5, y2 - size,
                                x2 - dir * size * 1.5, y2 + size,
                                'FD'
                            );
                        }
                    }
                    drawConnection(child);
                });
            }
            
            drawConnection(rootNode);
        }

        function drawDirectNodes(pdf, rootNode, coords, theme) {
            function drawNode(node) {
                const coord = coords[node.id];
                if (coord) {
                    setNodeThemeColors(pdf, theme, coord.class);
                    
                    const rx = coord.class === 'root' ? 2.5 : 1.8;
                    const ry = coord.class === 'root' ? 2.5 : 1.8;
                    
                    pdf.roundedRect(
                        coord.x - coord.w / 2,
                        coord.y - coord.h / 2,
                        coord.w,
                        coord.h,
                        rx,
                        ry,
                        'FD'
                    );
                    
                    setNodeTextThemeColors(pdf, theme, coord.class, coord.fontSize);
                    const pad = 3.5;
                    const lines = pdf.splitTextToSize(node.text, coord.w - pad * 2);
                    const lineHeight = coord.fontSize * 0.3528 * 1.3;
                    const totalH = lines.length * lineHeight;
                    const startY = coord.y - totalH / 2 + (coord.fontSize * 0.3528);
                    
                    lines.forEach((lineText, idx) => {
                        pdf.text(lineText, coord.x, startY + idx * lineHeight, { align: 'center' });
                    });
                }
                
                if (node.children) {
                    node.children.forEach(child => drawNode(child));
                }
            }
            
            drawNode(rootNode);
        }

        function setNodeThemeColors(pdf, theme, nodeClass) {
            pdf.setLineWidth(0.38);
            
            if (theme === 'dark-forest') {
                if (nodeClass === 'root') {
                    pdf.setFillColor(45, 102, 86);
                    pdf.setDrawColor(66, 187, 156);
                    pdf.setLineWidth(0.55);
                } else if (nodeClass === 'level1') {
                    pdf.setFillColor(22, 53, 44);
                    pdf.setDrawColor(46, 112, 96);
                } else {
                    pdf.setFillColor(14, 38, 31);
                    pdf.setDrawColor(28, 77, 65);
                }
            } else if (theme === 'retro-sketch') {
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(17, 17, 17);
                pdf.setLineWidth(0.48);
            } else if (theme === 'cyber-sketch') {
                pdf.setFillColor(11, 10, 26); // Dark purple-black box fill
                pdf.setLineWidth(0.48);
                if (nodeClass === 'root') {
                    pdf.setDrawColor(0, 245, 212); // Neon cyan border
                    pdf.setLineWidth(0.58);
                } else {
                    pdf.setDrawColor(157, 78, 221); // Neon purple border
                }
            } else if (theme === 'orange-hex') {
                if (nodeClass === 'root') {
                    pdf.setFillColor(255, 122, 0);
                    pdf.setDrawColor(224, 90, 0);
                    pdf.setLineWidth(0.6);
                } else if (nodeClass === 'level1') {
                    pdf.setFillColor(255, 252, 249);
                    pdf.setDrawColor(255, 184, 132);
                } else {
                    pdf.setFillColor(255, 255, 255);
                    pdf.setDrawColor(255, 227, 209);
                }
            } else if (theme === 'cyber-neon') {
                if (nodeClass === 'root') {
                    pdf.setFillColor(20, 15, 45);
                    pdf.setDrawColor(157, 78, 221);
                    pdf.setLineWidth(0.55);
                } else if (nodeClass === 'level1') {
                    pdf.setFillColor(12, 6, 30);
                    pdf.setDrawColor(58, 12, 163);
                } else {
                    pdf.setFillColor(5, 2, 15);
                    pdf.setDrawColor(114, 9, 183);
                }
            } else {
                if (nodeClass === 'root') {
                    pdf.setFillColor(231, 245, 255);
                    pdf.setDrawColor(51, 154, 240);
                } else if (nodeClass === 'level1') {
                    pdf.setFillColor(248, 249, 250);
                    pdf.setDrawColor(220, 224, 230);
                } else {
                    pdf.setFillColor(255, 255, 255);
                    pdf.setDrawColor(233, 236, 239);
                }
            }
        }

        function setNodeTextThemeColors(pdf, theme, nodeClass, fontSize) {
            pdf.setFontSize(fontSize);
            
            if (theme === 'dark-forest') {
                pdf.setFont("helvetica", nodeClass === 'root' ? "bold" : "normal");
                pdf.setTextColor(nodeClass === 'root' ? 255 : 255, nodeClass === 'root' ? 239 : 255, nodeClass === 'root' ? 160 : 255);
            } else if (theme === 'retro-sketch') {
                pdf.setFont("courier", nodeClass === 'root' ? "bold" : "normal");
                pdf.setTextColor(nodeClass === 'root' ? 17 : 26, nodeClass === 'root' ? 17 : 43, nodeClass === 'root' ? 17 : 76);
            } else if (theme === 'cyber-sketch') {
                pdf.setFont("courier", nodeClass === 'root' ? "bold" : "normal");
                if (nodeClass === 'root') {
                    pdf.setTextColor(0, 245, 212); // Neon cyan text
                } else {
                    pdf.setTextColor(255, 255, 255); // White text
                }
            } else if (theme === 'orange-hex') {
                pdf.setFont("helvetica", nodeClass === 'root' ? "bold" : "normal");
                pdf.setTextColor(nodeClass === 'root' ? 255 : 44, nodeClass === 'root' ? 255 : 62, nodeClass === 'root' ? 255 : 80);
            } else if (theme === 'cyber-neon') {
                pdf.setFont("helvetica", nodeClass === 'root' ? "bold" : "normal");
                pdf.setTextColor(nodeClass === 'root' ? 0 : 255, nodeClass === 'root' ? 245 : 255, nodeClass === 'root' ? 212 : 255);
            } else {
                pdf.setFont("helvetica", nodeClass === 'root' ? "bold" : "normal");
                pdf.setTextColor(nodeClass === 'root' ? 28 : 73, nodeClass === 'root' ? 126 : 80, nodeClass === 'root' ? 214 : 87);
            }
        }

        // --- Standalone Video Compiler Helper ---
        function compileVideoQuestions(quiz) {
            const nlp = {
                indianStates: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'],
                countries: ['India', 'China', 'USA', 'United States', 'Australia', 'Japan', 'UK', 'United Kingdom', 'France', 'Germany', 'Russia', 'Canada', 'Brazil', 'South Africa', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan'],
                rivers: ['Ganga', 'Ganges', 'Yamuna', 'Gomti', 'Narmada', 'Godavari', 'Krishna', 'Kaveri', 'Cauvery', 'Brahmaputra', 'Indus', 'Sutlej', 'Tapti', 'Mahanadi', 'Indravati'],
                animals: ['Tiger', 'Lion', 'Elephant', 'Leopard', 'Rhinoceros', 'Gibbon', 'Cow', 'Peacock', 'Dolphin'],
                constitutionalBodies: ['UPSC', 'CBI', 'Lokpal', 'Lokayukta', 'Finance Commission', 'Election Commission', 'Supreme Court', 'CAG', 'Attorney General', 'NITI Aayog', 'Rajya Sabha', 'Lok Sabha', 'Parliament', 'Governor', 'President', 'Reserve Bank of India', 'RBI', 'SEBI', 'Gram Sabha'],
                persons: ['Ambedkar', 'Nehru', 'Gandhi', 'Sardar Patel', 'Rajendra Prasad', 'Subhas Chandra Bose', 'Bhagat Singh', 'Tilak', 'Gokhale', 'Naoroji']
            };
            
            function escapeRegex(str) {
                return str.replace(/[.*+?^${}()|[\\\]]/g, '\\$&');
            }
            function getSvgTemplate(type, name) {
                switch (type) {
                    case 'state': return 'map_india';
                    case 'country': return /india/i.test(name) ? 'map_india' : 'globe';
                    case 'river': return 'river';
                    case 'animal':
                        if (/tiger/i.test(name)) return 'tiger';
                        if (/elephant/i.test(name)) return 'elephant';
                        if (/cow/i.test(name)) return 'cow';
                        if (/lion/i.test(name)) return 'lion';
                        if (/peacock/i.test(name)) return 'peacock';
                        if (/gibbon/i.test(name)) return 'monkey';
                        return 'animal_generic';
                    case 'person': return 'person';
                    case 'institution': return 'building';
                    default: return 'generic';
                }
            }
            
            function extractKeyTerms(text) {
                const terms = [];
                const seen = new Set();
                const addTerm = (term, type) => {
                    const key = term.toLowerCase().trim();
                    if (key.length < 2 || seen.has(key)) return;
                    seen.add(key);
                    terms.push({ term: term.trim(), type });
                };
                const articleRe = /Article\s+\d+[A-Z]?(?:\s*\(\d+\))?/gi;
                let m;
                while ((m = articleRe.exec(text)) !== null) addTerm(m[0], 'article');
                const amendRe = /\d+(?:st|nd|rd|th)\s+(?:Constitutional\s+)?Amendment(?:\s+Act)?(?:\s*,?\s*\d{4})?/gi;
                while ((m = amendRe.exec(text)) !== null) addTerm(m[0], 'amendment');
                const actRe = /[A-Z][a-zA-Z\s]{3,30}\s+Act(?:\s*,?\s*\d{4})?/g;
                while ((m = actRe.exec(text)) !== null) {
                    const cleaned = m[0].trim();
                    if (cleaned.length > 5 && cleaned.length < 80) addTerm(cleaned, 'act');
                }
                for (const body of nlp.constitutionalBodies) {
                    if (new RegExp('\\b' + escapeRegex(body) + '\\b', 'gi').test(text)) {
                        addTerm(body, 'body');
                    }
                }
                const properRe = /(?:[A-Z][a-z]+(?:\s+(?:of|and|the|for|in|on)\s+)?){2,3}[A-Z][a-z]+/g;
                while ((m = properRe.exec(text)) !== null) {
                    addTerm(m[0], 'proper');
                }
                return terms;
            }
            
            function extractEntities(text) {
                const entities = [];
                const seen = new Set();
                const addEntity = (name, type) => {
                    const key = name.toLowerCase().trim();
                    if (seen.has(key)) return;
                    seen.add(key);
                    entities.push({ name: name.trim(), type, svgTemplate: getSvgTemplate(type, name.trim()) });
                };
                for (const state of nlp.indianStates) {
                    if (new RegExp('\\b' + escapeRegex(state) + '\\b', 'i').test(text)) addEntity(state, 'state');
                }
                for (const country of nlp.countries) {
                    if (new RegExp('\\b' + escapeRegex(country) + '\\b', 'i').test(text)) addEntity(country, 'country');
                }
                for (const river of nlp.rivers) {
                    if (new RegExp('\\b' + escapeRegex(river) + '\\b', 'i').test(text)) addEntity(river, 'river');
                }
                for (const animal of nlp.animals) {
                    if (new RegExp('\\b' + escapeRegex(animal) + '\\b', 'i').test(text)) addEntity(animal, 'animal');
                }
                for (const person of nlp.persons) {
                    if (new RegExp('\\b' + escapeRegex(person) + '\\b', 'i').test(text)) addEntity(person, 'person');
                }
                for (const body of nlp.constitutionalBodies) {
                    if (new RegExp('\\b' + escapeRegex(body) + '\\b', 'i').test(text)) addEntity(body, 'institution');
                }
                return entities;
            }
            
            function shortenToTitle(text) {
                let t = text
                    .replace(/^(?:Which\s+of\s+the\s+following|Consider\s+the\s+following|With\s+reference\s+to|In\s+the\s+context\s+of|Regarding)\s*/i, '')
                    .replace(/^(?:statements?\s+(?:is|are)\s+(?:correct|incorrect|true|false))/i, '')
                    .replace(/[?:]+$/, '')
                    .trim();
                const aboutMatch = t.match(/(?:about|regarding|related\s+to|with\s+respect\s+to|pertaining\s+to)\s+(.+)/i);
                if (aboutMatch) {
                    t = aboutMatch[1].replace(/[,?.:]+$/, '').trim();
                }
                if (t.length > 40) {
                    const words = t.split(/\s+/).filter(w => !['the', 'a', 'an', 'is', 'are', 'of', 'in', 'to', 'for', 'and'].includes(w.toLowerCase()));
                    t = words.slice(0, 4).join(' ');
                }
                if (t.length > 0) {
                    t = t.charAt(0).toUpperCase() + t.slice(1);
                }
                return t || 'UPSC Concept';
            }
            
            return quiz.questions.map((q, idx) => {
                const questionText = (q.question || '').replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
                const explanation = (q.explanation || 'No explanation provided.').trim();
                const title = shortenToTitle(questionText);
                const keyTerms = extractKeyTerms(explanation);
                const entities = extractEntities(explanation);
                
                return {
                    number: idx + 1,
                    title: title,
                    questionText: questionText,
                    explanation: explanation,
                    keyTerms: keyTerms,
                    entities: entities
                };
            });
        }


        // --- Themed Mindmaps sequentially generated from MINDMAP PDF GENERATOR.html ---
        async function generateThemedMindmaps(quiz) {
            try {
                const themes = [
                    { id: 'dark-forest', name: 'Dark_Forest' },
                    { id: 'retro-sketch', name: 'Retro_Sketch' },
                    { id: 'orange-hex', name: 'Orange_Hex' },
                    { id: 'cyber-neon', name: 'Cyber_Neon' },
                    { id: 'pastel-breeze', name: 'Pastel_Breeze' },
                    { id: 'cyber-sketch', name: 'Cyber_Sketch' }
                ];
                
                const questions = quiz.questions.map((q, idx) => {
                    const qId = idx + 1;
                    const qText = q.question || '';
                    const expText = q.explanation || 'No explanation provided.';
                    const coreSubject = extractCoreSubject(qText);
                    const tree = parseExplanationToTree(expText, `Q${qId}: ${coreSubject}`);
                    return { id: qId, questionText: qText, explanation: expText, tree: tree };
                });
                
                const { jsPDF } = window.jspdf;
                
                for (let t = 0; t < themes.length; t++) {
                    const themeInfo = themes[t];
                    await new Promise(resolve => {
                        setTimeout(() => {
                            try {
                                const pdf = new jsPDF({
                                    orientation: 'landscape',
                                    unit: 'mm',
                                    format: 'a4'
                                });
                                for (let i = 0; i < questions.length; i++) {
                                    if (i > 0) pdf.addPage();
                                    drawSingleMindmapDirect(pdf, questions[i].tree, themeInfo.id);
                                }
                                pdf.save(`${quiz.name.replace(/\s+/g, '_')}_Mindmap_${themeInfo.name}.pdf`);
                            } catch (e) {
                                console.error(`Error saving mindmap for theme ${themeInfo.name}:`, e);
                            }
                            resolve();
                        }, t * 300);
                    });
                }
            } catch (err) {
                console.error("Error in generateThemedMindmaps:", err);
            }
        }
