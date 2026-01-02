import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },

  // 总览
  { path: '/dashboard', component: () => import('../modules/dashboard/index.vue') },

  // 宏观数据
  { path: '/macro/status', component: () => import('../modules/macro/Status.vue') },
  { path: '/macro/indicators', component: () => import('../modules/macro/Indicators.vue') },
  { path: '/macro/cycle', component: () => import('../modules/macro/Cycle.vue') },
  { path: '/macro/theory', component: () => import('../modules/macro/Theory.vue') },
  { path: '/macro/history', component: () => import('../modules/macro/History.vue') },

  // 投资组合
  { path: '/portfolio/list', component: () => import('../modules/portfolio/List.vue') },
  { path: '/portfolio/:id', component: () => import('../modules/portfolio/PortfolioDetail.vue') },
  { path: '/portfolio/risk', component: () => import('../modules/portfolio/Risk.vue') },
  { path: '/portfolio/optimizer', component: () => import('../modules/portfolio/Optimizer.vue') },
  { path: '/portfolio/performance', component: () => import('../modules/portfolio/Performance.vue') },
  { path: '/portfolio/rebalance', component: () => import('../modules/portfolio/Rebalance.vue') },

  // 策略分析与回测
  { path: '/execution/strategy', component: () => import('../modules/execution/Strategy.vue') },
  { path: '/execution/backtest', component: () => import('../modules/execution/Backtest.vue') },
  { path: '/execution/realtime', component: () => import('../modules/execution/Realtime.vue') },

  // 数据任务
  { path: '/flowhub/tasks', component: () => import('../modules/flowhub/Tasks.vue') },
  { path: '/flowhub/create', component: () => import('../modules/flowhub/Create.vue') },
  { path: '/flowhub/detail/:id', component: () => import('../modules/flowhub/Detail.vue') },
  { path: '/flowhub/sources', component: () => import('../modules/flowhub/Sources.vue') },

  // 监控告警
  { path: '/monitoring/health', component: () => import('../modules/monitoring/Health.vue') },
  { path: '/monitoring/metrics', component: () => import('../modules/monitoring/Metrics.vue') },
  { path: '/monitoring/alerts', component: () => import('../modules/monitoring/Alerts.vue') },
  { path: '/monitoring/performance', component: () => import('../modules/monitoring/Performance.vue') },

  // 系统协调
  { path: '/system/status', component: () => import('../modules/system/Status.vue') },
  { path: '/system/services', component: () => import('../modules/system/Services.vue') },
  { path: '/system/dataflow', component: () => import('../modules/system/Dataflow.vue') },
  { path: '/system/tasks', component: () => import('../modules/system/Tasks.vue') },

]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
