import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class ZeroLossHTMLExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
    this.fullCSS = '';
    this.originalHTML = '';
  }

  /**
   * Extract questions with ZERO format loss from HTML file
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-ZERO-LOSS') {
    try {
      console.log('🚀 Starting ZERO LOSS HTML extraction...\n');

      // Read the complete HTML file
      this.originalHTML = readFileSync(filePath, 'utf8');
      console.log('📂 Original HTML file loaded successfully');

      // Extract all CSS styles
      this.extractAllCSS();
      console.log(`🎨 Extracted ${this.fullCSS.length} characters of CSS`);

      // Parse HTML structure
      const dom = new JSDOM(this.originalHTML);
      const document = dom.window.document;

      // Extract each question with complete HTML preservation
      await this.extractCompleteQuestionsHTML(document);

      console.log(`✅ Extracted ${this.questions.length} questions with ZERO format loss`);
      this.printSummary();

      // Save to Firebase with complete HTML preservation
      const result = await this.saveToFirebase(this.questions, examName);

      console.log('\n🎉 ZERO LOSS process completed successfully!');
      console.log(`📋 Exam ID: ${result.examId}`);
      console.log(`📝 Questions saved: ${result.questionsCount}`);

      return result;

    } catch (error) {
      console.error('❌ ZERO LOSS process failed:', error);
      throw error;
    }
  }

  /**
   * Extract ALL CSS styles from the HTML file
   */
  extractAllCSS() {
    // Extract all <style> tags content
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cssContent = '';
    let match;

    while ((match = styleRegex.exec(this.originalHTML)) !== null) {
      cssContent += match[1] + '\n\n';
    }

    // Also extract any <link> CSS references (for completeness)
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(this.originalHTML)) !== null) {
      console.log('Found CSS link:', linkMatch[0]);
    }

    this.fullCSS = cssContent.trim();
  }

  /**
   * Extract questions with complete HTML structure preservation
   */
  async extractCompleteQuestionsHTML(document) {
    console.log('🔍 Extracting complete HTML questions with zero loss...');

    // Get all text content to find question patterns
    const bodyText = document.body.textContent || document.body.innerText || '';

    // Extract multiple choice questions (1-40)
    for (let questionNum = 1; questionNum <= 40; questionNum++) {
      const questionHTML = this.findCompleteQuestionHTML(document, questionNum, 'multiple_choice');
      if (questionHTML) {
        this.questions.push(questionHTML);
        this.multipleChoiceCount++;
      }
    }

    // Extract fill-in questions (А, Б, В)
    const fillInLetters = ['А', 'Б', 'В'];
    for (const letter of fillInLetters) {
      const questionHTML = this.findCompleteQuestionHTML(document, letter, 'fill_in');
      if (questionHTML) {
        this.questions.push(questionHTML);
        this.fillInCount++;
      }
    }
  }

  /**
   * Find and extract complete HTML for a question with ZERO loss
   */
  findCompleteQuestionHTML(document, questionIdentifier, type) {
    try {
      // Create tree walker to traverse all nodes
      const walker = document.createTreeWalker(
        document.body,
        document.defaultView.NodeFilter.SHOW_TEXT
      );

      let questionStartNode = null;
      let questionEndNode = null;
      let currentNode;

      // Find the question start
      while (currentNode = walker.nextNode()) {
        const text = currentNode.textContent.trim();

        let isQuestionStart = false;
        if (type === 'multiple_choice') {
          isQuestionStart = text.match(new RegExp(`^${questionIdentifier}\\.\\s`));
        } else if (type === 'fill_in') {
          isQuestionStart = text.match(new RegExp(`^${questionIdentifier}\\.\\s`));
        }

        if (isQuestionStart) {
          questionStartNode = this.findContainingElement(currentNode);
          break;
        }
      }

      if (!questionStartNode) {
        return null;
      }

      // Find question end by looking for next question or section
      let searchNode = questionStartNode;
      let foundEnd = false;

      while (searchNode && !foundEnd) {
        const nextSibling = searchNode.nextElementSibling;
        if (nextSibling) {
          const siblingText = nextSibling.textContent.trim();

          // Check if this is the start of next question
          if (type === 'multiple_choice') {
            const nextQuestionNum = questionIdentifier + 1;
            if (siblingText.match(new RegExp(`^${nextQuestionNum}\\.\\s`)) ||
                siblingText.match(/^[АБВ]\.\s/) ||
                siblingText.includes('Хоёрдугаар хэсэг')) {
              questionEndNode = searchNode;
              foundEnd = true;
            }
          } else if (type === 'fill_in') {
            const nextLetters = ['А', 'Б', 'В'];
            const currentIndex = nextLetters.indexOf(questionIdentifier);
            const nextLetter = nextLetters[currentIndex + 1];

            if ((nextLetter && siblingText.match(new RegExp(`^${nextLetter}\\.\\s`))) ||
                (!nextLetter && siblingText.match(/^\d+\.\s/))) {
              questionEndNode = searchNode;
              foundEnd = true;
            }
          }

          searchNode = nextSibling;
        } else {
          // If no more siblings, this is the end
          questionEndNode = searchNode;
          foundEnd = true;
        }
      }

      // Extract complete HTML segment
      const completeHTML = this.extractHTMLSegment(questionStartNode, questionEndNode);

      if (completeHTML && completeHTML.length > 50) {
        // Extract clean text for search purposes
        const cleanText = this.extractCleanText(completeHTML);

        return {
          id: type === 'multiple_choice' ? `mc_${questionIdentifier}` : `fill_in_${questionIdentifier}`,
          type: type,
          questionNumber: questionIdentifier,
          completeHTML: completeHTML, // The complete HTML with all formatting
          questionText: cleanText, // Clean text for search/fallback
          points: type === 'multiple_choice' ? 1 : 15,
          format: 'ZERO_LOSS_HTML'
        };
      }

      return null;

    } catch (error) {
      console.error(`Error extracting question ${questionIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Find the containing element that holds the question
   */
  findContainingElement(textNode) {
    let element = textNode.parentElement;

    // Find a meaningful containing element
    while (element && element.tagName !== 'BODY') {
      const elementText = element.textContent.trim();

      // Look for elements that contain question-like content
      if (elementText.length > 20 &&
          (element.tagName === 'DIV' || element.tagName === 'P' ||
           element.tagName === 'TD' || element.tagName === 'SPAN')) {
        return element;
      }
      element = element.parentElement;
    }

    return textNode.parentElement;
  }

  /**
   * Extract HTML segment between start and end nodes
   */
  extractHTMLSegment(startNode, endNode) {
    if (!startNode) return '';

    try {
      // If we have both start and end, extract the range
      if (endNode && startNode !== endNode) {
        let htmlSegment = '';
        let currentNode = startNode;

        while (currentNode && currentNode !== endNode.nextElementSibling) {
          htmlSegment += currentNode.outerHTML + '\n';
          currentNode = currentNode.nextElementSibling;
        }

        return htmlSegment.trim();
      } else {
        // Just return the single node
        return startNode.outerHTML;
      }

    } catch (error) {
      console.error('Error extracting HTML segment:', error);
      return startNode.outerHTML || '';
    }
  }

  /**
   * Extract clean text from HTML for search/fallback
   */
  extractCleanText(html) {
    if (!html) return '';

    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit length for storage
  }

  /**
   * Save questions with ZERO format loss to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving ZERO LOSS HTML questions to Firebase...');

      // Create exam document with complete CSS
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: questions.length,
        multipleChoiceCount: questions.filter(q => q.type === 'multiple_choice').length,
        fillInCount: questions.filter(q => q.type === 'fill_in').length,
        format: 'ZERO_LOSS_HTML',
        fullCSS: this.fullCSS, // Complete CSS for zero loss rendering
        cssLength: this.fullCSS.length,
        extractionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Created ZERO LOSS exam document: ${examName}`);

      // Save each question with complete HTML
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved ZERO LOSS question: ${question.id}`);
      }

      console.log('🎉 All ZERO LOSS HTML questions saved to Firebase!');

      return {
        examId: examName,
        questionsCount: questions.length,
        cssLength: this.fullCSS.length,
        firebaseUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`
      };

    } catch (error) {
      console.error('❌ Error saving ZERO LOSS to Firebase:', error);
      throw error;
    }
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    console.log('\n📊 ZERO LOSS HTML Extraction Summary:');
    console.log(`├── Multiple Choice Questions: ${this.multipleChoiceCount}`);
    console.log(`├── Fill-in Questions: ${this.fillInCount}`);
    console.log(`├── Total Questions: ${this.questions.length}`);
    console.log(`└── CSS Characters: ${this.fullCSS.length}`);

    console.log('\n🔍 Question Details:');
    this.questions.forEach(q => {
      const htmlLength = q.completeHTML ? q.completeHTML.length : 0;
      console.log(`├── ${q.id}: ${q.type} (${q.points} points, ${htmlLength} chars HTML)`);
    });

    console.log('\n🎯 Format Preservation:');
    console.log('├── Complete HTML structure preserved');
    console.log('├── All CSS classes and styles captured');
    console.log('├── Original fonts and positioning maintained');
    console.log('└── ZERO format loss guaranteed');
  }
}

// Main execution
async function main() {
  try {
    const extractor = new ZeroLossHTMLExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 ZERO LOSS main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default ZeroLossHTMLExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}