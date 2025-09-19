import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class HTMLParserExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
  }

  /**
   * Extract questions from HTML file preserving HTML structure
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-HTML-Final') {
    try {
      console.log('🚀 Starting HTML parsing and extraction...\n');

      // Read the HTML file
      const htmlContent = readFileSync(filePath, 'utf8');
      console.log('📂 HTML file loaded successfully');

      // Parse with JSDOM
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract questions from HTML structure
      await this.extractQuestionsFromDOM(document);

      console.log(`✅ Extracted ${this.questions.length} questions with HTML formatting`);
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
   * Extract questions from DOM structure
   */
  async extractQuestionsFromDOM(document) {
    console.log('🔍 Parsing HTML DOM for questions...');

    // Get all text content and find question patterns
    const bodyText = document.body.textContent || '';

    // Extract multiple choice questions (1-40)
    for (let questionNum = 1; questionNum <= 40; questionNum++) {
      const questionData = this.findQuestionInDOM(document, questionNum, 'multiple_choice');
      if (questionData) {
        this.questions.push(questionData);
        this.multipleChoiceCount++;
      }
    }

    // Extract fill-in questions (А, Б, В)
    const fillInLetters = ['А', 'Б', 'В'];
    for (const letter of fillInLetters) {
      const questionData = this.findQuestionInDOM(document, letter, 'fill_in');
      if (questionData) {
        this.questions.push(questionData);
        this.fillInCount++;
      }
    }
  }

  /**
   * Find question in DOM and extract HTML
   */
  findQuestionInDOM(document, questionIdentifier, type) {
    try {
      // Create a tree walker to find text nodes
      const walker = document.createTreeWalker(
        document.body,
        document.defaultView.NodeFilter.SHOW_TEXT
      );

      let currentNode;
      let questionStartElement = null;
      let questionEndElement = null;

      // Find the question start
      while (currentNode = walker.nextNode()) {
        const text = currentNode.textContent.trim();

        let isQuestionStart = false;
        if (type === 'multiple_choice') {
          isQuestionStart = text.match(new RegExp(`^${questionIdentifier}\\.\\s*`));
        } else if (type === 'fill_in') {
          isQuestionStart = text.match(new RegExp(`^${questionIdentifier}\\.\\s*`));
        }

        if (isQuestionStart) {
          questionStartElement = this.getContainingElement(currentNode);
          break;
        }
      }

      if (!questionStartElement) {
        return null;
      }

      // Find question content
      let questionHTML = '';
      let optionsHTML = [];
      let partsHTML = [];

      if (type === 'multiple_choice') {
        // Extract question and options
        const questionContent = this.extractMultipleChoiceHTML(document, questionIdentifier);
        if (questionContent) {
          questionHTML = questionContent.questionHTML;
          optionsHTML = questionContent.optionsHTML;
        }
      } else if (type === 'fill_in') {
        // Extract question and parts
        const questionContent = this.extractFillInHTML(document, questionIdentifier);
        if (questionContent) {
          questionHTML = questionContent.questionHTML;
          partsHTML = questionContent.partsHTML;
        }
      }

      // Create question object
      const questionData = {
        id: type === 'multiple_choice' ? `mc_${questionIdentifier}` : `fill_in_${questionIdentifier}`,
        type: type,
        questionNumber: questionIdentifier,
        questionHTML: questionHTML,
        questionText: this.stripHTML(questionHTML),
        points: type === 'multiple_choice' ? 1 : partsHTML.length * 5,
        format: 'HTML'
      };

      if (type === 'multiple_choice') {
        questionData.optionsHTML = optionsHTML;
        questionData.options = optionsHTML.map((html, index) => ({
          letter: String.fromCharCode(97 + index), // a, b, c, d, e
          text: this.stripHTML(html),
          html: html
        }));
      } else if (type === 'fill_in') {
        questionData.partsHTML = partsHTML;
        questionData.parts = partsHTML.map((html, index) => ({
          partNumber: index + 1,
          text: this.stripHTML(html),
          html: html,
          points: 5
        }));
      }

      return questionData;

    } catch (error) {
      console.error(`Error extracting question ${questionIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Extract multiple choice question HTML
   */
  extractMultipleChoiceHTML(document, questionNum) {
    const bodyHTML = document.body.innerHTML;

    // Find question pattern in HTML
    const questionPattern = new RegExp(
      `(<[^>]*>)*\\s*${questionNum}\\.\\s*([\\s\\S]*?)(?=\\s*\\d+\\.\\s|\\s*А\\.\\s|Хоёрдугаар хэсэг|$)`,
      'i'
    );

    const match = questionPattern.exec(bodyHTML);
    if (!match) return null;

    const questionSection = match[0];

    // Extract question HTML (everything before options)
    const questionHTML = questionSection.split(/[а-д]\./)[0].trim();

    // Extract options HTML
    const optionsHTML = [];
    const optionLetters = ['а', 'б', 'в', 'г', 'д'];

    for (const letter of optionLetters) {
      const optionPattern = new RegExp(`${letter}\\.\\s*([^а-д]*?)(?=[а-д]\\.|$)`, 'gi');
      const optionMatch = optionPattern.exec(questionSection);

      if (optionMatch) {
        const optionHTML = `<div class="option"><span class="option-letter">${letter}.</span> ${optionMatch[1].trim()}</div>`;
        optionsHTML.push(optionHTML);
      }
    }

    return {
      questionHTML: this.cleanHTML(questionHTML),
      optionsHTML: optionsHTML
    };
  }

  /**
   * Extract fill-in question HTML
   */
  extractFillInHTML(document, questionLetter) {
    const bodyHTML = document.body.innerHTML;

    // Find question pattern in HTML
    const questionPattern = new RegExp(
      `(<[^>]*>)*\\s*${questionLetter}\\.\\s*([\\s\\S]*?)(?=\\s*[АБВ]\\.\\s|$)`,
      'i'
    );

    const match = questionPattern.exec(bodyHTML);
    if (!match) return null;

    const questionSection = match[0];

    // Extract question HTML (everything before parts)
    const questionHTML = questionSection.split(/\(\d+\)/)[0].trim();

    // Extract parts HTML
    const partsHTML = [];
    const partPattern = /\((\d+)\)\s*([^(]*?)(?=\(\d+\)|$)/gi;

    let partMatch;
    while ((partMatch = partPattern.exec(questionSection)) !== null) {
      const partNumber = partMatch[1];
      const partContent = partMatch[2].trim();

      if (partContent.length > 5) {
        const partHTML = `<div class="question-part"><span class="part-number">(${partNumber})</span> ${partContent}</div>`;
        partsHTML.push(partHTML);
      }
    }

    return {
      questionHTML: this.cleanHTML(questionHTML),
      partsHTML: partsHTML
    };
  }

  /**
   * Get containing element for a text node
   */
  getContainingElement(textNode) {
    let element = textNode.parentElement;

    // Find meaningful parent element
    while (element && element.tagName !== 'BODY') {
      if (['P', 'DIV', 'SPAN', 'TD', 'TH'].includes(element.tagName)) {
        return element;
      }
      element = element.parentElement;
    }

    return textNode.parentElement;
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
   * Strip HTML tags
   */
  stripHTML(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved HTML question: ${question.id}`);
      }

      console.log('🎉 All HTML questions saved to Firebase!');

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
    console.log('\n📊 HTML Extraction Summary:');
    console.log(`├── Multiple Choice Questions: ${this.multipleChoiceCount}`);
    console.log(`├── Fill-in Questions: ${this.fillInCount}`);
    console.log(`└── Total Questions: ${this.questions.length}`);

    console.log('\n🔍 Question Details:');
    this.questions.forEach(q => {
      console.log(`├── ${q.id}: ${q.type} (${q.points} points)`);
      if (q.optionsHTML) {
        console.log(`│   └── Options: ${q.optionsHTML.length}`);
      }
      if (q.partsHTML) {
        console.log(`│   └── Parts: ${q.partsHTML.length}`);
      }
    });
  }
}

// Main execution
async function main() {
  try {
    const extractor = new HTMLParserExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 Main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default HTMLParserExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}