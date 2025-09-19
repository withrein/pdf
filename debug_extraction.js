// Debug the extraction process step by step

const sampleContent = `
1. √√25⁵ илэрхийллийн утгыг олоорой.
A. √5 B. 5 C. 25 D. ⁵√5 E. 1/5

2. sin 1140° илэрхийллийн утгыг олоорой.
A. √3/2 B. 1/2 C. 0 D. -1/2 E. 1

22. A ба В хотын хоорондох замын 0.6 хэсгийг I машин 9 цагт, харин II машин нийт замын 7/12 хэсгийг 14 цагт явдаг бөгөөд тэдгээрийн хурдны зөрөө нь 27 км/ц бол хоёр хотын хоорондох зайг олоорой.
A. 405 км B. 675 км C. 1728 км D. 1080 км E. 648 км
`;

console.log('🔍 DEBUGGING EXTRACTION PROCESS\n');

// Debug step 1: Split content into lines
const lines = sampleContent.split('\n');
console.log('📝 Lines found:');
lines.forEach((line, index) => {
  if (line.trim()) {
    console.log(`${index}: "${line.trim()}"`);
  }
});

console.log('\n🔎 Looking for question patterns...\n');

// Debug step 2: Test question matching
let currentQuestion = null;
let questionText = '';
let options = {};
const questions = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (!line) continue;

  // Look for question numbers
  const qMatch = line.match(/^(\d+)\.\s*(.+)/);
  if (qMatch) {
    const questionNum = qMatch[1];
    const text = qMatch[2];

    console.log(`✅ Found question ${questionNum}: "${text}"`);

    // Save previous question
    if (currentQuestion && Object.keys(options).length > 0) {
      questions[currentQuestion] = {
        text: questionText,
        options: { ...options }
      };
      console.log(`💾 Saved question ${currentQuestion} with ${Object.keys(options).length} options`);
    }

    currentQuestion = questionNum;
    questionText = text;
    options = {};
    continue;
  }

  // Look for options
  const optMatch = line.match(/([ABCDE])\.\s*([^ABCDE]*?)(?:\s+([ABCDE])\.\s*([^ABCDE]*?)(?:\s+([ABCDE])\.\s*([^ABCDE]*?)(?:\s+([ABCDE])\.\s*([^ABCDE]*?)(?:\s+([ABCDE])\.\s*([^ABCDE]*?))?)?)?)?/);
  if (optMatch && currentQuestion) {
    console.log(`🎯 Found options line: "${line}"`);

    // Parse multiple options on one line
    const optionPairs = [];
    for (let j = 1; j < optMatch.length; j += 2) {
      if (optMatch[j] && optMatch[j + 1]) {
        optionPairs.push([optMatch[j], optMatch[j + 1].trim()]);
      }
    }

    optionPairs.forEach(([letter, text]) => {
      options[letter] = text;
      console.log(`   ${letter}: "${text}"`);
    });
    continue;
  }

  // Continue question text
  if (currentQuestion && !line.match(/^[ABCDE]\./) && line.length > 0) {
    questionText += ' ' + line;
    console.log(`📝 Extended question ${currentQuestion}: "${line}"`);
  }
}

// Save last question
if (currentQuestion && Object.keys(options).length > 0) {
  questions[currentQuestion] = {
    text: questionText,
    options: { ...options }
  };
  console.log(`💾 Saved final question ${currentQuestion}`);
}

console.log('\n🎉 EXTRACTION RESULTS:\n');
Object.entries(questions).forEach(([qNum, data]) => {
  console.log(`Question ${qNum}:`);
  console.log(`  Text: ${data.text}`);
  console.log(`  Options: ${Object.keys(data.options).length} found`);
  Object.entries(data.options).forEach(([letter, text]) => {
    console.log(`    ${letter}: ${text}`);
  });
  console.log('');
});

console.log(`📊 Total questions extracted: ${Object.keys(questions).length}`);