import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，用于同步 document.title */
    title?: string
    /** 预留：是否需要登录 */
    requiresAuth?: boolean
  }
}

export {}
