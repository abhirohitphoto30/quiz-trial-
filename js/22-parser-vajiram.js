        // 2. VAJIRAM & RAVI PARSER
        const VajiramParser = {
            async extractOrderedTextStreamFromBinary(uint8ArraySource, enforceTwoColumnParsing = false, documentLabel = 'PDF') {
                const standaloneMemoryView = new Uint8Array(uint8ArraySource.slice(0));
                const activePdfHandle = await pdfjsLib.getDocument({ data: standaloneMemoryView }).promise;
                const fullyParsedPagesCollector = [];

                for (let pIdx = 1; pIdx <= activePdfHandle.numPages; pIdx++) {
                    const pageInstance = await activePdfHandle.getPage(pIdx);
                    const pageViewport = pageInstance.getViewport({ scale: 1.0 });
                    const pageRawTextCtx = await pageInstance.getTextContent();

                    const dynamicItemTokens = pageRawTextCtx.items
                        .filter(chunk => chunk.str && chunk.str.trim())
                        .map(chunk => ({
                            text: chunk.str,
                            x: Math.round(chunk.transform[4]),
                            y: Math.round(pageViewport.height - chunk.transform[5]),
                            w: Math.round(chunk.width),
                            h: Math.round(chunk.height)
                        }));

                    fullyParsedPagesCollector.push({
                        items: dynamicItemTokens,
                        width: pageViewport.width,
                        height: pageViewport.height,
                        pageId: pIdx
                    });
                }
                return fullyParsedPagesCollector;
            },
            consolidateSpatialTokensIntoTextLines(tokensList, yToleranceLimit = 4) {
                if (!tokensList.length) return [];
                const sortedWorkingTokens = [...tokensList].sort((alpha, beta) => alpha.y - beta.y || alpha.x - beta.x);
                const dynamicRowBuckets = [];
                let workingRowBucket = [sortedWorkingTokens[0]];

                for (let idx = 1; idx < sortedWorkingTokens.length; idx++) {
                    const currentToken = sortedWorkingTokens[idx];
                    if (Math.abs(currentToken.y - workingRowBucket[0].y) <= yToleranceLimit) {
                        workingRowBucket.push(currentToken);
                    } else {
                        dynamicRowBuckets.push(workingRowBucket);
                        workingRowBucket = [currentToken];
                    }
                }
                dynamicRowBuckets.push(workingRowBucket);

                return dynamicRowBuckets.map(bucket => {
                    bucket.sort((a, b) => a.x - b.x);
                    const continuousString = bucket.map(tok => tok.text).join(' ').replace(/\s{2,}/g, ' ').trim();
                    return {
                        y: bucket[0].y,
                        x: Math.min(...bucket.map(tok => tok.x)),
                        text: continuousString
                    };
                }).filter(rowModel => rowModel.text.length > 0);
            },
            evaluateIsHeaderFooterOrNoiseArtifact(lineProse) {
                const cleanedString = lineProse.trim().toUpperCase();
                if (cleanedString.length === 0) return true;

                const structuralNoiseRegexPatterns = [
                    /VAJIRAM\s*(&|AND)\s*RAVI/i,
                    /PRELIMS\s*TEST\s*SERIES/i,
                    /FULL\s*LENGTH\s*TEST/i,
                    /TEST\s*BOOKLET/i,
                    /MAXIMUM\s*MARKS/i,
                    /TIME\s*ALLOWED/i,
                    /DO\s*NOT\s*OPEN/i,
                    /COMMENCEMENT\s*OF\s*THE\s*EXAMINATION/i,
                    /UNPRINTED\s*OR\s*TORN/i,
                    /CANDIDATE'S\s*RESPONSIBILITY/i,
                    /ROLL\s*NUMBER/i,
                    /OMR\s*ANSWER/i,
                    /ANSWER\s*SHEET/i,
                    /PENALTY\s*FOR\s*WRONG/i,
                    /WRONG\s*ANSWERS\s*MARKED/i,
                    /ALTERNATIVES\s*FOR\s*THE\s*ANSWER/i,
                    /QUESTION\s*IS\s*LEFT\s*BLANK/i,
                    /ECONOMICS\s*\(V\d+\)/i,
                    /SCIENCE\s*&\s*TECHNOLOGY\s*\(V\d+\)/i,
                    /POLITY\s*\(V\d+\)/i,
                    /GS\s*TEST\s*-\s*\d+/i,
                    /POWERUP\s*POWER\s*UP/i,
                    /POWERUP\s*PRELIMS/i,
                    /^\d{1,3}$/
                ];

                return structuralNoiseRegexPatterns.some(pattern => pattern.test(lineProse));
            },
            evaluateIsCoverOrInstructionSheet(linesList) {
                const aggregateProse = linesList.map(l => l.text).join(' ');
                return !(/\(a\)/i.test(aggregateProse) || /\(b\)/i.test(aggregateProse));
            },
            parseTestBookletStructure(extractedPagesList, addLog) {
                const decoupledQuestionsIndexMap = {};

                for (const pageNode of extractedPagesList) {
                    const masterLinesList = this.consolidateSpatialTokensIntoTextLines(pageNode.items);
                    const filteredLinesList = masterLinesList.filter(l => !this.evaluateIsHeaderFooterOrNoiseArtifact(l.text));

                    if (this.evaluateIsCoverOrInstructionSheet(filteredLinesList)) {
                        addLog(`Skipping non-question page: ${pageNode.pageId}`, 'warn');
                        continue;
                    }

                    const spatialMidpointBoundaryX = pageNode.width / 2;
                    const leftColumnTokens = pageNode.items.filter(tok => tok.x < spatialMidpointBoundaryX - 15);
                    const rightColumnTokens = pageNode.items.filter(tok => tok.x >= spatialMidpointBoundaryX - 15);

                    const satisfiesTwoColumnDensity = leftColumnTokens.length > 6 && rightColumnTokens.length > 6;

                    let singleUnifiedTextStream = "";
                    if (satisfiesTwoColumnDensity) {
                        const compiledLeftLines = this.consolidateSpatialTokensIntoTextLines(leftColumnTokens).filter(l => !this.evaluateIsHeaderFooterOrNoiseArtifact(l.text));
                        const compiledRightLines = this.consolidateSpatialTokensIntoTextLines(rightColumnTokens).filter(l => !this.evaluateIsHeaderFooterOrNoiseArtifact(l.text));
                        singleUnifiedTextStream = compiledLeftLines.map(l => l.text).join('\n') + '\n' + compiledRightLines.map(l => l.text).join('\n');
                    } else {
                        singleUnifiedTextStream = filteredLinesList.map(l => l.text).join('\n');
                    }

                    this.executeStateEngineQuestionParsing(singleUnifiedTextStream, decoupledQuestionsIndexMap);
                }
                return decoupledQuestionsIndexMap;
            },
            executeStateEngineQuestionParsing(textStream, targetsCollectorIndex) {
                const streamLines = textStream.split('\n').map(row => row.trim()).filter(row => row.length > 0);

                let activeQuestionId = null;
                let runningBodyLinesCollector = [];
                let runningOptionsLinesCollector = [];
                let processingStateInsideOptions = false;

                const flushStateToIndex = () => {
                    if (activeQuestionId === null) return;
                    if (runningOptionsLinesCollector.length >= 2) {
                        if (!targetsCollectorIndex[activeQuestionId]) {
                            targetsCollectorIndex[activeQuestionId] = {
                                id: activeQuestionId,
                                bodyLines: [...runningBodyLinesCollector],
                                options: [...runningOptionsLinesCollector]
                            };
                        } else {
                            const activeModel = targetsCollectorIndex[activeQuestionId];
                            if (activeModel.options.length < runningOptionsLinesCollector.length) {
                                targetsCollectorIndex[activeQuestionId] = {
                                    id: activeQuestionId,
                                    bodyLines: [...runningBodyLinesCollector],
                                    options: [...runningOptionsLinesCollector]
                                };
                            }
                        }
                    }
                    activeQuestionId = null; runningBodyLinesCollector = []; runningOptionsLinesCollector = []; processingStateInsideOptions = false;
                };

                for (let index = 0; index < streamLines.length; index++) {
                    const currentLineText = streamLines[index];

                    const optionMatchToken = currentLineText.match(/^\s*\(([a-d])\)\s+(.+)$/i);
                    if (optionMatchToken && activeQuestionId !== null) {
                        processingStateInsideOptions = true;
                        runningOptionsLinesCollector.push({
                            letter: optionMatchToken[1].toLowerCase(),
                            text: optionMatchToken[2].trim()
                        });
                        continue;
                    }

                    const mainQuestionHeadMatch = currentLineText.match(/^\s*(\d{1,3})\.\s{1,6}(.+)$/);
                    if (mainQuestionHeadMatch) {
                        const numericKey = parseInt(mainQuestionHeadMatch[1], 10);
                        if (numericKey >= 1 && numericKey <= 100) {
                            const isInternalListStatementElement = (
                                activeQuestionId !== null &&
                                !processingStateInsideOptions &&
                                numericKey !== activeQuestionId + 1 &&
                                numericKey <= 6
                            );

                            if (!isInternalListStatementElement || activeQuestionId === null) {
                                flushStateToIndex();
                                activeQuestionId = numericKey;
                                runningBodyLinesCollector = [mainQuestionHeadMatch[2].trim()];
                                runningOptionsLinesCollector = [];
                                processingStateInsideOptions = false;
                                continue;
                            }
                        }
                    }

                    if (processingStateInsideOptions && runningOptionsLinesCollector.length > 0 && activeQuestionId !== null) {
                        if (!currentLineText.match(/^\s*\(([a-d])\)/i)) {
                            runningOptionsLinesCollector[runningOptionsLinesCollector.length - 1].text += ' ' + currentLineText;
                        }
                        continue;
                    }

                    if (activeQuestionId !== null && !processingStateInsideOptions) {
                        runningBodyLinesCollector.push(currentLineText);
                    }
                }
                flushStateToIndex();
            },
            parseSolutionsExplanationsBooklet(extractedPagesList, addLog) {
                const answerKeysTableMatrix = {};
                const individualExplanationsIndexMap = {};

                const unifiedTextStreamBuffer = extractedPagesList.map(page => {
                    const formattedRows = this.consolidateSpatialTokensIntoTextLines(page.items).filter(l => !this.evaluateIsHeaderFooterOrNoiseArtifact(l.text));
                    return formattedRows.map(l => l.text).join('\n');
                }).join('\n');

                const answersKeyMatrixTableRegex = /\b(\d{1,3})\.\s*\(([a-d])\)/gi;
                let patternMatchInstance;
                while ((patternMatchInstance = answersKeyMatrixTableRegex.exec(unifiedTextStreamBuffer)) !== null) {
                    const capturedQuestionIdx = parseInt(patternMatchInstance[1], 10);
                    if (capturedQuestionIdx >= 1 && capturedQuestionIdx <= 100) {
                        answerKeysTableMatrix[capturedQuestionIdx] = patternMatchInstance[2].toLowerCase();
                    }
                }
                addLog(`Answer key compiled. Matrix links successfully created: ${Object.keys(answerKeysTableMatrix).length} pointers.`, 'ok');

                const sequenceBlockSplittingRegex = /\nQ(\d{1,3})\.\s*\n/g;
                const mappedSlicesList = [];
                let lookupRegexResult;

                while ((lookupRegexResult = sequenceBlockSplittingRegex.exec(unifiedTextStreamBuffer)) !== null) {
                    mappedSlicesList.push({
                        qNum: parseInt(lookupRegexResult[1], 10),
                        startPointIdx: lookupRegexResult.index + lookupRegexResult[0].length
                    });
                }

                for (let pivot = 0; pivot < mappedSlicesList.length; pivot++) {
                    const { qNum, startPointIdx } = mappedSlicesList[pivot];
                    const endPointIdx = pivot + 1 < mappedSlicesList.length ? mappedSlicesList[pivot + 1].startPointIdx : unifiedTextStreamBuffer.length;
                    const blockStringSlice = unifiedTextStreamBuffer.slice(startPointIdx, endPointIdx);
                    individualExplanationsIndexMap[qNum] = this.sanitizeAndReconstructExplanationTextProse(blockStringSlice);
                }

                addLog(`Explanation prose extraction finished. Total modules slots mapped: ${Object.keys(individualExplanationsIndexMap).length}`, 'ok');
                return { answersMatrix: answerKeysTableMatrix, explanationsMap: individualExplanationsIndexMap };
            },
            sanitizeAndReconstructExplanationTextProse(rawTextSlice) {
                let textProseStream = rawTextSlice;

                textProseStream = textProseStream.replace(/^Answer\s*:\s*[a-d]\s*$/gmi, '');
                textProseStream = textProseStream.replace(/^Explanation\s*:\s*$/gmi, '');
                textProseStream = textProseStream.replace(/Therefore[,\s]+option\s*\([a-d]\)\s*is\s*the\s*correct\s*answer\.?[^\n]*/gi, '');
                textProseStream = textProseStream.replace(/So[,\s]+option\s*\([a-d]\)\s*is\s*the\s*correct\s*answer\.?[^\n]*/gi, '');
                textProseStream = textProseStream.replace(/Therefore[,\s]+the\s*correct\s*answer[^\n]*/gi, '');
                textProseStream = textProseStream.replace(/Relevance\s*:[^\n]*/gi, '');
                textProseStream = textProseStream.replace(/^(?:Source|Ref|Reference)\s*:[^\n]*/gmi, '');

                textProseStream = textProseStream.replace(/^[\s]*[●○•▪◆▸▹→\-–—]+\s*/gm, '');
                textProseStream = textProseStream.replace(/^\s+[●○•▪]+\s*/gm, ' ');
                textProseStream = textProseStream.replace(/^Q\d{1,3}\.\s*/gm, '');

                const cleanedLinesArray = textProseStream.split('\n')
                    .map(lineRow => lineRow.trim())
                    .filter(lineRow => lineRow.length > 2);

                let flattenedUnifiedParagraph = cleanedLinesArray.join(' ');
                flattenedUnifiedParagraph = flattenedUnifiedParagraph.replace(/\s{2,}/g, ' ').trim();
                flattenedUnifiedParagraph = flattenedUnifiedParagraph.replace(/\.\s*\./g, '.');

                return flattenedUnifiedParagraph;
            },
            compileSmartJoinedQuestionCoreLines(rawLinesList) {
                const fullyNormalizedLines = rawLinesList
                    .map(lineRow => this.normalizeRomanNumeralsToNumericDigits(lineRow.trim()))
                    .filter(lineRow => lineRow.length > 0);

                if (!fullyNormalizedLines.length) return [];

                const NEW_LOGICAL_LINE_START_RE = [
                    /^\d{1,2}\.\s+\S/,
                    /^Statement\s+[IVXLC]+\s*:/i,
                    /^(Which|How\s+many|How\s+|What|Select|Arrange|In\s+how|Who\s+|Where\s+|Among\s+|Identify|Of\s+the|With\s+reference|With\s+regard|Consider|Regarding|As\s+per|According\s+to|In\s+which\s+of\s+the\s+above)/i
                ];

                const outputLinesCollector = [];
                let activeLineBufferString = "";

                for (let i = 0; i < fullyNormalizedLines.length; i++) {
                    const lineItem = fullyNormalizedLines[i];
                    const meetsLineStartCondition = i === 0 || NEW_LOGICAL_LINE_START_RE.some(pattern => pattern.test(lineItem));

                    if (meetsLineStartCondition) {
                        if (activeLineBufferString) outputLinesCollector.push(activeLineBufferString.replace(/\s{2,}/g, ' ').trim());
                        activeLineBufferString = lineItem;
                    } else {
                        activeLineBufferString = (activeLineBufferString + ' ' + lineItem).replace(/\s{2,}/g, ' ');
                    }
                }
                if (activeLineBufferString) outputLinesCollector.push(activeLineBufferString.replace(/\s{2,}/g, ' ').trim());
                return outputLinesCollector;
            },
            normalizeRomanNumeralsToNumericDigits(lineStringValue) {
                return lineStringValue.replace(
                    /^\s*(I{1,3}|IV|V?I{0,3}|IX|XI{0,3})\.\s+/,
                    (match, romanToken) => {
                        const mapTranslationTable = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12 };
                        const extractedDigit = mapTranslationTable[romanToken.toUpperCase()];
                        return extractedDigit ? extractedDigit + '. ' : match;
                    }
                );
            },
            unpackAndStripHorizontalOptionsBlock(rawOptionsArrayModel) {
                const unifiedOptionsLineProse = rawOptionsArrayModel.map(o => `(${o.letter}) ${o.text}`).join(" ");

                const lookupPatternA = /\(a\)\s*([\s\S]*?)(?=\s*\(b\)|$)/i;
                const lookupPatternB = /\(b\)\s*([\s\S]*?)(?=\s*\(c\)|$)/i;
                const lookupPatternC = /\(c\)\s*([\s\S]*?)(?=\s*\(d\)|$)/i;
                const lookupPatternD = /\(d\)\s*([\s\S]*?)$/i;

                const stringMatchA = unifiedOptionsLineProse.match(lookupPatternA) ? unifiedOptionsLineProse.match(lookupPatternA)[1] : "Only one";
                const stringMatchB = unifiedOptionsLineProse.match(lookupPatternB) ? unifiedOptionsLineProse.match(lookupPatternB)[1] : "Only two";
                const stringMatchC = unifiedOptionsLineProse.match(lookupPatternC) ? unifiedOptionsLineProse.match(lookupPatternC)[1] : "Only three";
                const stringMatchD = unifiedOptionsLineProse.match(lookupPatternD) ? unifiedOptionsLineProse.match(lookupPatternD)[1] : "All the four";

                const isolatePureContentText = (targetStr) => {
                    return targetStr.replace(/^\s*\(?[a-d]\)?\s*\.?\s*/i, "").trim();
                };

                return [
                    { letter: 'a', text: isolatePureContentText(stringMatchA) },
                    { letter: 'b', text: isolatePureContentText(stringMatchB) },
                    { letter: 'c', text: isolatePureContentText(stringMatchC) },
                    { letter: 'd', text: isolatePureContentText(stringMatchD) }
                ];
            },
            async run(testFile, solFile, setProgress, addLog) {
                const testRaw = await testFile.arrayBuffer();
                const solRaw = await solFile.arrayBuffer();

                setProgress(15, "Decoding Test Booklet multi-column spatial coordinates...");
                const fullyExtractedTestPagesList = await this.extractOrderedTextStreamFromBinary(testRaw, true, 'Question PDF');
                
                setProgress(40, "Compiling core text elements into problem objects...");
                const finalQuestionsDatabaseMap = this.parseTestBookletStructure(fullyExtractedTestPagesList, addLog);
                const totalQuestionsCount = Object.keys(finalQuestionsDatabaseMap).length;

                addLog(`Question map generation executed. Isolated ${totalQuestionsCount} complete blocks.`, 'ok');
                if (totalQuestionsCount === 0) {
                    throw new Error("Zero valid questions isolated inside spatial maps.");
                }

                setProgress(60, "Decoding Explanations Booklet layout frames...");
                const fullyExtractedSolPagesList = await this.extractOrderedTextStreamFromBinary(solRaw, false, 'Solutions PDF');

                setProgress(85, "Cross-referencing index matrices keys...");
                const { answersMatrix, explanationsMap } = this.parseSolutionsExplanationsBooklet(fullyExtractedSolPagesList, addLog);

                setProgress(95, "Enforcing zero-gap string serialization...");
                const sortedDatabaseIntegerKeys = Object.keys(finalQuestionsDatabaseMap).map(Number).sort((x, y) => x - y);
                const masterStringStreamCollector = [];

                for (const itemKey of sortedDatabaseIntegerKeys) {
                    const activeQuestionNodeModel = finalQuestionsDatabaseMap[itemKey];
                    const matchingKeyLetterFlag = answersMatrix[itemKey];
                    const cleanExplanationTextProse = explanationsMap[itemKey] || 'Detailed explanation missing.';

                    const smartJoinedCoreLinesList = this.compileSmartJoinedQuestionCoreLines(activeQuestionNodeModel.bodyLines);
                    masterStringStreamCollector.push(`Q${itemKey}. ${smartJoinedCoreLinesList[0] || ''}`);
                    
                    for (let pivotIdx = 1; pivotIdx < smartJoinedCoreLinesList.length; pivotIdx++) {
                        masterStringStreamCollector.push(smartJoinedCoreLinesList[pivotIdx]);
                    }

                    masterStringStreamCollector.push('😂');

                    const unpackedVerticalChoicesMatrix = this.unpackAndStripHorizontalOptionsBlock(activeQuestionNodeModel.options);
                    for (const choiceItem of unpackedVerticalChoicesMatrix) {
                        const appendCheckmarkValue = (matchingKeyLetterFlag && choiceItem.letter === matchingKeyLetterFlag) ? ' ✅' : '';
                        masterStringStreamCollector.push(choiceItem.text + appendCheckmarkValue);
                    }

                    masterStringStreamCollector.push(`Ex: ${cleanExplanationTextProse.trim()}`);
                    masterStringStreamCollector.push('');
                }

                setProgress(100, "Done! " + totalQuestionsCount + " questions");
                return {
                    text: masterStringStreamCollector.join('\n'),
                    total: totalQuestionsCount
                };
            }
        };
