import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import SimpleHTMLExtractor from './simple_html_extractor.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseUploader {
  constructor() {
    this.extractor = new SimpleHTMLExtractor();
  }

  /**
   * Extract questions and upload to Firebase
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар') {
    try {
      console.log('🚀 Starting extraction and Firebase upload...\n');

      // Extract questions using improved algorithm
      const questions = await this.extractor.extractQuestionsFromHTML(filePath);

      if (questions.length === 0) {
        throw new Error('No questions extracted from HTML file');
      }

      // Print summary
      this.extractor.printSummary();

      // Save to Firebase
      const result = await this.saveToFirebase(questions, examName);

      console.log('\n🎉 Process completed successfully!');
      console.log(`📋 Exam ID: ${result.examId}`);
      console.log(`📝 Questions saved: ${result.questionsCount}`);
      console.log(`🔗 Firebase Console: ${result.firebaseUrl}`);

      return result;

    } catch (error) {
      console.error('❌ Process failed:', error);
      throw error;
    }
  }

  /**
   * Save questions to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving questions to Firebase...');

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created exam document: ${examName}`);

      // Save each question
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved question: ${question.id}`);
      }

      console.log('🎉 All questions saved to Firebase successfully!');

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
}

// Main execution function
async function main() {
  try {
    const uploader = new FirebaseUploader();

    // Extract and upload
    const htmlFile = '/Users/rein/Downloads/ЭШ-2025-Математик-A-хувилбар.html';
    await uploader.extractAndUpload(htmlFile);

  } catch (error) {
    console.error('💥 Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default FirebaseUploader;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}