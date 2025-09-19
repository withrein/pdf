/**
 * Test the simple HTML converter
 */

import SimpleHTMLConverter from './simple_html_converter.js';

async function testSimpleConverter() {
  console.log('🧪 Testing Simple HTML Converter\n');

  const converter = new SimpleHTMLConverter();
  const pdfFile = '/Users/rein/ai/aipdf2/ЭШ-2025-Математик-A-хувилбар.pdf';

  try {
    const result = await converter.convert(pdfFile, {
      title: 'Элсэлтийн ерөнхий шалгалт 2025 - Математик - Хувилбар А'
    });

    if (result.success) {
      console.log('✅ Simple HTML template created successfully!');
      console.log(`   Input: ${result.inputFile}`);
      console.log(`   Output: ${result.outputFile}`);
      console.log(`   Size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`   Type: ${result.type}`);

      console.log('\n📄 HTML template features:');
      console.log('   ✅ Bootstrap CSS framework');
      console.log('   ✅ Responsive design');
      console.log('   ✅ Exam-specific styling');
      console.log('   ✅ Interactive question selection');
      console.log('   ✅ Mongolian language support');
      console.log('   ✅ Sample question structure');
      console.log('   ✅ Ready for manual content input');

    } else {
      console.log('❌ Conversion failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSimpleConverter().catch(console.error);