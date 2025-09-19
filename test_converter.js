/**
 * Test script for Document to HTML Converter
 */

import DocumentToHTMLConverter from './document_to_html_converter.js';
import path from 'path';

async function testConverter() {
  console.log('🧪 Testing Document to HTML Converter\n');

  const converter = new DocumentToHTMLConverter();

  // Test with the existing PDF file
  const pdfFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.pdf';

  console.log('📋 Supported formats:', converter.getSupportedFormats());
  console.log('📁 Output directory:', '/Users/rein/ai/aipdf2/html\n');

  try {
    // Test PDF conversion
    console.log('🔄 Testing PDF conversion...');
    const result = await converter.convert(pdfFile, {
      title: 'Mongolian Math Exam 2025 - Variant A',
      preserveFormatting: true,
      includeBootstrap: true
    });

    if (result.success) {
      console.log('✅ PDF conversion successful!');
      console.log(`   Input: ${result.inputFile}`);
      console.log(`   Output: ${result.outputFile}`);
      console.log(`   Size: ${(result.size / 1024).toFixed(2)} KB\n`);
    } else {
      console.log('❌ PDF conversion failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test batch conversion
async function testBatchConversion() {
  console.log('🔄 Testing batch conversion...\n');

  const converter = new DocumentToHTMLConverter();

  // List of files to convert (add more as needed)
  const files = [
    '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.pdf'
    // Add more files here: DOC, DOCX, other PDFs
  ];

  const results = await converter.batchConvert(files, {
    includeBootstrap: true,
    customCSS: `
      .question-number { color: #007bff; font-weight: bold; }
      .math-formula { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    `
  });

  console.log('\n📊 Batch conversion results:');
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`   ${index + 1}. ✅ ${path.basename(result.inputFile)} → ${path.basename(result.outputFile)}`);
    } else {
      console.log(`   ${index + 1}. ❌ ${path.basename(result.inputFile)} - ${result.error}`);
    }
  });
}

// Run tests
async function runAllTests() {
  await testConverter();
  await testBatchConversion();

  console.log('\n🎉 Testing completed!');
  console.log('📁 Check the HTML files in: /Users/rein/ai/aipdf2/html/');
}

runAllTests().catch(console.error);