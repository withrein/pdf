import SimpleHTMLExtractor from './simple_html_extractor.js';

async function testFirebaseOffline() {
  console.log('🧪 Testing Firebase Uploader (Offline Mode)\n');

  try {
    const extractor = new SimpleHTMLExtractor();

    // Test extraction
    const htmlFile = '/Users/rein/Downloads/ЭШ-2025-Математик-A-хувилбар.html';
    console.log(`📄 Testing extraction from: ${htmlFile}`);

    const questions = await extractor.extractQuestionsFromHTML(htmlFile);

    console.log('\n📊 Extraction Results:');
    console.log(`Total questions extracted: ${questions.length}`);

    // Show sample questions with better formatting
    console.log('\n📝 Sample Multiple Choice Questions:');
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice').slice(0, 3);
    mcQuestions.forEach(q => {
      console.log(`\n${q.questionNumber}. ${q.questionText}`);
      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          console.log(`   ${opt.letter}. ${opt.text}`);
        });
      }
      console.log(`   Points: ${q.points} оноо`);
    });

    console.log('\n📝 Fill-in Questions:');
    const fillQuestions = questions.filter(q => q.type === 'fill_in');
    fillQuestions.forEach(q => {
      console.log(`\n${q.questionNumber}. ${q.questionText}`);
      if (q.parts && q.parts.length > 0) {
        q.parts.forEach(part => {
          console.log(`   (${part.partNumber}) ${part.text} - ${part.points} оноо`);
        });
      }
      console.log(`   Total Points: ${q.points} оноо`);
    });

    // Generate sample Firebase data structure
    console.log('\n🔥 Sample Firebase Data Structure:');
    const examData = {
      name: 'ЭШ-2025-Математик-A-хувилбар',
      subject: 'Математик',
      year: 2025,
      variant: 'A',
      totalQuestions: questions.length,
      multipleChoiceCount: questions.filter(q => q.type === 'multiple_choice').length,
      fillInCount: questions.filter(q => q.type === 'fill_in').length,
      createdAt: new Date().toISOString()
    };

    console.log('Exam Document:', JSON.stringify(examData, null, 2));

    // Show sample question document
    if (questions.length > 0) {
      console.log('\nSample Question Document:');
      console.log(JSON.stringify(questions[0], null, 2));
    }

    // Summary
    extractor.printSummary();

    console.log('\n✅ Offline test completed successfully!');
    console.log('\n📋 Ready for Firebase upload:');
    console.log('1. Configure Firebase credentials in firebase_uploader.js');
    console.log('2. Run: npm run extract');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFirebaseOffline().catch(console.error);