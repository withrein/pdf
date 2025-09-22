<template>
  <div class="simple-markdown-app">
    <!-- Header -->
    <div class="header">
      <h1>📄 Simple PDF to Markdown</h1>
      <p>MathPix болон Firebase ашиглан PDF → Markdown хөрвүүлэлт</p>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="status-message" :class="'status-' + statusType">
      {{ statusMessage }}
    </div>

    <!-- Main Content -->
    <div class="main-card">
      <simple-markdown-uploader
        :is-processing="isProcessing"
        @processing-start="onProcessingStart"
        @processing-end="onProcessingEnd"
        @markdown-success="onMarkdownSuccess"
        @status-update="onStatusUpdate">
      </simple-markdown-uploader>
    </div>
  </div>
</template>

<script>
import SimpleMarkdownUploader from './SimpleMarkdownUploader.vue'

export default {
  name: 'SimpleMarkdownApp',

  components: {
    SimpleMarkdownUploader
  },

  data() {
    return {
      isProcessing: false,
      statusMessage: '',
      statusType: 'info'
    };
  },

  mounted() {
    console.log('🏠 SimpleMarkdownApp mounted');
  },

  methods: {
    onProcessingStart() {
      this.isProcessing = true;
      this.statusMessage = '';
    },

    onProcessingEnd() {
      this.isProcessing = false;
    },

    onMarkdownSuccess(data, metadata) {
      console.log('✅ Markdown conversion success:', metadata);
    },

    onStatusUpdate(message, type) {
      this.statusMessage = message;
      this.statusType = type;

      // Auto-clear success messages
      if (type === 'success') {
        setTimeout(() => {
          this.statusMessage = '';
        }, 5000);
      }
    }
  }
}
</script>

<style scoped>
.simple-markdown-app {
  max-width: 1000px;
  margin: 0 auto;
}

/* Header */
.header {
  text-align: center;
  padding: 30px 0;
  background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
  color: white;
  border-radius: 15px;
  margin-bottom: 30px;
}

.header h1 {
  margin: 0;
  font-size: 2.2em;
  font-weight: 700;
}

.header p {
  margin: 10px 0 0;
  font-size: 1.1em;
  opacity: 0.9;
}

/* Status Messages */
.status-message {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
}

.status-info {
  background: #d1ecf1;
  color: #0c5460;
  border-left: 4px solid #17a2b8;
}

.status-success {
  background: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
}

/* Card */
.main-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .simple-markdown-app {
    padding: 10px;
  }

  .header h1 {
    font-size: 1.8em;
  }

  .main-card {
    padding: 20px;
  }
}
</style>