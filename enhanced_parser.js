// Enhanced dynamic parser that handles complex exam structures
class ExamParser {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // Enhanced dynamic parser with better structure detection
  async parseMarkdownWithClaude(markdown) {
    const dynamicPrompt = `
Analyze this exam document and extract ALL content into JSON format.

CRITICAL ANALYSIS REQUIRED:
1. Document Structure Detection:
   - Count total sections (may be 1, 2, 3, or more)
   - Identify question numbering patterns (1,2,3... or 2.1,2.2,2.3... etc.)
   - Detect point allocation systems (fixed vs variable)
   - Find multi-part questions with sub-parts

2. Content Extraction Rules:
   - Extract ALL questions completely
   - Preserve mathematical notation exactly
   - Include all answer options for multiple choice
   - Capture sub-parts for complex questions
   - Maintain original formatting

3. Expected JSON Structure:
{
  "exams": {
    "[YEAR]_[SUBJECT]_variant_[VARIANT]": {
      "metadata": {
        "title": "[Exact document title]",
        "subject": "[Subject name]",
        "variant": "[Variant identifier]",
        "year": [Year as number]
      },
      "sections": {
        "[section_identifier]": {
          "title": "[Section title in original language]",
          "type": "[multiple_choice|fill_in|essay|mixed]",
          "totalQuestions": [Actual count],
          "totalPoints": [Sum of all points],
          "pointsPerQuestion": [If uniform, otherwise omit],
          "questions": {
            "[question_id]": {
              "text": "[Complete question text]",
              "mainText": "[For multi-part questions]",
              "points": [Question points],
              "type": "[mc|fill|essay|calculation]",
              "options": {
                "[A|B|C|D|E]": "[Option text]"
              },
              "parts": {
                "[part_id]": {
                  "text": "[Part description]",
                  "points": [Part points]
                }
              }
            }
          }
        }
      }
    }
  }
}

SPECIAL HANDLING:
- For Mongolian/Cyrillic text: preserve exactly
- For mathematical expressions: maintain Unicode symbols
- For multi-part questions: use "mainText" + "parts" structure
- For mixed point values: specify per question
- For uniform points: use "pointsPerQuestion" at section level

DOCUMENT TO PARSE:
${markdown}

Return ONLY the complete JSON structure with all detected content.`;

    try {
      const response = await this.callClaudeAPI(dynamicPrompt);
      return this.validateAndProcessResponse(response);
    } catch (error) {
      console.error('Enhanced parsing failed:', error);
      throw error;
    }
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
        Object.entries(section.questions).forEach(([qId, question]) => {
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

      Object.entries(exam.sections).forEach(([sectionId, section]) => {
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