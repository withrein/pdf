<template>
  <div id="app">
    <h1>📚 Элсэлтийн Шалгалт Систем</h1>
    <p class="subtitle">🔄 Firebase асуулт харуулагч ба PDF экспорт</p>

    <!-- Exam Viewer Component -->
    <ExamViewer />

    <!-- Footer -->
    <footer class="app-footer">
      <p>Firebase-аас шалгалтын асуултуудыг унших ба PDF болгон экспорт хийх систем</p>
    </footer>
  </div>
</template>

<script>
import ExamViewer from './components/ExamViewer.vue'

export default {
  name: 'App',
  components: {
    ExamViewer
  },
  // No methods needed for this component
};
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

h1 {
  color: white;
  margin-bottom: 10px;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  padding: 30px 0 10px 0;
}

.subtitle {
  color: rgba(255,255,255,0.9);
  font-size: 1.1em;
  margin-bottom: 30px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.app-footer {
  background: rgba(0,0,0,0.1);
  color: rgba(255,255,255,0.8);
  padding: 20px;
  margin-top: 50px;
  text-align: center;
}

.app-footer p {
  margin: 0;
  font-size: 0.9em;
}

/* Removed unused styles */
</style>