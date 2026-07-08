import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Aplica o tema salvo antes do primeiro paint, para não piscar o tema errado
document.documentElement.classList.toggle('dark', (localStorage.getItem('gestor_tema') || 'dark') === 'dark')

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
