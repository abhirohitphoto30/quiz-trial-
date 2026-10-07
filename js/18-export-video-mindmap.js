        function generateNewClassroomVideoHtml(quiz) {
            function getTopicDetails(qId, questionText) {
                const qLower = questionText.toLowerCase();
                if (qLower.includes("opportunity cost")) {
                    return { title: "The Theory of Opportunity Cost", intro: "the fundamental economic concept of foregone alternatives and how we measure choices." };
                }
                if (qLower.includes("gnp") || qLower.includes("gdp") || qLower.includes("national income")) {
                    if (qLower.includes("deflator")) {
                        return { title: "GDP Deflator vs. CPI", intro: "why the GDP deflator is a more comprehensive inflation measure than the Consumer Price Index." };
                    }
                    if (qLower.includes("domestic") || qLower.includes("territory")) {
                        return { title: "National Accounting: Economic Territory", intro: "how we define a nation's domestic or economic territory for GDP calculations." };
                    }
                    if (qLower.includes("personal income")) {
                        return { title: "National Income Accounts: Personal Income", intro: "how we derive the actual income received by households from national income." };
                    }
                    return { title: "Economic Growth and GDP Metrics", intro: "the core indicators we use to measure a nation's economic output and growth." };
                }
                if (qLower.includes("monopolistic")) {
                    return { title: "Market Structures: Monopolistic Competition", intro: "markets where many sellers offer similar but differentiated products." };
                }
                if (qLower.includes("payment") && qLower.includes("bank")) {
                    return { title: "Financial Inclusion: Payments Banks in India", intro: "the regulatory framework and operational limits of Payments Banks." };
                }
                if (qLower.includes("working capital")) {
                    return { title: "Corporate Finance: Working Capital Management", intro: "the short-term financial resources a business needs for day-to-day operations." };
                }
                if (qLower.includes("kuznets")) {
                    return { title: "Development Economics: The Kuznets Curve", intro: "the relationship between economic development and income inequality over time." };
                }
                if (qLower.includes("gender gap")) {
                    return { title: "Socio-Economic Indicators: The Global Gender Gap Index", intro: "how the World Economic Forum measures gender disparities across nations." };
                }
                if (qLower.includes("opec")) {
                    return { title: "Global Commodity Markets: The OPEC Cartel", intro: "the structure, membership, and policy coordination of oil-producing nations." };
                }
                if (qLower.includes("utility")) {
                    return { title: "Consumer Behaviour: Marginal & Total Utility", intro: "how total utility behaves when marginal utility reaches zero." };
                }
                
                const words = questionText.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3);
                const titleWords = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                const generatedTitle = titleWords.length > 0 ? titleWords.join(" ") + " Concepts" : `Topic ${qId}`;
                return {
                    title: generatedTitle,
                    intro: "critical academic and economic principles relating to this area of study."
                };
            }

            function buildLectureDataset(parsed) {
                const students = ["Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Pooja", "Aditya", "Meera", "Kabir", "Riya"];
                return parsed.map((q, idx) => {
                    const topic = getTopicDetails(q.id, q.question);
                    const sentences = q.explanation.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
                    
                    const card1_front = topic.title;
                    const card1_back = sentences[0] ? sentences[0] + "." : "The primary concept under discussion.";
                    
                    const card2_front = "Core Mechanism";
                    const correct_statements = sentences.filter(s => /correct|incorrect|option|answer/i.test(s));
                    const card2_back = correct_statements.length > 0 ? correct_statements.slice(0, 2).join(". ") + "." : (sentences[1] ? sentences[1] + "." : "Detailed mechanism.");
                    
                    const card3_front = "Key Takeaway";
                    const card3_back = sentences[sentences.length - 1] ? sentences[sentences.length - 1] + "." : "Crucial point to remember.";

                    const flashcards = [
                        { front: card1_front, back: card1_back },
                        { front: card2_front, back: card2_back },
                        { front: card3_front, back: card3_back }
                    ];

                    const student_name = students[idx % students.length];
                    const correct_letter = String.fromCharCode(65 + q.correct_index);

                    const dialogue = [
                        {
                            speaker: "Teacher",
                            text: `Hello class! Today we are going to learn about '${topic.title}'. Specifically, we will discuss ${topic.intro}`,
                            action: "show_topic_intro"
                        },
                        {
                            speaker: "Teacher",
                            text: `Let's start by looking at our first flashcard: '${card1_front}'. This is the foundation of our topic.`,
                            action: "show_card_1"
                        },
                        {
                            speaker: "Teacher",
                            text: `If we flip this card, we see the core definition: '${card1_back}' Let that sink in.`,
                            action: "flip_card_1"
                        },
                        {
                            speaker: student_name,
                            text: `Ma'am, how does this concept apply when we are faced with a practical problem? Can you give us an example?`,
                            action: "student_raise_hand"
                        },
                        {
                            speaker: "Teacher",
                            text: `Great question, ${student_name}! Let's look at this practice problem on our smartboard to apply what we just learned.`,
                            action: "show_question"
                        },
                        {
                            speaker: "Teacher",
                            text: `To solve this, let's pull up our second flashcard: '${card2_front}'. Let's open it.`,
                            action: "show_card_2"
                        },
                        {
                            speaker: "Teacher",
                            text: `Flipped: '${card2_back}' This explains why option ${correct_letter} is the correct answer.`,
                            action: "flip_card_2"
                        },
                        {
                            speaker: "Teacher",
                            text: `Finally, let's look at our third card: '${card3_front}'. This is the most important takeaway for your exams.`,
                            action: "show_card_3"
                        },
                        {
                            speaker: "Teacher",
                            text: `Flipped: '${card3_back}' Keep this in mind when revising. Let's move on to the next topic!`,
                            action: "flip_card_3"
                        }
                    ];

                    let visual_aid = "none";
                    let visual_data = {};
                    const q_lower = q.question.toLowerCase();
                    if (q_lower.includes("supply") || q_lower.includes("demand")) {
                        visual_aid = "supply_demand_shift";
                        visual_data = { title: "Demand & Supply Curve Shift" };
                    } else if (q_lower.includes("working capital")) {
                        visual_aid = "working_capital_formula";
                        visual_data = {
                            title: "Working Capital Formula",
                            formula: "Working Capital = Current Assets - Current Liabilities",
                            assets: ["Bills Receivable", "Debtors", "Cash at Bank", "Finished Goods Inventory", "Raw Materials"]
                        }
                    } else if (q_lower.includes("kuznets")) {
                        visual_aid = "kuznets_curve";
                        visual_data = { title: "The Kuznets Curve" };
                    } else if (q_lower.includes("production possibility") || q_lower.includes("ppf")) {
                        visual_aid = "ppf_curve";
                        visual_data = { title: "Production Possibility Frontier (PPF)" };
                    } else if (q_lower.includes("deflator")) {
                        visual_aid = "gdp_deflator_table";
                        visual_data = {
                            title: "GDP Deflator vs CPI",
                            headers: ["Feature", "GDP Deflator", "CPI"],
                            rows: [
                                ["Basket", "Changes yearly (all domestic)", "Fixed basket (consumer)"],
                                ["Imports", "Excluded", "Included"],
                                ["Formula", "(Nominal GDP / Real GDP) * 100", "(Cost current / Cost base) * 100"]
                            ]
                        }
                    } else if (q_lower.includes("opec")) {
                        visual_aid = "opec_members_map";
                        visual_data = {
                            title: "OPEC Members",
                            members: ["Algeria", "Congo", "Equatorial Guinea", "Gabon", "Iran", "Iraq", "Kuwait", "Libya", "Nigeria", "Saudi Arabia", "UAE", "Venezuela"],
                            ex_members: ["Angola (left 2024)", "Ecuador", "Qatar", "Indonesia"]
                        }
                    } else if (q_lower.includes("opportunity cost")) {
                        visual_aid = "opportunity_cost_diagram";
                        visual_data = { title: "Opportunity Cost" };
                    } else if (q_lower.includes("payment banks")) {
                        visual_aid = "payments_bank_rules";
                        visual_data = {
                            title: "Payments Bank Guidelines",
                            do: ["Accept demand deposits up to ₹2 Lakhs", "Issue ATM/Debit Cards", "Offer utility bill payments"],
                            dont: ["Issue Credit Cards", "Extend loans or lending", "Accept NRI deposits"]
                        }
                    }

                    return {
                        id: q.id,
                        topic_title: topic.title,
                        question: q.question,
                        options: q.options,
                        correct_index: q.correct_index,
                        explanation: q.explanation,
                        dialogue: dialogue,
                        flashcards: flashcards,
                        visual_aid: visual_aid,
                        visual_data: visual_data
                    };
                });
            }

            const parsedQuestions = quiz.questions.map((q, idx) => {
                let correctIndex = q.options.findIndex(o => o.isCorrect);
                if (correctIndex === -1) correctIndex = 0;
                
                return {
                    id: idx + 1,
                    question: q.question,
                    options: q.options.map(o => o.text),
                    correct_index: correctIndex,
                    explanation: q.explanation || "Detailed explanation of the topic."
                };
            });

            const lectureDataset = buildLectureDataset(parsedQuestions);
            const datasetJSON = JSON.stringify(lectureDataset, null, 2);

            const templateEl = document.getElementById("new-video-template");
            if (!templateEl) {
                throw new Error("New Classroom template element not found in the DOM!");
            }
            const templateText = templateEl.value;
            return templateText.replace("__QUESTIONS_DATA__", datasetJSON);
        }

        function generateAndDownloadVideo(quiz) {
            try {
                // 1. Generate and download OLD video
                const dataList = compileQuizToClassroomData(quiz);
                const htmlContent = generateClassroomHtml(quiz, dataList);
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${quiz.name.replace(/\s+/g, '_')}_classroom_old.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // 2. Generate and download NEW video after a short delay to prevent browser block
                setTimeout(() => {
                    try {
                        const newHtmlContent = generateNewClassroomVideoHtml(quiz);
                        const newBlob = new Blob([newHtmlContent], { type: 'text/html' });
                        const newUrl = URL.createObjectURL(newBlob);
                        const newA = document.createElement('a');
                        newA.href = newUrl;
                        newA.download = `${quiz.name.replace(/\s+/g, '_')}_classroom_new.html`;
                        document.body.appendChild(newA);
                        newA.click();
                        document.body.removeChild(newA);
                        URL.revokeObjectURL(newUrl);
                    } catch (err) {
                        console.error(err);
                        printMsg('bot', `❌ Failed to download New Classroom Video: ` + err.message);
                    }
                }, 250);

                // 3. Generate and download Standalone Video Lecture (video generator.html) after another short delay
                setTimeout(() => {
                    try {
                        const videoTemplateEl = document.getElementById("unigram-video-template");
                        if (!videoTemplateEl) {
                            throw new Error("Standalone Video template not found in the DOM!");
                        }
                        const templateHtml = videoTemplateEl.value;
                        const videoQuestions = compileVideoQuestions(quiz);
                        const searchString = 'window.PRELOADED_QUESTIONS = null;';
                        const replaceString = 'window.PRELOADED_QUESTIONS = ' + JSON.stringify(videoQuestions) + ';';
                        const finalHtml = templateHtml.replace(searchString, replaceString);

                        const videoBlob = new Blob([finalHtml], { type: 'text/html;charset=utf-8;' });
                        const videoUrl = URL.createObjectURL(videoBlob);
                        const videoA = document.createElement('a');
                        videoA.href = videoUrl;
                        videoA.download = `${quiz.name.replace(/\s+/g, '_')}_video_lecture.html`;
                        document.body.appendChild(videoA);
                        videoA.click();
                        document.body.removeChild(videoA);
                        URL.revokeObjectURL(videoUrl);

                        printMsg('bot', `🎬 <b>Classroom Videos generated successfully!</b><br>1. Old Video: <code>${quiz.name.replace(/\s+/g, '_')}_classroom_old.html</code><br>2. New Video: <code>${quiz.name.replace(/\s+/g, '_')}_classroom_new.html</code><br>3. Standalone Video: <code>${quiz.name.replace(/\s+/g, '_')}_video_lecture.html</code>`, true);
                    } catch (err) {
                        console.error(err);
                        printMsg('bot', `❌ Failed to download Standalone Video Lecture: ` + err.message);
                    }
                }, 500);

            } catch(e) {
                console.error(e);
                printMsg('bot', `❌ Failed to download Classroom Videos: ` + e.message);
            }
        }

        function generateAndDownloadMindmap(quiz) {
            try {
                const preparedQs = prepareQuestionsForMindmapAndFlashcards(quiz);
                const doc = generateMindMaps(quiz.name, preparedQs);
                doc.save(`${quiz.name.replace(/\s+/g, '_')}_mind_maps.pdf`);
                printMsg('bot', `✅ Mind Map PDF downloaded successfully for <b>${quiz.name}</b>.`, true);
            } catch(e) {
                console.error(e);
                printMsg('bot', `❌ Failed to download Mind Maps PDF: ` + e.message);
            }
        }

        function generateAndDownloadFlashcard(quiz) {
            try {
                // 1. Generate and download traditional PDF flashcards
                const preparedQs = prepareQuestionsForMindmapAndFlashcards(quiz);
                const doc = generateFlashcards(quiz.name, preparedQs);
                doc.save(`${quiz.name.replace(/\s+/g, '_')}_flashcards.pdf`);
                printMsg('bot', `✅ Flashcards PDF downloaded successfully for <b>${quiz.name}</b>.`, true);

                // 2. Generate and download new Premium Interactive HTML flashcards
                generatePremiumHtmlFlashcards(quiz);
            } catch(e) {
                console.error(e);
                printMsg('bot', `❌ Failed to download Flashcards: ` + e.message);
            }
        }
