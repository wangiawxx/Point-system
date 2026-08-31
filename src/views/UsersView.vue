<script setup>
import { onMounted, ref } from 'vue'
import PageHeader from '../layouts/components/PageHeader.vue'
import { addUser, deleteUser, loadUsers, updateUser, users } from '../data/store'

const search = ref(''); const showAdd = ref(false); const showEdit = ref(false); const apiError = ref('')
const form = ref({ name: '', phone: '', points: 0, role: 'member', avatarUrl: '' })
const editForm = ref({ id: null, name: '', phone: '', status: '正常', role: 'member', avatarUrl: '' })
const page = ref(1); const pageSize = ref(20); const total = ref(0)
const totalPages = () => Math.max(Math.ceil(total.value / pageSize.value), 1)
async function load() { try { const result = await loadUsers({ search: search.value, page: page.value, pageSize: pageSize.value }); total.value = result.total; page.value = result.page; apiError.value = '' } catch (e) { apiError.value = e.message } }
function submitSearch() { page.value = 1; load() }
async function submit() { if (!form.value.name || !form.value.phone) return; try { await addUser(form.value); form.value = { name: '', phone: '', points: 0, role: 'member', avatarUrl: '' }; showAdd.value = false; page.value = 1; await load() } catch (e) { apiError.value = e.message } }
function openEdit(user) { editForm.value = { id: user.id, name: user.name, phone: user.phone, status: user.status, role: user.role || 'member', avatarUrl: user.avatarUrl || '' }; showEdit.value = true }
async function removeUser(user) { if (!window.confirm(`确认删除用户“${user.name}”吗？删除后不可恢复。`)) return; try { await deleteUser(user.id); await load() } catch (e) { apiError.value = e.message } }
async function saveEdit() { try { await updateUser(editForm.value.id, { name: editForm.value.name, phone: editForm.value.phone, status: editForm.value.status, role: editForm.value.role, avatarUrl: editForm.value.avatarUrl }); showEdit.value = false; await load() } catch (e) { apiError.value = e.message } }
onMounted(load)
</script>
<template>
  <PageHeader title="用户管理" />
  <main class="main-area admin-page admin-table-page"><div v-if="apiError" class="api-error">{{ apiError }}</div>
    <div class="toolbar"><div class="search-box">⌕<input v-model="search" placeholder="搜索姓名或手机号尾号" @keyup.enter="submitSearch" /></div><div class="toolbar-actions"><button class="outline-btn" @click="submitSearch">搜索</button><button class="primary-btn" @click="showAdd = true">＋ 新增用户</button></div></div>
    <section class="panel table-panel full-table"><div class="panel-head"><div><h2>用户列表</h2><p>共 {{ total }} 位会员</p></div></div><table><thead><tr><th>排名</th><th>头像</th><th>用户</th><th>角色</th><th>手机号</th><th>当前积分</th><th>加入时间</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="(user, index) in users" :key="user.id"><td>{{ (page - 1) * pageSize + index + 1 }}</td><td><img v-if="user.avatarUrl" class="user-avatar" :src="user.avatarUrl" alt="" /><span v-else class="rank-avatar">{{ user.name[0] }}</span></td><td><b>{{ user.name }}</b></td><td><span class="role-tag">{{ user.role === 'staff' ? '员工' : '会员' }}</span></td><td>{{ user.phone }}</td><td><strong class="points">{{ user.points.toLocaleString() }} PTS</strong></td><td>{{ user.joined }}</td><td><span class="status">{{ user.status }}</span></td><td><button class="link-btn" @click="openEdit(user)">修改信息</button><button class="link-btn danger-link" @click="removeUser(user)">删除用户</button></td></tr><tr v-if="!users.length"><td colspan="9" class="empty-state">没有找到匹配用户</td></tr></tbody></table><div class="pagination"><span>第 {{ page }} / {{ totalPages() }} 页</span><label>每页<select v-model.number="pageSize" @change="submitSearch"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select> 条</label><button class="outline-btn" :disabled="page === 1" @click="page--; load()">上一页</button><button class="outline-btn" :disabled="page === totalPages()" @click="page++; load()">下一页</button></div></section>
  </main>
  <div v-if="showAdd" class="modal-backdrop" @click.self="showAdd = false"><form class="modal" @submit.prevent="submit"><button type="button" class="close" @click="showAdd = false">×</button><h2>新增用户</h2><label>用户名称<input v-model="form.name" required /></label><label>手机号码<input v-model="form.phone" required /></label><label>角色<select v-model="form.role"><option value="member">会员</option><option value="staff">员工</option></select></label><label>头像地址<input v-model="form.avatarUrl" placeholder="https://..." /></label><label>初始积分<input v-model="form.points" type="number" min="0" /></label><button class="primary-btn">保存用户</button></form></div>
  <div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false"><form class="modal" @submit.prevent="saveEdit"><button type="button" class="close" @click="showEdit = false">×</button><h2>修改用户信息</h2><label>用户名称<input v-model="editForm.name" required /></label><label>手机号码<input v-model="editForm.phone" required /></label><label>角色<select v-model="editForm.role"><option value="member">会员</option><option value="staff">员工</option></select></label><label>头像地址<input v-model="editForm.avatarUrl" placeholder="https://..." /></label><label>状态<select v-model="editForm.status"><option value="正常">正常</option><option value="禁用">禁用</option></select></label><button class="primary-btn">保存修改</button></form></div>
</template>
<style scoped>.user-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;vertical-align:middle}.role-tag{font-size:11px;color:#486d5d;background:#e6f1eb;border-radius:10px;padding:4px 9px}.danger-link{color:#b64d4d;margin-left:10px}</style>
