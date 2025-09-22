// Clean MathPix-enabled PDF to Q&A Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { db } = require('./firebase-config');
const { collection, addDoc, getDocs, doc, getDoc } = require('firebase/firestore');

// Import our clean services
const mathpixService = require('./services/mathpixService');
const anthropicService = require('./services/anthropicService');
const AIOnlyExtractor = require('./services/aiOnlyExtractor');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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

// Serve Vue components from src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// API Status and Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Clean PDF to Q&A Server ажиллаж байна',
    services: {
      mathpix: !!process.env.MATHPIX_APP_ID && !!process.env.MATHPIX_APP_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      firebase: !!process.env.FIREBASE_PROJECT_ID
    }
  });
});

// Get service status
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      server: 'running',
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Check MathPix service
    try {
      if (process.env.MATHPIX_APP_ID && process.env.MATHPIX_APP_KEY) {
        const accountInfo = await mathpixService.getAccountInfo();
        status.services.mathpix = {
          status: 'connected',
          quota: accountInfo.total_requests || 'N/A',
          remaining: accountInfo.monthly_limit_remaining || 'N/A'
        };
      } else {
        status.services.mathpix = { status: 'not_configured' };
      }
    } catch (error) {
      status.services.mathpix = { status: 'error', error: error.message };
    }

    // Check AI service
    status.services.anthropic = process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured';

    // Check Firebase
    status.services.firebase = process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured';

    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize AI-Only Extractor
const aiExtractor = new AIOnlyExtractor();

// NEW: 100% AI-powered PDF processing endpoint
app.post('/api/process-with-ai-complete', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF файл дутуу байна'
      });
    }

    console.log('🤖 100% AI processing эхэллээ:', req.file.originalname);

    // Step 1: PDF → Markdown (Mathpix)
    const markdown = await mathpixService.convertPdfToMarkdown(req.file.buffer);

    if (!markdown.success) {
      throw new Error('MathPix conversion failed');
    }

    // Step 2: AI extracts everything
    const aiResult = await aiExtractor.extractEverything(markdown.markdown);

    // Step 3: Save directly to Firebase
    const docData = {
      originalFile: req.file.originalname,
      originalMarkdown: markdown.markdown,
      questions: aiResult.content,
      metadata: aiResult.metadata,
      processedBy: 'AI-Complete',
      timestamp: new Date(),
      version: 'ai-complete-v1'
    };

    const docRef = await addDoc(collection(db, 'pdf-questions-ai-complete'), docData);

    console.log('✅ AI Complete processing success:', docRef.id);

    res.json({
      success: true,
      docId: docRef.id,
      message: '100% AI processing амжилттай',
      data: aiResult,
      stats: {
        totalQuestions: aiResult.metadata.totalQuestions,
        sections: aiResult.content.sections.length,
        confidence: aiResult.metadata.extractionConfidence
      }
    });

  } catch (error) {
    console.error('❌ AI Complete processing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MAIN ENDPOINT: AI-powered PDF to Questions conversion
app.post('/api/convert-pdf-ai-enhanced', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF файл дутуу байна'
      });
    }

    console.log('📄 AI Enhanced PDF conversion эхэллээ:', req.file.originalname, 'Хэмжээ:', req.file.size);

    // Step 1: Convert PDF to Markdown using MathPix
    console.log('🔄 MathPix conversion...');
    const mathpixResult = await mathpixService.convertPdfToMarkdown(req.file.buffer);

    if (!mathpixResult.success) {
      throw new Error('MathPix conversion амжилтгүй боллоо');
    }

    console.log('✅ MathPix conversion дууслаа');

    // Step 2: Process with AI for intelligent question extraction and image association
    console.log('🤖 AI enhanced processing...');
    const aiResult = await anthropicService.enhanceQuestionExtraction(mathpixResult.markdown);

    let finalQuestions;
    let processingMethod;

    if (aiResult.success) {
      console.log('✅ AI processing амжилттай боллоо');
      finalQuestions = aiResult.questions;
      processingMethod = 'ai_enhanced';
    } else {
      console.log('⚠️ AI processing алдаа, basic structure ашиглаж байна...');
      // Simple fallback structure
      finalQuestions = {
        section1: [],
        section2: []
      };
      processingMethod = 'basic_fallback';
    }

    // Step 3: Save to Firebase with enhanced metadata and original markdown
    const docData = {
      questions: finalQuestions,
      originalMarkdown: mathpixResult.markdown, // MathPix original markdown хадгалах
      metadata: {
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        mathpix: mathpixResult.metadata,
        aiProcessing: aiResult.success ? aiResult.metadata : null,
        processingMethod: processingMethod,
        section1Count: finalQuestions.section1?.length || 0,
        section2Count: finalQuestions.section2?.length || 0,
        totalQuestions: (finalQuestions.section1?.length || 0) + (finalQuestions.section2?.length || 0),
        markdownLength: mathpixResult.markdown.length,
        processedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      version: 'clean-ai-v1'
    };

    const docRef = await addDoc(collection(db, 'pdf-questions-ai'), docData);

    console.log('💾 AI Enhanced questions Firebase-д хадгалагдлаа:', docRef.id);

    // Prepare response
    const response = {
      success: true,
      docId: docRef.id,
      message: `Clean AI PDF processing амжилттай боллоо (${processingMethod})`,
      data: {
        questions: finalQuestions,
        markdown: mathpixResult.markdown
      },
      stats: {
        section1: finalQuestions.section1?.length || 0,
        section2: finalQuestions.section2?.length || 0,
        total: (finalQuestions.section1?.length || 0) + (finalQuestions.section2?.length || 0),
        processingMethod: processingMethod,
        aiProcessed: aiResult.success
      },
      metadata: docData.metadata
    };

    res.json(response);

  } catch (error) {
    console.error('❌ AI Enhanced PDF conversion алдаа:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'AI Enhanced PDF conversion алдаа гарлаа'
    });
  }
});

// Get questions from Firebase (check all collections)
app.get('/api/get-questions', async (req, res) => {
  try {
    let documents = [];

    // Try AI Complete collection first
    try {
      const aiCompleteSnapshot = await getDocs(collection(db, 'pdf-questions-ai-complete'));
      aiCompleteSnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          source: 'ai-complete',
          ...doc.data()
        });
      });
    } catch (error) {
      console.log('No AI Complete collection yet');
    }

    // Try AI enhanced collection
    try {
      const aiQuerySnapshot = await getDocs(collection(db, 'pdf-questions-ai'));
      aiQuerySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          source: 'ai-enhanced',
          ...doc.data()
        });
      });
    } catch (error) {
      console.log('No AI enhanced collection yet');
    }

    // Sort by creation date (newest first)
    documents.sort((a, b) => {
      const aDate = a.timestamp || a.createdAt;
      const bDate = b.timestamp || b.createdAt;
      return new Date(bDate) - new Date(aDate);
    });

    console.log('📖 Questions Firebase-ээс уншлаа:', documents.length, 'баримт');

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('❌ Questions унших алдаа:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Main route: Serve the Vue.js app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// PDF Question Viewer route
app.get('/pdf.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pdf.html'));
});

// Questions Viewer route
app.get('/view-questions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view-questions.html'));
});

// 404 for all other routes
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'This is a clean API server. Available endpoints listed at /',
    available: ['/api/health', '/api/status', '/api/convert-pdf-ai-enhanced', '/api/get-questions']
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server алдаа:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Файлын хэмжээ хэт том байна (максимум 50MB)'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Server дотоод алдаа гарлаа',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Clean PDF to Q&A API Server started:`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log(`\n📚 Available Endpoints:`);
  console.log(`   POST /api/process-with-ai-complete - 100% AI-powered PDF Processing`);
  console.log(`   POST /api/convert-pdf-ai-enhanced - AI-powered PDF to Questions`);
  console.log(`   GET /api/get-questions - Get Saved Questions`);
  console.log(`\n🔑 Service Status:`);
  console.log(`   MathPix: ${process.env.MATHPIX_APP_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Anthropic AI: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Firebase: ${process.env.FIREBASE_PROJECT_ID ? '✅ Configured' : '❌ Not configured'}`);
});

module.exports = app;