import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import HTMLQuestionExtractor from './html_question_extractor.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class HTMLFirebaseUploader {
  constructor() {
    this.extractor = new HTMLQuestionExtractor();
  }

  /**
   * Extract questions with HTML formatting and upload to Firebase
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-HTML') {
    try {
      console.log('🚀 Starting HTML extraction and Firebase upload...\n');

      // Extract questions preserving HTML formatting
      const questions = await this.extractor.extractQuestionsFromHTML(filePath);

      if (questions.length === 0) {
        throw new Error('No questions extracted from HTML file');
      }

      // Print summary
      this.extractor.printSummary();

      // Save to Firebase with HTML formatting
      const result = await this.saveToFirebase(questions, examName);

      console.log('\n🎉 HTML Process completed successfully!');
      console.log(`📋 Exam ID: ${result.examId}`);
      console.log(`📝 Questions saved: ${result.questionsCount}`);
      console.log(`🔗 Firebase Console: ${result.firebaseUrl}`);

      return result;

    } catch (error) {
      console.error('❌ HTML Process failed:', error);
      throw error;
    }
  }

  /**
   * Save HTML formatted questions to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving HTML questions to Firebase...');

      // Create exam document with HTML format info
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: questions.length,
        multipleChoiceCount: questions.filter(q => q.type === 'multiple_choice').length,
        fillInCount: questions.filter(q => q.type === 'fill_in').length,
        format: 'HTML', // Mark as HTML format
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created HTML exam document: ${examName}`);

      // Save each question with HTML formatting
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        const questionDoc = {
          id: question.id,
          type: question.type,
          questionNumber: question.questionNumber,
          points: question.points,
          format: 'HTML'
        };

        // Add HTML-specific fields based on question type
        if (question.type === 'multiple_choice') {
          questionDoc.questionHTML = question.questionHTML;
          questionDoc.optionsHTML = question.optionsHTML || [];

          // Also extract clean text for search/display fallback
          questionDoc.questionText = this.stripHTML(question.questionHTML);
          questionDoc.options = question.optionsHTML.map((optionHTML, index) => ({
            letter: String.fromCharCode(97 + index), // a, b, c, d, e
            text: this.stripHTML(optionHTML),
            html: optionHTML
          }));
        } else if (question.type === 'fill_in') {
          questionDoc.questionHTML = question.questionHTML;
          questionDoc.partsHTML = question.partsHTML || [];

          // Extract clean text for fallback
          questionDoc.questionText = this.stripHTML(question.questionHTML);
          questionDoc.parts = question.partsHTML.map((partHTML, index) => ({
            partNumber: index + 1,
            text: this.stripHTML(partHTML),
            html: partHTML,
            points: 5
          }));
        }

        await addDoc(questionsRef, questionDoc);
        console.log(`   ✓ Saved HTML question: ${question.id}`);
      }

      console.log('🎉 All HTML questions saved to Firebase successfully!');

      return {
        examId: examName,
        questionsCount: questions.length,
        firebaseUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`
      };

    } catch (error) {
      console.error('❌ Error saving HTML to Firebase:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags to get clean text
   */
  stripHTML(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// Main execution function
async function main() {
  try {
    const uploader = new HTMLFirebaseUploader();

    // Extract and upload with HTML formatting
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await uploader.extractAndUpload(htmlFile);

  } catch (error) {
    console.error('💥 HTML Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default HTMLFirebaseUploader;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}