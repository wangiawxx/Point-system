<script setup>
import { ref } from 'vue'
import PageHeader from '../layouts/components/PageHeader.vue'
import { currentAdmin, updateAdminProfile } from '../data/auth'

const admin = currentAdmin()
const form = ref({ username: admin?.username || '', currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' })
const visible = ref({ current: false, next: false, confirm: false })
const error = ref(''); const message = ref(''); const saving = ref(false)
const passwordType = (key) => visible.value[key] ? 'text' : 'password'
async function submit() {
  error.value = ''; message.value = ''
  if (form.value.newPassword.length < 6) { error.value = '新密码至少 6 个字符'; return }
  if (form.value.newPassword !== form.value.confirmPassword) { error.value = '两次输入的新密码不一致'; return }
  if (!form.value.verificationCode) { error.value = '请输入管理员验证字符串'; return }
  saving.value = true
  try { await updateAdminProfile(form.value.username, form.value.currentPassword, form.value.newPassword, form.value.verificationCode); message.value = '管理员信息已更新。'; form.value.currentPassword = ''; form.value.newPassword = ''; form.value.confirmPassword = ''; form.value.verificationCode = '' } catch (e) { error.value = e.message } finally { saving.value = false }
}
</script>
<template>
  <PageHeader title="管理员账户" eyebrow="ACCOUNT SETTINGS" />
  <main class="main-area profile-area"><section class="panel admin-profile-panel"><div class="profile-intro"><div class="profile-avatar">{{ form.username?.[0]?.toUpperCase() || 'A' }}</div><div><h2>管理员信息</h2><p>修改账号或密码时需要验证当前密码和验证字符串。</p></div></div><form class="admin-profile-form" @submit.prevent="submit"><label>管理员账号<input v-model.trim="form.username" autocomplete="username" required minlength="3" /></label><label>当前密码<span class="password-input"><input v-model="form.currentPassword" :type="passwordType('current')" autocomplete="current-password" required /><button type="button" class="password-toggle" :class="{ 'is-hidden': !visible.current }" :aria-label="visible.current ? '隐藏当前密码' : '显示当前密码'" @click="visible.current = !visible.current">&#128065;</button></span></label><label>新密码<span class="password-input"><input v-model="form.newPassword" :type="passwordType('next')" autocomplete="new-password" required minlength="6" /><button type="button" class="password-toggle" :class="{ 'is-hidden': !visible.next }" :aria-label="visible.next ? '隐藏新密码' : '显示新密码'" @click="visible.next = !visible.next">&#128065;</button></span></label><label>确认新密码<span class="password-input"><input v-model="form.confirmPassword" :type="passwordType('confirm')" autocomplete="new-password" required minlength="6" /><button type="button" class="password-toggle" :class="{ 'is-hidden': !visible.confirm }" :aria-label="visible.confirm ? '隐藏确认密码' : '显示确认密码'" @click="visible.confirm = !visible.confirm">&#128065;</button></span></label><label>管理员验证字符串<input v-model="form.verificationCode" type="password" autocomplete="off" required /></label><p v-if="error" class="api-error">{{ error }}</p><p v-if="message" class="profile-success">{{ message }}</p><button class="primary-btn" :disabled="saving">{{ saving ? '保存中...' : '保存修改' }}</button></form></section></main>
</template>
<style scoped>.profile-area{max-width:920px}.admin-profile-panel{padding:30px;max-width:650px}.profile-intro{display:flex;gap:16px;align-items:center;border-bottom:1px solid #e8ede9;padding-bottom:23px}.profile-avatar{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#dcebe3;color:#28644f;font:600 23px 'Space Grotesk'}.profile-intro h2{margin:0;font:600 19px 'Space Grotesk'}.profile-intro p{margin:6px 0 0;color:#849189;font-size:13px}.admin-profile-form{display:grid;gap:17px;margin-top:25px}.admin-profile-form label{display:grid;gap:7px;color:#64726a;font-size:13px}.admin-profile-form input{border:1px solid #dce5de;border-radius:5px;padding:11px;outline:none;width:100%}.admin-profile-form input:focus{border-color:#4d8a75}.password-input{position:relative}.password-input input{padding-right:45px}.password-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;font-size:17px;line-height:1;padding:5px;color:#60756b}.password-toggle.is-hidden::after{content:'';position:absolute;width:11px;height:2px;left:7px;top:12px;background:#60756b;transform:rotate(-42deg);border-radius:2px}.profile-success{margin:0;color:#27805b;font-size:13px}</style>
