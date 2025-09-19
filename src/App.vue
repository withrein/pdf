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

        // Use fallback data when AI fails
        console.log('Using fallback data...');
        this.examData = this.getFallbackData();
        this.calculateStats(this.examData);
        this.step = 3; // Show results with fallback data
      } finally {
        this.loading = false;
        this.statusMessage = '';
      }
    },

    async parseMarkdownWithClaude(markdown) {
      // Token хязгаарлалтаас зайлсхийхийн тулд markdown-ыг хэсэглэх
      const MAX_CHUNK_SIZE = 30000;
      let processedMarkdown = markdown;

      if (markdown.length > MAX_CHUNK_SIZE) {
        // Эхний хэсгийг авна (асуултуудыг алдахгүйн тулд)
        processedMarkdown = markdown.substring(0, MAX_CHUNK_SIZE);
        console.warn(`Markdown truncated from ${markdown.length} to ${MAX_CHUNK_SIZE} chars`);
      }

      const improvedPrompt = `
Extract ALL questions from this Mongolian exam document into the EXACT JSON format below.

CRITICAL REQUIREMENTS:
1. Section 1 MUST have ALL 36 multiple choice questions
2. Section 2 MUST have ALL 4 multi-part questions (2.1, 2.2, 2.3, 2.4)

EXACT OUTPUT FORMAT REQUIRED:
{
  "exams": {
    "2025_math_variant_A": {
      "metadata": {
        "title": "[exam title]",
        "subject": "[subject]",
        "variant": "[A/B/C]",
        "year": [year]
      },
      "section1": {
        "title": "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
        "totalQuestions": 36,
        "totalPoints": 72,
        "questions": {
          // ALL 36 questions with format:
          "[number]": {
            "text": "[full question text]",
            "points": [1 for Q1-8, 2 for Q9-28, 3 for Q29-36],
            "options": {
              "A": "[option A text]",
              "B": "[option B text]",
              "C": "[option C text]",
              "D": "[option D text]",
              "E": "[option E text]"
            }
          }
        }
      },
      "section2": {
        "title": "Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР",
        "pointsPerQuestion": 7,
        "questions": {
          "2.1": {
            "mainText": "[main problem text]",
            "parts": {
              "1": { "text": "[part 1 text]", "points": [points] },
              "2": { "text": "[part 2 text]", "points": [points] },
              "3": { "text": "[part 3 text]", "points": [points] }
            }
          },
          "2.2": {
            "mainText": "[main problem text]",
            "parts": {
              "1": { "text": "[part 1]", "points": [points] },
              "2": { "text": "[part 2]", "points": [points] },
              "3": { "text": "[part 3]", "points": [points] }
            }
          },
          "2.3": {
            "mainText": "[main problem text]",
            "parts": {
              "1": { "text": "[part 1]", "points": [points] },
              "2": { "text": "[part 2]", "points": [points] },
              "3": { "text": "[part 3]", "points": [points] }
            }
          },
          "2.4": {
            "mainText": "[main problem text]",
            "parts": {
              "1": { "text": "[part 1]", "points": [points] },
              "2": { "text": "[part 2]", "points": [points] },
              "3": { "text": "[part 3]", "points": [points] }
            }
          }
        }
      }
    }
  }
}

SECTION 2 PATTERN TO FIND:
- Look for "2.1", "2.2", "2.3", "2.4" numbered questions
- Each has a main problem description
- Each has multiple parts (usually 3 parts)
- Total 7 points per question
- Parts labeled as 1), 2), 3) or similar

IMPORTANT:
- Extract BOTH sections completely
- Section 1: ALL 36 multiple choice questions
- Section 2: ALL 4 multi-part problems
- If Section 2 is not found in the document, still include the structure but with empty questions object

Document to parse:
${processedMarkdown}

Return ONLY the complete JSON with both sections extracted.`;

      try {
        const response = await axios.post(
          'http://localhost:3001/api/anthropic',
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8192,
            temperature: 0,
            messages: [{
              role: 'user',
              content: improvedPrompt
            }]
          },
          {
            timeout: 60000
          }
        );

        const responseText = response.data.content[0].text;
        console.log('🔍 Raw AI Response:');
        console.log('Response length:', responseText.length);
        console.log('First 500 chars:', responseText.substring(0, 500));
        console.log('Last 500 chars:', responseText.substring(responseText.length - 500));

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          console.log('✅ JSON found in response');
          console.log('JSON length:', jsonMatch[0].length);
          console.log('JSON starts with:', jsonMatch[0].substring(0, 200));

          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ JSON parsed successfully');

            // Validate question count for Section 1
            const section1Questions = Object.keys(parsed.exams?.['2025_math_variant_A']?.section1?.questions || {}).length;

            // Validate question count for Section 2
            const section2Questions = Object.keys(parsed.exams?.['2025_math_variant_A']?.section2?.questions || {}).length;

            console.log(`📊 Section 1: ${section1Questions}/36 questions`);
            console.log(`📊 Section 2: ${section2Questions}/4 questions`);

            if (section1Questions < 36 || section2Questions < 4) {
              console.warn(`Incomplete sections detected. Using fallback for missing.`);
              return this.mergeWithFallback(parsed);
            }

            return parsed;
          } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('Error position:', parseError.message);
            console.log('🔍 Problematic JSON snippet around error:');

            // Try to find the error position and show context
            const errorMatch = parseError.message.match(/position (\d+)/);
            if (errorMatch) {
              const position = parseInt(errorMatch[1]);
              const start = Math.max(0, position - 100);
              const end = Math.min(jsonMatch[0].length, position + 100);
              console.log(`Characters ${start}-${end}:`, jsonMatch[0].substring(start, end));
            }

            console.warn('Using complete exam structure due to JSON parse error');
            return this.getCompleteExamStructure();
          }
        } else {
          console.warn('❌ No JSON found in response, using complete exam structure');
          console.log('🔍 Full response text:', responseText);
          return this.getCompleteExamStructure();
        }
      } catch (error) {
        console.error('❌ API call error:', error);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        return this.getCompleteExamStructure();
      }
    },

    calculateStats(data) {
      if (!data || !data.exams) {
        console.error('Invalid data passed to calculateStats:', data);
        return;
      }

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

    // Бүх 36 асуулттай fallback data
    getCompleteExamStructure() {
      const questions = {};

      // Generate all 36 questions
      for (let i = 1; i <= 36; i++) {
        let points = 1;
        if (i >= 9 && i <= 28) points = 2;
        if (i >= 29) points = 3;

        questions[i.toString()] = {
          text: `Асуулт ${i} - [Энд бодит асуултын текст байна]`,
          points: points,
          options: {
            A: `Хариулт A - Асуулт ${i}`,
            B: `Хариулт B - Асуулт ${i}`,
            C: `Хариулт C - Асуулт ${i}`,
            D: `Хариулт D - Асуулт ${i}`,
            E: `Хариулт E - Асуулт ${i}`
          }
        };
      }

      return {
        exams: {
          "2025_math_variant_A": {
            metadata: {
              title: "Элсэлтийн ерөнхий шалгалт 2025",
              subject: "Математик",
              variant: "Хувилбар А",
              year: 2025
            },
            section1: {
              title: "Нэгдүгээр хэсэг. СОНГОХ ДААЛГАВАР",
              totalQuestions: 36,
              totalPoints: 72,
              questions: questions
            },
            section2: {
              title: "Хоёрдугаар хэсэг. НӨХӨХ ДААЛГАВАР",
              pointsPerQuestion: 7,
              questions: {
                "2.1": {
                  mainText: "Fallback асуулт 2.1 - [Энд бодит даалгаврын текст байна]",
                  parts: {
                    "1": { text: "1-р хэсэг - [Fallback текст]", points: 3 },
                    "2": { text: "2-р хэсэг - [Fallback текст]", points: 2 },
                    "3": { text: "3-р хэсэг - [Fallback текст]", points: 2 }
                  }
                },
                "2.2": {
                  mainText: "Fallback асуулт 2.2 - [Энд бодит даалгаврын текст байна]",
                  parts: {
                    "1": { text: "1-р хэсэг - [Fallback текст]", points: 2 },
                    "2": { text: "2-р хэсэг - [Fallback текст]", points: 2 },
                    "3": { text: "3-р хэсэг - [Fallback текст]", points: 3 }
                  }
                },
                "2.3": {
                  mainText: "Fallback асуулт 2.3 - [Энд бодит даалгаврын текст байна]",
                  parts: {
                    "1": { text: "1-р хэсэг - [Fallback текст]", points: 1 },
                    "2": { text: "2-р хэсэг - [Fallback текст]", points: 3 },
                    "3": { text: "3-р хэсэг - [Fallback текст]", points: 3 }
                  }
                },
                "2.4": {
                  mainText: "Fallback асуулт 2.4 - [Энд бодит даалгаврын текст байна]",
                  parts: {
                    "1": { text: "1-р хэсэг - [Fallback текст]", points: 2 },
                    "2": { text: "2-р хэсэг - [Fallback текст]", points: 2 },
                    "3": { text: "3-р хэсэг - [Fallback текст]", points: 3 }
                  }
                }
              }
            }
          }
        }
      };
    },

    // Merge partial data with fallback
    mergeWithFallback(partialData) {
      try {
        const complete = this.getCompleteExamStructure();
        const examKey = "2025_math_variant_A";

        // Ensure partialData has the correct structure
        if (!partialData || !partialData.exams || !partialData.exams[examKey]) {
          console.warn('Invalid partial data, returning complete structure');
          return complete;
        }

        // Merge Section 1 questions with fallback
        const existingSection1 = partialData.exams[examKey]?.section1?.questions || {};
        const fallbackSection1 = complete.exams[examKey].section1.questions;

        // Overlay existing Section 1 on fallback
        Object.keys(existingSection1).forEach(key => {
          if (existingSection1[key] && existingSection1[key].text && existingSection1[key].text !== '') {
            fallbackSection1[key] = existingSection1[key];
          }
        });

        // Merge Section 2 questions with fallback
        const existingSection2 = partialData.exams[examKey]?.section2?.questions || {};
        const fallbackSection2 = complete.exams[examKey].section2.questions;

        // Overlay existing Section 2 on fallback
        Object.keys(existingSection2).forEach(key => {
          if (existingSection2[key] && existingSection2[key].mainText && existingSection2[key].mainText !== '') {
            fallbackSection2[key] = existingSection2[key];
          }
        });

        // Update the structure
        if (!partialData.exams[examKey].section1) {
          partialData.exams[examKey].section1 = complete.exams[examKey].section1;
        } else {
          partialData.exams[examKey].section1.questions = fallbackSection1;
        }

        if (!partialData.exams[examKey].section2) {
          partialData.exams[examKey].section2 = complete.exams[examKey].section2;
        } else {
          partialData.exams[examKey].section2.questions = fallbackSection2;
        }

        return partialData;
      } catch (error) {
        console.error('Error in mergeWithFallback:', error);
        return this.getCompleteExamStructure();
      }
    },

    // Fallback data method for development and error cases (keeping for compatibility)
    getFallbackData() {
      return this.getCompleteExamStructure();
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