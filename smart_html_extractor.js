import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class SmartHTMLExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
  }

  /**
   * Extract questions using proven text method but create HTML formatting
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-HTML-Smart') {
    try {
      console.log('🚀 Starting smart HTML extraction...\n');

      // Read file and extract text
      const content = readFileSync(filePath, 'utf8');
      const text = this.extractTextFromHTML(content);

      console.log('📂 HTML file processed, extracting questions...');

      // Extract questions using proven method
      await this.extractMultipleChoiceQuestions(text);
      await this.extractFillInQuestions(text);

      console.log(`✅ Extracted ${this.questions.length} questions`);
      this.printSummary();

      // Save to Firebase
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
   * Extract text from HTML
   */
  extractTextFromHTML(htmlContent) {
    // Remove HTML tags but preserve structure
    return htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract multiple choice questions (1-40)
   */
  async extractMultipleChoiceQuestions(text) {
    console.log('📝 Extracting multiple choice questions...');

    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const questionMatch = word.match(/^(\d+)\.$/);

      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);

        if (questionNumber >= 1 && questionNumber <= 40) {
          // Extract question text
          let questionText = '';
          let j = i + 1;

          // Continue until we find options or next question
          while (j < words.length) {
            const nextWord = words[j];

            // Check if we hit an option (а. б. в. г. д.)
            if (nextWord.match(/^[а-д]\.$/)) {
              break;
            }

            // Check if we hit next question
            const nextQuestionMatch = nextWord.match(/^(\d+)\.$/);
            if (nextQuestionMatch) {
              const nextNum = parseInt(nextQuestionMatch[1]);
              if (nextNum >= 1 && nextNum <= 40 && nextNum !== questionNumber) {
                break;
              }
            }

            // Check if we hit fill-in section
            if (nextWord.match(/^[АБВ]\.$/)) {
              break;
            }

            questionText += nextWord + ' ';
            j++;
          }

          // Extract options
          const options = [];
          const optionLetters = ['а', 'б', 'в', 'г', 'д'];

          for (const letter of optionLetters) {
            // Find option text
            const optionIndex = words.findIndex((w, idx) =>
              idx > j && w === `${letter}.`
            );

            if (optionIndex !== -1) {
              let optionText = '';
              let k = optionIndex + 1;

              // Extract option text until next option or question
              while (k < words.length) {
                const nextWord = words[k];

                // Stop at next option
                if (optionLetters.some(l => nextWord === `${l}.`)) {
                  break;
                }

                // Stop at next question
                if (nextWord.match(/^(\d+)\.$/)) {
                  break;
                }

                // Stop at fill-in section
                if (nextWord.match(/^[АБВ]\.$/)) {
                  break;
                }

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

          // Only save if question has meaningful content
          if (questionText.trim().length > 10) {
            // Create HTML formatting for question
            const questionHTML = this.createQuestionHTML(questionNumber, questionText.trim());
            const optionsHTML = options.map(opt =>
              this.createOptionHTML(opt.letter, opt.text)
            );

            this.questions.push({
              id: `mc_${questionNumber}`,
              type: 'multiple_choice',
              questionNumber: questionNumber,
              questionText: questionText.trim(),
              questionHTML: questionHTML,
              options: options,
              optionsHTML: optionsHTML,
              points: 1,
              format: 'HTML'
            });

            this.multipleChoiceCount++;
          }
        }
      }
    }
  }

  /**
   * Extract fill-in questions (А, Б, В)
   */
  async extractFillInQuestions(text) {
    console.log('📝 Extracting fill-in questions...');

    const fillInQuestions = ['А', 'Б', 'В'];
    const words = text.split(' ');

    for (const questionLetter of fillInQuestions) {
      // Find question start
      const questionIndex = words.findIndex(word => word === `${questionLetter}.`);

      if (questionIndex !== -1) {
        let questionText = '';
        let j = questionIndex + 1;

        // Extract question text until next fill-in question
        while (j < words.length) {
          const nextWord = words[j];

          // Stop at next fill-in question
          if (fillInQuestions.some(letter => nextWord === `${letter}.`)) {
            break;
          }

          questionText += nextWord + ' ';
          j++;
        }

        // Extract parts (1), (2), (3)
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

        // Only save if question has meaningful content
        if (questionText.trim().length > 10) {
          // Create HTML formatting
          const questionHTML = this.createFillInQuestionHTML(questionLetter, questionText.trim());
          const partsHTML = parts.map(part =>
            this.createPartHTML(part.partNumber, part.text)
          );

          this.questions.push({
            id: `fill_in_${questionLetter}`,
            type: 'fill_in',
            questionNumber: questionLetter,
            questionText: questionText.trim(),
            questionHTML: questionHTML,
            parts: parts,
            partsHTML: partsHTML,
            points: parts.length * 5,
            format: 'HTML'
          });

          this.fillInCount++;
        }
      }
    }
  }

  /**
   * Create HTML for multiple choice question
   */
  createQuestionHTML(questionNumber, questionText) {
    return `<div class="question-content">
      <div class="question-header">
        <span class="question-number">${questionNumber}.</span>
      </div>
      <div class="question-text">${this.formatMathText(questionText)}</div>
    </div>`;
  }

  /**
   * Create HTML for option
   */
  createOptionHTML(letter, optionText) {
    return `<div class="option">
      <span class="option-letter">${letter}.</span>
      <span class="option-text">${this.formatMathText(optionText)}</span>
    </div>`;
  }

  /**
   * Create HTML for fill-in question
   */
  createFillInQuestionHTML(questionLetter, questionText) {
    return `<div class="fill-question-content">
      <div class="question-header">
        <span class="question-number">${questionLetter}.</span>
      </div>
      <div class="question-text">${this.formatMathText(questionText)}</div>
    </div>`;
  }

  /**
   * Create HTML for question part
   */
  createPartHTML(partNumber, partText) {
    return `<div class="question-part">
      <span class="part-number">(${partNumber})</span>
      <span class="part-text">${this.formatMathText(partText)}</span>
    </div>`;
  }

  /**
   * Format mathematical text
   */
  formatMathText(text) {
    return text
      // Convert fractions
      .replace(/(\d+)\/(\d+)/g, '<sup>$1</sup>⁄<sub>$2</sub>')
      // Convert powers
      .replace(/\^(\d+)/g, '<sup>$1</sup>')
      // Convert subscripts
      .replace(/_(\d+)/g, '<sub>$1</sub>')
      // Convert mathematical symbols
      .replace(/sqrt/g, '√')
      .replace(/infinity/g, '∞')
      .replace(/pi/g, 'π')
      .replace(/\+\-/g, '±')
      .replace(/deg/g, '°');
  }

  /**
   * Save questions to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving smart HTML questions to Firebase...');

      // Create exam document
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: questions.length,
        multipleChoiceCount: questions.filter(q => q.type === 'multiple_choice').length,
        fillInCount: questions.filter(q => q.type === 'fill_in').length,
        format: 'HTML',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created exam document: ${examName}`);

      // Save each question
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved HTML question: ${question.id}`);
      }

      console.log('🎉 All smart HTML questions saved to Firebase!');

      return {
        examId: examName,
        questionsCount: questions.length,
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
    console.log('\n📊 Smart HTML Extraction Summary:');
    console.log(`├── Multiple Choice Questions: ${this.multipleChoiceCount}`);
    console.log(`├── Fill-in Questions: ${this.fillInCount}`);
    console.log(`└── Total Questions: ${this.questions.length}`);

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
    const extractor = new SmartHTMLExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default SmartHTMLExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}