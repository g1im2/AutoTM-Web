<template>
  <el-container class="app-container">
    <el-aside :width="sidebarWidth" class="app-sidebar">
      <div class="sidebar-header">
        <h2 class="app-title">AutoTM</h2>
        <span class="app-subtitle">智能交易管理系统</span>
      </div>

      <el-menu
        router
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapsed"
        :collapse-transition="false"
      >
        <!-- 总览 -->
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <span>总览</span>
        </el-menu-item>

        <!-- 宏观数据 -->
        <el-sub-menu index="macro">
          <template #title>
            <el-icon><TrendCharts /></el-icon>
            <span>宏观数据</span>
          </template>
          <el-menu-item index="/macro/status">宏观状态</el-menu-item>
          <el-menu-item index="/macro/indicators">指标面板</el-menu-item>
          <el-menu-item index="/macro/cycle">周期定位</el-menu-item>
          <el-menu-item index="/macro/theory">理论分析</el-menu-item>
          <el-menu-item index="/macro/history">历史记录</el-menu-item>
        </el-sub-menu>

        <!-- 投资组合 -->
        <el-sub-menu index="portfolio">
          <template #title>
            <el-icon><PieChart /></el-icon>
            <span>投资组合</span>
          </template>
          <el-menu-item index="/portfolio/list">组合列表</el-menu-item>
          <el-menu-item index="/portfolio/risk">风险管理</el-menu-item>
          <el-menu-item index="/portfolio/optimizer">优化器</el-menu-item>
          <el-menu-item index="/portfolio/performance">绩效分析</el-menu-item>
          <el-menu-item index="/portfolio/rebalance">再平衡</el-menu-item>
        </el-sub-menu>

        <!-- 策略分析与回测 -->
        <el-sub-menu index="execution">
          <template #title>
            <el-icon><Operation /></el-icon>
            <span>策略分析</span>
          </template>
          <el-menu-item index="/execution/strategy">策略分析</el-menu-item>
          <el-menu-item index="/execution/backtest">回测验证</el-menu-item>
          <el-menu-item index="/execution/realtime">实时验证</el-menu-item>
        </el-sub-menu>

        <!-- 数据任务 -->
        <el-sub-menu index="flowhub">
          <template #title>
            <el-icon><DataBoard /></el-icon>
            <span>数据任务</span>
          </template>
          <el-menu-item index="/flowhub/tasks">任务列表</el-menu-item>
          <el-menu-item index="/flowhub/create">新建任务</el-menu-item>
          <el-menu-item index="/flowhub/sources">数据源</el-menu-item>
        </el-sub-menu>

        <!-- 监控告警 -->
        <el-sub-menu index="monitoring">
          <template #title>
            <el-icon><Warning /></el-icon>
            <span>监控告警</span>
          </template>
          <el-menu-item index="/monitoring/health">系统健康</el-menu-item>
          <el-menu-item index="/monitoring/metrics">指标监控</el-menu-item>
          <el-menu-item index="/monitoring/alerts">告警管理</el-menu-item>
          <el-menu-item index="/monitoring/performance">性能视图</el-menu-item>
        </el-sub-menu>

        <!-- 系统协调 -->
        <el-sub-menu index="system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统协调</span>
          </template>
          <el-menu-item index="/system/status">系统状态</el-menu-item>
          <el-menu-item index="/system/services">服务管理</el-menu-item>
          <el-menu-item index="/system/dataflow">数据流</el-menu-item>
          <el-menu-item index="/system/tasks">定时任务</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="main-container">
      <el-header class="app-header">
        <div class="header-left">
          <el-button
            text
            @click="toggleSidebar"
            class="sidebar-toggle"
          >
            <el-icon><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon>
          </el-button>
          <span class="page-title">{{ pageTitle }}</span>
        </div>

        <div class="header-right">
          <el-button text>
            <el-icon><Bell /></el-icon>
          </el-button>
          <el-button text>
            <el-icon><User /></el-icon>
          </el-button>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Monitor, TrendCharts, PieChart, Operation, DataBoard,
  Warning, Setting, Fold, Expand, Bell, User
} from '@element-plus/icons-vue'

const route = useRoute()
const isCollapsed = ref(false)

const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '280px')

const pageTitle = computed(() => {
  if (route.path.startsWith('/flowhub/detail/')) {
    return '任务详情'
  }
  if (route.path.startsWith('/portfolio/')) {
    return '组合详情'
  }
  const titles: Record<string, string> = {
    '/dashboard': '总览',
    '/macro/status': '宏观状态',
    '/macro/indicators': '指标面板',
    '/macro/cycle': '周期定位',
    '/macro/theory': '理论分析',
    '/macro/history': '历史记录',
    '/portfolio/list': '组合列表',
    '/portfolio/risk': '风险管理',
    '/portfolio/optimizer': '优化器',
    '/portfolio/performance': '绩效分析',
    '/portfolio/rebalance': '再平衡',
    '/execution/strategy': '策略分析',
    '/execution/backtest': '回测验证',
    '/execution/realtime': '实时验证',
    '/flowhub/tasks': '任务列表',
    '/flowhub/create': '新建任务',
    '/flowhub/sources': '数据源',
    '/monitoring/health': '系统健康',
    '/monitoring/metrics': '指标监控',
    '/monitoring/alerts': '告警管理',
    '/monitoring/performance': '性能视图',
    '/system/status': '系统状态',
    '/system/services': '服务管理',
    '/system/dataflow': '数据流',
    '/system/tasks': '定时任务'
  }
  return titles[route.path] || '未知页面'
})

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  background-color: var(--primary-bg);
}

.app-sidebar {
  background-color: var(--secondary-bg);
  border-right: 1px solid var(--border-color);
  transition: width var(--transition-normal);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: var(--secondary-bg);
}

.app-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--finance-blue);
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: var(--text-xs);
  color: var(--text-muted);
  display: block;
  margin-top: var(--spacing-xs);
}

.sidebar-menu {
  border-right: none;
  background-color: transparent;
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: var(--spacing-lg);
}

.main-container {
  background-color: var(--primary-bg);
}

.app-header {
  background-color: var(--secondary-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sidebar-toggle {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.page-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.app-main {
  background-color: var(--primary-bg);
  padding: 0;
  overflow-y: auto;
}

/* 响应式侧边栏 */
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(v-bind(isCollapsed ? '-100%' : '0'));
  }

  .main-container {
    margin-left: 0;
  }

  .sidebar-header {
    padding: var(--spacing-md);
  }

  .app-title {
    font-size: var(--text-xl);
  }
}

@media (min-width: 769px) {
  .main-container {
    margin-left: 0;
  }
}
</style>
