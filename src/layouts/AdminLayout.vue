<script setup>
import { useRouter } from 'vue-router'
import { currentAdmin, logout } from '../data/auth'
const router = useRouter()
const admin = currentAdmin()
const nav = [
  { to: '/admin/dashboard', label: '概览', icon: '◧' }, { to: '/admin/users', label: '用户管理', icon: '◉' },
  { to: '/admin/points', label: '积分录入', icon: '+' }, { to: '/admin/ranking', label: '积分排行', icon: '↕' }, { to: '/admin/pk', label: 'PK 对战', icon: 'PK' },
]
function signOut() { logout(); router.replace('/login') }
</script>
<template><div class="app-shell"><aside class="sidebar"><div class="brand-mark">CUE<span>+</span></div><div class="club-name">顺八台球会所<small>会员积分中心</small></div><nav><RouterLink v-for="item in nav" :key="item.to" :to="item.to"><i>{{ item.icon }}</i>{{ item.label }}</RouterLink></nav><div class="sidebar-bottom"><RouterLink class="admin-profile-link" to="/admin/profile"><div class="admin-avatar">{{ admin?.username?.[0]?.toUpperCase() || 'A' }}</div><div><b>{{ admin?.username || '管理员' }}</b><small>系统管理员</small></div></RouterLink><button class="logout-btn" title="退出登录" @click="signOut">↪</button></div></aside><section class="content"><RouterView /></section></div></template>
