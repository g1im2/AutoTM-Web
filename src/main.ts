import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import './styles/theme.css'

async function loadRuntimeConfig() {
  try {
    const resp = await fetch('/config.json', { cache: 'no-store' })
    if (!resp.ok) {
      return
    }
    const data = await resp.json()
    window.__APP_CONFIG__ = data
  } catch {
    // 忽略加载失败，回退到构建时环境变量
  }
}

async function bootstrap() {
  await loadRuntimeConfig()
  const app = createApp(App)
  app.use(router)
  app.use(createPinia())
  app.use(ElementPlus)
  app.mount('#app')
}

bootstrap()
