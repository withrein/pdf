/**
 * Improved PDF to HTML Converter
 * Uses multiple methods to extract PDF content
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ImprovedPDFConverter {
  constructor() {
    this.outputDir = '/Users/rein/ai/aipdf2/html';
  }

  /**
   * Convert PDF to HTML using multiple extraction methods
   */
  async convertPDFToHTML(pdfPath, options = {}) {
    console.log('📄 Converting PDF to HTML with improved methods...');

    try {
      // Method 1: Try pdf-parse with better error handling
      const content = await this.extractWithPdfParse(pdfPath);
      if (content) {
        return this.createHTMLFromText(content, options);
      }
    } catch (error) {
      console.warn('pdf-parse method failed:', error.message);
    }

    try {
      // Method 2: Try pdftotext (if available)
      const content = await this.extractWithPdfToText(pdfPath);
      if (content) {
        return this.createHTMLFromText(content, options);
      }
    } catch (error) {
      console.warn('pdftotext method failed:', error.message);
    }

    try {
      // Method 3: Read PDF as binary and extract basic info
      const content = await this.extractBasicPDFInfo(pdfPath);
      return this.createHTMLFromText(content, options);
    } catch (error) {
      console.warn('Basic extraction failed:', error.message);
    }

    // Fallback: Create placeholder HTML
    return this.createFallbackHTML(pdfPath, options);
  }

  /**
   * Extract text using pdf-parse with better configuration
   */
  async extractWithPdfParse(pdfPath) {
    try {
      const pdfParse = await import('pdf-parse');
      const buffer = await fs.readFile(pdfPath);

      // Configure pdf-parse options
      const options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };

      const data = await pdfParse.default(buffer, options);

      if (data.text && data.text.trim().length > 0) {
        console.log(`✅ pdf-parse extracted ${data.text.length} characters`);
        return {
          text: data.text,
          pages: data.numpages,
          metadata: data.info
        };
      }

      return null;
    } catch (error) {
      console.error('pdf-parse error:', error.message);
      return null;
    }
  }

  /**
   * Extract text using pdftotext command (if available)
   */
  async extractWithPdfToText(pdfPath) {
    try {
      const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);

      if (stdout && stdout.trim().length > 0) {
        console.log(`✅ pdftotext extracted ${stdout.length} characters`);
        return {
          text: stdout,
          pages: null,
          metadata: null
        };
      }

      return null;
    } catch (error) {
      // pdftotext not available
      return null;
    }
  }

  /**
   * Extract basic PDF information by reading the file
   */
  async extractBasicPDFInfo(pdfPath) {
    const buffer = await fs.readFile(pdfPath);
    const fileName = path.basename(pdfPath);

    // Try to extract some basic text patterns from PDF
    const text = buffer.toString('binary');

    // Look for text patterns (this is very basic)
    const textMatches = text.match(/\(([^)]+)\)/g);

    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches
        .map(match => match.slice(1, -1))
        .filter(str => str.length > 3)
        .join(' ');

      console.log(`✅ Basic extraction found ${textMatches.length} text patterns`);

      return {
        text: `Document: ${fileName}\n\nExtracted content:\n${extractedText}`,
        pages: 'Unknown',
        metadata: {
          fileName,
          size: buffer.length,
          extractionMethod: 'Basic binary parsing'
        }
      };
    }

    // Return file info at minimum
    return {
      text: `PDF Document: ${fileName}\nFile size: ${(buffer.length / 1024).toFixed(2)} KB\nThis PDF could not be parsed for text content.`,
      pages: 'Unknown',
      metadata: {
        fileName,
        size: buffer.length,
        extractionMethod: 'File info only'
      }
    };
  }

  /**
   * Create structured HTML from extracted text
   */
  createHTMLFromText(contentData, options = {}) {
    const { title = 'PDF Document' } = options;
    const { text, pages, metadata } = contentData;

    // Split text into lines and process
    const lines = text.split('\n').filter(line => line.trim());

    let htmlContent = '';

    // Add metadata section
    htmlContent += '<div class="pdf-metadata alert alert-info">\n';
    htmlContent += `<h3>📄 Document Information</h3>\n`;
    htmlContent += `<p><strong>Pages:</strong> ${pages || 'Unknown'}</p>\n`;
    if (metadata) {
      htmlContent += `<p><strong>Extraction Method:</strong> ${metadata.extractionMethod || 'pdf-parse'}</p>\n`;
      if (metadata.fileName) {
        htmlContent += `<p><strong>Filename:</strong> ${metadata.fileName}</p>\n`;
      }
    }
    htmlContent += '</div>\n\n';

    // Process content lines
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Detect questions (lines starting with numbers)
      if (/^\d+\./.test(trimmedLine)) {
        if (currentSection) {
          htmlContent += '</div>\n\n';
        }
        htmlContent += `<div class="question">\n`;
        htmlContent += `<h4 class="question-number">${this.escapeHTML(trimmedLine)}</h4>\n`;
        currentSection = 'question';
      }
      // Detect options (lines starting with A. B. C. etc.)
      else if (/^[A-E]\./.test(trimmedLine)) {
        htmlContent += `<div class="option">${this.escapeHTML(trimmedLine)}</div>\n`;
      }
      // Detect headers (short lines, all caps or containing specific keywords)
      else if (trimmedLine.length < 100 && this.looksLikeHeader(trimmedLine)) {
        if (currentSection) {
          htmlContent += '</div>\n\n';
          currentSection = '';
        }
        htmlContent += `<h2 class="section-header">${this.escapeHTML(trimmedLine)}</h2>\n`;
      }
      // Regular content
      else {
        if (!currentSection) {
          htmlContent += `<p>${this.escapeHTML(trimmedLine)}</p>\n`;
        } else {
          htmlContent += `<p class="question-text">${this.escapeHTML(trimmedLine)}</p>\n`;
        }
      }
    }

    // Close any open sections
    if (currentSection) {
      htmlContent += '</div>\n';
    }

    return this.wrapInHTMLDocument(htmlContent, title, options);
  }

  /**
   * Check if a line looks like a header
   */
  looksLikeHeader(line) {
    const headerKeywords = ['хэсэг', 'ДААЛГАВАР', 'Математик', 'Элсэлтийн', 'шалгалт'];

    return line.length < 80 &&
           (headerKeywords.some(keyword => line.includes(keyword)) ||
            line.toUpperCase() === line ||
            /^\d+\.?\s*[А-ЯЁ]/.test(line));
  }

  /**
   * Wrap content in complete HTML document
   */
  wrapInHTMLDocument(bodyContent, title, options = {}) {
    const styles = `
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .pdf-metadata {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          margin: 20px 0;
        }
        .question {
          margin: 20px 0;
          padding: 15px;
          border-left: 3px solid #007bff;
          background: #f8f9fa;
        }
        .question-number {
          color: #007bff;
          margin-bottom: 10px;
        }
        .question-text {
          margin: 8px 0;
        }
        .option {
          margin: 5px 0;
          padding: 5px 10px;
          background: white;
          border-radius: 3px;
          border: 1px solid #e0e0e0;
        }
        .section-header {
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 5px;
          margin: 30px 0 20px 0;
        }
        .math-content {
          font-family: 'Times New Roman', serif;
          font-size: 1.1em;
        }
      </style>
    `;

    return `<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHTML(title)}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    ${styles}
</head>
<body>
    <div class="container">
        <header class="text-center mb-4">
            <h1>${this.escapeHTML(title)}</h1>
            <p class="text-muted">Converted on: ${new Date().toLocaleString()}</p>
        </header>

        <main>
            ${bodyContent}
        </main>

        <footer class="text-muted mt-5 text-center">
            <hr>
            <p>Generated by Improved PDF to HTML Converter</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Create fallback HTML when all extraction methods fail
   */
  createFallbackHTML(pdfPath, options = {}) {
    const fileName = path.basename(pdfPath);

    const content = `
      <div class="alert alert-warning">
        <h3>📄 PDF Document</h3>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Status:</strong> PDF detected but content could not be extracted</p>
        <p>This PDF may contain:</p>
        <ul>
          <li>Scanned images (requires OCR)</li>
          <li>Protected content</li>
          <li>Complex formatting</li>
          <li>Non-standard encoding</li>
        </ul>
        <p>To view the content, try opening the PDF directly or use specialized PDF tools.</p>
      </div>
    `;

    return this.wrapInHTMLDocument(content, fileName, options);
  }

  /**
   * Escape HTML special characters
   */
  escapeHTML(text) {
    if (typeof text !== 'string') return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Main conversion method
   */
  async convert(pdfPath, options = {}) {
    console.log(`🔄 Starting improved PDF conversion: ${path.basename(pdfPath)}`);

    try {
      const htmlContent = await this.convertPDFToHTML(pdfPath, {
        title: options.title || path.basename(pdfPath, '.pdf'),
        ...options
      });

      // Save the HTML file
      const baseName = path.basename(pdfPath, '.pdf');
      const outputPath = path.join(this.outputDir, `${baseName}.html`);

      await fs.writeFile(outputPath, htmlContent, 'utf8');

      console.log(`✅ Conversion completed: ${outputPath}`);

      return {
        success: true,
        inputFile: pdfPath,
        outputFile: outputPath,
        size: Buffer.byteLength(htmlContent, 'utf8')
      };

    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        inputFile: pdfPath
      };
    }
  }
}

export default ImprovedPDFConverter;