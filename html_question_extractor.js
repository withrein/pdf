import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

class HTMLQuestionExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
  }

  /**
   * Extract questions from HTML file preserving HTML formatting
   */
  async extractQuestionsFromHTML(filePath) {
    try {
      console.log('🔍 Reading HTML file with preserved formatting...');

      const htmlContent = readFileSync(filePath, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract multiple choice questions (1-40)
      await this.extractMultipleChoiceHTML(document);

      // Extract fill-in questions (А, Б, В)
      await this.extractFillInHTML(document);

      console.log(`✅ Extracted ${this.questions.length} questions with HTML formatting`);
      return this.questions;

    } catch (error) {
      console.error('❌ Error extracting questions:', error);
      throw error;
    }
  }

  /**
   * Extract multiple choice questions preserving HTML structure
   */
  async extractMultipleChoiceHTML(document) {
    console.log('📝 Extracting multiple choice questions with HTML...');

    // Find all text nodes and elements
    const walker = document.createTreeWalker(
      document.body,
      document.defaultView.NodeFilter.SHOW_ALL
    );

    let currentNode;
    let questionElements = [];
    let currentQuestion = null;
    let isInQuestion = false;

    while (currentNode = walker.nextNode()) {
      const text = currentNode.textContent?.trim();

      if (!text) continue;

      // Check for question start (1. to 40.)
      const questionMatch = text.match(/^(\d+)\.\s*/);
      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);

        if (questionNumber >= 1 && questionNumber <= 40) {
          // Save previous question if exists
          if (currentQuestion) {
            this.saveMultipleChoiceQuestion(currentQuestion);
          }

          // Start new question
          currentQuestion = {
            questionNumber,
            htmlElements: [],
            questionHTML: '',
            optionsHTML: [],
            type: 'multiple_choice'
          };
          isInQuestion = true;

          // Add the question element
          const questionElement = this.getParentElement(currentNode);
          currentQuestion.htmlElements.push(questionElement);
        }
      }

      // Check for options (а. б. в. г. д.)
      else if (isInQuestion && text.match(/^[а-д]\.\s*/)) {
        const optionElement = this.getParentElement(currentNode);
        if (currentQuestion) {
          currentQuestion.htmlElements.push(optionElement);
        }
      }

      // Check if we've moved to next question or section
      else if (isInQuestion && (text.match(/^\d+\.\s*/) || text.includes('Хоёрдугаар хэсэг'))) {
        if (currentQuestion) {
          this.saveMultipleChoiceQuestion(currentQuestion);
          currentQuestion = null;
          isInQuestion = false;
        }
      }
    }

    // Save last question if exists
    if (currentQuestion) {
      this.saveMultipleChoiceQuestion(currentQuestion);
    }
  }

  /**
   * Extract fill-in questions preserving HTML structure
   */
  async extractFillInHTML(document) {
    console.log('📝 Extracting fill-in questions with HTML...');

    const fillInQuestions = ['А', 'Б', 'В'];

    for (const questionLetter of fillInQuestions) {
      const questionData = this.findFillInQuestionHTML(document, questionLetter);
      if (questionData) {
        this.questions.push({
          id: `fill_in_${questionLetter}`,
          type: 'fill_in',
          questionNumber: questionLetter,
          questionHTML: questionData.questionHTML,
          partsHTML: questionData.partsHTML,
          points: questionData.totalPoints || 5
        });
        this.fillInCount++;
      }
    }
  }

  /**
   * Find fill-in question HTML structure
   */
  findFillInQuestionHTML(document, questionLetter) {
    const walker = document.createTreeWalker(
      document.body,
      document.defaultView.NodeFilter.SHOW_TEXT
    );

    let currentNode;
    let foundQuestion = false;
    let questionHTML = '';
    let partsHTML = [];

    while (currentNode = walker.nextNode()) {
      const text = currentNode.textContent?.trim();

      if (text.includes(`${questionLetter}.`) && text.length < 50) {
        foundQuestion = true;
        const questionElement = this.getParentElement(currentNode);
        questionHTML = questionElement.outerHTML;

        // Look for parts (1), (2), (3)
        let nextNode = walker.nextNode();
        while (nextNode) {
          const nextText = nextNode.textContent?.trim();

          if (nextText.match(/^\(\d+\)/)) {
            const partElement = this.getParentElement(nextNode);
            partsHTML.push(partElement.outerHTML);
          }

          // Stop if we hit next question
          if (nextText.match(/^[АБВ]\./)) {
            break;
          }

          nextNode = walker.nextNode();
        }
        break;
      }
    }

    if (foundQuestion) {
      return {
        questionHTML,
        partsHTML,
        totalPoints: partsHTML.length * 5
      };
    }

    return null;
  }

  /**
   * Save multiple choice question with HTML
   */
  saveMultipleChoiceQuestion(questionData) {
    if (!questionData.htmlElements.length) return;

    // Extract question HTML and options HTML
    let questionHTML = '';
    let optionsHTML = [];

    for (const element of questionData.htmlElements) {
      const text = element.textContent?.trim();

      if (text.match(/^\d+\.\s*/)) {
        questionHTML = element.outerHTML;
      } else if (text.match(/^[а-д]\.\s*/)) {
        optionsHTML.push(element.outerHTML);
      }
    }

    if (questionHTML) {
      this.questions.push({
        id: `mc_${questionData.questionNumber}`,
        type: 'multiple_choice',
        questionNumber: questionData.questionNumber,
        questionHTML: questionHTML,
        optionsHTML: optionsHTML,
        points: 1
      });
      this.multipleChoiceCount++;
    }
  }

  /**
   * Get parent element that contains meaningful content
   */
  getParentElement(node) {
    let parent = node.nodeType === 3 ? node.parentElement : node; // Text node to element

    // Find a meaningful parent (p, div, span with content)
    while (parent && parent.tagName !== 'BODY') {
      if (['P', 'DIV', 'SPAN'].includes(parent.tagName) &&
          parent.textContent?.trim().length > 0) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return parent || node;
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

export default HTMLQuestionExtractor;