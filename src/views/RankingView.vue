<script setup>
import { onMounted, ref } from 'vue'
import PageHeader from '../layouts/components/PageHeader.vue'
import { API } from '../data/store'
import { maskPhone } from '../data/store'
const users = ref([]); const search = ref(''); const page = ref(1); const pageSize = ref(20); const total = ref(0); const error = ref('')
const totalPages = () => Math.max(Math.ceil(total.value / pageSize.value), 1)
async function load() { try { const params = new URLSearchParams({ page: page.value, pageSize: pageSize.value }); if (search.value) params.set('search', search.value); const response = await fetch(`${API}/ranking?${params}`); if (!response.ok) throw new Error('排行榜加载失败'); const data = await response.json(); users.value = data.items.map(user => ({ ...user, phone: maskPhone(user.phone) })); total.value = data.total; page.value = data.page; error.value = '' } catch (e) { error.value = e.message } }
function submitSearch() { page.value = 1; load() }
onMounted(load)
</script>
<template>
  <PageHeader title="积分排行"/><main class="main-area admin-table-page"><div v-if="error" class="api-error">{{ error }}</div><div class="toolbar"><div class="search-box">⌕<input v-model="search" placeholder="搜索昵称或手机号尾号" @keyup.enter="submitSearch" /></div><button class="outline-btn" @click="submitSearch">搜索</button></div><section class="panel table-panel full-table"><div class="panel-head"><div><h2>积分排行榜</h2><p>按当前总积分排序，共 {{ total }} 位会员</p></div></div><table><thead><tr><th>排名</th><th>用户</th><th>手机号</th><th>积分</th><th>占比</th></tr></thead><tbody><tr v-for="(user, index) in users" :key="user.id"><td><span :class="['medal', `m${(page - 1) * pageSize + index + 1}`]">{{ (page - 1) * pageSize + index + 1 }}</span></td><td><span class="rank-avatar">{{ user.name[0] }}</span><b>{{ user.name }}</b></td><td>{{ user.phone }}</td><td><strong class="points">{{ user.points.toLocaleString() }} PTS</strong></td><td><div class="progress"><i :style="{ width: `${users[0] ? Math.round(user.points / users[0].points * 100) : 0}%` }"></i></div></td></tr><tr v-if="!users.length"><td colspan="5" class="empty-state">没有找到匹配用户</td></tr></tbody></table><div class="pagination"><span>第 {{ page }} / {{ totalPages() }} 页</span><label>每页<select v-model.number="pageSize" @change="submitSearch"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label><button class="outline-btn" :disabled="page === 1" @click="page--; load()">上一页</button><button class="outline-btn" :disabled="page === totalPages()" @click="page++; load()">下一页</button></div></section></main>
</template>
<style scoped>
@media (min-width: 52.0625rem) {
  .main-area {
    display: flex;
    flex-direction: column;
    block-size: calc(100dvh - clamp(5.2rem, 9vh, 7.5rem));
    min-block-size: 0;
    overflow: hidden;
  }

  .full-table {
    flex: 1 1 auto;
    min-block-size: 0;
  }
}
</style>
