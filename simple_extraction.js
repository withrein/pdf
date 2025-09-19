// Simple, reliable extraction method that WORKS!

const sampleContent = `
1. √√25⁵ илэрхийллийн утгыг олоорой.
A. √5 B. 5 C. 25 D. ⁵√5 E. 1/5

2. sin 1140° илэрхийллийн утгыг олоорой.
A. √3/2 B. 1/2 C. 0 D. -1/2 E. 1

22. A ба В хотын хоорондох замын 0.6 хэсгийг I машин 9 цагт, харин II машин нийт замын 7/12 хэсгийг 14 цагт явдаг бөгөөд тэдгээрийн хурдны зөрөө нь 27 км/ц бол хоёр хотын хоорондох зайг олоорой.
A. 405 км B. 675 км C. 1728 км D. 1080 км E. 648 км
`;

// SIMPLE EXTRACTION METHOD
function extractQuestions(content) {
  const questions = {};
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  let currentQuestion = null;
  let questionText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find question number (1. 2. 22. etc.)
    const qMatch = line.match(/^(\d+)\.\s*(.+)/);
    if (qMatch) {
      currentQuestion = qMatch[1];
      questionText = qMatch[2];
      console.log(`📝 Question ${currentQuestion}: ${questionText.substring(0, 30)}...`);
      continue;
    }

    // Find options line (starts with A.)
    if (line.startsWith('A.') && currentQuestion) {
      const options = parseOptionsLine(line);

      if (Object.keys(options).length === 5) {
        // Assign points
        const qNum = parseInt(currentQuestion);
        let points = 1;
        if (qNum >= 9 && qNum <= 28) points = 2;
        else if (qNum >= 29 && qNum <= 36) points = 3;

        questions[currentQuestion] = {
          text: questionText,
          points: points,
          options: options
        };

        console.log(`✅ Saved question ${currentQuestion} with all 5 options`);
        currentQuestion = null;
      } else {
        console.log(`⚠️  Question ${currentQuestion} only has ${Object.keys(options).length} options`);
      }
    }
  }

  return questions;
}

// SIMPLE OPTIONS PARSER
function parseOptionsLine(line) {
  const options = {};

  // Split by letter patterns and clean up
  const parts = line.split(/([ABCDE]\.)/).filter(part => part.trim());

  for (let i = 0; i < parts.length - 1; i += 2) {
    const letter = parts[i].replace('.', '');
    const text = parts[i + 1].trim();

    if (letter && text && ['A', 'B', 'C', 'D', 'E'].includes(letter)) {
      options[letter] = text;
      console.log(`   ${letter}: "${text}"`);
    }
  }

  return options;
}

// TEST THE EXTRACTION
console.log('🚀 TESTING SIMPLE EXTRACTION METHOD\n');

const result = extractQuestions(sampleContent);

console.log('\n🎉 FINAL RESULTS:');
console.log(`Questions extracted: ${Object.keys(result).length}\n`);

Object.entries(result).forEach(([qNum, data]) => {
  console.log(`Question ${qNum} (${data.points} points):`);
  console.log(`  "${data.text}"`);
  console.log(`  Options:`);
  Object.entries(data.options).forEach(([letter, text]) => {
    console.log(`    ${letter}. ${text}`);
  });
  console.log('');
});

// Generate JSON
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
        "questions": result
      }
    }
  }
};

console.log('🔥 SUCCESS! Real questions extracted without any placeholders!');
console.log('\n📄 JSON Output:');
console.log(JSON.stringify(examData, null, 2));