import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class ImprovedHTMLExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
  }

  /**
   * Extract questions from HTML file and get HTML segments
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-HTML-V2') {
    try {
      console.log('🚀 Starting improved HTML extraction...\n');

      const htmlContent = readFileSync(filePath, 'utf8');

      // Extract multiple choice questions (1-40)
      await this.extractMultipleChoiceHTML(htmlContent);

      // Extract fill-in questions (А, Б, В)
      await this.extractFillInHTML(htmlContent);

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
   * Extract multiple choice questions with HTML formatting
   */
  async extractMultipleChoiceHTML(htmlContent) {
    console.log('📝 Extracting multiple choice questions...');

    for (let questionNum = 1; questionNum <= 40; questionNum++) {
      // Create regex pattern to find the question and its options
      const questionPattern = new RegExp(
        `${questionNum}\\.\\s*([\\s\\S]*?)(?=\\d+\\.\\s|А\\.\\s|Хоёрдугаар хэсэг|$)`,
        'g'
      );

      const match = questionPattern.exec(htmlContent);
      if (match) {
        const questionText = match[1].trim();

        // Extract HTML for this question section
        const htmlPattern = new RegExp(
          `(<[^>]*>)*\\s*${questionNum}\\.\\s*([\\s\\S]*?)(?=\\s*\\d+\\.\\s|\\s*А\\.\\s|Хоёрдугаар хэсэг|$)`,
          'g'
        );

        const htmlMatch = htmlPattern.exec(htmlContent);
        let questionHTML = htmlMatch ? htmlMatch[0] : `<p>${questionNum}. ${questionText}</p>`;

        // Extract options (а. б. в. г. д.)
        const options = [];
        const optionsHTML = [];
        const optionLetters = ['а', 'б', 'в', 'г', 'д'];

        for (const letter of optionLetters) {
          const optionPattern = new RegExp(`${letter}\\.\\s*([^а-д\\.]*?)(?=[а-д]\\.|$)`, 'g');
          const optionMatch = optionPattern.exec(questionText);

          if (optionMatch) {
            const optionText = optionMatch[1].trim();
            options.push({
              letter: letter,
              text: optionText
            });

            // Create HTML for option
            optionsHTML.push(`<div class="option"><span class="option-letter">${letter}.</span> ${optionText}</div>`);
          }
        }

        if (questionText.length > 10) { // Only save meaningful questions
          this.questions.push({
            id: `mc_${questionNum}`,
            type: 'multiple_choice',
            questionNumber: questionNum,
            questionText: this.cleanText(questionText),
            questionHTML: this.cleanHTML(questionHTML),
            options: options,
            optionsHTML: optionsHTML,
            points: 1
          });
          this.multipleChoiceCount++;
        }
      }
    }
  }

  /**
   * Extract fill-in questions with HTML formatting
   */
  async extractFillInHTML(htmlContent) {
    console.log('📝 Extracting fill-in questions...');

    const fillInQuestions = ['А', 'Б', 'В'];

    for (const questionLetter of fillInQuestions) {
      // Find the question section
      const questionPattern = new RegExp(
        `${questionLetter}\\.\\s*([\\s\\S]*?)(?=[АБВ]\\.|$)`,
        'g'
      );

      const match = questionPattern.exec(htmlContent);
      if (match) {
        const questionContent = match[1].trim();

        // Extract HTML for this question
        const htmlPattern = new RegExp(
          `(<[^>]*>)*\\s*${questionLetter}\\.\\s*([\\s\\S]*?)(?=\\s*[АБВ]\\.|$)`,
          'g'
        );

        const htmlMatch = htmlPattern.exec(htmlContent);
        let questionHTML = htmlMatch ? htmlMatch[0] : `<p>${questionLetter}. ${questionContent}</p>`;

        // Extract parts (1), (2), (3)
        const parts = [];
        const partsHTML = [];
        const partPattern = /\((\d+)\)\s*([^(]*?)(?=\(\d+\)|$)/g;

        let partMatch;
        while ((partMatch = partPattern.exec(questionContent)) !== null) {
          const partNumber = partMatch[1];
          const partText = partMatch[2].trim();

          if (partText.length > 5) {
            parts.push({
              partNumber: partNumber,
              text: partText,
              points: 5
            });

            partsHTML.push(`<div class="question-part"><span class="part-number">(${partNumber})</span> ${partText}</div>`);
          }
        }

        if (questionContent.length > 10) {
          this.questions.push({
            id: `fill_in_${questionLetter}`,
            type: 'fill_in',
            questionNumber: questionLetter,
            questionText: this.cleanText(questionContent),
            questionHTML: this.cleanHTML(questionHTML),
            parts: parts,
            partsHTML: partsHTML,
            points: parts.length * 5
          });
          this.fillInCount++;
        }
      }
    }
  }

  /**
   * Clean HTML content
   */
  cleanHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Clean text content
   */
  cleanText(text) {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Save questions to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving HTML questions to Firebase...');

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
        await addDoc(questionsRef, {
          ...question,
          format: 'HTML'
        });
        console.log(`   ✓ Saved question: ${question.id}`);
      }

      console.log('🎉 All questions saved to Firebase!');

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
    console.log('\n📊 Extraction Summary:');
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
    const extractor = new ImprovedHTMLExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default ImprovedHTMLExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}