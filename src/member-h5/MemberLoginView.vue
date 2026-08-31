<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { memberLogin, memberRegister } from '../data/auth'
const router = useRouter(); const phone = ref(localStorage.getItem('cue-member-phone') || ''); const password = ref(''); const name = ref(''); const error = ref(''); const loading = ref(false); const registerMode = ref(false)
function toggleMode() { registerMode.value = !registerMode.value; error.value = ''; password.value = '' }
async function submit() {
  const normalizedPhone = phone.value.trim()
  if (!normalizedPhone || (!registerMode.value && !password.value) || (registerMode.value && !name.value.trim())) return
  loading.value = true; error.value = ''
  try {
    if (registerMode.value) await memberRegister(name.value.trim(), normalizedPhone)
    else await memberLogin(normalizedPhone, password.value)
    localStorage.setItem('cue-member-phone', normalizedPhone); router.replace('/member')
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
</script>
<style scoped>
.member-register-button{width:100%;margin-top:12px;padding:4px;border:0;background:transparent;color:#2c7661;cursor:pointer;font-size:12px}.member-register-button:disabled{opacity:.55;cursor:wait}
</style>
<template><main class="member-login"><section class="member-login-art"><div class="member-login-brand">CUE<span>+</span></div><div class="member-login-art-copy"><p>PLAY · EARN · CHALLENGE</p><h1>每一杆，<br>都值得被记录。</h1><small>会员积分中心 · NINE BALL CLUB</small></div><div class="login-orbit orbit-one"></div><div class="login-orbit orbit-two"></div></section><section class="member-login-panel"><div class="member-login-card"><p class="eyebrow">NINE BALL CLUB</p><h1>{{ registerMode ? '注册会员' : '欢迎回来' }}</h1><p class="member-login-sub">{{ registerMode ? '填写基本信息，即可进入会员中心' : '登录会员中心，发起你的下一场 PK' }}</p><form @submit.prevent="submit"><label v-if="registerMode">用户名<input v-model="name" type="text" autocomplete="name" maxlength="30" placeholder="请输入用户名" /></label><label>手机号<input v-model="phone" type="tel" inputmode="numeric" autocomplete="username" maxlength="11" placeholder="请输入注册手机号" /></label><label v-if="!registerMode">登录密码<input v-model="password" type="password" autocomplete="current-password" placeholder="默认密码 123456" /></label><p v-if="error" class="member-error">{{ error }}</p><button class="member-login-button" :disabled="loading">{{ loading ? (registerMode ? '注册中...' : '登录中...') : (registerMode ? '注册并进入会员中心' : '进入会员中心') }}<span>→</span></button></form><button class="member-register-button" type="button" :disabled="loading" @click="toggleMode">{{ registerMode ? '已有账号？返回登录' : '没有账号？注册会员' }}</button><small class="member-login-tip">{{ registerMode ? '注册后默认密码：123456' : '默认密码：123456 · 可由浏览器安全保存登录密码' }}</small></div></section></main></template>
