// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('./firebase-config');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } = require('firebase/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Anthropic API Key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Check if API key is loaded
if (!ANTHROPIC_API_KEY) {
  console.error('⚠️  АНХААРУУЛГА: ANTHROPIC_API_KEY байхгүй байна!');
  console.error('   .env файлд API key-г оруулна уу');
  console.error('   API key авах газар: https://console.anthropic.com/');
} else {
  const maskedKey = ANTHROPIC_API_KEY.substring(0, 8) + '...' + ANTHROPIC_API_KEY.substring(ANTHROPIC_API_KEY.length - 4);
  console.log('✅ ANTHROPIC_API_KEY ачаалагдлаа:', maskedKey);
}

// Count questions in PDF function
async function countQuestionsInPDF(pdfText) {
  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Count the total number of questions in this Mongolian exam PDF text.

PDF Text:
${pdfText}

Please respond with ONLY the counts in this format:
Section 1: [number] questions
Section 2: [number] questions
Total: [number] questions

Count every single question carefully, don't miss any.`
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const countText = data.content[0].text;
      console.log('📊 Асуулт тоолсон хариулт:', countText);

      // Extract numbers from response
      const section1Match = countText.match(/Section 1[:\s]*(\d+)/i);
      const section2Match = countText.match(/Section 2[:\s]*(\d+)/i);
      const totalMatch = countText.match(/Total[:\s]*(\d+)/i);

      return {
        section1: section1Match ? parseInt(section1Match[1]) : 0,
        section2: section2Match ? parseInt(section2Match[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0
      };
    }
  } catch (error) {
    console.error('Асуулт тоолохад алдаа:', error);
  }

  return { section1: 0, section2: 0, total: 0 };
}

// Split text into chunks for processing
function splitTextIntoChunks(text, maxChunkSize = 3000) {
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += '\n' + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Parse questions with chunked approach
async function parseQuestionsWithRetry(pdfText, expectedCount) {
  const fetch = (await import('node-fetch')).default;

  console.log('📄 PDF текст хэмжээ:', pdfText.length, 'тэмдэгт');

  // Split text into manageable chunks
  const chunks = splitTextIntoChunks(pdfText, 3000);
  console.log('📂 Текстийг', chunks.length, 'хэсэгт хуваалаа');

  let allSection1 = [];
  let allSection2 = [];
  let section1IdCounter = 1;
  let section2IdCounter = 1;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 ${i + 1}/${chunks.length} хэсгийг боловсруулж байна...`);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Extract ALL questions from this chunk of Mongolian exam text. Return JSON format.

Text chunk ${i + 1}/${chunks.length}:
${chunks[i]}

Extract ALL questions in this format:
{
  "section1": [
    {
      "question": "complete question text",
      "options": ["A option", "B option", "C option", "D option", "E option"],
      "optionLabels": ["A", "B", "C", "D", "E"],
      "points": 1,
      "type": "multiple_choice"
    }
  ],
  "section2": [
    {
      "question": "complete question text",
      "parts": [
        {
          "part": 1,
          "description": "part description",
          "answer": "answer template",
          "points": 3
        }
      ],
      "points": 7,
      "type": "fill_in_blank"
    }
  ]
}

RULES:
1. Extract EVERY question in this chunk
2. Section 1 = Multiple choice (A,B,C,D,E)
3. Section 2 = Fill-in-the-blank
4. Don't assign ID numbers - I'll add them later
5. Preserve mathematical formulas exactly
6. Return only valid JSON
7. If no questions in chunk, return {"section1":[], "section2":[]}`
          }]
        })
      });

      if (!response.ok) {
        console.log(`❌ API алдаа chunk ${i + 1}:`, response.status);
        continue;
      }

      const data = await response.json();
      const aiResponse = data.content[0].text;

      // Extract JSON
      let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        }
      }

      if (jsonMatch) {
        const chunkData = JSON.parse(jsonMatch[0]);

        // Add questions with proper IDs
        if (chunkData.section1 && chunkData.section1.length > 0) {
          chunkData.section1.forEach(q => {
            q.id = section1IdCounter++;
            allSection1.push(q);
          });
        }

        if (chunkData.section2 && chunkData.section2.length > 0) {
          chunkData.section2.forEach(q => {
            q.id = section2IdCounter++;
            allSection2.push(q);
          });
        }

        console.log(`✅ Chunk ${i + 1}: Section1=${chunkData.section1?.length || 0}, Section2=${chunkData.section2?.length || 0}`);
      } else {
        console.log(`❌ Chunk ${i + 1}: JSON олдсонгүй`);
      }

    } catch (error) {
      console.error(`❌ Chunk ${i + 1} алдаа:`, error.message);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const finalResult = {
    section1: allSection1,
    section2: allSection2
  };

  const foundTotal = allSection1.length + allSection2.length;
  console.log(`🎯 Нийт олдсон асуулт: Section1=${allSection1.length}, Section2=${allSection2.length}, Total=${foundTotal}`);
  console.log(`📋 Хүлээгдэж буй: Section1=${expectedCount.section1}, Section2=${expectedCount.section2}, Total=${expectedCount.total}`);

  if (foundTotal >= expectedCount.total * 0.8) { // 80% threshold for chunked approach
    console.log('✅ Хангалттай асуулт олдлоо!');
    return finalResult;
  } else {
    console.log('⚠️ Хангалтгүй асуулт олдлоо, гэхдээ олдсон асуултуудыг буцаана...');
    return finalResult; // Return what we found
  }
}

// Firebase API Routes
app.post('/api/save-questions', async (req, res) => {
  try {
    const { questions, metadata } = req.body;

    const docData = {
      questions: questions,
      metadata: metadata || {
        timestamp: new Date().toISOString(),
        totalQuestions: (questions.section1?.length || 0) + (questions.section2?.length || 0)
      },
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'pdf-questions'), docData);

    console.log('💾 Firebase-д хадгаллаа:', docRef.id);

    res.json({
      success: true,
      docId: docRef.id,
      message: 'Асуултууд Firebase-д амжилттай хадгалагдлаа'
    });

  } catch (error) {
    console.error('❌ Firebase хадгалах алдаа:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/get-questions', async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'pdf-questions'));
    const documents = [];

    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('📖 Firebase-ээс уншлаа:', documents.length, 'баримт бичиг');

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('❌ Firebase унших алдаа:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes
app.post('/api/parse-pdf', async (req, res) => {
  try {
    const { pdfText } = req.body;

    if (!pdfText) {
      return res.status(400).json({
        success: false,
        error: 'PDF текст дутуу байна'
      });
    }

    console.log('📄 PDF текст хүлээн авлаа:', pdfText.length, 'тэмдэгт');
    console.log('📊 PDF агуулгын эхний 500 тэмдэгт:', pdfText.substring(0, 500));

    // Count questions first
    const questionCount = await countQuestionsInPDF(pdfText);
    console.log('📋 PDF дэх нийт асуултын тоо:', questionCount);

    // Parse with retries until all questions are found
    const allQuestions = await parseQuestionsWithRetry(pdfText, questionCount);

    res.json({
      success: true,
      data: allQuestions
    });


  } catch (error) {
    console.error('❌ Parse алдаа:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Сервер зөв ажиллаж байна'
  });
});

// Serve Vue.js app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server алдаа:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Сервер дотоод алдаа гарлаа'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Vue.js PDF Parser сервер ажиллаж байна: http://localhost:${PORT}`);
  console.log(`📄 PDF Parser: http://localhost:${PORT}`);
  console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔧 API Parse: http://localhost:${PORT}/api/parse-pdf`);
  console.log(`💾 API Save Questions: http://localhost:${PORT}/api/save-questions`);
  console.log(`📖 API Get Questions: http://localhost:${PORT}/api/get-questions`);
});

module.exports = app;