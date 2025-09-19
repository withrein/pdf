import HTMLToFirebaseExtractor from './html_to_firebase.js';

async function testExtractor() {
  console.log('🧪 Testing HTML to Firebase Extractor\n');

  try {
    const extractor = new HTMLToFirebaseExtractor();

    // Test extraction without Firebase save
    console.log('📄 Testing question extraction...');
    const htmlFile = '/Users/rein/Downloads/ЭШ-2025-Математик-A-хувилбар.html';

    const questions = await extractor.extractQuestionsFromHTML(htmlFile);

    console.log('\n📊 Extraction Results:');
    console.log(`Total questions extracted: ${questions.length}`);

    // Show sample questions
    console.log('\n📝 Sample Multiple Choice Questions:');
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice').slice(0, 3);
    mcQuestions.forEach(q => {
      console.log(`\n${q.questionNumber}. ${q.questionText}`);
      q.options.forEach(opt => {
        console.log(`   ${opt.letter}. ${opt.text}`);
      });
      console.log(`   Points: ${q.points}`);
    });

    console.log('\n📝 Sample Fill-in Questions:');
    const fillQuestions = questions.filter(q => q.type === 'fill_in');
    fillQuestions.forEach(q => {
      console.log(`\n${q.questionNumber}. ${q.questionText}`);
      q.parts.forEach(part => {
        console.log(`   (${part.partNumber}) ${part.text} - ${part.points} оноо`);
      });
      console.log(`   Total Points: ${q.points}`);
    });

    // Print summary
    extractor.printSummary();

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 To save to Firebase:');
    console.log('1. Copy firebase-config-example.js to firebase-config.js');
    console.log('2. Fill in your Firebase credentials');
    console.log('3. Run: npm run extract');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testExtractor().catch(console.error);