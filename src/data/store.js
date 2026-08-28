import { computed, ref } from 'vue'

const defaults = []
export const users = ref(JSON.parse(localStorage.getItem('cue-users') || 'null') || defaults)
export const ranked = computed(() => [...users.value].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)))
export const totalPoints = computed(() => users.value.reduce((sum, user) => sum + (Number(user.points) || 0), 0))
export const API = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:3000`
export function authHeaders(role = 'admin', json = false) {
  const key = role === 'member' ? 'cue-member' : 'cue-admin'
  const session = JSON.parse(localStorage.getItem(key) || 'null')
  const headers = { ...(json ? { 'Content-Type': 'application/json' } : {}) }
  if (session?.token) headers.Authorization = 'Bearer ' + session.token
  return headers
}
export function maskPhone(phone = '') {
  const value = String(phone)
  if (value.includes('*')) return value
  return value.length >= 7 ? `${value.slice(0, 3)}****${value.slice(-4)}` : value
}
export async function loadUsers(options = {}) {
  const { search = '', page = 1, pageSize = 100 } = typeof options === 'string' ? { search: options } : options
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search) query.set('search', search)
  const response = await fetch(`${API}/users?${query}`, { headers: authHeaders() })
  if (!response.ok) throw new Error('用户数据加载失败')
  const data = await response.json()
  users.value = data.items.map(user => ({ ...user, phone: maskPhone(user.phone), joined: user.joinedAt?.slice(0, 10) || user.joined }))
  save(); return { ...data, items: users.value }
}
export async function addUser(user) {
  const response = await fetch(`${API}/users`, { method: 'POST', headers: authHeaders('admin', true), body: JSON.stringify({ ...user, points: Number(user.points) || 0 }) })
  if (!response.ok) throw new Error('用户创建失败')
  const created = await response.json(); users.value.push(created); save(); return created
}
export async function updateUser(id, user) {
  const response = await fetch(`${API}/users/${id}`, { method: 'PATCH', headers: authHeaders('admin', true), body: JSON.stringify(user) })
  if (!response.ok) throw new Error('用户信息更新失败')
  return response.json()
}
export async function deleteUser(id) {
  const response = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!response.ok) throw new Error('User deletion failed')
  const deleted = await response.json()
  users.value = users.value.filter(user => user.id !== id)
  save()
  return deleted
}
function createOperationId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `points-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
export async function addPoints(user, amount, note = '手动积分录入') {
  const operationId = createOperationId()
  const response = await fetch(`${API}/points`, { method: 'POST', headers: authHeaders('admin', true), body: JSON.stringify({ userId: user.id, amount: Number(amount), note, operationId }) })
  if (!response.ok) throw new Error('积分录入失败')
  const record = await response.json(); user.points = record.after; save(); return record
}
export async function loadPointRecords() {
  const response = await fetch(`${API}/points/records`, { headers: authHeaders() })
  if (!response.ok) throw new Error('积分流水加载失败')
  return response.json()
}
export async function loadAllRankings(limit = Infinity, signal) {
  limit = Number(limit) || Infinity
  const pageSize = Math.min(100, Number(limit) || 100)
  let page = 1
  let total = 0
  const all = []
  let iterations = 0
  const maxIterations = 50 // safety guard to avoid infinite loops if backend returns bad data
  do {
    iterations += 1
    if (iterations > maxIterations) break
    const response = await fetch(`${API}/ranking?page=${page}&pageSize=${pageSize}`, { signal })
    if (!response.ok) throw new Error('排行榜加载失败')
    const data = await response.json()
    const items = Array.isArray(data.items) ? data.items : []
    // prefer numeric total; fallback to items length if total missing or invalid
    total = Number(data.total) || items.length || total
    if (items.length === 0) break
    all.push(...items.map(user => ({ ...user, phone: maskPhone(user.phone) })))
    page += 1
  } while (all.length < total && all.length < limit)
  return all.slice(0, limit)
}
const save = () => localStorage.setItem('cue-users', JSON.stringify(users.value))
