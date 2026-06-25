import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { registerProxyServiceWorker } from './utils/apiClient.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Register Service Worker for production CORS proxy
registerProxyServiceWorker()
