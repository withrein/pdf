<template>
  <div>
    <!-- Upload Section -->
    <div
      class="upload-section simple-mathpix"
      :class="{ dragover: isDragOver, processing: isProcessing }"
      @click="onUploadAreaClick"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop">

      <div class="upload-icon">📄</div>
      <div class="upload-text">
        PDF → Questions (AI Enhanced)
      </div>
      <p>PDF файлыг MathPix + AI-аар асуулт болгож Firebase-д хадгалах</p>

      <!-- Single Upload Button -->
      <button
        type="button"
        class="btn btn-primary upload-btn"
        @click.stop="triggerUpload"
        :disabled="isProcessing">
        <span v-if="!isProcessing">📤 Upload PDF & Process</span>
        <span v-else>⏳ {{ processingStatus }}...</span>
      </button>

      <div class="upload-hint">
        Бүх процесс автоматаар хийгдэнэ: PDF → MathPix → AI → Firebase
      </div>

      <input
        ref="fileInput"
        type="file"
        class="file-input"
        accept=".pdf"
        @change="onFileSelect"
        style="display: none;">
    </div>

    <!-- Processing Status -->
    <div v-if="processingStages.length > 0" class="processing-status">
      <h4>🔄 Processing Status:</h4>
      <div v-for="(stage, index) in processingStages" :key="index" class="stage-item" :style="getStageStyle(stage.status)">
        {{ stage.icon }} {{ stage.message }}
        <span v-if="stage.details">({{ stage.details }})</span>
      </div>
    </div>

    <!-- Markdown Preview -->
    <div v-if="markdownPreview" class="markdown-preview">
      <h4>📄 Markdown Preview (эхний 2000 тэмдэгт):</h4>
      <pre>{{ markdownPreview }}</pre>
    </div>

    <!-- Results Summary -->
    <div v-if="lastResult" class="results-summary">
      <h4>✅ Conversion Results:</h4>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ lastResult.markdownSize }}</div>
          <div class="stat-label">Markdown Characters</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ lastResult.mathFormulas }}</div>
          <div class="stat-label">Math Formulas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ lastResult.processingTime }}</div>
          <div class="stat-label">Processing Time</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" :class="{ 'text-success': lastResult.saved, 'text-warning': !lastResult.saved }">
            {{ lastResult.saved ? 'SAVED' : 'PENDING' }}
          </div>
          <div class="stat-label">Firebase Status</div>
        </div>
      </div>

      <!-- Export Action -->
      <div class="action-buttons" v-if="lastResult && lastResult.markdown">
        <button
          @click="exportMarkdown"
          class="btn btn-info">
          📁 Export Markdown
        </button>
      </div>
    </div>


  </div>
</template>

<script>
export default {
  name: 'SimpleMarkdownUploader',
  props: {
    isProcessing: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      isDragOver: false,
      markdownPreview: '',
      processingStages: [],
      processingStatus: 'Waiting',
      lastResult: null,
      processingStartTime: null,
      savedDocuments: []
    };
  },

  mounted() {
    this.loadSavedDocuments();
  },

  methods: {
    onUploadAreaClick(e) {
      if (e.target === e.currentTarget || e.target.classList.contains('upload-icon') || e.target.classList.contains('upload-text') || e.target.tagName === 'P') {
        this.triggerUpload();
      }
    },

    triggerUpload() {
      console.log('📤 Upload triggered');

      if (this.isProcessing) {
        console.log('❌ Already processing, ignoring...');
        return;
      }

      if (this.$refs.fileInput) {
        this.$refs.fileInput.click();
      }
    },

    onDragOver(e) {
      e.preventDefault();
      this.isDragOver = true;
    },

    onDragLeave(e) {
      e.preventDefault();
      this.isDragOver = false;
    },

    onDrop(e) {
      e.preventDefault();
      this.isDragOver = false;

      try {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          console.log('📁 Drag & drop file:', files[0].name);
          this.handleFullWorkflow(files[0]);
        } else {
          this.$emit('status-update', '❌ Файл олдсонгүй', 'error');
        }
      } catch (error) {
        console.error('Drag & drop error:', error);
        this.$emit('status-update', '❌ Drag & drop алдаа гарлаа', 'error');
      }
    },

    onFileSelect(e) {
      console.log('📁 File select event:', e.target.files);
      if (e.target.files.length > 0) {
        this.handleFullWorkflow(e.target.files[0]);
        e.target.value = '';
      }
    },

    async handleFullWorkflow(file) {
      if (this.isProcessing) {
        console.log('❌ Already processing, ignoring...');
        return;
      }

      console.log('🚀 Starting full workflow for file:', file.name);

      // Validate file
      if (file.type !== 'application/pdf') {
        this.$emit('status-update', '❌ PDF файл сонгоно уу!', 'error');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        this.$emit('status-update', '❌ Файлын хэмжээ хэт том байна! (максимум 50MB)', 'error');
        return;
      }

      // Reset state
      this.processingStages = [];
      this.markdownPreview = '';
      this.lastResult = null;
      this.processingStartTime = Date.now();

      try {
        // Emit processing start
        this.$emit('processing-start');

        // Stage 1: Upload
        this.addProcessingStage('upload', 'in_progress', '📤 PDF файл илгээж байна...', `${Math.round(file.size / 1024)}KB`);
        this.processingStatus = 'Uploading PDF';

        // Prepare form data
        const formData = new FormData();
        formData.append('pdf', file);

        // Send to AI enhanced endpoint for full workflow
        const response = await fetch('/api/convert-pdf-ai-enhanced', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        this.updateProcessingStage('upload', 'completed', '✅ PDF файл илгээгдлээ');

        // Stage 2: MathPix Processing
        this.addProcessingStage('mathpix', 'in_progress', '🧮 MathPix-аар PDF-г Markdown болгож байна...', 'Mathematical formulas');
        this.processingStatus = 'MathPix Processing';

        // Stage 3: AI Processing (update to in_progress)
        this.addProcessingStage('ai', 'in_progress', '🤖 AI-аар асуулт гаргаж байна...', 'Section 1 & 2');
        this.processingStatus = 'AI Processing';

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Processing failed');
        }

        this.updateProcessingStage('mathpix', 'completed', '✅ MathPix conversion амжилттай');
        this.updateProcessingStage('ai', 'completed', `✅ AI processing амжилттай (${result.stats.processingMethod})`);

        // Stage 4: Firebase Save
        this.addProcessingStage('firebase', 'completed', '💾 Firebase-д хадгалагдлаа', `${result.stats.total} асуулт`);
        this.processingStatus = 'Completed';

        // Set preview and results
        if (result.data.markdown) {
          this.markdownPreview = result.data.markdown.substring(0, 1000) + (result.data.markdown.length > 1000 ? '\n\n... (truncated)' : '');
        }

        const processingTime = Math.round((Date.now() - this.processingStartTime) / 1000);

        this.lastResult = {
          markdown: result.data.markdown,
          metadata: result.metadata,
          questions: result.data.questions,
          markdownSize: result.data.markdown ? result.data.markdown.length : 0,
          mathFormulas: result.data.markdown ? (result.data.markdown.match(/\$[^$]+\$/g) || []).length : 0,
          processingTime: `${processingTime}s`,
          saved: true,
          aiProcessed: result.stats.aiProcessed,
          processingMethod: result.stats.processingMethod,
          docId: result.docId,
          questionStats: result.stats
        };

        // Show clear success message
        this.$emit('questions-success', result.data.questions, result.metadata);
        this.$emit('status-update',
          `🎉 Амжилттай хадгалагдлаа! Section 1: ${result.stats.section1} асуулт, Section 2: ${result.stats.section2} асуулт. Нийт: ${result.stats.total} асуулт Firebase-д хадгалагдлаа.`,
          'success'
        );
        this.$emit('processing-end');

      } catch (error) {
        console.error('Full workflow error:', error);

        // Update current stage as error
        if (this.processingStages.length > 0) {
          const currentStage = this.processingStages[this.processingStages.length - 1];
          this.updateProcessingStage(currentStage.id, 'error', `❌ ${error.message}`);
        }

        this.$emit('status-update', `❌ Processing алдаа: ${error.message}`, 'error');
        this.$emit('processing-end');
      }
    },


    exportMarkdown() {
      if (!this.lastResult) return;

      const blob = new Blob([this.lastResult.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.lastResult.metadata.originalFileName || 'document'}.md`;
      a.click();
      URL.revokeObjectURL(url);

      this.$emit('status-update', '✅ Markdown exported successfully!', 'success');
    },

    async loadSavedDocuments() {
      try {
        // Load from AI enhanced questions collection
        const response = await fetch('/api/get-questions');
        if (response.ok) {
          const result = await response.json();
          this.savedDocuments = result.data || [];
          console.log('📚 Saved documents loaded:', this.savedDocuments.length);
        }
      } catch (error) {
        console.error('Failed to load saved documents:', error);
      }
    },

    loadDocument(doc) {
      this.lastResult = {
        markdown: doc.markdown || '',
        metadata: doc.metadata,
        markdownSize: doc.metadata.markdownLength || 0,
        mathFormulas: doc.markdown ? (doc.markdown.match(/\$[^$]+\$/g) || []).length : 0,
        processingTime: 'N/A',
        saved: true,
        docId: doc.id
      };

      this.markdownPreview = doc.markdown ? doc.markdown.substring(0, 2000) + (doc.markdown.length > 2000 ? '\n\n... (truncated)' : '') : '';
      this.$emit('status-update', `📖 Loaded markdown document: ${doc.metadata.originalFileName}`, 'success');
    },

    addProcessingStage(id, status, message, details = '') {
      this.processingStages.push({
        id: id,
        status: status,
        icon: this.getStageIcon(status),
        message: message,
        details: details,
        timestamp: new Date().toLocaleTimeString()
      });
    },

    updateProcessingStage(id, status, message, details = '') {
      const stage = this.processingStages.find(s => s.id === id);
      if (stage) {
        stage.status = status;
        stage.icon = this.getStageIcon(status);
        stage.message = message;
        if (details) stage.details = details;
      }
    },

    getStageIcon(status) {
      switch (status) {
        case 'in_progress': return '🔄';
        case 'completed': return '✅';
        case 'error': return '❌';
        default: return '⏳';
      }
    },

    getStageStyle(status) {
      switch (status) {
        case 'in_progress': return { background: '#fff3cd', borderLeft: '4px solid #ffc107' };
        case 'completed': return { background: '#d4edda', borderLeft: '4px solid #28a745' };
        case 'error': return { background: '#f8d7da', borderLeft: '4px solid #dc3545' };
        default: return { background: '#e2e3e5', borderLeft: '4px solid #6c757d' };
      }
    },

    formatDate(timestamp) {
      if (!timestamp) return 'Unknown';

      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
}
</script>

<style scoped>
.upload-section {
  border: 3px dashed #cbd5e0;
  border-radius: 15px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.upload-section:hover {
  border-color: #17a2b8;
  background: rgba(23, 162, 184, 0.05);
}

.upload-section.dragover {
  border-color: #17a2b8;
  background: rgba(23, 162, 184, 0.1);
  transform: scale(1.02);
}

.upload-section.processing {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.05);
}

.upload-section.simple-mathpix {
  background: linear-gradient(135deg, rgba(23, 162, 184, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%);
}

.upload-icon {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.8;
}

.upload-text {
  font-size: 1.8em;
  font-weight: 600;
  margin-bottom: 10px;
  color: #2d3748;
}

.upload-hint {
  font-size: 0.9em;
  color: #718096;
  margin-top: 20px;
  line-height: 1.5;
}

.upload-btn {
  margin: 20px 0;
  padding: 18px 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 15px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  min-width: 250px;
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.upload-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.processing-status {
  margin-top: 20px;
  padding: 20px;
  background: #e3f2fd;
  border-radius: 8px;
}

.stage-item {
  margin: 8px 0;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.stage-item span {
  font-size: 12px;
  opacity: 0.8;
}

.markdown-preview {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.markdown-preview pre {
  white-space: pre-wrap;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #495057;
  background: white;
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #17a2b8;
}

.results-summary {
  margin-top: 20px;
  padding: 20px;
  background: #d4edda;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #17a2b8;
}

.text-success {
  color: #28a745 !important;
}

.text-warning {
  color: #ffc107 !important;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.btn {
  margin: 0 10px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.saved-documents {
  margin-top: 30px;
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.document-card {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.document-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.doc-date {
  font-size: 0.8em;
  color: #6c757d;
}

.doc-size {
  background: #17a2b8;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8em;
}

.doc-info {
  margin-bottom: 15px;
}

.doc-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.doc-details {
  font-size: 0.8em;
  color: #6c757d;
}

.btn-outline-primary {
  background: white;
  color: #17a2b8;
  border: 1px solid #17a2b8;
  width: 100%;
  padding: 8px;
}

.btn-outline-primary:hover {
  background: #17a2b8;
  color: white;
}
</style>