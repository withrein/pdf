/**
 * Test the improved PDF converter
 */

import ImprovedPDFConverter from './improved_pdf_converter.js';

async function testImprovedConverter() {
  console.log('🧪 Testing Improved PDF Converter\n');

  const converter = new ImprovedPDFConverter();
  const pdfFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.pdf';

  try {
    const result = await converter.convert(pdfFile, {
      title: 'Элсэлтийн ерөнхий шалгалт 2025 - Математик - Хувилбар А'
    });

    if (result.success) {
      console.log('✅ Improved conversion successful!');
      console.log(`   Output: ${result.outputFile}`);
      console.log(`   Size: ${(result.size / 1024).toFixed(2)} KB`);
    } else {
      console.log('❌ Conversion failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testImprovedConverter().catch(console.error);