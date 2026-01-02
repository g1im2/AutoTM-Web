<template>
  <div class="dashboard-container">
    <!-- 顶部KPI指标卡片 -->
    <div class="kpi-grid">
      <!-- 经济周期 -->
      <div class="kpi-card">
        <div class="kpi-label">经济周期</div>
        <div class="kpi-value">{{ cyclePosition }}</div>
        <div class="kpi-sub">{{ cyclePhase }}</div>
      </div>

      <!-- 市场情绪 -->
      <div class="kpi-card">
        <div class="kpi-label">市场情绪</div>
        <div class="kpi-value">{{ marketSentiment }}</div>
        <div class="kpi-sub">{{ sentimentLabel }}</div>
      </div>

      <!-- 市场成交 -->
      <div class="kpi-card">
        <div class="kpi-label">市场成交</div>
        <div class="kpi-value">{{ formatNumber(totalTurnover) }}亿</div>
        <div class="kpi-sub" :class="turnoverDiff >= 0 ? 'positive' : 'negative'">
          {{ turnoverDiff >= 0 ? '+' : '' }}{{ formatNumber(turnoverDiff) }}亿
        </div>
      </div>

      <!-- 涨跌比 -->
      <div class="kpi-card">
        <div class="kpi-label">涨跌比</div>
        <div class="kpi-value">{{ upDownRatio }}</div>
        <div class="kpi-sub">{{ upCount }}涨 / {{ downCount }}跌</div>
      </div>
    </div>

    <!-- 热力图区域 -->
    <div class="heatmap-grid">
      <!-- 热门行业板块 -->
      <div class="heatmap-card">
        <div class="card-header">
          <h3>热门行业板块</h3>
          <button @click="refreshSectors" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
        <div class="heatmap-content" ref="sectorsChartRef"></div>
      </div>

      <!-- 热门概念板块 -->
      <div class="heatmap-card">
        <div class="card-header">
          <h3>热门概念板块</h3>
          <button @click="refreshConcepts" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
        <div class="heatmap-content" ref="conceptsChartRef"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { api } from '../../api/clients'

echarts.use([TreemapChart, TooltipComponent, CanvasRenderer])

// ==================== 状态定义 ====================
// KPI数据
const cyclePosition = ref(50)
const cyclePhase = ref('加载中...')
const marketSentiment = ref(50)
const sentimentLabel = ref('中性')
const totalTurnover = ref(0)
const turnoverDiff = ref(0)
const upCount = ref(0)
const downCount = ref(0)

// 热力图数据
const sectorsData = ref<any[]>([])
const conceptsData = ref<any[]>([])

// 图表实例
let sectorsChart: echarts.ECharts | null = null
let conceptsChart: echarts.ECharts | null = null

// DOM引用
const sectorsChartRef = ref<HTMLElement>()
const conceptsChartRef = ref<HTMLElement>()

// ==================== 计算属性 ====================
const upDownRatio = computed(() => {
  if (upCount.value === 0 && downCount.value === 0) return '50.00'
  const total = upCount.value + downCount.value
  return ((upCount.value / total) * 100).toFixed(2)
})

// ==================== 工具函数 ====================
function formatNumber(num: number): string {
  return num.toFixed(2)
}

function getHeatmapColor(change: number): string {
  if (change >= 5) return '#dc2626'
  if (change >= 3) return '#ef4444'
  if (change >= 1) return '#f87171'
  if (change >= 0) return '#fca5a5'
  if (change >= -1) return '#86efac'
  if (change >= -3) return '#4ade80'
  if (change >= -5) return '#22c55e'
  return '#16a34a'
}

// ==================== 数据加载函数 ====================
async function loadCyclePosition() {
  try {
    const response = await api.getMacroCyclePosition()
    console.log('Cycle API response:', response)
    
    const data = response?.cycle_position || response
    const historicalPos = data?.historical_position || {}
    const kondratieffPos = historicalPos.kondratieff_position || 0
    
    cyclePosition.value = Math.round(kondratieffPos * 100)
    
    // 设置阶段
    const pos = cyclePosition.value
    if (pos < 25) cyclePhase.value = '复苏期'
    else if (pos < 50) cyclePhase.value = '繁荣期'
    else if (pos < 75) cyclePhase.value = '衰退期'
    else cyclePhase.value = '萧条期'
    
    console.log('Cycle position set to:', cyclePosition.value, cyclePhase.value)
  } catch (error) {
    console.error('加载经济周期失败:', error)
    cyclePhase.value = '加载失败'
  }
}

async function loadMarketSummary() {
  try {
    const response = await api.getMarketSummary()
    console.log('Market summary API response:', response)
    
    const data = response
    
    // 更新成交数据
    totalTurnover.value = data.total_turnover_billion || 0
    turnoverDiff.value = data.diff_billion || 0
    upCount.value = data.up_count || 0
    downCount.value = data.down_count || 0
    
    // 计算市场情绪
    if (upCount.value > 0 || downCount.value > 0) {
      const total = upCount.value + downCount.value
      const ratio = upCount.value / total
      marketSentiment.value = Math.round(ratio * 100)
      
      if (marketSentiment.value >= 55) sentimentLabel.value = '偏乐观'
      else if (marketSentiment.value >= 45) sentimentLabel.value = '中性'
      else sentimentLabel.value = '偏悲观'
    }
    
    console.log('Market data:', {
      turnover: totalTurnover.value,
      up: upCount.value,
      down: downCount.value,
      sentiment: marketSentiment.value
    })
  } catch (error) {
    console.error('加载市场数据失败:', error)
  }
}

async function loadSectorsData() {
  try {
    const response = await api.getTopSectors('momentum', '20d')
    console.log('Sectors API response:', response)
    
    sectorsData.value = (response || []).slice(0, 20).map((item: any) => ({
      name: item.name,
      value: Math.abs(item.flow || 100),
      change: item.change || 0
    }))
    
    console.log('Sectors data loaded:', sectorsData.value.length)
    updateSectorsChart()
  } catch (error) {
    console.error('加载行业数据失败:', error)
  }
}

async function loadConceptsData() {
  try {
    const response = await api.getTopConcepts('attention', '20d')
    console.log('Concepts API response:', response)
    
    conceptsData.value = (response || []).slice(0, 20).map((item: any) => ({
      name: item.name,
      value: Math.abs(item.flow || item.attention || 100),
      change: item.change || 0
    }))
    
    console.log('Concepts data loaded:', conceptsData.value.length)
    updateConceptsChart()
  } catch (error) {
    console.error('加载概念数据失败:', error)
  }
}

// ==================== 图表更新函数 ====================
function updateSectorsChart() {
  if (!sectorsChartRef.value || sectorsData.value.length === 0) {
    console.warn('Sectors chart ref or data not ready')
    return
  }
  
  if (!sectorsChart) {
    sectorsChart = echarts.init(sectorsChartRef.value)
  }
  
  const option = {
    tooltip: {
      formatter: (params: any) => {
        return `${params.name}<br/>涨跌幅: ${params.data.change.toFixed(2)}%`
      }
    },
    series: [{
      type: 'treemap',
      data: sectorsData.value.map(item => ({
        name: item.name,
        value: item.value,
        change: item.change,
        itemStyle: {
          color: getHeatmapColor(item.change),
          borderColor: '#1f2937',
          borderWidth: 1
        }
      })),
      label: {
        show: true,
        formatter: '{b}\n{@change}%',
        fontSize: 13,
        color: '#fff'
      },
      levels: [{
        itemStyle: {
          borderWidth: 1,
          borderColor: '#1f2937',
          gapWidth: 1
        }
      }]
    }]
  }
  
  sectorsChart.setOption(option)
  console.log('Sectors chart updated')
}

function updateConceptsChart() {
  if (!conceptsChartRef.value || conceptsData.value.length === 0) {
    console.warn('Concepts chart ref or data not ready')
    return
  }
  
  if (!conceptsChart) {
    conceptsChart = echarts.init(conceptsChartRef.value)
  }
  
  const option = {
    tooltip: {
      formatter: (params: any) => {
        return `${params.name}<br/>涨跌幅: ${params.data.change.toFixed(2)}%`
      }
    },
    series: [{
      type: 'treemap',
      data: conceptsData.value.map(item => ({
        name: item.name,
        value: item.value,
        change: item.change,
        itemStyle: {
          color: getHeatmapColor(item.change),
          borderColor: '#1f2937',
          borderWidth: 1
        }
      })),
      label: {
        show: true,
        formatter: '{b}\n{@change}%',
        fontSize: 11,
        color: '#fff'
      },
      levels: [{
        itemStyle: {
          borderWidth: 1,
          borderColor: '#1f2937',
          gapWidth: 1
        }
      }]
    }]
  }
  
  conceptsChart.setOption(option)
  console.log('Concepts chart updated')
}

// ==================== 刷新函数 ====================
async function refreshSectors() {
  await loadSectorsData()
}

async function refreshConcepts() {
  await loadConceptsData()
}

function handleResize() {
  sectorsChart?.resize()
  conceptsChart?.resize()
}

// ==================== 生命周期 ====================
onMounted(async () => {
  console.log('Dashboard mounted, loading data...')

  // 并行加载所有数据
  await Promise.all([
    loadCyclePosition(),
    loadMarketSummary(),
    loadSectorsData(),
    loadConceptsData()
  ])

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)

  console.log('Dashboard data loaded')
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  sectorsChart?.dispose()
  conceptsChart?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  padding: var(--spacing-lg);
  max-width: 1600px;
  margin: 0 auto;
}

/* KPI卡片网格 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.kpi-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.kpi-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.kpi-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.kpi-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.kpi-sub.positive {
  color: var(--finance-red);
}

.kpi-sub.negative {
  color: var(--finance-green);
}

/* 热力图网格 */
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.heatmap-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  height: 760px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.card-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  color: var(--finance-blue);
  background: var(--surface-bg);
}

.heatmap-content {
  flex: 1;
  width: 100%;
  min-height: 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .heatmap-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .kpi-value {
    font-size: 24px;
  }

  .heatmap-card {
    height: 500px;
  }
}
</style>


