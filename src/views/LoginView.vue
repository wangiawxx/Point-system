<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../data/auth'
const router = useRouter(); const username = ref('admin'); const password = ref('admin123'); const error = ref(''); const loading = ref(false)
async function submit() { if (!username.value || !password.value) return; loading.value = true; error.value = ''; try { await login(username.value, password.value); router.replace('/admin/dashboard') } catch (e) { error.value = e.message } finally { loading.value = false } }
</script>
<template><main class="login-page"><div class="login-art"><div class="login-brand">CUE<span>+</span></div><div class="login-art-copy"><p>MEMBER POINTS CENTER</p><h1>每一杆，<br>都值得被记录。</h1></div></div><section class="login-panel"><div class="login-panel-inner"><p class="eyebrow">NINE BALL CLUB</p><h2>管理员登录</h2><p class="login-subtitle">登录会员积分管理中心</p><form @submit.prevent="submit"><label>账号<input v-model="username" autocomplete="username" placeholder="请输入管理员账号" /></label><label>密码<input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" /></label><p v-if="error" class="login-error">{{ error }}</p><button class="primary-btn login-submit" :disabled="loading">{{ loading ? '登录中...' : '登录管理后台' }}</button></form><small class="login-hint">默认账号：admin　密码：admin123</small></div></section></main></template>
