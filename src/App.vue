<template>
  <div id="app">
    <h1>📚 Универсал Шалгалт Parser v2.0</h1>
    <p class="subtitle">🔄 2-алхамтай найдвартай систем</p>

    <div class="upload-container">
      <input
        type="file"
        @change="handleFile"
        accept=".pdf,.doc,.docx,.txt,.md"
        ref="fileInput"
      />
      <button
        @click="processFile"
        :disabled="!file || loading"
        class="process-btn"
      >
        {{ getButtonText() }}
      </button>
    </div>

    <!-- Progress Steps -->
    <div v-if="file" class="progress-steps">
      <div class="step" :class="{ active: step >= 1, completed: step > 1 }">
        <span class="step-number">1</span>
        <span class="step-text">{{ file.name.split('.').pop().toUpperCase() }} → Markdown</span>
      </div>
      <div class="step" :class="{ active: step >= 2, completed: step > 2 }">
        <span class="step-number">2</span>
        <span class="step-text">Markdown → JSON (AI)</span>
      </div>
    </div>

    <div v-if="error" class="error">
      ❌ {{ error }}
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ statusMessage }}</p>
    </div>

    <!-- Step 1 Complete: Show Markdown -->
    <div v-if="markdown && step === 1" class="result markdown-preview">
      <h2>✅ 1-р алхам: Markdown бэлэн!</h2>
      <div class="actions">
        <button @click="step = 2; parseWithAI()" class="next-btn">
          🤖 2-р алхам: AI-гаар боловсруулах
        </button>
        <button @click="downloadMarkdown" class="download-btn">
          📥 Markdown татах
        </button>
      </div>
      <details>
        <summary>📄 Markdown харах ({{ markdown.length }} тэмдэгт)</summary>
        <pre class="markdown-content">{{ markdown }}</pre>
      </details>
    </div>

    <!-- Step 2 Complete: Show JSON -->
    <div v-if="examData && step === 3" class="result">
      <h2>🎉 Амжилттай дууслаа!</h2>
      <div class="stats">
        <p>📚 Хичээл: {{ examSubject }}</p>
        <p>📅 Он: {{ examYear }}</p>
        <p>📝 Нийт асуулт: {{ totalQuestions }}</p>
        <p>📊 Нийт оноо: {{ totalPoints }}</p>
      </div>
      <div class="actions">
        <button @click="saveToFirebase" class="save-btn">
          🔥 Firebase-д хадгалах
        </button>
        <button @click="downloadJSON" class="download-btn">
          📥 JSON татах
        </button>
        <button @click="reset" class="reset-btn">
          🔄 Дахин эхлэх
        </button>
      </div>
      <details>
        <summary>📊 JSON харах</summary>
        <pre>{{ JSON.stringify(examData, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script>
import { DocumentToMarkdown } from './documentConverter';
import axios from 'axios';
import { saveExamToFirebase } from './firebase';

export default {
  name: 'App',
  data() {
    return {
      file: null,
      markdown: '',
      examData: null,
      loading: false,
      error: null,
      statusMessage: '',
      step: 0, // 0: initial, 1: markdown ready, 2: processing AI, 3: json ready
      totalQuestions: 0,
      totalPoints: 0,
      examSubject: '',
      examYear: ''
    };
  },
  methods: {
    handleFile(event) {
      this.file = event.target.files[0];
      this.reset();
    },

    reset() {
      this.markdown = '';
      this.examData = null;
      this.error = null;
      this.step = 0;
      this.loading = false;
    },

    getButtonText() {
      if (this.loading) return '⏳ Боловсруулж байна...';
      if (!this.file) return '📁 Файл сонгоно уу';
      return `🚀 ${this.file.name.split('.').pop().toUpperCase()} боловсруулах`;
    },

    async processFile() {
      if (!this.file) return;

      this.loading = true;
      this.error = null;
      this.step = 1;

      try {
        // Step 1: Convert to Markdown (No AI)
        this.statusMessage = '📄 Файлыг Markdown болгож байна...';
        const converter = new DocumentToMarkdown();
        this.markdown = await converter.convertToMarkdown(this.file);

        this.loading = false;
        this.statusMessage = '';

        // Auto-proceed to step 2 if markdown is good
        if (this.markdown && this.markdown.length > 100) {
          setTimeout(() => {
            this.step = 2;
            this.parseWithAI();
          }, 1000);
        }

      } catch (error) {
        console.error('Document conversion failed:', error);
        this.error = 'Файл уншихад алдаа гарлаа: ' + error.message;
        this.loading = false;
        this.step = 0;
      }
    },

    async parseWithAI() {
      this.loading = true;
      this.step = 2;

      try {
        this.statusMessage = '🤖 AI ашиглан боловсруулж байна...';
        this.examData = await this.parseMarkdownWithClaude(this.markdown);
        this.calculateStats(this.examData);
        this.step = 3;

      } catch (error) {
        console.error('AI parsing failed:', error);
        this.error = 'AI боловсруулалтад алдаа гарлаа: ' + error.message;
        this.step = 1; // Back to markdown view
      } finally {
        this.loading = false;
        this.statusMessage = '';
      }
    },

    async parseMarkdownWithClaude(markdown) {
      const superPrompt = `
You are an expert exam parser. Convert the provided Markdown text into a structured JSON format.

## INPUT FORMAT
You will receive a Markdown document containing:
- Exam questions marked with ### (e.g., ### 1. Question text)
- Answer options marked with - **A:** through - **E:**
- Section headers marked with #
- Mathematical formulas in $ blocks

## PARSING INSTRUCTIONS

1. **IDENTIFY STRUCTURE**
   - Find exam year (look for 20XX patterns)
   - Find subject (Математик, Физик, Хими, etc.)
   - Find variant (A, B, C, Д, etc.)
   - Count total questions
   - Identify sections

2. **EXTRACT QUESTIONS**
   Each question should capture:
   - Complete question text (everything after the number)
   - All 5 options (A, B, C, D, E) with full text
   - Point value based on position:
     * Questions 1-8: 1 point
     * Questions 9-28: 2 points
     * Questions 29-36: 3 points

3. **PRESERVE MATH NOTATION**
   Keep all mathematical symbols exactly:
   - Powers: x², x³, 2^5
   - Roots: √25, ∛7
   - Fractions: 1/2, a/b
   - Integrals: ∫
   - Greek: π, α, β, θ, Σ
   - Sets: ∈, ∩, ∪

## OUTPUT JSON FORMAT
{
  "exams": {
    "[YEAR]_[SUBJECT]_variant_[VARIANT]": {
      "metadata": {
        "title": "[Full exam title from document]",
        "subject": "[Detected subject]",
        "variant": "[Variant letter/number]",
        "year": [Year as number],
        "language": "[mn/en/ru]",
        "totalQuestions": [Actual count],
        "totalPoints": [Calculated sum]
      },
      "sections": {
        "section1": {
          "title": "[Section title from markdown]",
          "type": "multiple_choice",
          "questions": {
            "[number]": {
              "text": "[COMPLETE question text - NOT placeholder]",
              "points": [1, 2, or 3],
              "options": {
                "A": "[Complete option A text]",
                "B": "[Complete option B text]",
                "C": "[Complete option C text]",
                "D": "[Complete option D text]",
                "E": "[Complete option E text]"
              }
            }
          }
        },
        "section2": {
          "title": "[If exists]",
          "type": "fill_in",
          "questions": {}
        }
      }
    }
  }
}

## VALIDATION CHECKLIST
✓ Every question has actual text (no placeholders)
✓ All 5 options (A-E) have complete content
✓ Mathematical notation is preserved
✓ Point values follow the pattern
✓ No empty objects or arrays

## MARKDOWN DOCUMENT TO PARSE:

${markdown}

Return ONLY the JSON object. Extract ALL content, no placeholders.`;

      const response = await axios.post(
        'http://localhost:3001/api/anthropic',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          temperature: 0,
          system: "You are a precise data extraction system. You always extract complete, accurate content from documents.",
          messages: [{
            role: 'user',
            content: superPrompt
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse response
      const responseText = response.data.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate extraction
        const examKey = Object.keys(parsed.exams)[0];
        const sections = parsed.exams[examKey]?.sections || {};
        const hasQuestions = Object.values(sections).some(section =>
          Object.keys(section.questions || {}).length > 0
        );

        if (!hasQuestions) {
          throw new Error('AI-аас асуулт олдсонгүй. Markdown файлыг шалгана уу.');
        }

        return parsed;
      }

      throw new Error('JSON олдсонгүй');
    },

    calculateStats(data) {
      const examKey = Object.keys(data.exams)[0];
      const exam = data.exams[examKey];

      this.examSubject = exam.metadata?.subject || 'Тодорхойгүй';
      this.examYear = exam.metadata?.year || new Date().getFullYear();

      this.totalQuestions = 0;
      this.totalPoints = 0;

      // Count from sections
      if (exam.sections) {
        Object.values(exam.sections).forEach(section => {
          const questions = section.questions || {};
          this.totalQuestions += Object.keys(questions).length;
          Object.values(questions).forEach(q => {
            this.totalPoints += q.points || 1;
          });
        });
      }

      // Use metadata if available
      if (exam.metadata?.totalQuestions) this.totalQuestions = exam.metadata.totalQuestions;
      if (exam.metadata?.totalPoints) this.totalPoints = exam.metadata.totalPoints;
    },

    async saveToFirebase() {
      this.loading = true;
      this.statusMessage = '🔥 Firebase-д хадгалж байна...';

      const result = await saveExamToFirebase(this.examData);

      if (result.success) {
        this.statusMessage = '✅ Амжилттай хадгаллаа!';
        setTimeout(() => {
          this.statusMessage = '';
          this.loading = false;
        }, 2000);
      } else {
        this.error = 'Firebase алдаа: ' + result.error;
        this.loading = false;
      }
    },

    downloadMarkdown() {
      const blob = new Blob([this.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.file.name}_converted.md`;
      a.click();
      URL.revokeObjectURL(url);
    },

    downloadJSON() {
      const blob = new Blob([JSON.stringify(this.examData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.file.name}_parsed.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Fallback data method for development and error cases
    getFallbackData() {
      return {
        exams: {
          "2025_math_variant_A": {
            metadata: {
              title: "Элсэлтийн ерөнхий шалгалт 2025",
              subject: "Математик",
              variant: "Хувилбар А",
              year: 2025
            },
            sections: {
              section1: {
                title: "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
                totalQuestions: 36,
                totalPoints: 72,
                questions: {
                  "1": {
                    text: "⁵√√25⁵ илэрхийллийн утгыг олоорой",
                    points: 2,
                    options: {
                      A: "√5",
                      B: "5",
                      C: "25",
                      D: "⁵√5",
                      E: "1/5"
                    }
                  },
                  "2": {
                    text: "sin 1140° илэрхийллийн утгыг олоорой",
                    points: 2,
                    options: {
                      A: "√3/2",
                      B: "1/2",
                      C: "0",
                      D: "-1/2",
                      E: "1"
                    }
                  },
                  "3": {
                    text: "Тэгшитгэл x² - 5x + 6 = 0 -ын язгуурыг олоорой",
                    points: 2,
                    options: {
                      A: "x = 2, x = 3",
                      B: "x = 1, x = 6",
                      C: "x = -2, x = -3",
                      D: "x = 0, x = 5",
                      E: "Язгуур байхгүй"
                    }
                  }
                }
              }
            }
          }
        }
      };
    }
  }
};
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 20px auto;
  max-width: 1000px;
  padding: 20px;
}

h1 {
  color: #42b983;
  margin-bottom: 10px;
  font-size: 2.5em;
}

.subtitle {
  color: #666;
  font-size: 1.1em;
  margin-bottom: 30px;
}

.upload-container {
  margin: 30px 0;
  padding: 30px;
  border: 3px dashed #42b983;
  border-radius: 15px;
  background: #f8f9fa;
}

.upload-container input[type="file"] {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: white;
}

.process-btn {
  background: linear-gradient(45deg, #42b983, #369970);
  color: white;
  border: none;
  padding: 15px 25px;
  margin-left: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.process-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(66, 185, 131, 0.3);
}

.process-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.progress-steps {
  display: flex;
  justify-content: center;
  margin: 30px 0;
  gap: 50px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  border-radius: 25px;
  background: #f0f0f0;
  transition: all 0.3s;
}

.step.active {
  background: #e3f2fd;
  color: #1976d2;
  box-shadow: 0 3px 10px rgba(25, 118, 210, 0.2);
}

.step.completed {
  background: #e8f5e8;
  color: #388e3c;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step.active .step-number {
  background: #1976d2;
  color: white;
}

.step.completed .step-number {
  background: #388e3c;
  color: white;
}

.error {
  color: #e74c3c;
  background-color: #ffeaea;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  border-left: 4px solid #e74c3c;
}

.loading {
  margin: 30px 0;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.result {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 30px;
  border-radius: 15px;
  margin: 30px 0;
  text-align: left;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.markdown-preview {
  background: linear-gradient(135deg, #fff9c4, #ffeaa7);
}

.stats {
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.stats p {
  margin: 10px 0;
  font-size: 1.1em;
}

.actions {
  display: flex;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.next-btn, .save-btn, .download-btn, .reset-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.next-btn {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.save-btn {
  background: linear-gradient(45deg, #f093fb, #f5576c);
  color: white;
}

.download-btn {
  background: linear-gradient(45deg, #4facfe, #00f2fe);
  color: white;
}

.reset-btn {
  background: linear-gradient(45deg, #ffecd2, #fcb69f);
  color: #333;
}

.next-btn:hover, .save-btn:hover, .download-btn:hover, .reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

details {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

summary {
  cursor: pointer;
  font-weight: bold;
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
  transition: background 0.3s;
}

summary:hover {
  background: #e9ecef;
}

.markdown-content {
  background: #2d3748;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 0 0 8px 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

pre {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  overflow-x: auto;
  text-align: left;
  font-size: 13px;
  line-height: 1.6;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
}
</style>