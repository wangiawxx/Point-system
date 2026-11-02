import { createApp } from 'vue'
import ElementPlus, { ElMessageBox } from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import './screen.css'
import './pk.css'
import './login.css'
import './member.css'
import './member-header.css'
import './member-auth.css'
import './member-profile.css'
import './screen-display.css'
import './screen-effects.css'
import './screen-layout.css'
import './admin-redesign.css'
import './screen-redesign.css'
import App from './App.vue'
import router from './router'

// Capture the PWA install event as early as possible. Some mobile browsers
// dispatch it before the member home page has mounted.
window.__cueInstallPrompt = null
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  window.__cueInstallPrompt = event
  window.dispatchEvent(new Event('cue-install-available'))
})
window.addEventListener('appinstalled', () => { window.__cueInstallPrompt = null })

const nativeFetch = window.fetch.bind(window)
let adminSessionExpired = false

window.fetch = async (...args) => {
  const response = await nativeFetch(...args)
  const request = args[0]
  const requestUrl = typeof request === 'string' ? request : request?.url || ''
  const isAdminPage = window.location.hash.startsWith('#/admin')
  const isLoginRequest = requestUrl.includes('/auth/login')

  if (response.status === 401 && isAdminPage && !isLoginRequest && !adminSessionExpired) {
    adminSessionExpired = true
    localStorage.removeItem('cue-admin')
    ElMessageBox.alert('登录状态已过期，请重新登录。', '登录已过期', {
      confirmButtonText: '前往登录',
      closeOnClickModal: false,
      closeOnPressEscape: false,
      showClose: false,
    }).finally(() => {
      window.location.hash = '#/admin/login'
      adminSessionExpired = false
    })
  }

  return response
}

createApp(App).use(router).use(ElementPlus).mount('#app')
