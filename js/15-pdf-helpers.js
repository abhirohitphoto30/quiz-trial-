        // Color helpers (RGB conversion)
        function setFillColorHex(doc, hex) {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            doc.setFillColor(r, g, b);
        }

        function setDrawColorHex(doc, hex) {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            doc.setDrawColor(r, g, b);
        }

        function setTextColorHex(doc, hex) {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            doc.setTextColor(r, g, b);
        }

        function safePdfText(t) {
            return (t || '').replace(/[^\x00-\xFF]/g, '');
        }

        function pdfCleanText(text) {
            if (!text) return '';
            text = text.replace(/e\s+s\s+t\s+–\s+05\s+–.*?d\s+i\s+a\s+n\s+H\s+i\s+s\s+t\s+o\s+r\s+y\s+&/gi, '');
            text = text.replace(/GS\s+Test\s+–\s+05\s+–\s+Ancient\s+and\s+Medieval\s+Indian\s+History\s+&\s+Art\s+and\s+Culture\s+\(V4415\)/gi, '');
            text = text.replace(/G\s+S\s+T\s+e\s+s\s+t\s+–\s+05\s+–\s+Ancient\s+and\s+Medieval\s+Indian\s+History\s+&\s+Art\s+and\s+Culture\s+\(V4415\)/gi, '');
            text = text.replace(/G\s+S\s+T\s+A\s+r\s+t\s+a\s+n\s+d\s+C\s+u\s+l\s+t\s+u\s+r\s+e\s+.*?d\s+i\s+a\s+n\s+H\s+i\s+s\s+t\s+o\s+r\s+y\s+&/gi, '');
            
            const replacements = {
                '\u2018': "'",
                '\u2019': "'",
                '\u201c': '"',
                '\u201d': '"',
                '\u2013': '-',
                '\u2014': '-',
                '\u2022': '*',
                '\xa0': ' ',
                '\ufffd': ' '
            };
            for (let char in replacements) {
                text = text.replaceAll(char, replacements[char]);
            }
            
            text = text.replace(/\s+/g, ' ');
            return text.trim();
        }

        function pdfExtractTopic(qText) {
            const qClean = qText.replace(/^Q\d+\.\s*/, '').trim();
            const patterns = [
                /With reference to (?:the\s+)?([^,:\n]+)/i,
                /Consider the following statements with reference to (?:the\s+)?([^,:\n]+)/i,
                /Consider the following statements regarding (?:the\s+)?([^,:\n]+)/i,
                /In the context of (?:the\s+)?([^,:\n]+)/i,
                /According to (?:the\s+)?([^,:\n]+)/i,
                /Which of the following statements is\/are correct with reference to (?:the\s+)?([^,:\n]+)/i
            ];
            
            for (let r of patterns) {
                const match = qClean.match(r);
                if (match) {
                    let topic = match[1].trim();
                    topic = topic.replace(/\s+consider\s+.*$/i, '');
                    topic = topic.replace(/\s+is\/are\s+.*$/i, '');
                    const words = topic.split(/\s+/);
                    if (words.length > 6) {
                        return words.slice(0, 5).join(' ').replace(/[?,.:;\s-]+$/, '');
                    }
                    return topic.replace(/[?,.:;\s-]+$/, '');
                }
            }
            
            const firstLine = qClean.split('\n')[0].trim();
            const cleanLine = firstLine.replace(/^(Which of the following|Consider the following|According to)\s+/i, '');
            const words = cleanLine.split(/\s+/);
            if (words.length > 5) {
                return words.slice(0, 5).join(' ').replace(/[?,.:;\s-]+$/, '');
            }
            return cleanLine.replace(/[?,.:;\s-]+$/, '');
        }

        function pdfParseExplanationBranches(explanation) {
            let kbPart = "";
            let mainExp = explanation;
            
            if (explanation.includes("Knowledge Box")) {
                const parts = explanation.split("Knowledge Box");
                mainExp = parts[0];
                kbPart = parts.slice(1).join("Knowledge Box").trim();
            }
            
            const branches = [];
            const sentences = mainExp.split(/(?<=[.!?])\s+/);
            
            const statementNodes = {};
            const otherSentences = [];
            
            for (let sent of sentences) {
                sent = sent.trim();
                if (!sent) continue;
                
                const match = sent.match(/\b(statement|pair|point)\s+(\d+)\b/i);
                if (match) {
                    const key = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() + " " + match[2];
                    if (!statementNodes[key]) {
                        statementNodes[key] = [];
                    }
                    statementNodes[key].push(sent);
                } else {
                    otherSentences.push(sent);
                }
            }
            
            const sortedKeys = Object.keys(statementNodes).sort();
            for (let key of sortedKeys) {
                branches.push({
                    title: key,
                    text: pdfCleanText(statementNodes[key].join(" "))
                });
            }
            
            if (otherSentences.length > 0) {
                const cleanOthers = pdfCleanText(otherSentences.join(" "));
                const subSents = cleanOthers.split(/(?<=[.!?])\s+/);
                if (subSents.length > 3) {
                    const half = Math.ceil(subSents.length / 2);
                    branches.push({
                        title: "Core Concept",
                        text: subSents.slice(0, half).join(" ")
                    });
                    branches.push({
                        title: "Concept Detail",
                        text: subSents.slice(half).join(" ")
                    });
                } else {
                    branches.push({
                        title: "Core Concept",
                        text: cleanOthers
                    });
                }
            }
            
            if (kbPart) {
                branches.push({
                    title: "Knowledge Box",
                    text: pdfCleanText(kbPart)
                });
            }
            
            if (branches.length > 5) {
                const extraText = branches.slice(4).map(b => b.text).join(" ");
                branches.splice(4);
                branches.push({
                    title: "Additional Info",
                    text: extraText
                });
            } else if (branches.length === 0) {
                branches.push({
                    title: "Overview",
                    text: pdfCleanText(explanation)
                });
            }
            
            return branches;
        }
