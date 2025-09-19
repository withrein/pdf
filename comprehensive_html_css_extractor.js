import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class ComprehensiveHTMLCSSExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
    this.extractedCSS = '';
    this.htmlStructure = '';
  }

  /**
   * Extract questions with HTML and CSS from original file
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-WITH-CSS') {
    try {
      console.log('🚀 Starting comprehensive HTML+CSS extraction...\n');

      // Read the HTML file
      const htmlContent = readFileSync(filePath, 'utf8');
      console.log('📂 HTML file loaded successfully');

      // Extract CSS styles from the HTML
      this.extractCSSStyles(htmlContent);
      console.log('🎨 CSS styles extracted');

      // Parse with JSDOM for question extraction
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract questions with their exact HTML structure
      await this.extractQuestionsFromHTML(htmlContent, document);

      console.log(`✅ Extracted ${this.questions.length} questions with HTML+CSS`);
      this.printSummary();

      // Save to Firebase with CSS
      const result = await this.saveToFirebase(this.questions, examName);

      console.log('\n🎉 Process completed successfully!');
      console.log(`📋 Exam ID: ${result.examId}`);
      console.log(`📝 Questions saved: ${result.questionsCount}`);

      return result;

    } catch (error) {
      console.error('❌ Process failed:', error);
      throw error;
    }
  }

  /**
   * Extract CSS styles from HTML content
   */
  extractCSSStyles(htmlContent) {
    // Extract all <style> tags content
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cssContent = '';
    let match;

    while ((match = styleRegex.exec(htmlContent)) !== null) {
      cssContent += match[1] + '\n\n';
    }

    this.extractedCSS = cssContent.trim();
    console.log(`📏 Extracted ${this.extractedCSS.length} characters of CSS`);
  }

  /**
   * Extract questions with exact HTML structure
   */
  async extractQuestionsFromHTML(htmlContent, document) {
    console.log('🔍 Extracting questions with HTML structure...');

    // Convert HTML to plain text for question finding
    const text = this.extractTextFromHTML(htmlContent);

    // Extract multiple choice questions (1-40)
    await this.extractMultipleChoiceWithHTML(text, htmlContent);

    // Extract fill-in questions (А, Б, В)
    await this.extractFillInWithHTML(text, htmlContent);
  }

  /**
   * Extract text from HTML for pattern matching
   */
  extractTextFromHTML(htmlContent) {
    return htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract multiple choice questions with HTML
   */
  async extractMultipleChoiceWithHTML(text, htmlContent) {
    console.log('📝 Extracting multiple choice questions with HTML...');

    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const questionMatch = word.match(/^(\d+)\.$/);

      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);

        if (questionNumber >= 1 && questionNumber <= 40) {
          // Extract question text using proven method
          let questionText = '';
          let j = i + 1;

          while (j < words.length) {
            const nextWord = words[j];

            if (nextWord.match(/^[а-д]\.$/)) break;

            const nextQuestionMatch = nextWord.match(/^(\d+)\.$/);
            if (nextQuestionMatch) {
              const nextNum = parseInt(nextQuestionMatch[1]);
              if (nextNum >= 1 && nextNum <= 40 && nextNum !== questionNumber) break;
            }

            if (nextWord.match(/^[АБВ]\.$/)) break;

            questionText += nextWord + ' ';
            j++;
          }

          // Extract options
          const options = [];
          const optionLetters = ['а', 'б', 'в', 'г', 'д'];

          for (const letter of optionLetters) {
            const optionIndex = words.findIndex((w, idx) =>
              idx > j && w === `${letter}.`
            );

            if (optionIndex !== -1) {
              let optionText = '';
              let k = optionIndex + 1;

              while (k < words.length) {
                const nextWord = words[k];
                if (optionLetters.some(l => nextWord === `${l}.`)) break;
                if (nextWord.match(/^(\d+)\.$/)) break;
                if (nextWord.match(/^[АБВ]\.$/)) break;

                optionText += nextWord + ' ';
                k++;
              }

              if (optionText.trim().length > 2) {
                options.push({
                  letter: letter,
                  text: optionText.trim()
                });
              }
            }
          }

          // Extract HTML content for this question from original HTML
          const questionHTML = this.extractQuestionHTML(htmlContent, questionNumber, questionText.trim());
          const optionsHTML = options.map(opt =>
            this.extractOptionHTML(htmlContent, opt.letter, opt.text)
          );

          // Only save if question has meaningful content
          if (questionText.trim().length > 10) {
            this.questions.push({
              id: `mc_${questionNumber}`,
              type: 'multiple_choice',
              questionNumber: questionNumber,
              questionText: questionText.trim(),
              questionHTML: questionHTML,
              options: options,
              optionsHTML: optionsHTML,
              points: 1,
              format: 'HTML_WITH_CSS'
            });

            this.multipleChoiceCount++;
          }
        }
      }
    }
  }

  /**
   * Extract fill-in questions with HTML
   */
  async extractFillInWithHTML(text, htmlContent) {
    console.log('📝 Extracting fill-in questions with HTML...');

    const fillInQuestions = ['А', 'Б', 'В'];
    const words = text.split(' ');

    for (const questionLetter of fillInQuestions) {
      const questionIndex = words.findIndex(word => word === `${questionLetter}.`);

      if (questionIndex !== -1) {
        let questionText = '';
        let j = questionIndex + 1;

        while (j < words.length) {
          const nextWord = words[j];
          if (fillInQuestions.some(letter => nextWord === `${letter}.`)) break;
          questionText += nextWord + ' ';
          j++;
        }

        // Extract parts
        const parts = [];
        const partPattern = /\((\d+)\)\s*([^(]*?)(?=\(\d+\)|$)/g;
        let partMatch;

        while ((partMatch = partPattern.exec(questionText)) !== null) {
          const partNumber = partMatch[1];
          const partText = partMatch[2].trim();

          if (partText.length > 5) {
            parts.push({
              partNumber: partNumber,
              text: partText,
              points: 5
            });
          }
        }

        // Extract HTML content for this question
        const questionHTML = this.extractFillInQuestionHTML(htmlContent, questionLetter, questionText.trim());
        const partsHTML = parts.map(part =>
          this.extractPartHTML(htmlContent, part.partNumber, part.text)
        );

        if (questionText.trim().length > 10) {
          this.questions.push({
            id: `fill_in_${questionLetter}`,
            type: 'fill_in',
            questionNumber: questionLetter,
            questionText: questionText.trim(),
            questionHTML: questionHTML,
            parts: parts,
            partsHTML: partsHTML,
            points: parts.length * 5,
            format: 'HTML_WITH_CSS'
          });

          this.fillInCount++;
        }
      }
    }
  }

  /**
   * Extract HTML for multiple choice question
   */
  extractQuestionHTML(htmlContent, questionNumber, questionText) {
    // Try to find the exact HTML segment for this question
    const questionPattern = new RegExp(
      `(<[^>]*>)*[\\s]*${questionNumber}\\.([\\s\\S]*?)(?=\\s*\\d+\\.|\\s*[а-д]\\.|\\s*[АБВ]\\.|$)`,
      'i'
    );

    const match = questionPattern.exec(htmlContent);
    if (match) {
      // Clean up the HTML and preserve essential formatting
      return this.cleanAndPreserveHTML(match[0]);
    }

    // Fallback: create structured HTML
    return `<div class="question-content mc-question" data-question="${questionNumber}">
      <span class="question-number">${questionNumber}.</span>
      <span class="question-text">${this.escapeHTML(questionText)}</span>
    </div>`;
  }

  /**
   * Extract HTML for option
   */
  extractOptionHTML(htmlContent, letter, optionText) {
    // Try to find the exact HTML for this option
    const optionPattern = new RegExp(
      `(<[^>]*>)*[\\s]*${letter}\\.([\\s\\S]*?)(?=\\s*[а-д]\\.|\\s*\\d+\\.|\\s*[АБВ]\\.|$)`,
      'i'
    );

    const match = optionPattern.exec(htmlContent);
    if (match) {
      return this.cleanAndPreserveHTML(match[0]);
    }

    // Fallback: create structured HTML
    return `<div class="option-content" data-option="${letter}">
      <span class="option-letter">${letter}.</span>
      <span class="option-text">${this.escapeHTML(optionText)}</span>
    </div>`;
  }

  /**
   * Extract HTML for fill-in question
   */
  extractFillInQuestionHTML(htmlContent, questionLetter, questionText) {
    const questionPattern = new RegExp(
      `(<[^>]*>)*[\\s]*${questionLetter}\\.([\\s\\S]*?)(?=\\s*[АБВ]\\.|\\s*\\(\\d+\\)|$)`,
      'i'
    );

    const match = questionPattern.exec(htmlContent);
    if (match) {
      return this.cleanAndPreserveHTML(match[0]);
    }

    return `<div class="fill-question-content" data-question="${questionLetter}">
      <span class="question-number">${questionLetter}.</span>
      <span class="question-text">${this.escapeHTML(questionText)}</span>
    </div>`;
  }

  /**
   * Extract HTML for question part
   */
  extractPartHTML(htmlContent, partNumber, partText) {
    const partPattern = new RegExp(
      `(<[^>]*>)*[\\s]*\\(${partNumber}\\)([\\s\\S]*?)(?=\\s*\\(\\d+\\)|\\s*[АБВ]\\.|$)`,
      'i'
    );

    const match = partPattern.exec(htmlContent);
    if (match) {
      return this.cleanAndPreserveHTML(match[0]);
    }

    return `<div class="part-content" data-part="${partNumber}">
      <span class="part-number">(${partNumber})</span>
      <span class="part-text">${this.escapeHTML(partText)}</span>
    </div>`;
  }

  /**
   * Clean and preserve essential HTML formatting
   */
  cleanAndPreserveHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Escape HTML entities
   */
  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Save questions and CSS to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving HTML questions and CSS to Firebase...');

      // Create exam document with CSS
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: questions.length,
        multipleChoiceCount: questions.filter(q => q.type === 'multiple_choice').length,
        fillInCount: questions.filter(q => q.type === 'fill_in').length,
        format: 'HTML_WITH_CSS',
        cssStyles: this.extractedCSS, // Store CSS styles
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created exam document with CSS: ${examName}`);

      // Save each question
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved HTML+CSS question: ${question.id}`);
      }

      console.log('🎉 All HTML questions and CSS saved to Firebase!');

      return {
        examId: examName,
        questionsCount: questions.length,
        cssLength: this.extractedCSS.length,
        firebaseUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`
      };

    } catch (error) {
      console.error('❌ Error saving to Firebase:', error);
      throw error;
    }
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    console.log('\n📊 Comprehensive HTML+CSS Extraction Summary:');
    console.log(`├── Multiple Choice Questions: ${this.multipleChoiceCount}`);
    console.log(`├── Fill-in Questions: ${this.fillInCount}`);
    console.log(`├── Total Questions: ${this.questions.length}`);
    console.log(`└── CSS Characters: ${this.extractedCSS.length}`);

    console.log('\n🔍 Question Details:');
    this.questions.forEach(q => {
      console.log(`├── ${q.id}: ${q.type} (${q.points} points)`);
      if (q.options) {
        console.log(`│   └── Options: ${q.options.length}`);
      }
      if (q.parts) {
        console.log(`│   └── Parts: ${q.parts.length}`);
      }
    });
  }
}

// Main execution
async function main() {
  try {
    const extractor = new ComprehensiveHTMLCSSExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default ComprehensiveHTMLCSSExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}