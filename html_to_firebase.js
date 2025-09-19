import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs/promises';
import { JSDOM } from 'jsdom';

// Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class HTMLToFirebaseExtractor {
  constructor() {
    this.questions = [];
  }

  /**
   * Extract questions from HTML file
   */
  async extractQuestionsFromHTML(filePath) {
    try {
      console.log(`📄 Reading HTML file: ${filePath}`);

      const htmlContent = await fs.readFile(filePath, 'utf8');

      // Remove style and script tags first
      let cleanContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      cleanContent = cleanContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      const dom = new JSDOM(cleanContent);
      const document = dom.window.document;

      // Get text from all text nodes and elements
      const allText = this.extractAllText(document);
      console.log(`📋 Extracted ${allText.length} characters of text`);

      // Split into meaningful chunks
      const textChunks = this.splitIntoChunks(allText);
      console.log(`📋 Found ${textChunks.length} text chunks`);

      // Extract multiple choice questions (1-36)
      await this.extractMultipleChoiceQuestions(textChunks);

      // Extract fill-in questions (2.1, 2.2, 2.3)
      await this.extractFillInQuestions(textChunks);

      console.log(`✅ Extracted ${this.questions.length} questions total`);
      return this.questions;

    } catch (error) {
      console.error('❌ Error extracting questions:', error);
      throw error;
    }
  }

  /**
   * Extract all text from document
   */
  extractAllText(document) {
    // Get all text nodes, filtering out empty ones
    const walker = document.createTreeWalker(
      document.body,
      document.defaultView.NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textContent = '';
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text && text.length > 1) {
        textContent += text + ' ';
      }
    }

    return textContent;
  }

  /**
   * Split text into meaningful chunks
   */
  splitIntoChunks(text) {
    // Split by whitespace and filter meaningful content
    return text.split(/\s+/)
      .filter(chunk => chunk && chunk.length > 0)
      .map(chunk => chunk.trim());
  }

  /**
   * Extract multiple choice questions (1-36)
   */
  extractMultipleChoiceQuestions(chunks) {
    console.log('🔍 Extracting multiple choice questions...');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Look for numbered questions (1., 2., etc.)
      const questionMatch = chunk.match(/^(\d+)\.$/);

      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);

        // Only process questions 1-36 for multiple choice
        if (questionNumber >= 1 && questionNumber <= 36) {
          // Collect question text from following chunks
          const questionData = this.collectQuestionText(chunks, i, questionNumber);

          if (questionData.questionText.length > 10) {
            // Determine points based on question number
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
   * Extract answer options (A, B, C, D, E)
   */
  extractOptions(lines, startIndex) {
    const options = [];
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];

    for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
      const line = lines[i];

      for (const letter of optionLetters) {
        const optionMatch = line.match(new RegExp(`^${letter}[.)\\s]+(.+)`, 'i'));
        if (optionMatch) {
          options.push({
            letter: letter,
            text: optionMatch[1].trim()
          });
          break;
        }
      }

      // Stop if we found all 5 options or hit another question
      if (options.length >= 5 || line.match(/^\d+\./)) {
        break;
      }
    }

    return options;
  }

  /**
   * Extract fill-in questions (2.1, 2.2, 2.3)
   */
  extractFillInQuestions(lines) {
    console.log('🔍 Extracting fill-in questions...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for sub-questions (2.1, 2.2, etc.)
      const fillMatch = line.match(/^2\.(\d+)\.\s*(.+)/);

      if (fillMatch) {
        const subNumber = parseInt(fillMatch[1]);
        const questionText = fillMatch[2];

        // Extract parts of the fill-in question
        const parts = this.extractFillInParts(lines, i + 1);

        const question = {
          id: `fill_2_${subNumber}`,
          type: 'fill_in',
          questionNumber: `2.${subNumber}`,
          questionText: questionText,
          parts: parts,
          points: 7,
          section: 2,
          extracted: new Date().toISOString()
        };

        this.questions.push(question);
        console.log(`   ✓ Fill-in 2.${subNumber}: ${questionText.substring(0, 50)}...`);
      }
    }
  }

  /**
   * Extract parts of fill-in questions
   */
  extractFillInParts(lines, startIndex) {
    const parts = [];

    for (let i = startIndex; i < Math.min(startIndex + 15, lines.length); i++) {
      const line = lines[i];

      // Look for numbered parts like (1), (2), (3)
      const partMatch = line.match(/^\((\d+)\)\s*(.+)/);
      if (partMatch) {
        const partNumber = parseInt(partMatch[1]);
        const partText = partMatch[2];

        // Extract points if mentioned
        let points = 2; // default
        const pointsMatch = partText.match(/\((\d+)\s*оноо\)/);
        if (pointsMatch) {
          points = parseInt(pointsMatch[1]);
        }

        parts.push({
          partNumber: partNumber,
          text: partText,
          points: points
        });
      }

      // Stop if we hit another question
      if (line.match(/^2\.\d+\./) || line.match(/^\d+\./)) {
        break;
      }
    }

    return parts;
  }

  /**
   * Save questions to Firebase
   */
  async saveToFirebase(examName = 'ЭШ-2025-Математик-A-хувилбар') {
    try {
      console.log('🔥 Saving questions to Firebase...');

      // Create exam document
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: this.questions.length,
        multipleChoiceCount: this.questions.filter(q => q.type === 'multiple_choice').length,
        fillInCount: this.questions.filter(q => q.type === 'fill_in').length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created exam document: ${examName}`);

      // Save each question
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of this.questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved question: ${question.id}`);
      }

      console.log('🎉 All questions saved to Firebase successfully!');

      return {
        examId: examName,
        questionsCount: this.questions.length,
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
    console.log(`Total questions: ${this.questions.length}`);

    const mcQuestions = this.questions.filter(q => q.type === 'multiple_choice');
    const fillQuestions = this.questions.filter(q => q.type === 'fill_in');

    console.log(`Multiple choice: ${mcQuestions.length}`);
    console.log(`Fill-in questions: ${fillQuestions.length}`);

    // Points breakdown
    const totalPoints = this.questions.reduce((sum, q) => {
      if (q.type === 'multiple_choice') {
        return sum + q.points;
      } else if (q.type === 'fill_in') {
        return sum + q.points;
      }
      return sum;
    }, 0);

    console.log(`Total points: ${totalPoints}`);

    console.log('\nQuestions by section:');
    console.log('Section 1 (Multiple Choice):');
    mcQuestions.forEach(q => {
      console.log(`  ${q.questionNumber}. ${q.questionText.substring(0, 60)}... (${q.points} оноо)`);
    });

    console.log('\nSection 2 (Fill-in):');
    fillQuestions.forEach(q => {
      console.log(`  ${q.questionNumber}. ${q.questionText.substring(0, 60)}... (${q.points} оноо)`);
    });
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 HTML to Firebase Extractor Starting...\n');

    const extractor = new HTMLToFirebaseExtractor();

    // Extract questions from HTML
    const htmlFile = '/Users/rein/Downloads/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractQuestionsFromHTML(htmlFile);

    // Print summary
    extractor.printSummary();

    // Save to Firebase
    const result = await extractor.saveToFirebase();

    console.log('\n🎉 Process completed successfully!');
    console.log(`📋 Exam ID: ${result.examId}`);
    console.log(`📝 Questions saved: ${result.questionsCount}`);
    console.log(`🔗 Firebase Console: ${result.firebaseUrl}`);

  } catch (error) {
    console.error('💥 Process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default HTMLToFirebaseExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}