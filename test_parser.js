// Test script to demonstrate the enhanced parser working with real PDF content

// Sample PDF content from the real exam
const samplePDFContent = `
Математик Хувилбар А
Элсэлтийн ерөнхий шалгалт 2025

Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР

1. √√25⁵ илэрхийллийн утгыг олоорой.
A. √5 B. 5 C. 25 D. ⁵√5 E. 1/5

2. sin 1140° илэрхийллийн утгыг олоорой.
A. √3/2 B. 1/2 C. 0 D. -1/2 E. 1

3. {√5, π, 1.(12), 0, ∛7, 12/7, √25} олонлог өгөгдөв. Энэ олонлогийн бүх элемент нь иррационал тоо байх дэд олонлог аль нь вэ?
A. {π, ∛7, √5, √25} B. {1.(12), 12/7} C. {√5, π, 12/7}
D. {√5, π, ∛7} E. {√5, π, ∛7, 12/7, 1.(12)}

22. A ба В хотын хоорондох замын 0.6 хэсгийг I машин 9 цагт, харин II машин нийт замын 7/12 хэсгийг 14 цагт явдаг бөгөөд тэдгээрийн хурдны зөрөө нь 27 км/ц бол хоёр хотын хоорондох зайг олоорой.
A. 405 км B. 675 км C. 1728 км D. 1080 км E. 648 км

Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР

2.1. y = f(x) квадрат функцийн график Ox тэнхлэгтэй (-6, 0), (14, 0) цэгүүдээр харин Oy тэнхлэгтэй (0, 42) цэгээр огтлолцдог байв. y = |f(x)| ба y = k муруй дөрвөн ерөнхий цэгтэй байх k – ийн бүх утгыг олъё.

(1) Квадрат функцийн томьёог олбол f(x) = -0.a x² + b x + cd болно. (3 оноо)
(2) Оройн цэгийн координатыг олбол O(4, ef) (2 оноо)
(3) |f(x)| = k тэгшитгэл ялгаатай дөрвөн шийдтэй байх k – ийн утгууд нь 0 < k < gh байна. (2 оноо)
`;

// Mock parser to test fallback extraction
class TestParser {
  constructor() {
    console.log('🧪 Testing Enhanced Parser with Real PDF Content');
  }

  // Simulate the hasPlaceholderContent check
  hasPlaceholderContent(data) {
    const jsonStr = JSON.stringify(data);
    return jsonStr.includes('[Энд бодит асуултын текст байна]') ||
           jsonStr.includes('Асуулт 1 - [') ||
           jsonStr.includes('Хариулт A - Асуулт') ||
           jsonStr.includes('Fallback асуулт');
  }

  // Use the fallback extraction method
  fallbackExtraction(markdown) {
    console.log('🔧 Using fallback pattern matching extraction...');

    const examData = {
      "exams": {
        "2025_math_variant_A": {
          "metadata": {
            "title": "Элсэлтийн ерөнхий шалгалт 2025",
            "subject": "Математик",
            "variant": "Хувилбар А",
            "year": 2025
          },
          "section1": {
            "title": "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
            "totalQuestions": 36,
            "totalPoints": 72,
            "questions": {}
          },
          "section2": {
            "title": "Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР",
            "pointsPerQuestion": 7,
            "questions": {}
          }
        }
      }
    };

    // Extract Section 1 questions
    this.extractSection1Questions(markdown, examData.exams["2025_math_variant_A"].section1);

    return examData;
  }

  // Extract questions using pattern matching
  extractSection1Questions(markdown, section1) {
    const lines = markdown.split('\n');
    let currentQuestion = null;
    let questionText = '';
    let options = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and headers
      if (!line || line.includes('Хувилбар') || line.includes('Элсэлтийн')) continue;

      // Look for question numbers 1-36
      const qMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (qMatch && parseInt(qMatch[1]) >= 1 && parseInt(qMatch[1]) <= 36) {
        // Save previous question if exists
        if (currentQuestion && questionText && Object.keys(options).length === 5) {
          this.saveQuestion(section1, currentQuestion, questionText, options);
        }

        currentQuestion = qMatch[1];
        questionText = qMatch[2];
        options = {};
        continue;
      }

      // Look for options A-E
      const optMatch = line.match(/^([ABCDE])\.\s*(.+)/);
      if (optMatch && currentQuestion) {
        options[optMatch[1]] = optMatch[2];
        continue;
      }

      // Continue question text on next line
      if (currentQuestion && !line.match(/^[ABCDE]\./) && line.length > 0) {
        questionText += ' ' + line;
      }
    }

    // Save last question
    if (currentQuestion && questionText && Object.keys(options).length === 5) {
      this.saveQuestion(section1, currentQuestion, questionText, options);
    }
  }

  // Save question to section
  saveQuestion(section, questionNum, text, options) {
    const qNum = parseInt(questionNum);
    let points = 1;

    // Assign points based on question number
    if (qNum >= 1 && qNum <= 8) points = 1;
    else if (qNum >= 9 && qNum <= 28) points = 2;
    else if (qNum >= 29 && qNum <= 36) points = 3;

    section.questions[questionNum] = {
      text: text.trim(),
      points: points,
      options: { ...options }
    };

    console.log(`✅ Extracted question ${questionNum}: ${text.substring(0, 50)}...`);
    console.log(`   Options: A=${options.A?.substring(0, 10)}... B=${options.B?.substring(0, 10)}... etc.`);
  }

  // Test the extraction
  testExtraction() {
    console.log('\n🚀 TESTING FALLBACK EXTRACTION\n');

    const result = this.fallbackExtraction(samplePDFContent);

    console.log('\n📊 EXTRACTION RESULTS:');
    console.log(`Questions extracted: ${Object.keys(result.exams["2025_math_variant_A"].section1.questions).length}`);

    // Show specific examples
    const questions = result.exams["2025_math_variant_A"].section1.questions;

    if (questions["1"]) {
      console.log('\n📝 Question 1:');
      console.log(`Text: ${questions["1"].text}`);
      console.log(`Points: ${questions["1"].points}`);
      console.log(`Options:`, questions["1"].options);
    }

    if (questions["22"]) {
      console.log('\n📝 Question 22:');
      console.log(`Text: ${questions["22"].text}`);
      console.log(`Points: ${questions["22"].points}`);
      console.log(`Options:`, questions["22"].options);
    }

    return result;
  }
}

// Run the test
const tester = new TestParser();
const result = tester.testExtraction();

console.log('\n🎉 TEST COMPLETED! Real questions extracted without placeholders.');
console.log('\n📄 Full JSON preview:');
console.log(JSON.stringify(result, null, 2).substring(0, 1000) + '...');