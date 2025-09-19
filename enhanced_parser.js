// Enhanced dynamic parser that handles complex exam structures
class ExamParser {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // ULTRA-ENHANCED parser that FORCES real content extraction
  async parseMarkdownWithClaude(markdown) {
    const dynamicPrompt = `
🚨 CRITICAL EXTRACTION TASK 🚨

YOU MUST EXTRACT THE REAL QUESTIONS FROM THE PDF - NO PLACEHOLDERS ALLOWED!

EXAMPLES OF WHAT I NEED FROM THE PDF:

REAL QUESTION 1 FROM PDF: "√√25⁵ илэрхийллийн утгыг олоорой."
REAL OPTIONS FROM PDF: A. √5  B. 5  C. 25  D. ⁵√5  E. 1/5

REAL QUESTION 22 FROM PDF: "A ба В хотын хоорондох замын 0.6 хэсгийг I машин 9 цагт, харин II машин нийт замын 7/12 хэсгийг 14 цагт явдаг бөгөөд тэдгээрийн хурдны зөрөө нь 27 км/ц бол хоёр хотын хоорондох зайг олоорой."
REAL OPTIONS FROM PDF: A. 405 км  B. 675 км  C. 1728 км  D. 1080 км  E. 648 км

❌ WRONG (DO NOT DO THIS):
"text": "Асуулт 1 - [Энд бодит асуултын текст байна]"
"A": "Хариулт A - Асуулт 1"

✅ CORRECT (DO EXACTLY THIS):
"text": "√√25⁵ илэрхийллийн утгыг олоорой."
"A": "√5"

EXTRACTION RULES:
1. Find question numbers: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36
2. Extract the EXACT question text after each number
3. Extract the EXACT A, B, C, D, E options for each question
4. Questions 1-8 = 1 point each
5. Questions 9-28 = 2 points each
6. Questions 29-36 = 3 points each
7. For section 2: Extract questions 2.1, 2.2, 2.3, 2.4 with their parts

MANDATORY JSON STRUCTURE:
{
  "exams": {
    "2025_math_variant_A": {
      "metadata": {
        "title": "Элсэлтийн ерөнхий шалгалт 2025",
        "subject": "Математик",
        "variant": "Хувилбар А",
        "year": 2025
      },
      "section1": {
        "title": "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
        "totalQuestions": 36,
        "totalPoints": 72,
        "questions": {
          "1": {
            "text": "[EXACT TEXT FROM PDF AFTER '1.']",
            "points": 1,
            "options": {
              "A": "[EXACT TEXT FROM PDF AFTER 'A.']",
              "B": "[EXACT TEXT FROM PDF AFTER 'B.']",
              "C": "[EXACT TEXT FROM PDF AFTER 'C.']",
              "D": "[EXACT TEXT FROM PDF AFTER 'D.']",
              "E": "[EXACT TEXT FROM PDF AFTER 'E.']"
            }
          },
          "2": {
            "text": "[EXACT TEXT FROM PDF AFTER '2.']",
            "points": 1,
            "options": {
              "A": "[EXACT TEXT FROM PDF AFTER 'A.']",
              "B": "[EXACT TEXT FROM PDF AFTER 'B.']",
              "C": "[EXACT TEXT FROM PDF AFTER 'C.']",
              "D": "[EXACT TEXT FROM PDF AFTER 'D.']",
              "E": "[EXACT TEXT FROM PDF AFTER 'E.']"
            }
          }
          // ... CONTINUE FOR ALL 36 QUESTIONS WITH REAL TEXT
        }
      },
      "section2": {
        "title": "Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР",
        "pointsPerQuestion": 7,
        "questions": {
          "2.1": {
            "mainText": "[EXACT TEXT FROM PDF FOR 2.1]",
            "parts": {
              "1": {
                "text": "[EXACT TEXT FROM PDF FOR PART 1]",
                "points": 3
              },
              "2": {
                "text": "[EXACT TEXT FROM PDF FOR PART 2]",
                "points": 2
              },
              "3": {
                "text": "[EXACT TEXT FROM PDF FOR PART 3]",
                "points": 2
              }
            }
          }
          // ... CONTINUE FOR 2.2, 2.3, 2.4
        }
      }
    }
  }
}

🔥 ABSOLUTE REQUIREMENTS:
- ZERO placeholders allowed
- ZERO made-up text allowed
- ONLY extract text that EXISTS in the PDF
- If you can't find a question, mark it as "NOT_FOUND" instead of making up text
- Preserve ALL mathematical symbols: √, ², ³, π, ∫, etc.
- Preserve ALL Mongolian text exactly
- Extract ALL 36 questions from section 1
- Extract ALL 4 questions from section 2

PDF CONTENT:
${markdown}

EXTRACT NOW - REAL CONTENT ONLY!`;

    try {
      const response = await this.callClaudeAPI(dynamicPrompt);
      const result = this.validateAndProcessResponse(response);

      // Check if we still got placeholder text
      if (this.hasPlaceholderContent(result)) {
        console.warn('AI generated placeholders, using fallback extraction...');
        return this.fallbackExtraction(markdown);
      }

      return result;
    } catch (error) {
      console.error('Enhanced parsing failed, trying fallback extraction:', error);
      return this.fallbackExtraction(markdown);
    }
  }

  // Check if the result contains placeholder text
  hasPlaceholderContent(data) {
    const jsonStr = JSON.stringify(data);
    return jsonStr.includes('[Энд бодит асуултын текст байна]') ||
           jsonStr.includes('Асуулт 1 - [') ||
           jsonStr.includes('Хариулт A - Асуулт') ||
           jsonStr.includes('Fallback асуулт') ||
           jsonStr.includes('[Fallback текст]');
  }

  // Fallback extraction using pattern matching
  fallbackExtraction(markdown) {
    console.log('🔧 Using fallback pattern matching extraction...');

    const examData = {
      "exams": {
        "2025_math_variant_A": {
          "metadata": {
            "title": "Элсэлтийн ерөнхий шалгалт 2025",
            "subject": "Математик",
            "variant": "Хувилбар А",
            "year": 2025
          },
          "section1": {
            "title": "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
            "totalQuestions": 36,
            "totalPoints": 72,
            "questions": {}
          },
          "section2": {
            "title": "Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР",
            "pointsPerQuestion": 7,
            "questions": {}
          }
        }
      }
    };

    // Extract Section 1 questions (1-36)
    this.extractSection1Questions(markdown, examData.exams["2025_math_variant_A"].section1);

    // Extract Section 2 questions (2.1-2.4)
    this.extractSection2Questions(markdown, examData.exams["2025_math_variant_A"].section2);

    return examData;
  }

  // WORKING: Extract multiple choice questions from section 1
  extractSection1Questions(markdown, section1) {
    const lines = markdown.split('\n').map(line => line.trim()).filter(line => line);
    let currentQuestion = null;
    let questionText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip headers
      if (line.includes('Хувилбар') || line.includes('Элсэлтийн') || line.includes('СОНГОХ ДААЛГАВАР')) continue;

      // Find question number (1. 2. 22. etc.)
      const qMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (qMatch && parseInt(qMatch[1]) >= 1 && parseInt(qMatch[1]) <= 36) {
        currentQuestion = qMatch[1];
        questionText = qMatch[2];
        console.log(`📝 Found question ${currentQuestion}: ${questionText.substring(0, 30)}...`);
        continue;
      }

      // Find options line (starts with A.)
      if (line.startsWith('A.') && currentQuestion) {
        const options = this.parseOptionsLine(line);

        if (Object.keys(options).length === 5) {
          this.saveQuestion(section1, currentQuestion, questionText, options);
          console.log(`✅ Saved question ${currentQuestion} with all 5 options`);
          currentQuestion = null;
        } else {
          console.log(`⚠️ Question ${currentQuestion} only has ${Object.keys(options).length} options`);
        }
      }
    }
  }

  // WORKING: Parse options from a single line
  parseOptionsLine(line) {
    const options = {};

    // Split by letter patterns and clean up
    const parts = line.split(/([ABCDE]\.)/).filter(part => part.trim());

    for (let i = 0; i < parts.length - 1; i += 2) {
      const letter = parts[i].replace('.', '');
      const text = parts[i + 1].trim();

      if (letter && text && ['A', 'B', 'C', 'D', 'E'].includes(letter)) {
        options[letter] = text;
        console.log(`   ${letter}: "${text}"`);
      }
    }

    return options;
  }

  // Save individual question to section
  saveQuestion(section, questionNum, text, options) {
    const qNum = parseInt(questionNum);
    let points = 1; // Default

    // Assign points based on question number
    if (qNum >= 1 && qNum <= 8) points = 1;
    else if (qNum >= 9 && qNum <= 28) points = 2;
    else if (qNum >= 29 && qNum <= 36) points = 3;

    section.questions[questionNum] = {
      text: text.trim(),
      points: points,
      options: { ...options }
    };

    console.log(`✓ Extracted question ${questionNum}: ${text.substring(0, 50)}...`);
  }

  // Extract fill-in questions from section 2
  extractSection2Questions(markdown, section2) {
    // Look for questions 2.1, 2.2, 2.3, 2.4
    const section2Pattern = /2\.(\d+)\.\s*([^2]*?)(?=2\.\d+|$)/gm;

    let match;
    while ((match = section2Pattern.exec(markdown)) !== null) {
      const questionId = `2.${match[1]}`;
      const content = match[2].trim();

      // Extract main text and parts
      const parts = this.extractQuestionParts(content);

      section2.questions[questionId] = {
        mainText: this.extractMainText(content),
        parts: parts
      };

      console.log(`✓ Extracted question ${questionId}`);
    }
  }

  // Extract parts from question content
  extractQuestionParts(content) {
    const parts = {};
    const partPattern = /\((\d+)\)\s*([^(]*?)(?=\(\d+\)|$)/gm;

    let match;
    while ((match = partPattern.exec(content)) !== null) {
      const partNum = match[1];
      const partText = match[2].trim();

      // Assign points based on typical distribution
      let points = 2;
      if (partNum === '1') points = 3;
      else if (partNum === '3') points = 2;

      parts[partNum] = {
        text: partText,
        points: points
      };
    }

    return parts;
  }

  // Extract main text before numbered parts
  extractMainText(content) {
    const mainTextMatch = content.match(/^([^(]*?)(?=\(1\)|$)/);
    return mainTextMatch ? mainTextMatch[1].trim() : content.substring(0, 200);
  }

  // Improved response validation
  validateAndProcessResponse(responseText) {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`JSON parsing failed: ${e.message}`);
    }

    // Validate structure
    if (!parsed.exams || typeof parsed.exams !== 'object') {
      throw new Error('Invalid exam structure: missing exams object');
    }

    const examKeys = Object.keys(parsed.exams);
    if (examKeys.length === 0) {
      throw new Error('No exams found in parsed data');
    }

    // Analyze and report structure
    const analysis = this.analyzeExamStructure(parsed);
    console.log('Exam parsing complete:', analysis);

    return parsed;
  }

  // Comprehensive structure analysis
  analyzeExamStructure(data) {
    const analysis = {
      totalExams: 0,
      examDetails: {},
      globalStats: {
        totalSections: 0,
        totalQuestions: 0,
        totalPoints: 0
      }
    };

    Object.entries(data.exams).forEach(([examKey, exam]) => {
      analysis.totalExams++;

      const examAnalysis = {
        metadata: exam.metadata || {},
        sections: {},
        totals: { questions: 0, points: 0, sections: 0 }
      };

      // Handle both old (section1, section2) and new (sections) formats
      const sectionsToAnalyze = exam.sections ? exam.sections :
        Object.fromEntries(
          Object.entries(exam).filter(([key]) => key.startsWith('section'))
        );

      Object.entries(sectionsToAnalyze).forEach(([sectionId, section]) => {
        if (!section.questions) return;

        const sectionAnalysis = {
          title: section.title || sectionId,
          type: section.type || 'unknown',
          questionCount: Object.keys(section.questions).length,
          pointsTotal: 0,
          pointsDistribution: {},
          hasMultiPart: false
        };

        // Analyze questions
        Object.entries(section.questions).forEach(([, question]) => {
          let questionPoints = 0;

          if (question.points) {
            questionPoints = question.points;
          }

          // Add points from sub-parts
          if (question.parts) {
            sectionAnalysis.hasMultiPart = true;
            Object.values(question.parts).forEach(part => {
              if (part.points) questionPoints += part.points;
            });
          }

          sectionAnalysis.pointsTotal += questionPoints;

          // Track point distribution
          const pointKey = questionPoints.toString();
          sectionAnalysis.pointsDistribution[pointKey] =
            (sectionAnalysis.pointsDistribution[pointKey] || 0) + 1;
        });

        examAnalysis.sections[sectionId] = sectionAnalysis;
        examAnalysis.totals.questions += sectionAnalysis.questionCount;
        examAnalysis.totals.points += sectionAnalysis.pointsTotal;
        examAnalysis.totals.sections++;
      });

      analysis.examDetails[examKey] = examAnalysis;
      analysis.globalStats.totalSections += examAnalysis.totals.sections;
      analysis.globalStats.totalQuestions += examAnalysis.totals.questions;
      analysis.globalStats.totalPoints += examAnalysis.totals.points;
    });

    return analysis;
  }

  // Claude API call with retry logic
  async callClaudeAPI(prompt, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        // Implement your Claude API call here
        // This is a placeholder - replace with actual API integration
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;

      } catch (error) {
        console.warn(`API call attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) throw error;

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  // Generate exam statistics report
  generateStatsReport(analysisData) {
    const { examDetails, globalStats } = analysisData;

    console.group('📊 Exam Parsing Statistics');
    console.log(`Total Questions: ${globalStats.totalQuestions}`);
    console.log(`Total Sections: ${globalStats.totalSections}`);
    console.log(`Total Points: ${globalStats.totalPoints}`);

    Object.entries(examDetails).forEach(([examKey, exam]) => {
      console.group(`📝 ${examKey}`);
      console.log(`Subject: ${exam.metadata.subject || 'Unknown'}`);
      console.log(`Year: ${exam.metadata.year || 'Unknown'}`);
      console.log(`Variant: ${exam.metadata.variant || 'Unknown'}`);

      Object.entries(exam.sections).forEach(([, section]) => {
        console.group(`📋 ${section.title}`);
        console.log(`Questions: ${section.questionCount}`);
        console.log(`Points: ${section.pointsTotal}`);
        console.log(`Type: ${section.type}`);
        console.log(`Multi-part: ${section.hasMultiPart ? 'Yes' : 'No'}`);
        console.log(`Point distribution:`, section.pointsDistribution);
        console.groupEnd();
      });

      console.groupEnd();
    });

    console.groupEnd();

    return analysisData;
  }
}

// Enhanced integration for Vue component
export default class ExamParserIntegration {
  constructor(apiKey) {
    this.parser = new ExamParser(apiKey);
    this.examData = null;
    this.analysisData = null;
  }

  async parseExam(markdown) {
    try {
      console.log('🔍 Starting enhanced exam parsing...');

      this.examData = await this.parser.parseMarkdownWithClaude(markdown);
      this.analysisData = this.parser.analyzeExamStructure(this.examData);

      console.log('✅ Parsing complete');
      this.parser.generateStatsReport(this.analysisData);

      return {
        success: true,
        data: this.examData,
        analysis: this.analysisData
      };

    } catch (error) {
      console.error('❌ Parsing failed:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        analysis: null
      };
    }
  }

  // Get formatted statistics for UI display
  getUIStats() {
    if (!this.analysisData) return null;

    const { globalStats, examDetails } = this.analysisData;
    const examKey = Object.keys(examDetails)[0];
    const exam = examDetails[examKey];

    return {
      subject: exam.metadata.subject || 'Unknown',
      year: exam.metadata.year || new Date().getFullYear(),
      variant: exam.metadata.variant || 'Unknown',
      totalQuestions: globalStats.totalQuestions,
      totalSections: globalStats.totalSections,
      totalPoints: globalStats.totalPoints,
      sectionBreakdown: Object.entries(exam.sections).map(([id, section]) => ({
        id,
        title: section.title,
        questions: section.questionCount,
        points: section.pointsTotal,
        type: section.type
      }))
    };
  }

  // Extract questions for specific section
  getSectionQuestions(sectionId) {
    if (!this.examData) return [];

    const examKey = Object.keys(this.examData.exams)[0];
    const exam = this.examData.exams[examKey];

    // Handle both old and new structure
    const section = exam.sections?.[sectionId] || exam[sectionId];

    if (!section?.questions) return [];

    return Object.entries(section.questions).map(([qId, question]) => ({
      id: qId,
      text: question.text || question.mainText,
      points: question.points || 0,
      type: question.type || 'unknown',
      options: question.options || null,
      parts: question.parts || null
    }));
  }
}