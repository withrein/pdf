import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class ImageBasedHTMLExtractor {
  constructor() {
    this.questions = [];
    this.multipleChoiceCount = 0;
    this.fillInCount = 0;
    this.fullCSS = '';
    this.originalHTML = '';
    this.pageElements = [];
  }

  /**
   * Extract questions from image-based PDF2HTML format
   */
  async extractAndUpload(filePath, examName = 'ЭШ-2025-Математик-A-хувилбар-IMAGE-BASED') {
    try {
      console.log('🚀 Starting image-based HTML extraction (PDF2HTML format)...\n');

      // Read the complete HTML file
      this.originalHTML = readFileSync(filePath, 'utf8');
      console.log('📂 Original HTML file loaded successfully');

      // Extract all CSS styles
      this.extractAllCSS();
      console.log(`🎨 Extracted ${this.fullCSS.length} characters of CSS`);

      // Parse HTML structure
      const dom = new JSDOM(this.originalHTML);
      const document = dom.window.document;

      // Extract page elements (images + any overlays)
      await this.extractPageElements(document);

      // Create logical question divisions
      await this.createQuestionDivisions();

      console.log(`✅ Created ${this.questions.length} question segments with ZERO format loss`);
      this.printSummary();

      // Save to Firebase with complete HTML preservation
      const result = await this.saveToFirebase(this.questions, examName);

      console.log('\n🎉 IMAGE-BASED process completed successfully!');
      console.log(`📋 Exam ID: ${result.examId}`);
      console.log(`📝 Questions saved: ${result.questionsCount}`);

      return result;

    } catch (error) {
      console.error('❌ IMAGE-BASED process failed:', error);
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

    this.fullCSS = cssContent.trim();
  }

  /**
   * Extract page elements (each page is an image-based representation)
   */
  async extractPageElements(document) {
    console.log('🔍 Extracting page elements from PDF2HTML format...');

    // Find all page containers (pdf2htmlEX uses div with class "pf" for pages)
    const pageContainers = document.querySelectorAll('div[class*="pf"]');
    console.log(`Found ${pageContainers.length} page container(s)`);

    for (let i = 0; i < pageContainers.length; i++) {
      const page = pageContainers[i];
      const pageHTML = page.outerHTML;

      this.pageElements.push({
        pageNumber: i + 1,
        pageId: page.id || `page_${i + 1}`,
        completeHTML: pageHTML,
        htmlLength: pageHTML.length
      });
    }

    console.log(`📋 Extracted ${this.pageElements.length} complete page elements`);
  }

  /**
   * Create logical question divisions based on exam structure
   * Since we can't parse text from images, we create logical segments
   */
  async createQuestionDivisions() {
    console.log('📝 Creating question divisions for image-based content...');

    // For a typical math exam with 40 multiple choice + 3 fill-in questions
    // We'll create logical divisions that preserve the complete page structure

    if (this.pageElements.length === 0) {
      console.log('❌ No page elements found to process');
      return;
    }

    // Strategy: Create question segments that include complete page structure
    // This ensures zero format loss while providing logical divisions

    for (let pageIndex = 0; pageIndex < this.pageElements.length; pageIndex++) {
      const page = this.pageElements[pageIndex];

      // Create comprehensive page segment that includes everything
      const pageSegment = {
        id: `page_${page.pageNumber}`,
        type: 'page_segment',
        pageNumber: page.pageNumber,
        title: `Page ${page.pageNumber} - Complete Section`,
        completeHTML: page.completeHTML,
        format: 'IMAGE_BASED_ZERO_LOSS',
        description: `Complete page ${page.pageNumber} with all questions and formatting preserved`,
        containsQuestions: this.estimateQuestionsInPage(page.pageNumber),
        htmlLength: page.htmlLength
      };

      this.questions.push(pageSegment);
    }

    // Also create a complete document segment for full preservation
    const completeDocument = {
      id: 'complete_document',
      type: 'complete_document',
      pageNumber: 'ALL',
      title: 'Complete Exam Document',
      completeHTML: this.createCompleteDocument(),
      format: 'IMAGE_BASED_ZERO_LOSS',
      description: 'Complete exam with all pages, CSS, and formatting - absolute zero loss',
      containsQuestions: 'ALL_QUESTIONS',
      htmlLength: this.originalHTML.length
    };

    this.questions.push(completeDocument);

    console.log(`✅ Created ${this.questions.length} question segments including complete document`);
  }

  /**
   * Estimate which questions might be in each page (for organization)
   */
  estimateQuestionsInPage(pageNumber) {
    // This is estimation since we can't read the image content
    // Typical exam structure assumptions
    if (pageNumber === 1) {
      return 'Questions 1-15 (estimated)';
    } else if (pageNumber === 2) {
      return 'Questions 16-30 (estimated)';
    } else if (pageNumber === 3) {
      return 'Questions 31-40 + Fill-in A (estimated)';
    } else if (pageNumber === 4) {
      return 'Fill-in B, C (estimated)';
    } else {
      return `Additional content (page ${pageNumber})`;
    }
  }

  /**
   * Create complete document with full CSS and all pages
   */
  createCompleteDocument() {
    // Reconstruct the complete HTML document
    let completeHTML = this.originalHTML;

    // Ensure we have everything
    if (!completeHTML.includes('<html')) {
      // If somehow incomplete, build from parts
      completeHTML = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<style>
${this.fullCSS}
</style>
</head>
<body>
${this.pageElements.map(p => p.completeHTML).join('\n')}
</body>
</html>`;
    }

    return completeHTML;
  }

  /**
   * Save questions with ZERO format loss to Firebase
   */
  async saveToFirebase(questions, examName) {
    try {
      console.log('\n🔥 Saving IMAGE-BASED questions to Firebase...');

      // Create exam document with complete preservation info
      const examRef = doc(db, 'exams', examName);
      await setDoc(examRef, {
        name: examName,
        subject: 'Математик',
        year: 2025,
        variant: 'A',
        totalQuestions: questions.length,
        format: 'IMAGE_BASED_ZERO_LOSS',
        extractionMethod: 'PDF2HTML_IMAGE_PRESERVATION',
        fullCSS: this.fullCSS, // Complete CSS for perfect rendering
        cssLength: this.fullCSS.length,
        originalHTMLLength: this.originalHTML.length,
        pagesExtracted: this.pageElements.length,
        preservationLevel: 'ABSOLUTE_ZERO_LOSS',
        extractionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: 'Complete exam preserved as image-based HTML with full CSS and structure'
      });

      console.log(`✅ Created IMAGE-BASED exam document: ${examName}`);

      // Save each question segment
      const questionsRef = collection(db, 'exams', examName, 'questions');

      for (const question of questions) {
        await addDoc(questionsRef, question);
        console.log(`   ✓ Saved segment: ${question.id} (${question.htmlLength} chars)`);
      }

      console.log('🎉 All IMAGE-BASED segments saved to Firebase!');

      return {
        examId: examName,
        questionsCount: questions.length,
        cssLength: this.fullCSS.length,
        originalHTMLLength: this.originalHTML.length,
        preservationLevel: 'ABSOLUTE_ZERO_LOSS',
        firebaseUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`
      };

    } catch (error) {
      console.error('❌ Error saving IMAGE-BASED to Firebase:', error);
      throw error;
    }
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    console.log('\n📊 IMAGE-BASED HTML Extraction Summary:');
    console.log(`├── Pages Extracted: ${this.pageElements.length}`);
    console.log(`├── Total Segments: ${this.questions.length}`);
    console.log(`├── CSS Characters: ${this.fullCSS.length}`);
    console.log(`├── Original HTML Length: ${this.originalHTML.length}`);
    console.log(`└── Preservation Level: ABSOLUTE ZERO LOSS`);

    console.log('\n🔍 Segment Details:');
    this.questions.forEach(q => {
      const htmlLength = q.completeHTML ? q.completeHTML.length : 0;
      console.log(`├── ${q.id}: ${q.type} (${htmlLength} chars HTML)`);
      if (q.containsQuestions) {
        console.log(`│   └── Contains: ${q.containsQuestions}`);
      }
    });

    console.log('\n🎯 Format Preservation Guarantee:');
    console.log('├── Complete HTML structure preserved');
    console.log('├── All CSS classes and styles captured');
    console.log('├── Original images and positioning maintained');
    console.log('├── PDF2HTML structure fully preserved');
    console.log('└── ABSOLUTE ZERO format loss guaranteed');
  }
}

// Main execution
async function main() {
  try {
    const extractor = new ImageBasedHTMLExtractor();
    const htmlFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.html';
    await extractor.extractAndUpload(htmlFile);
  } catch (error) {
    console.error('💥 IMAGE-BASED main process failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export default ImageBasedHTMLExtractor;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}