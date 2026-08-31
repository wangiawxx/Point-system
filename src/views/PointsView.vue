<script setup>
import { onMounted, ref } from 'vue'
import PageHeader from '../layouts/components/PageHeader.vue'
import { addPoints, loadUsers, users } from '../data/store'

const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selected = ref(null)
const amount = ref(null)
const deductAmount = ref(null)
const error = ref('')
const success = ref('')
const submitting = ref(false)
const deducting = ref(false)
const totalPages = () => Math.max(Math.ceil(total.value / pageSize.value), 1)

async function load() {
  try {
    error.value = ''
    const result = await loadUsers({ search: search.value, page: page.value, pageSize: pageSize.value })
    total.value = result.total
    page.value = result.page
    if (selected.value) selected.value = users.value.find(user => user.id === selected.value.id) || null
  } catch (e) { error.value = e.message }
}
function selectUser(user) { selected.value = { ...user }; error.value = '' }
function submitSearch() { page.value = 1; selected.value = null; load() }
function positiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}
async function submit() {
  if (!selected.value || submitting.value) return
  const value = positiveInteger(amount.value)
  if (!value) { error.value = '请输入大于 0 的整数积分'; return }
  submitting.value = true
  try {
    error.value = ''
    success.value = ''
    await addPoints(selected.value, value, '手动录入积分')
    amount.value = null
    await load()
    success.value = '积分录入成功'
    window.setTimeout(() => { success.value = '' }, 3500)
  } catch (e) { error.value = e.message } finally { submitting.value = false }
}
async function submitDeduction() {
  if (!selected.value || deducting.value) return
  const value = positiveInteger(deductAmount.value)
  if (!value) { error.value = '请输入大于 0 的整数扣除积分'; return }
  if (value > selected.value.points) { error.value = '扣除积分不能超过当前积分'; return }
  deducting.value = true
  try {
    error.value = ''
    success.value = ''
    await addPoints(selected.value, -value, '手动扣除积分')
    deductAmount.value = null
    await load()
    success.value = '积分扣除成功'
    window.setTimeout(() => { success.value = '' }, 3500)
  } catch (e) { error.value = e.message } finally { deducting.value = false }
}
onMounted(load)
</script>

<style scoped>
.points-entry-panel .primary-btn { min-height: 48px; margin-top: 10px; padding: 14px 24px; font-size: 15px; }
.points-entry-panel .points-amount-field input { min-height: 52px; padding: 12px 14px; font-size: 18px; }
.deduction-form { margin-top: 22px; padding-top: 20px; border-top: 1px solid #e7ece8; }
.deduction-form h3 { margin: 0; color: #994a4a; font-size: 15px; }
.deduction-form > p { margin: 5px 0 14px; color: #8a9690; font-size: 12px; }
.deduction-btn { background: #a54d4d; }
.deduction-btn:disabled { opacity: .55; cursor: not-allowed; }
</style>

<template>
  <PageHeader title="积分录入" />
  <main class="main-area admin-page admin-points-page">
    <div v-if="error" class="api-error">{{ error }}</div>
    <div class="points-workspace">
      <section class="panel table-panel points-user-table"><div class="panel-head"><div><h2>选择会员</h2><p>共 {{ total }} 位会员，点击用户后在右侧录入积分</p></div><div class="search-box">⌕<input v-model="search" placeholder="搜索昵称或手机号尾号" @keyup.enter="submitSearch" /></div></div><table><thead><tr><th>排名</th><th>用户</th><th>手机号</th><th>当前积分</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="(user, index) in users" :key="user.id" class="selectable-row" :class="{ 'selected-row': selected && selected.id === user.id }" @click="selectUser(user)"><td>{{ (page - 1) * pageSize + index + 1 }}</td><td><span class="rank-avatar">{{ user.name[0] }}</span><b>{{ user.name }}</b></td><td>{{ user.phone }}</td><td><strong class="points">{{ user.points.toLocaleString() }} PTS</strong></td><td><span class="status">{{ user.status }}</span></td><td><button type="button" class="link-btn" @click.stop="selectUser(user)">选择</button></td></tr><tr v-if="!users.length"><td colspan="6" class="empty-state">没有找到匹配用户</td></tr></tbody></table><div class="pagination"><span>第 {{ page }} / {{ totalPages() }} 页</span><label>每页<select v-model.number="pageSize" @change="submitSearch"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label><button class="outline-btn" :disabled="page === 1" @click="page--; load()">上一页</button><button class="outline-btn" :disabled="page === totalPages()" @click="page++; load()">下一页</button></div></section>
      <aside class="panel points-entry-panel">
        <div class="panel-head"><div><h2>录入积分</h2><p>{{ selected ? '当前会员：' + selected.name : '请先从左侧选择会员' }}</p></div></div>
        <div v-if="selected" class="entry-user"><span class="rank-avatar">{{ selected.name[0] }}</span><div><b>{{ selected.name }}</b><small>{{ selected.phone }}</small></div><strong>{{ selected.points.toLocaleString() }} PTS</strong></div>
        <div v-else class="entry-placeholder">选择用户后即可录入积分</div>
        <form class="entry-form" @submit.prevent="submit">
          <label>手动录入积分<span class="points-amount-field"><input v-model.number="amount" type="number" min="1" step="1" required :disabled="!selected" placeholder="请输入积分" /><b>PTS</b></span></label>
          <button class="primary-btn" :disabled="!selected || submitting">{{ submitting ? '录入中...' : '确认录入积分' }}</button>
        </form>
        <form class="entry-form deduction-form" @submit.prevent="submitDeduction">
          <h3>积分扣除</h3>
          <p>扣除后积分不能低于 0。</p>
          <label>手动扣除积分<span class="points-amount-field"><input v-model.number="deductAmount" type="number" min="1" step="1" required :disabled="!selected" placeholder="请输入积分" /><b>PTS</b></span></label>
          <button class="primary-btn deduction-btn" :disabled="!selected || deducting">{{ deducting ? '扣除中...' : '确认扣除积分' }}</button>
        </form>
      </aside>
    </div>
  </main>
  <Transition name="toast"><div v-if="success" class="toast-message"><span class="toast-check">✓</span>{{ success }}</div></Transition>
</template>
