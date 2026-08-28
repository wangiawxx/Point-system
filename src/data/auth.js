const API = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:3000`
const KEY = 'cue-admin'
const MEMBER_KEY = 'cue-member'
function valid(session) { if (!session?.token) return null; try { const payload = JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (payload.exp && payload.exp * 1000 < Date.now()) return null; return session } catch { return null } }
export function currentAdmin() { try { return valid(JSON.parse(localStorage.getItem(KEY) || 'null')) } catch { return null } }
export async function login(username, password) {
  const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  if (!response.ok) throw new Error('用户名或密码错误')
  const admin = await response.json(); localStorage.removeItem(MEMBER_KEY); localStorage.setItem(KEY, JSON.stringify(admin)); return admin
}
export function logout() { localStorage.removeItem(KEY) }
export async function updateAdminProfile(username, currentPassword, newPassword, verificationCode) {
  const admin = currentAdmin()
  const headers = { 'Content-Type': 'application/json' }
  if (admin?.token) headers.Authorization = 'Bearer ' + admin.token
  const response = await fetch(`${API}/auth/profile`, { method: 'POST', headers, body: JSON.stringify({ username, currentPassword, newPassword, verificationCode }) })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message || '管理员信息更新失败')
  localStorage.setItem(KEY, JSON.stringify(data))
  return data
}
export function currentMember() { try { return valid(JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null')) } catch { return null } }
export async function memberLogin(phone, password) {
  const response = await fetch(`${API}/member/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) })
  if (!response.ok) throw new Error('手机号或密码错误')
  const member = await response.json(); localStorage.removeItem(KEY); localStorage.setItem(MEMBER_KEY, JSON.stringify(member)); return member
}
export async function memberRegister(name, phone) {
  const response = await fetch(`${API}/member/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message[0] : (data?.message || '注册失败，请稍后重试'))
  localStorage.removeItem(KEY); localStorage.setItem(MEMBER_KEY, JSON.stringify(data)); return data
}
export function memberLogout() { localStorage.removeItem(MEMBER_KEY) }
export async function changeMemberPassword(userId, oldPassword, newPassword) {
  const member = currentMember()
  const headers = { 'Content-Type': 'application/json' }
  if (member?.token) headers.Authorization = 'Bearer ' + member.token
  const response = await fetch(`${API}/member/auth/change-password`, { method: 'POST', headers, body: JSON.stringify({ oldPassword, newPassword }) })
  if (!response.ok) throw new Error('密码修改失败，请检查原密码')
  return response.json()
}
