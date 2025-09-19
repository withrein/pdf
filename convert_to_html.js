#!/usr/bin/env node

/**
 * Main Document to HTML Converter Script
 * Usage: node convert_to_html.js <file_path> [options]
 */

import SimpleHTMLConverter from './simple_html_converter.js';
import DocumentToHTMLConverter from './document_to_html_converter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MainConverter {
  constructor() {
    this.simpleConverter = new SimpleHTMLConverter();
    this.advancedConverter = new DocumentToHTMLConverter();
  }

  /**
   * Convert document to HTML with automatic method selection
   */
  async convert(filePath, options = {}) {
    console.log('🔄 Document to HTML Converter Starting...\n');

    // Validate file path
    if (!filePath) {
      throw new Error('File path is required');
    }

    const fileExt = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, fileExt);

    console.log(`📄 Input: ${path.basename(filePath)}`);
    console.log(`📁 Output: /Users/rein/ai/aipdf2/html/${fileName}.html`);
    console.log(`🔧 Method: ${options.method || 'auto'}\n`);

    let result;

    // Choose conversion method
    switch (options.method) {
      case 'simple':
        result = await this.simpleConverter.convert(filePath, options);
        break;

      case 'advanced':
        result = await this.advancedConverter.convert(filePath, options);
        break;

      default:
        // Auto-select method based on file type
        if (fileExt === '.pdf') {
          console.log('📄 PDF detected - using simple template method for best results');
          result = await this.simpleConverter.convert(filePath, options);
        } else if (['.doc', '.docx'].includes(fileExt)) {
          console.log('📝 DOC file detected - using advanced text extraction');
          result = await this.advancedConverter.convert(filePath, options);
        } else {
          console.log('🔄 Unknown format - trying simple template method');
          result = await this.simpleConverter.convert(filePath, options);
        }
    }

    return result;
  }

  /**
   * Print usage information
   */
  printUsage() {
    console.log(`
📚 Document to HTML Converter

Usage:
  node convert_to_html.js <file_path> [options]

Examples:
  node convert_to_html.js ./exam.pdf
  node convert_to_html.js ./document.docx --method=advanced
  node convert_to_html.js ./file.pdf --title="Custom Title"

Options:
  --method=simple     Use simple template method (recommended for PDFs)
  --method=advanced   Use advanced text extraction (good for DOC files)
  --title="Title"     Set custom document title
  --help             Show this help message

Output:
  All HTML files are saved to: /Users/rein/ai/aipdf2/html/

Supported formats: PDF, DOC, DOCX
`);
  }

  /**
   * Parse command line arguments
   */
  parseArgs(args) {
    const options = {};
    let filePath = null;

    for (let i = 2; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value || true;
      } else if (!filePath) {
        filePath = arg;
      }
    }

    return { filePath, options };
  }
}

// Main execution
async function main() {
  const converter = new MainConverter();
  const { filePath, options } = converter.parseArgs(process.argv);

  // Show help
  if (options.help || !filePath) {
    converter.printUsage();
    process.exit(0);
  }

  try {
    // Set default title if not provided
    if (!options.title) {
      const fileName = path.basename(filePath, path.extname(filePath));
      options.title = fileName;
    }

    // Convert file
    const result = await converter.convert(filePath, options);

    if (result.success) {
      console.log('\n🎉 Conversion Successful!');
      console.log(`✅ Output: ${result.outputFile}`);
      console.log(`📊 Size: ${(result.size / 1024).toFixed(2)} KB`);

      if (result.type) {
        console.log(`🏷️  Type: ${result.type}`);
      }

      console.log('\n📖 To view the HTML file:');
      console.log(`   open "${result.outputFile}"`);

    } else {
      console.log('\n❌ Conversion Failed!');
      console.log(`Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Conversion Error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default MainConverter;