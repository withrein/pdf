import fs from 'fs/promises';
import path from 'path';

/**
 * Simple HTML Question Extractor
 * Uses regex patterns to extract questions directly from HTML content
 */
class SimpleHTMLExtractor {
  constructor() {
    this.questions = [];
  }

  /**
   * Extract questions using simple regex patterns
   */
  async extractQuestionsFromHTML(filePath) {
    try {
      console.log(`📄 Reading HTML file: ${filePath}`);

      const htmlContent = await fs.readFile(filePath, 'utf8');

      // First copy the file locally for easier access
      const localFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
      await fs.copyFile(filePath, localFile);
      console.log(`📁 Copied file to: ${localFile}`);

      // Use the direct text extraction approach that worked before
      await this.extractWithRegex(htmlContent);

      console.log(`✅ Extracted ${this.questions.length} questions total`);
      return this.questions;

    } catch (error) {
      console.error('❌ Error extracting questions:', error);
      throw error;
    }
  }

  /**
   * Extract using direct regex patterns on HTML content
   */
  async extractWithRegex(htmlContent) {
    console.log('🔍 Using regex pattern extraction...');

    // Remove HTML tags and decode entities
    let text = htmlContent.replace(/<[^>]+>/g, ' ');
    text = text.replace(/&[a-zA-Z0-9#]+;/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();

    console.log(`📋 Processed text length: ${text.length} characters`);

    // Find all number patterns that could be questions
    const numberPatterns = text.match(/\b\d+\.\s*/g);
    console.log(`📋 Found ${numberPatterns ? numberPatterns.length : 0} number patterns`);

    // Extract specific question patterns
    this.extractMultipleChoiceWithRegex(text);
    this.extractFillInWithRegex(text);
  }

  /**
   * Extract multiple choice questions using regex
   */
  extractMultipleChoiceWithRegex(text) {
    console.log('🔍 Extracting multiple choice questions with regex...');

    // Look for patterns like "1. question text A. option B. option..."
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i].trim();

      // Look for question numbers (1., 2., etc.)
      const questionMatch = word.match(/^(\d+)\.$/);

      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);

        if (questionNumber >= 1 && questionNumber <= 36) {
          // Collect text after the question number
          const questionData = this.collectQuestionFromWords(words, i, questionNumber);

          if (questionData.questionText.length > 5) {
            // Determine points
            let points = 1;
            if (questionNumber >= 9 && questionNumber <= 28) points = 2;
            if (questionNumber >= 29 && questionNumber <= 36) points = 3;

            const question = {
              id: `mc_${questionNumber}`,
              type: 'multiple_choice',
              questionNumber: questionNumber,
              questionText: questionData.questionText,
              options: questionData.options,
              points: points,
              section: 1,
              extracted: new Date().toISOString()
            };

            this.questions.push(question);
            console.log(`   ✓ Question ${questionNumber}: ${questionData.questionText.substring(0, 50)}...`);
          }
        }
      }
    }
  }

  /**
   * Collect question text and options from word array
   */
  collectQuestionFromWords(words, startIndex, questionNumber) {
    let questionText = '';
    const options = [];
    let currentMode = 'question'; // 'question' or 'options'

    // Look ahead to collect question text and options
    for (let i = startIndex + 1; i < Math.min(startIndex + 100, words.length); i++) {
      const word = words[i];

      // Stop if we hit another question number
      if (word.match(/^\d+\.$/)) {
        break;
      }

      // Check for option letters (A., B., C., D., E.)
      const optionMatch = word.match(/^([A-E])\.$/);
      if (optionMatch) {
        currentMode = 'options';
        // Collect option text
        const optionText = this.collectOptionText(words, i);
        if (optionText.length > 0) {
          options.push({
            letter: optionMatch[1],
            text: optionText
          });
        }
        continue;
      }

      // Collect question text
      if (currentMode === 'question' && !optionMatch) {
        questionText += word + ' ';
      }

      // Stop after collecting enough options
      if (options.length >= 5) {
        break;
      }
    }

    return {
      questionText: questionText.trim(),
      options: options
    };
  }

  /**
   * Collect option text after option letter
   */
  collectOptionText(words, startIndex) {
    let optionText = '';

    for (let i = startIndex + 1; i < Math.min(startIndex + 20, words.length); i++) {
      const word = words[i];

      // Stop at next option letter or question number
      if (word.match(/^[A-E]\.$/) || word.match(/^\d+\.$/)) {
        break;
      }

      optionText += word + ' ';
    }

    return optionText.trim();
  }

  /**
   * Extract fill-in questions using regex
   */
  extractFillInWithRegex(text) {
    console.log('🔍 Extracting fill-in questions with regex...');

    // Look for 2.1, 2.2, 2.3 patterns
    const fillMatches = text.match(/2\.([123])\./g);

    if (fillMatches) {
      fillMatches.forEach(match => {
        const subNumber = match.match(/2\.(\d)\./)[1];

        const question = {
          id: `fill_2_${subNumber}`,
          type: 'fill_in',
          questionNumber: `2.${subNumber}`,
          questionText: `[Нөхөх асуулт 2.${subNumber} - HTML-аас бодит текст салгах шаардлагатай]`,
          parts: [
            { partNumber: 1, text: '[Эхний хэсэг]', points: 3 },
            { partNumber: 2, text: '[Хоёрдугаар хэсэг]', points: 2 },
            { partNumber: 3, text: '[Гуравдугаар хэсэг]', points: 2 }
          ],
          points: 7,
          section: 2,
          extracted: new Date().toISOString()
        };

        this.questions.push(question);
        console.log(`   ✓ Fill-in 2.${subNumber}: ${question.questionText.substring(0, 50)}...`);
      });
    }
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    console.log('\n📊 Extraction Summary:');
    console.log(`Total questions: ${this.questions.length}`);

    const mcQuestions = this.questions.filter(q => q.type === 'multiple_choice');
    const fillQuestions = this.questions.filter(q => q.type === 'fill_in');

    console.log(`Multiple choice: ${mcQuestions.length}`);
    console.log(`Fill-in questions: ${fillQuestions.length}`);

    console.log('\nExtracted questions:');
    this.questions.forEach(q => {
      console.log(`  ${q.questionNumber}. ${q.questionText.substring(0, 60)}... (${q.points} оноо)`);
    });
  }
}

export default SimpleHTMLExtractor;