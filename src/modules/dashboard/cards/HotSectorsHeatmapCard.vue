<template>
  <ChartCard title="热门行业板块" height="clamp(280px, 30vh, 480px)" show-refresh @refresh="handleRefresh" class="heatmap-card">
    <div class="heatmap-container">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="sectors.length === 0" class="empty-state">
        <el-icon><DataAnalysis /></el-icon>
        <span>暂无数据</span>
      </div>
      <div v-else ref="chartRef" class="chart-wrapper"></div>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import ChartCard from '../../../components/ChartCard.vue'
import { useMarketStore } from '../../../stores/market'
import { Loading, DataAnalysis } from '@element-plus/icons-vue'

echarts.use([TreemapChart, TooltipComponent, TitleComponent, CanvasRenderer])

const marketStore = useMarketStore()
const { topSectors, loading: storeLoading } = storeToRefs(marketStore)

const loading = computed(() => storeLoading.value.sectors)
const sectors = computed(() => topSectors.value)

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const chartOption = computed(() => {
  // 计算颜色：根据涨跌幅使用渐变色
  const getColor = (change: number) => {
    if (change >= 5) return '#dc2626'      // 深红 (大涨)
    if (change >= 3) return '#ef4444'      // 红色
    if (change >= 1) return '#f87171'      // 浅红
    if (change >= 0) return '#fca5a5'      // 淡红
    if (change >= -1) return '#86efac'     // 淡绿
    if (change >= -3) return '#4ade80'     // 浅绿
    if (change >= -5) return '#22c55e'     // 绿色
    return '#16a34a'                       // 深绿 (大跌)
  }

  const data = sectors.value.map(sector => ({
    name: sector.name,
    value: Math.abs(sector.flow ?? sector.turnover ?? 100),
    change: sector.change,
    itemStyle: {
      color: getColor(sector.change),
      borderColor: '#1f2937',
      borderWidth: 1
    }
  }))

  return {
    tooltip: {
      formatter: (params: any) => {
        const item = sectors.value.find(s => s.name === params.name)
        if (!item) return params.name
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${item.name}</div>
            <div>涨跌幅: <span style="color: ${item.change >= 0 ? '#ef4444' : '#22c55e'}">
              ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%
            </span></div>
            ${item.flow ? `<div>资金流向: ${item.flow.toFixed(1)}亿元</div>` : ''}
            ${item.momentum ? `<div>动量: ${(item.momentum * 100).toFixed(0)}%</div>` : ''}
          </div>
        `
      }
    },
    series: [
      {
        type: 'treemap',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        data,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (params: any) => {
            const item = sectors.value.find(s => s.name === params.name)
            return `{name|${params.name}}\n{change|${item?.change >= 0 ? '+' : ''}${item?.change.toFixed(2)}%}`
          },
          rich: {
            name: {
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              lineHeight: 18
            },
            change: {
              fontSize: 11,
              color: '#fff',
              lineHeight: 16
            }
          }
        },
        upperLabel: {
          show: false
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 1,
              borderColor: '#1f2937',
              gapWidth: 1
            }
          }
        ]
      }
    ]
  }
})

function initChart() {
  if (!chartRef.value) {
    console.warn('HotSectors: chartRef not available')
    return
  }

  console.log('HotSectors: Initializing chart with', sectors.value.length, 'sectors')
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption(chartOption.value)
  console.log('HotSectors: Chart initialized successfully')

  // 点击事件：跳转到行业详情（预留）
  chartInstance.on('click', (params: any) => {
    const sector = sectors.value.find(s => s.name === params.name)
    if (sector) {
      console.log('点击行业:', sector)
      // TODO: 跳转到 /market/sectors?id=${sector.id}
    }
  })
}

function updateChart() {
  if (chartInstance) {
    chartInstance.setOption(chartOption.value)
  }
}

function resizeChart() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

async function handleRefresh() {
  await marketStore.fetchTopSectors('momentum', '20d', true)
}

watch(() => sectors.value, (newVal) => {
  console.log('HotSectors: sectors changed, length:', newVal.length, 'chartInstance:', !!chartInstance)
  if (newVal.length > 0 && !chartInstance) {
    setTimeout(initChart, 100)
  } else if (chartInstance) {
    updateChart()
  }
}, { deep: true })

onMounted(async () => {
  console.log('HotSectors: Component mounted')
  await marketStore.fetchTopSectors('momentum', '20d', true)
  console.log('HotSectors: After fetch, sectors count:', sectors.value.length)
  if (sectors.value.length > 0) {
    setTimeout(initChart, 100)
  } else {
    console.warn('HotSectors: No sectors data after fetch')
  }
  // 监听容器尺寸变化，保证图表自适应
  if (chartRef.value && !ro) {
    ro = new ResizeObserver(() => chartInstance && chartInstance.resize())
    ro.observe(chartRef.value)
  }
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (ro) {
    ro.disconnect()
    ro = null
  }
  window.removeEventListener('resize', resizeChart)
})
</script>

<style scoped>
/* 减小热力图卡片的左右padding，与上下padding一致 */
.heatmap-card :deep(.el-card__body) {
  padding: var(--spacing-md) var(--spacing-md) !important;
  flex: 0 0 auto !important; /* 让body高度由内容决定，避免被父容器压扁 */
}

/* 确保内容区不使用flex:1，而是按传入的height固定高度渲染 */
.heatmap-card :deep(.chart-content) {
  flex: 0 0 auto !important;
}

.heatmap-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.loading-state .el-icon,
.empty-state .el-icon {
  font-size: 48px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

