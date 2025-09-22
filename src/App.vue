<template>
  <div id="app">
    <SimpleMarkdownApp />
  </div>
</template>

<script>
import SimpleMarkdownApp from './components/SimpleMarkdownApp.vue'

export default {
  name: 'App',
  components: {
    SimpleMarkdownApp
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  min-height: 100vh;
  padding: 20px;
}

#app {
  width: 100%;
  min-height: 100vh;
}
</style>