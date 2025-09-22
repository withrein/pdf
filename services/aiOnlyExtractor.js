const Anthropic = require('@anthropic-ai/sdk');

const AI_COMPLETE_EXTRACTION_PROMPT = `
CRITICAL: Extract EVERY SINGLE question from this document. DO NOT merge multiple questions together.

QUESTION SEPARATION RULES:
1. Look for numbered question patterns like "1.", "2.", "3.", etc.
2. Look for section headers like "Бодлого 9-28"
3. Each question should be extracted as a SEPARATE item
4. If you see multiple question numbers in one text block, SPLIT them into separate questions
5. NEVER merge questions - each question gets its own JSON object

IMAGE ASSOCIATION RULES:
1. Each image URL can only be used ONCE for ONE specific question
2. Match images to questions based on their position in the document
3. If an image appears near question N, assign it to question N only

EXTRACTION STEPS:
1. Scan the entire document for question boundaries
2. Identify each individual question by its number/pattern
3. Extract question text stopping at the next question boundary
4. Assign images based on proximity to each question
5. Validate that no questions are merged together

Return JSON format:
{
  "metadata": {
    "language": "auto-detected",
    "totalQuestions": 0,
    "documentType": "detected_type",
    "extractionConfidence": 95,
    "sectionsFound": ["section1_type", "section2_type"]
  },
  "content": {
    "sections": [
      {
        "id": "section1",
        "name": "Section Name",
        "questions": [
          {
            "id": 1,
            "question": "ONLY the text for question 1 - stop at question 2",
            "options": ["A. option1", "B. option2", "C. option3", "D. option4", "E. option5"],
            "questionImages": ["specific_image_for_question_1_only"],
            "points": 1
          },
          {
            "id": 2,
            "question": "ONLY the text for question 2 - stop at question 3",
            "options": ["A. option1", "B. option2", "C. option3", "D. option4", "E. option5"],
            "questionImages": ["specific_image_for_question_2_only"],
            "points": 1
          }
        ]
      }
    ]
  }
}

VALIDATION CHECKLIST:
- Each question has ONLY its own text (not merged with others)
- Each image URL appears in ONLY ONE question
- All question numbers are accounted for (no gaps)
- Questions are not duplicated or merged
- Section boundaries are properly identified

CRITICAL: If you see text like "9. question text 10. another question", split these into TWO separate question objects, not one merged object.
`;

class AIOnlyExtractor {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.model = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 8192;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.1;
    this.fallbackEnabled = process.env.FALLBACK_ENABLED === 'true';

    this.fallbackPrompts = [
      "Extract all questions from this exam document. Return structured JSON with sections and questions.",
      "Parse this educational document completely. Find every problem, question, and exercise.",
      "Find every problem and solution in this text. Structure as JSON with metadata and content."
    ];
  }

  async extractEverything(markdown) {
    try {
      const response = await this.callAnthropic(
        AI_COMPLETE_EXTRACTION_PROMPT + '\n\nDOCUMENT:\n' + markdown
      );

      const result = this.parseAIResponse(response);

      console.log('AI extraction result structure:', {
        hasSections: !!result.content?.sections,
        sectionCount: result.content?.sections?.length || 0,
        sectionsWithQuestions: result.content?.sections?.filter(s => s.questions?.length > 0).length || 0
      });

      // Validate result has content
      if (!result.content?.sections?.length) {
        console.error('No sections found in AI response');
        throw new Error('No sections found in AI response');
      }

      // Count total questions across all sections
      const totalQuestions = result.content.sections.reduce((total, section) => {
        return total + (section.questions?.length || 0);
      }, 0);

      console.log(`Found ${totalQuestions} total questions across ${result.content.sections.length} sections`);

      if (totalQuestions === 0) {
        throw new Error('No questions found in AI response');
      }

      return result;
    } catch (error) {
      console.error('Primary extraction failed:', error.message);

      if (this.fallbackEnabled) {
        return await this.extractWithRetry(markdown);
      }

      throw error;
    }
  }

  async extractWithRetry(markdown, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Retry ${i + 1} with fallback prompt`);

        const response = await this.callAnthropic(
          this.fallbackPrompts[i] + '\n\nDOCUMENT:\n' + markdown
        );

        const result = this.parseAIResponse(response);

        if (result.content?.sections?.length > 0) {
          return result;
        }
      } catch (error) {
        console.log(`Retry ${i + 1} failed:`, error.message);
      }
    }

    throw new Error('AI extraction failed after all retries');
  }

  async callAnthropic(prompt) {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.content[0].text;
  }

  parseAIResponse(response) {
    try {
      console.log('Raw AI response length:', response.length);
      console.log('AI response preview:', response.substring(0, 200) + '...');

      // Clean the response - remove any non-JSON text
      let cleanedResponse = response.trim();

      // Find JSON boundaries - look for the first complete JSON structure
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON found in AI response');
      }

      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      console.log('Extracted JSON length:', cleanedResponse.length);

      // Handle potential JSON corruption by trying to fix common issues
      cleanedResponse = this.fixCommonJSONIssues(cleanedResponse);
      console.log('After fixing JSON issues, length:', cleanedResponse.length);

      const parsed = JSON.parse(cleanedResponse);

      // Validate required structure
      if (!parsed.metadata || !parsed.content) {
        throw new Error('Invalid JSON structure from AI');
      }

      // Ensure sections exist
      if (!parsed.content.sections) {
        parsed.content.sections = [];
      }

      // Validate and fix questions structure
      this.validateAndFixQuestions(parsed.content.sections);

      // Add default metadata if missing
      if (!parsed.metadata.language) {
        parsed.metadata.language = 'auto-detected';
      }
      if (!parsed.metadata.totalQuestions) {
        parsed.metadata.totalQuestions = this.countQuestions(parsed.content.sections);
      }
      if (!parsed.metadata.extractionConfidence) {
        parsed.metadata.extractionConfidence = 85;
      }
      if (!parsed.metadata.documentType) {
        parsed.metadata.documentType = 'exam';
      }

      return parsed;

    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      console.error('Response was:', response.substring(0, 500) + '...');

      // Return fallback structure
      return {
        metadata: {
          language: 'unknown',
          totalQuestions: 0,
          documentType: 'exam',
          extractionConfidence: 0,
          error: error.message
        },
        content: {
          sections: [],
          images: [],
          formulas: []
        }
      };
    }
  }

  fixCommonJSONIssues(jsonString) {
    console.log('Fixing JSON issues in response preview:', jsonString.substring(0, 300) + '...');

    let fixed = jsonString;

    // Check if we have a partial JSON that's missing the root structure
    if (!fixed.trim().startsWith('{"metadata"') && !fixed.trim().startsWith('{\n  "metadata"')) {
      console.log('Attempting to reconstruct missing JSON structure...');

      // Try to extract sections and metadata from the partial response
      const sectionsMatch = fixed.match(/"sections":\s*\[(.*?)\]/s);
      const sectionsFoundMatch = fixed.match(/"sectionsFound":\s*\[(.*?)\]/);

      if (sectionsMatch || sectionsFoundMatch) {
        // Reconstruct the JSON with proper structure
        const sectionsFound = sectionsFoundMatch ? sectionsFoundMatch[1] : '"Unknown"';
        const sectionsContent = sectionsMatch ? sectionsMatch[1] : '[]';

        fixed = `{
          "metadata": {
            "language": "auto-detected",
            "totalQuestions": 0,
            "documentType": "exam",
            "extractionConfidence": 95,
            "sectionsFound": [${sectionsFound}]
          },
          "content": {
            "sections": [${sectionsContent}]
          }
        }`;

        console.log('Reconstructed JSON structure');
      }
    }

    // Count open and close braces
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;

    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }

    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix incomplete strings by closing them
    fixed = fixed.replace(/:\s*"[^"]*$/, ': "incomplete"');

    // Fix incomplete arrays
    fixed = fixed.replace(/,\s*$/, '');

    return fixed;
  }

  countQuestions(sections) {
    return sections.reduce((total, section) => {
      return total + (section.questions ? section.questions.length : 0);
    }, 0);
  }

  validateAndFixQuestions(sections) {
    const usedImageUrls = new Set();

    sections.forEach(section => {
      if (!section.questions) return;

      // Check for merged questions and split them
      const fixedQuestions = [];
      section.questions.forEach(question => {
        const splitQuestions = this.detectAndSplitMergedQuestions(question, section.id);
        fixedQuestions.push(...splitQuestions);
      });
      section.questions = fixedQuestions;

      section.questions.forEach(question => {
        // Fix multiple choice questions with empty options
        if (section.id === 'section1' || section.name?.toLowerCase().includes('choice')) {
          if (!question.options || question.options.length === 0) {
            console.warn(`Question ${question.id} has empty options, adding placeholder options`);
            question.options = [
              'A. [Option not extracted]',
              'B. [Option not extracted]',
              'C. [Option not extracted]',
              'D. [Option not extracted]',
              'E. [Option not extracted]'
            ];
          }
        }

        // Check for duplicate image URLs
        if (question.questionImages && Array.isArray(question.questionImages)) {
          const validImages = [];
          question.questionImages.forEach(imageUrl => {
            if (imageUrl && !usedImageUrls.has(imageUrl)) {
              usedImageUrls.add(imageUrl);
              validImages.push(imageUrl);
            } else if (imageUrl && usedImageUrls.has(imageUrl)) {
              console.warn(`Duplicate image URL found for question ${question.id}: ${imageUrl}`);
            }
          });
          question.questionImages = validImages;
        }

        // Ensure questionImages is an array
        if (!question.questionImages) {
          question.questionImages = [];
        }

        // Ensure points is set
        if (!question.points) {
          question.points = section.id === 'section1' ? 1 : 7;
        }
      });
    });
  }

  detectAndSplitMergedQuestions(question, sectionId) {
    const questionText = question.question || '';

    // Check if the question text is abnormally long (indicating merged questions)
    if (questionText.length > 500) {
      console.warn(`Question ${question.id} is abnormally long (${questionText.length} chars), checking for merged questions`);

      // Look for multiple question numbers in the text
      const numberMatches = questionText.match(/\b(\d+)\s*[.．]/g);
      if (numberMatches && numberMatches.length > 1) {
        console.log(`Found ${numberMatches.length} question numbers in merged text:`, numberMatches);

        // Split the text at question boundaries
        const parts = questionText.split(/\b(\d+)\s*[.．]/);
        const splitQuestions = [];

        for (let i = 1; i < parts.length; i += 2) {
          if (parts[i] && parts[i+1]) {
            const questionNumber = parseInt(parts[i]);
            const questionContent = parts[i+1].trim();

            if (questionContent.length > 20) { // Valid question content
              splitQuestions.push({
                ...question,
                id: questionNumber,
                question: questionContent.split(/\b\d+\s*[.．]/)[0].trim(), // Take only the first part
                questionImages: [], // Will be reassigned later
                points: sectionId === 'section1' ? (questionNumber <= 8 ? 1 : questionNumber <= 28 ? 2 : 3) : 7
              });
            }
          }
        }

        if (splitQuestions.length > 1) {
          console.log(`Successfully split merged question into ${splitQuestions.length} separate questions`);
          return splitQuestions;
        }
      }
    }

    return [question]; // Return original question if no splitting needed
  }

  // Convert AI result to legacy format for compatibility
  convertToLegacyFormat(aiResult) {
    console.log('Converting AI result to legacy format...');
    console.log('Available sections:', aiResult.content.sections.map(s => ({id: s.id, name: s.name, questionCount: s.questions?.length || 0})));

    // Find multiple choice section (section1)
    const section1 = aiResult.content.sections.find(s =>
      s.id === 'section1' ||
      s.name?.toLowerCase().includes('choice') ||
      s.name?.toLowerCase().includes('multiple') ||
      s.name?.toLowerCase().includes('сонгох')
    );

    // Find fill-in-blank section (section2)
    const section2 = aiResult.content.sections.find(s =>
      s.id === 'section2' ||
      s.name?.toLowerCase().includes('fill') ||
      s.name?.toLowerCase().includes('blank') ||
      s.name?.toLowerCase().includes('нөхөх')
    );

    // If no clear sections found, try to distribute questions by point value or pattern
    let finalSection1 = section1?.questions || [];
    let finalSection2 = section2?.questions || [];

    if (finalSection1.length === 0 && finalSection2.length === 0) {
      console.log('No clear sections found, attempting to categorize all questions...');

      // Combine all questions from all sections
      const allQuestions = [];
      aiResult.content.sections.forEach(section => {
        if (section.questions) {
          allQuestions.push(...section.questions);
        }
      });

      console.log(`Found ${allQuestions.length} total questions to categorize`);

      // Separate by question characteristics
      allQuestions.forEach(q => {
        const hasOptions = q.options && q.options.length > 0;
        const hasSubparts = q.subparts && q.subparts.length > 0;
        const hasLowPoints = q.points && q.points <= 3;

        if (hasOptions || hasLowPoints) {
          finalSection1.push(q);
        } else if (hasSubparts || q.points === 7) {
          finalSection2.push(q);
        } else {
          // Default to section1 for remaining questions
          finalSection1.push(q);
        }
      });
    }

    console.log(`Legacy format: Section1=${finalSection1.length}, Section2=${finalSection2.length}`);

    return {
      section1: finalSection1,
      section2: finalSection2,
      metadata: aiResult.metadata,
      originalMarkdown: '', // Will be set by caller
      questions: {
        section1: finalSection1,
        section2: finalSection2
      },
      version: 'ai-complete-v1'
    };
  }
}

module.exports = AIOnlyExtractor;