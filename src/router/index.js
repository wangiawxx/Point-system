import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import UsersView from '../views/UsersView.vue'
import PointsView from '../views/PointsView.vue'
import RankingView from '../views/RankingView.vue'
// import ScreenView from '../views/ScreenView.vue'
// import ScreenStaticView from '../views/ScreenStaticView.vue'
import ScreenTopFourView from '../views/ScreenTopFourView.vue'
import PkView from '../views/PkView.vue'
import LoginView from '../views/LoginView.vue'
import AdminProfileView from '../views/AdminProfileView.vue'
import { currentAdmin, currentMember } from '../data/auth'
import MemberHomeView from '../member-h5/MemberHomeView.vue'
import MemberPkView from '../member-h5/MemberPkView.vue'
import MemberLoginView from '../member-h5/MemberLoginView.vue'

if (!window.location.hash && window.location.pathname !== '/') window.history.replaceState(null, '', `/#${window.location.pathname}${window.location.search}`)

const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/admin/login' },
  { path: '/login', redirect: '/admin/login' },
  { path: '/admin/login', component: LoginView },
  { path: '/admin', component: AdminLayout, redirect: '/admin/dashboard', children: [
    { path: 'dashboard', component: DashboardView }, { path: 'users', component: UsersView }, { path: 'points', component: PointsView }, { path: 'ranking', component: RankingView }, { path: 'pk', component: PkView }, { path: 'profile', component: AdminProfileView },
  ] },
  // { path: '/screen', component: ScreenView }, { path: '/screen-static', component: ScreenStaticView }, 
  { path: '/screen-top-four', component: ScreenTopFourView }, { path: '/pk/create', redirect: '/member/pk/create' },
  { path: '/member/login', component: MemberLoginView }, { path: '/member', component: MemberHomeView }, { path: '/member/pk/create', component: MemberPkView },
] })
router.beforeEach((to) => {
  if (to.path.startsWith('/admin') && to.path !== '/admin/login' && !currentAdmin()) return '/admin/login'
  if ((to.path === '/login' || to.path === '/admin/login') && currentAdmin()) return '/admin/dashboard'
  if (to.path.startsWith('/member') && to.path !== '/member/login' && !currentMember()) return '/member/login'
  if (to.path === '/member/login' && currentMember()) return '/member'
})
export default router
