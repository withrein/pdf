/**
 * Direct Document to HTML Converter
 * Converts PDF and DOC files directly to HTML without markdown intermediary
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentToHTMLConverter {
  constructor() {
    this.outputDir = '/Users/rein/ai/aipdf2/html';
    this.supportedFormats = ['.pdf', '.doc', '.docx'];
  }

  /**
   * Main conversion method
   * @param {string} inputFilePath - Path to input file
   * @param {Object} options - Conversion options
   */
  async convert(inputFilePath, options = {}) {
    try {
      console.log(`🔄 Starting conversion: ${path.basename(inputFilePath)}`);

      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Get file extension
      const fileExt = path.extname(inputFilePath).toLowerCase();

      if (!this.supportedFormats.includes(fileExt)) {
        throw new Error(`Unsupported file format: ${fileExt}`);
      }

      // Convert based on file type
      let htmlContent;
      switch (fileExt) {
        case '.pdf':
          htmlContent = await this.convertPDFToHTML(inputFilePath, options);
          break;
        case '.doc':
        case '.docx':
          htmlContent = await this.convertDOCToHTML(inputFilePath, options);
          break;
        default:
          throw new Error(`Conversion not implemented for ${fileExt}`);
      }

      // Generate output filename
      const baseName = path.basename(inputFilePath, fileExt);
      const outputPath = path.join(this.outputDir, `${baseName}.html`);

      // Save HTML file
      await this.saveHTMLFile(outputPath, htmlContent, inputFilePath);

      console.log(`✅ Conversion completed: ${outputPath}`);

      return {
        success: true,
        inputFile: inputFilePath,
        outputFile: outputPath,
        size: Buffer.byteLength(htmlContent, 'utf8')
      };

    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        inputFile: inputFilePath
      };
    }
  }

  /**
   * Convert PDF to HTML using pdf2pic or pdf-parse
   */
  async convertPDFToHTML(pdfPath, options = {}) {
    console.log('📄 Converting PDF to HTML...');

    try {
      // Try using pdf-parse for text extraction
      const pdfParse = await import('pdf-parse');

      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParse.default(pdfBuffer);

      // Create structured HTML from PDF text
      const htmlContent = this.createHTMLFromPDFText(pdfData, options);

      return htmlContent;

    } catch (error) {
      console.warn('pdf-parse failed, trying alternative method...');

      // Fallback: Create basic HTML structure
      return this.createFallbackHTML(pdfPath, 'PDF', error.message);
    }
  }

  /**
   * Convert DOC/DOCX to HTML using mammoth
   */
  async convertDOCToHTML(docPath, options = {}) {
    console.log('📝 Converting DOC/DOCX to HTML...');

    try {
      const mammoth = await import('mammoth');

      const result = await mammoth.convertToHtml({ path: docPath });

      if (result.messages.length > 0) {
        console.warn('Conversion warnings:', result.messages);
      }

      // Wrap in complete HTML document
      const htmlContent = this.wrapInHTMLDocument(result.value, path.basename(docPath), options);

      return htmlContent;

    } catch (error) {
      console.warn('mammoth failed, trying alternative method...');

      // Fallback: Create basic HTML structure
      return this.createFallbackHTML(docPath, 'DOC', error.message);
    }
  }

  /**
   * Create HTML from PDF text data
   */
  createHTMLFromPDFText(pdfData, options = {}) {
    const { title = 'PDF Document', preserveFormatting = true } = options;

    // Clean and structure the text
    let textContent = pdfData.text || '';

    // Split into lines and filter empty ones
    const lines = textContent.split('\n').filter(line => line.trim());

    // Create HTML structure
    let htmlBody = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      // Detect headers (lines that are short and might be titles)
      if (trimmedLine.length < 100 && this.looksLikeHeader(trimmedLine)) {
        htmlBody += `<h2>${this.escapeHTML(trimmedLine)}</h2>\n`;
      } else {
        htmlBody += `<p>${this.escapeHTML(trimmedLine)}</p>\n`;
      }
    });

    return this.wrapInHTMLDocument(htmlBody, title, options);
  }

  /**
   * Check if a line looks like a header
   */
  looksLikeHeader(line) {
    // Headers are usually shorter, may contain numbers, and don't end with punctuation
    return line.length < 80 &&
           !line.endsWith('.') &&
           !line.endsWith(',') &&
           (line.includes('хэсэг') || line.includes('ДААЛГАВАР') || /^\d+\./.test(line));
  }

  /**
   * Wrap content in complete HTML document
   */
  wrapInHTMLDocument(bodyContent, title, options = {}) {
    const { includeBootstrap = true, customCSS = '' } = options;

    const bootstrapCSS = includeBootstrap ?
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">' : '';

    const defaultCSS = `
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .math { font-family: 'Times New Roman', serif; }
        .question { margin: 20px 0; padding: 15px; border-left: 3px solid #007bff; }
        .options { margin: 10px 0; }
        .option { margin: 5px 0; padding: 5px; }
        h1, h2, h3 { color: #333; }
        .metadata { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 20px 0; }
      </style>
    `;

    return `<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHTML(title)}</title>
    ${bootstrapCSS}
    ${defaultCSS}
    ${customCSS ? `<style>${customCSS}</style>` : ''}
</head>
<body>
    <div class="container">
        <header class="metadata">
            <h1>${this.escapeHTML(title)}</h1>
            <p>Converted on: ${new Date().toLocaleString()}</p>
        </header>

        <main>
            ${bodyContent}
        </main>

        <footer class="text-muted mt-5">
            <hr>
            <p>Generated by Document to HTML Converter</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Create fallback HTML when conversion fails
   */
  createFallbackHTML(filePath, fileType, errorMessage) {
    const fileName = path.basename(filePath);

    return this.wrapInHTMLDocument(
      `<div class="alert alert-warning">
        <h3>Conversion Notice</h3>
        <p>Unable to extract content from <strong>${fileName}</strong></p>
        <p><strong>File Type:</strong> ${fileType}</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p>The file was detected but content extraction failed. Please ensure the file is not corrupted and try again.</p>
      </div>`,
      `${fileName} - Conversion Failed`
    );
  }

  /**
   * Save HTML content to file
   */
  async saveHTMLFile(outputPath, htmlContent, originalPath) {
    await fs.writeFile(outputPath, htmlContent, 'utf8');

    const stats = await fs.stat(outputPath);
    console.log(`💾 Saved HTML file: ${path.basename(outputPath)} (${this.formatFileSize(stats.size)})`);
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
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
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Batch convert multiple files
   */
  async batchConvert(filePaths, options = {}) {
    console.log(`🔄 Starting batch conversion of ${filePaths.length} files...`);

    const results = [];

    for (const filePath of filePaths) {
      const result = await this.convert(filePath, options);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Batch conversion complete:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return results;
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }
}

export default DocumentToHTMLConverter;