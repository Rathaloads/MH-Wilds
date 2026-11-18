import { createApp } from 'vue'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 样式顺序很重要：Element Plus → UnoCSS → 项目全局样式（后者可覆盖前者）
import 'element-plus/dist/index.css'
import 'virtual:uno.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import pinia from './stores'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
