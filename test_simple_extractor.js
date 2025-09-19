import SimpleHTMLExtractor from './simple_html_extractor.js';

async function testSimpleExtractor() {
  console.log('🧪 Testing Simple HTML Extractor\n');

  try {
    const extractor = new SimpleHTMLExtractor();

    // Test with the HTML file
    const htmlFile = '/Users/rein/Downloads/ЭШ-2025-Математик-A-хувилбар.html';
    console.log(`📄 Testing with: ${htmlFile}`);

    const questions = await extractor.extractQuestionsFromHTML(htmlFile);

    console.log('\n📊 Extraction Results:');
    console.log(`Total questions extracted: ${questions.length}`);

    // Show details
    extractor.printSummary();

    console.log('\n✅ Simple extraction test completed!');

    if (questions.length === 0) {
      console.log('\n⚠️  No questions found. This indicates the HTML structure is different than expected.');
      console.log('💡 The file may need manual analysis or different extraction approach.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSimpleExtractor().catch(console.error);