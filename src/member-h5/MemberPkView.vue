<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentMember } from '../data/auth'
import { API, authHeaders, loadAllRankings, users } from '../data/store'
const member = currentMember(); const router = useRouter(); const matches = ref([]); const phoneTail = ref(''); const opponentSelect = ref(null); const form = ref({ challengerId: member?.id || '', opponentId: '', stake: 100, date: new Date().toISOString().slice(0, 10), time: '19:30', note: '' }); const message = ref(''); const error = ref('')
const availableOpponents = computed(() => {
  const tail = phoneTail.value.replace(/\D/g, '')
  return users.value.filter((user) => user.id !== member?.id && (!tail || String(user.phone || '').replace(/\D/g, '').endsWith(tail)))
})
watch([phoneTail, availableOpponents], async ([tail, opponents]) => {
  if (tail.replace(/\D/g, '').length !== 4 || !opponents.length) return
  await nextTick()
  const select = opponentSelect.value
  if (!select) return
  select.focus()
  if (typeof select.showPicker === 'function') select.showPicker()
  else select.click()
})
async function loadMatches() { if (!member?.id) return; const response = await fetch(`${API}/pk?pageSize=100`, { headers: authHeaders('member') }); if (response.ok) matches.value = (await response.json()).items }
async function submit() { error.value = ''; message.value = ''; if (!form.value.opponentId) { error.value = '请选择对手'; return } const response = await fetch(`${API}/pk`, { method: 'POST', headers: authHeaders('member', true), body: JSON.stringify({ opponentId: Number(form.value.opponentId), stake: Number(form.value.stake), date: form.value.date, time: form.value.time, note: form.value.note }) }); if (!response.ok) { error.value = '预约提交失败'; return } message.value = 'PK 预约成功'; form.value = { ...form.value, opponentId: '', stake: 100, note: '' }; await loadMatches() }
onMounted(() => { loadAllRankings().then((items) => { users.value = items }).catch(() => {}); loadMatches().catch(() => {}) })
</script>
<template><div class="member-app member-pk-page"><header class="member-subhead"><button @click="router.back()">‹</button><h1>发起积分 PK</h1><span></span></header><form class="member-form" @submit.prevent="submit"><p class="member-form-intro">设置对手和赌注，比赛结果由后台最终结算。</p><div class="member-current">发起人：{{ member?.name || '当前用户' }}</div><label>PK 对手<select ref="opponentSelect" v-model="form.opponentId" required><option value="" disabled>选择对手</option><option v-for="user in availableOpponents" :key="user.id" :value="user.id">{{ user.name }} · {{ user.phone }}</option></select></label><label>搜索手机号尾号<input v-model="phoneTail" type="tel" inputmode="numeric" maxlength="4" placeholder="输入手机号后 4 位筛选对手" /></label><p v-if="phoneTail && !availableOpponents.length" class="member-error">未找到手机号尾号匹配的会员</p><div class="member-form-grid"><label>赌注积分<input v-model.number="form.stake" type="number" min="1" required /></label><label>预约日期<input v-model="form.date" type="date" required /></label></div><label>预约时间<input v-model="form.time" type="time" required /></label><label>备注<input v-model="form.note" placeholder="例如：先到 7 局" /></label><p v-if="error" class="member-error">{{ error }}</p><p v-if="message" class="member-success">{{ message }}</p><button class="member-primary" type="submit">提交 PK 预约</button></form><section class="member-my-pk"><div class="member-section-head"><h2>我发起的 PK</h2><small>{{ matches.length }} 场</small></div><div v-if="!matches.length" class="member-empty">还没有发起过 PK</div><div v-for="match in matches" :key="match.id" class="member-pk-card"><div><b>{{ match.challenger?.name || member?.name }}</b><span> VS </span><b>{{ match.opponent?.name || '对手' }}</b><small>{{ match.date }} · {{ match.time }}</small></div><strong :class="['member-pk-status', match.status]">{{ match.status }}</strong><em>{{ match.stake }} PTS</em></div></section></div></template>
