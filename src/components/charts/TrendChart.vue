<template>
  <div class="chart-container">
    <v-chart 
      class="chart" 
      :option="chartOption" 
      :loading="loading"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
])

interface TrendData {
  date: string
  value: number
  name?: string
}

interface Props {
  title?: string
  data: TrendData[]
  height?: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '趋势图',
  height: '300px',
  color: '#409EFF'
})

const loading = ref(false)

// 获取 CSS 变量的实际值（用于 ECharts）
const getCSSVariable = (variable: string): string => {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

// 主题颜色（从 CSS 变量获取）
const themeColors = ref({
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  borderColor: '#374151',
  borderLight: '#4b5563',
  surfaceBg: '#1e293b',
  cardBg: '#0f172a'
})

// 在组件挂载时获取实际的 CSS 变量值
onMounted(() => {
  themeColors.value = {
    textPrimary: getCSSVariable('--text-primary') || '#f8fafc',
    textSecondary: getCSSVariable('--text-secondary') || '#cbd5e1',
    borderColor: getCSSVariable('--border-color') || '#374151',
    borderLight: getCSSVariable('--border-light') || '#4b5563',
    surfaceBg: getCSSVariable('--surface-bg') || '#1e293b',
    cardBg: getCSSVariable('--card-bg') || '#0f172a'
  }
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: {
    text: props.title,
    textStyle: {
      color: themeColors.value.textPrimary,
      fontSize: 16,
      fontWeight: 'normal'
    }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: themeColors.value.surfaceBg,
    borderColor: themeColors.value.borderColor,
    borderWidth: 1,
    textStyle: {
      color: themeColors.value.textPrimary,
      fontSize: 12
    },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '8%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: props.data.map(item => item.date),
    axisLine: {
      lineStyle: {
        color: themeColors.value.borderColor,
        width: 1
      }
    },
    axisLabel: {
      color: themeColors.value.textSecondary,
      fontSize: 12,
      margin: 8
    },
    axisTick: {
      lineStyle: {
        color: themeColors.value.borderColor
      }
    },
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisLabel: {
      color: themeColors.value.textSecondary,
      fontSize: 12,
      margin: 8
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.08)',
        type: 'dashed',
        width: 1
      }
    },
    axisTick: {
      show: false
    }
  },
  series: [
    {
      name: props.title,
      type: 'line',
      data: props.data.map(item => item.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: props.color,
        width: 3,
        cap: 'round'
      },
      itemStyle: {
        color: props.color,
        borderColor: themeColors.value.cardBg,
        borderWidth: 2
      },
      emphasis: {
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: props.color + '60'
        }
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: props.color + '30' },
            { offset: 1, color: props.color + '05' }
          ]
        }
      }
    }
  ]
}))
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: v-bind(height);
}
.chart {
  width: 100%;
  height: 100%;
}
</style>
