import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '自动配装' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: '关于' },
  },
  {
    path: '/builder',
    name: 'builder',
    component: () => import('@/views/BuilderView.vue'),
    meta: { title: '配装器' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { left: 0, top: 0 },
})

// 根据路由 meta 同步浏览器标题
router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} | MonsterHunter` : 'MonsterHunter'
})

export default router
