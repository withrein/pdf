<template>
  <div class="exam-viewer">
    <!-- Header -->
    <div class="exam-header">
      <h1 class="exam-title">{{ exam.name }}</h1>
      <div class="exam-info">
        <span class="badge">{{ exam.subject }}</span>
        <span class="badge">{{ exam.year }}</span>
        <span class="badge">Хувилбар {{ exam.variant }}</span>
        <span class="badge">{{ exam.totalQuestions }} асуулт</span>
      </div>
      <div class="action-buttons">
        <button @click="exportToPDF" class="btn btn-primary" :disabled="loading">
          <i class="fas fa-file-pdf"></i>
          PDF болгон татах
        </button>
        <button @click="printExam" class="btn btn-secondary">
          <i class="fas fa-print"></i>
          Хэвлэх
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Firebase-аас асуултууд уншиж байна...</p>
    </div>

    <!-- Exam Content with Zero Loss Image-Based Format -->
    <div v-else-if="questions.length > 0" class="exam-content zero-loss-container" id="examContent">
      <!-- Page Segments with Complete Format Preservation -->
      <div class="page-segments">
        <div
          v-for="segment in pageSegments"
          :key="segment.id"
          class="page-segment"
          :class="{ 'complete-document': segment.type === 'complete_document' }"
        >
          <div v-if="segment.type !== 'complete_document'" class="segment-header">
            <h3>{{ segment.title }}</h3>
            <div class="segment-info">
              <span class="badge">{{ segment.containsQuestions }}</span>
              <span class="badge">{{ Math.round(segment.htmlLength / 1024) }}KB</span>
            </div>
          </div>

          <!-- Render complete HTML with zero format loss -->
          <div
            class="segment-content"
            v-html="segment.completeHTML"
          ></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <h3>Алдаа гарлаа</h3>
      <p>{{ error }}</p>
      <button @click="loadQuestions" class="btn btn-primary">Дахин оролдох</button>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <h3>Асуулт олдсонгүй</h3>
      <p>Firebase дээр асуулт хадгалагдаагүй байна.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default {
  name: 'ExamViewer',
  setup() {
    const loading = ref(true)
    const error = ref(null)
    const exam = ref({})
    const questions = ref([])

    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyBYfGqfIdnj1CUc85Bomsz8EUsq-bU5joI",
      authDomain: "test-pdfs-ef0d7.firebaseapp.com",
      projectId: "test-pdfs-ef0d7",
      storageBucket: "test-pdfs-ef0d7.firebasestorage.app",
      messagingSenderId: "1092705597872",
      appId: "1:1092705597872:web:72e4900ea0630bd8673e75",
      measurementId: "G-XQ59GQE7FH"
    }

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // Computed properties
    const pageSegments = computed(() => {
      return questions.value
        .filter(q => q.type === 'page_segment') // Only show page segments, not complete document
        .sort((a, b) => a.pageNumber - b.pageNumber)
    })

    const completeDocument = computed(() => {
      return questions.value.find(q => q.type === 'complete_document')
    })

    // Load questions from Firebase
    const loadQuestions = async () => {
      try {
        loading.value = true
        error.value = null

        const examId = 'ЭШ-2025-Математик-A-хувилбар-IMAGE-BASED'

        // Load exam document
        const examRef = doc(db, 'exams', examId)
        const examSnap = await getDoc(examRef)

        if (examSnap.exists()) {
          exam.value = examSnap.data()

          // Apply CSS styles if they exist
          if (exam.value.fullCSS) {
            applyCSSStyles(exam.value.fullCSS)
          }
        } else {
          throw new Error('Exam document not found')
        }

        // Load questions
        const questionsRef = collection(db, 'exams', examId, 'questions')
        const questionsSnap = await getDocs(questionsRef)

        const loadedQuestions = []
        questionsSnap.forEach(doc => {
          loadedQuestions.push({
            id: doc.id,
            ...doc.data()
          })
        })

        questions.value = loadedQuestions
        console.log(`Loaded ${loadedQuestions.length} questions`)

      } catch (err) {
        console.error('Error loading questions:', err)
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    // Export to PDF with improved formatting
    const exportToPDF = () => {
      try {
        const pdf = new jsPDF('p', 'mm', 'a4')

        // Title
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text(exam.value.name || 'Шалгалтын асуулт', 20, 20)

        // Exam info
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Хичээл: ${exam.value.subject}`, 20, 30)
        pdf.text(`Он: ${exam.value.year}`, 20, 35)
        pdf.text(`Хувилбар: ${exam.value.variant}`, 20, 40)
        pdf.text(`Нийт асуулт: ${exam.value.totalQuestions}`, 20, 45)

        let yPosition = 55

        // Multiple choice questions
        if (multipleChoiceQuestions.value.length > 0) {
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР', 20, yPosition)
          yPosition += 10

          multipleChoiceQuestions.value.forEach(question => {
            if (yPosition > 270) {
              pdf.addPage()
              yPosition = 20
            }

            // Question number and text
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')

            // Clean and format question text
            const questionText = cleanTextForPDF(question.questionText)
            const splitText = pdf.splitTextToSize(`${question.questionNumber}. ${questionText}`, 170)

            pdf.text(splitText, 20, yPosition)
            yPosition += splitText.length * 4 + 2

            // Options
            if (question.options && question.options.length > 0) {
              pdf.setFont('helvetica', 'normal')
              question.options.forEach(option => {
                if (yPosition > 270) {
                  pdf.addPage()
                  yPosition = 20
                }

                const optionText = cleanTextForPDF(option.text)
                const splitOption = pdf.splitTextToSize(`   ${option.letter}. ${optionText}`, 165)

                pdf.text(splitOption, 25, yPosition)
                yPosition += splitOption.length * 4
              })
            }
            yPosition += 5
          })
        }

        // Fill-in questions
        if (fillInQuestions.value.length > 0) {
          if (yPosition > 250) {
            pdf.addPage()
            yPosition = 20
          }

          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР', 20, yPosition)
          yPosition += 10

          fillInQuestions.value.forEach(question => {
            if (yPosition > 270) {
              pdf.addPage()
              yPosition = 20
            }

            // Question text
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')

            const questionText = cleanTextForPDF(question.questionText)
            const splitText = pdf.splitTextToSize(`${question.questionNumber}. ${questionText}`, 170)

            pdf.text(splitText, 20, yPosition)
            yPosition += splitText.length * 4 + 2

            // Parts
            if (question.parts && question.parts.length > 0) {
              pdf.setFont('helvetica', 'normal')
              question.parts.forEach(part => {
                if (yPosition > 270) {
                  pdf.addPage()
                  yPosition = 20
                }

                const partText = cleanTextForPDF(part.text)
                const splitPart = pdf.splitTextToSize(`   (${part.partNumber}) ${partText}`, 165)

                pdf.text(splitPart, 25, yPosition)
                yPosition += splitPart.length * 4 + 2
              })
            }
            yPosition += 8
          })
        }

        // Save PDF
        pdf.save(`${exam.value.name || 'exam'}.pdf`)

      } catch (err) {
        console.error('Error generating PDF:', err)
        alert('PDF үүсгэхэд алдаа гарлаа: ' + err.message)
      }
    }

    // Clean text for PDF export (remove HTML and format math)
    const cleanTextForPDF = (text) => {
      if (!text) return ''

      return text
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Convert mathematical symbols
        .replace(/∞/g, '∞')
        .replace(/π/g, 'π')
        .replace(/±/g, '±')
        .replace(/°/g, '°')
        .replace(/×/g, '×')
        .replace(/÷/g, '÷')
        // Clean up extra spaces
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Print exam
    const printExam = () => {
      window.print()
    }

    // Apply CSS styles from Firebase
    const applyCSSStyles = (cssStyles) => {
      try {
        // Remove existing PDF styles if any
        const existingStyles = document.querySelectorAll('style[data-pdf-styles]')
        existingStyles.forEach(style => style.remove())

        // Create new style element
        const styleElement = document.createElement('style')
        styleElement.setAttribute('data-pdf-styles', 'true')
        styleElement.textContent = cssStyles

        // Add to document head
        document.head.appendChild(styleElement)

        console.log('✅ CSS styles applied from Firebase')
      } catch (error) {
        console.error('❌ Error applying CSS styles:', error)
      }
    }

    // Format question text with mathematical expressions
    const formatQuestionText = (text) => {
      if (!text) return ''

      // Convert mathematical expressions and formatting
      return text
        // Convert fractions like 1/2 to proper format
        .replace(/(\d+)\/(\d+)/g, '<sup>$1</sup>⁄<sub>$2</sub>')
        // Convert powers like x^2 to superscript
        .replace(/\^(\d+)/g, '<sup>$1</sup>')
        // Convert subscripts like x_1 to subscript
        .replace(/_(\d+)/g, '<sub>$1</sub>')
        // Convert square root symbol
        .replace(/sqrt\(([^)]+)\)/g, '√($1)')
        // Convert infinity symbol
        .replace(/infinity/g, '∞')
        // Convert degree symbol
        .replace(/deg/g, '°')
        // Convert pi symbol
        .replace(/pi/g, 'π')
        // Convert mathematical operators
        .replace(/\*\*/g, '×')
        .replace(/\+\-/g, '±')
        // Convert line breaks
        .replace(/\n/g, '<br>')
        // Convert tabs to spaces
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    }

    // Load data on mount
    onMounted(() => {
      loadQuestions()
    })

    return {
      loading,
      error,
      exam,
      questions,
      pageSegments,
      completeDocument,
      loadQuestions,
      exportToPDF,
      printExam,
      formatQuestionText,
      cleanTextForPDF,
      applyCSSStyles
    }
  }
}
</script>

<style scoped>
.exam-viewer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.exam-header {
  text-align: center;
  padding: 30px 0;
  border-bottom: 3px solid #007bff;
  margin-bottom: 30px;
}

.exam-title {
  color: #007bff;
  margin-bottom: 15px;
  font-weight: bold;
  font-size: 2rem;
}

.exam-info {
  margin: 15px 0;
}

.badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 5px 12px;
  border-radius: 15px;
  margin: 0 5px;
  font-size: 0.9rem;
}

.action-buttons {
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  margin: 0 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 50px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.exam-section {
  margin: 40px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.section-header {
  background: #007bff;
  color: white;
  padding: 15px;
  margin: -20px -20px 20px -20px;
  border-radius: 8px 8px 0 0;
  font-weight: bold;
}

.questions-grid {
  display: grid;
  gap: 20px;
}

.question-card,
.fill-question-card {
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 0 8px 8px 0;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.question-number {
  color: #007bff;
  font-weight: bold;
  font-size: 1.1rem;
}

.question-points {
  background: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.question-text {
  margin: 10px 0;
  font-size: 1.05rem;
  line-height: 1.5;
}

.question-options {
  margin: 15px 0;
}

.option {
  margin: 8px 0;
  padding: 8px 15px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  display: flex;
  gap: 10px;
}

.option-letter {
  font-weight: bold;
  color: #007bff;
  min-width: 20px;
}

.question-parts {
  margin: 15px 0;
}

.question-part {
  margin: 10px 0;
  padding: 10px 15px;
  background: white;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.part-number {
  font-weight: bold;
  color: #ff9800;
  min-width: 30px;
}

.part-points {
  background: #ff9800;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-left: auto;
}

.error-state,
.empty-state {
  text-align: center;
  padding: 50px;
  color: #666;
}

/* PDF Container Styling */
.pdf-container {
  background: white;
  margin: 20px auto;
  padding: 20px;
  max-width: 800px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-radius: 8px;
}

/* HTML question formatting */
.question-text sup {
  font-size: 0.7em;
  vertical-align: super;
}

.question-text sub {
  font-size: 0.7em;
  vertical-align: sub;
}

.option-text sup {
  font-size: 0.7em;
  vertical-align: super;
}

.option-text sub {
  font-size: 0.7em;
  vertical-align: sub;
}

.part-text sup {
  font-size: 0.7em;
  vertical-align: super;
}

.part-text sub {
  font-size: 0.7em;
  vertical-align: sub;
}

.question-content .question-header {
  display: inline;
}

.question-content .question-number {
  font-weight: bold;
  color: #007bff;
}

.option .option-letter {
  font-weight: bold;
  color: #007bff;
}

.question-part .part-number {
  font-weight: bold;
  color: #ff9800;
}

/* Print styles */
@media print {
  .action-buttons {
    display: none;
  }

  .exam-viewer {
    margin: 0;
    padding: 10px;
  }

  .question-card,
  .fill-question-card {
    break-inside: avoid;
    margin-bottom: 15px;
  }

  .question-text sup,
  .option-text sup,
  .part-text sup {
    font-size: 0.7em;
    vertical-align: super;
  }

  .question-text sub,
  .option-text sub,
  .part-text sub {
    font-size: 0.7em;
    vertical-align: sub;
  }
}

/* Zero Loss Image-Based Format Styles */
.zero-loss-container {
  background: white;
  padding: 0;
  margin: 0;
}

.page-segments {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-segment {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.page-segment.complete-document {
  display: none; /* Hide complete document in normal view */
}

.segment-header {
  background: #f8f9fa;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.segment-header h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.2rem;
}

.segment-info {
  display: flex;
  gap: 0.5rem;
}

.segment-info .badge {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.segment-content {
  /* Let the original PDF2HTML CSS handle all styling */
  /* This ensures zero format loss */
  overflow: auto;
}

/* Ensure PDF2HTML elements render correctly */
.segment-content .pf {
  position: relative !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  page-break-after: unset !important;
}

.segment-content .pc {
  position: relative !important;
}

.segment-content .bi {
  max-width: 100%;
  height: auto;
}

@media print {
  .segment-header {
    display: none;
  }

  .page-segment {
    border: none;
    box-shadow: none;
    page-break-inside: avoid;
    page-break-after: always;
  }

  .page-segment:last-child {
    page-break-after: auto;
  }
}
</style>