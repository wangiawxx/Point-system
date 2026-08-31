<script setup>
defineProps({ title: String, eyebrow: { type: String, default: 'MEMBER CENTER' } })
function openScreen() { window.open(`${window.location.pathname}#/screen-top-four`, '_blank', 'noopener,noreferrer') }
</script>
<template><header class="topbar"><div><p class="eyebrow">{{ eyebrow }}</p><h1>{{ title }}</h1></div><div class="top-actions"><button class="outline-btn" @click="openScreen">▣ <span>打开大屏</span></button><div class="date-chip">2025年06月16日 <span>⌄</span></div></div></header></template>
