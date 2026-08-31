<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '../layouts/components/PageHeader.vue'
import { API, authHeaders, loadPointRecords, loadUsers, maskPhone, ranked, totalPoints, users } from '../data/store'

const ranges = [{ key: 'week', label: '本周' }, { key: 'month', label: '本月' }, { key: 'year', label: '全年' }]
const range = ref('week')
const trend = ref([])
const trendLoading = ref(false)
const todayRecords = ref([])
const stats = ref({ users: 0, totalPoints: 0 })
const todayPoints = computed(() => todayRecords.value.reduce((sum, record) => sum + record.amount, 0))
const activeMembers = computed(() => new Set(todayRecords.value.filter((record) => record.amount !== 0).map((record) => record.userId)).size)
const maxTrendValue = computed(() => Math.max(...trend.value.map((item) => Math.abs(item.value)), 1))
const axisMax = computed(() => Math.max(100, Math.ceil(maxTrendValue.value / 100) * 100))
const axisValues = computed(() => [axisMax.value, Math.round(axisMax.value * 2 / 3), Math.round(axisMax.value / 3), 0])
function chinaDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

async function loadTrend() {
  trendLoading.value = true
  try {
    const response = await fetch(`${API}/ranking/trend?range=${range.value}`, { headers: authHeaders() })
    if (!response.ok) throw new Error('积分趋势加载失败')
    trend.value = (await response.json()).items
  } catch { trend.value = [] } finally { trendLoading.value = false }
}
async function loadDashboard() {
  try {
    await loadUsers({ pageSize: 100 })
    const [records, statisticResponse] = await Promise.all([loadPointRecords(), fetch(`${API}/ranking/statistics`, { headers: authHeaders() })])
    if (statisticResponse.ok) stats.value = await statisticResponse.json()
    const today = chinaDate(new Date())
    todayRecords.value = records.filter((record) => chinaDate(new Date(record.createdAt)) === today).map((record) => ({ ...record, user: { ...record.user, phone: maskPhone(record.user.phone) } }))
  } catch {}
  await loadTrend()
}
watch(range, loadTrend)
onMounted(loadDashboard)
</script>

<template>
  <PageHeader title="概览" eyebrow="OVERVIEW" />
  <main class="main-area admin-page admin-dashboard-page">
    <div class="stats-grid">
      <div class="stat-card"><span>会员总数</span><strong>{{ stats.users }}</strong><em>人</em><small class="muted">系统登记会员</small></div>
      <div class="stat-card accent"><span>积分总量</span><strong>{{ stats.totalPoints.toLocaleString() }}</strong><em>PTS</em><small class="muted">当前账户积分合计</small></div>
      <div class="stat-card"><span>今日净增积分</span><strong>{{ todayPoints }}</strong><em>PTS</em><small class="muted">含录入、扣减与 PK 结算</small></div>
      <div class="stat-card"><span>今日活跃会员</span><strong>{{ activeMembers }}</strong><em>人</em><small class="muted">今日有积分流水</small></div>
    </div>
    <div class="dashboard-grid">
      <section class="panel trend-panel"><div class="panel-head"><div><h2>积分趋势</h2><p>按积分流水净变化实时汇总</p></div><div class="segmented"><button v-for="item in ranges" :key="item.key" :class="{ selected: range === item.key }" @click="range = item.key">{{ item.label }}</button></div></div><div class="chart"><div class="y-axis"><span v-for="value in axisValues" :key="value">{{ value }}</span></div><div class="bars"><div v-for="item in trend" :key="item.label" class="bar-wrap"><div :class="['bar', { negative: item.value < 0 }]" :style="{ height: `${Math.max(Math.abs(item.value) / axisMax * 100, item.value ? 2 : 0)}%` }"><b>{{ item.value }}</b></div><small>{{ item.label }}</small></div><div v-if="!trend.length && !trendLoading" class="chart-empty">当前周期暂无积分流水</div></div></div></section>
      <section class="panel mini-rank"><div class="panel-head"><div><h2>积分排行</h2><p>全部用户</p></div><RouterLink class="text-btn" to="/admin/ranking">查看全部 →</RouterLink></div><div class="mini-rank-scroll"><div v-for="(u, i) in ranked" :key="u.id" class="mini-row"><span :class="['medal', `m${i + 1}`]">{{ i + 1 }}</span><span class="rank-avatar">{{ u.name[0] }}</span><b>{{ u.name }}</b><strong>{{ u.points.toLocaleString() }}</strong></div></div></section>
    </div>
    <section class="panel table-panel today-table"><div class="panel-head"><div><h2>今日游戏记录</h2><p>根据今日积分流水自动汇总</p></div><span class="table-date">今日 · {{ todayPoints }} PTS</span></div><table><thead><tr><th>用户</th><th>手机号</th><th>游戏时长 / 变动</th><th>今日积分</th><th>录入说明</th><th>更新时间</th></tr></thead><tbody><tr v-for="record in todayRecords" :key="record.id"><td><span class="rank-avatar">{{ record.user.name[0] }}</span><b>{{ record.user.name }}</b></td><td>{{ record.user.phone }}</td><td><strong class="duration">{{ record.amount }} 分钟</strong></td><td><strong class="points">{{ record.amount }}</strong> <small>PTS</small></td><td>{{ record.note || '手动积分录入' }}</td><td class="updated-time">{{ new Date(record.createdAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</td></tr><tr v-if="!todayRecords.length"><td colspan="6" class="empty-state">今日暂无积分录入记录</td></tr></tbody></table></section>
  </main>
</template>
<style scoped>.chart-empty{margin:auto;color:#9ba69f;font-size:13px}.bar.negative{background:#d8796f}</style>
