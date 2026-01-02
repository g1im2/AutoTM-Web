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
import { GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的组件
use([
  CanvasRenderer,
  GaugeChart,
  TitleComponent,
  TooltipComponent
])

interface Props {
  title?: string
  value: number
  max?: number
  min?: number
  height?: string
  unit?: string
  stages?: Array<{ min: number; max: number; color: string; label: string }>
}

const props = withDefaults(defineProps<Props>(), {
  title: '仪表盘',
  max: 100,
  min: 0,
  height: '300px',
  unit: '%',
  stages: () => [
    { min: 0, max: 30, color: '#67C23A', label: '低风险' },
    { min: 30, max: 70, color: '#E6A23C', label: '中风险' },
    { min: 70, max: 100, color: '#F56C6C', label: '高风险' }
  ]
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
  textMuted: '#94a3b8',
  borderColor: '#374151',
  surfaceBg: '#1e293b'
})

// 在组件挂载时获取实际的 CSS 变量值
onMounted(() => {
  themeColors.value = {
    textPrimary: getCSSVariable('--text-primary') || '#f8fafc',
    textSecondary: getCSSVariable('--text-secondary') || '#cbd5e1',
    textMuted: getCSSVariable('--text-muted') || '#94a3b8',
    borderColor: getCSSVariable('--border-color') || '#374151',
    surfaceBg: getCSSVariable('--surface-bg') || '#1e293b'
  }
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: {
    text: props.title,
    left: 'center',
    top: '8%',
    textStyle: {
      color: themeColors.value.textPrimary,
      fontSize: 16,
      fontWeight: 'normal'
    }
  },
  tooltip: {
    formatter: '{a} <br/>{b} : {c}' + props.unit,
    backgroundColor: themeColors.value.surfaceBg,
    borderColor: themeColors.value.borderColor,
    borderWidth: 1,
    textStyle: {
      color: themeColors.value.textPrimary,
      fontSize: 12
    },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);'
  },
  series: [
    {
      name: props.title,
      type: 'gauge',
      min: props.min,
      max: props.max,
      splitNumber: 5,
      radius: '80%',
      center: ['50%', '60%'],
      startAngle: 225,
      endAngle: -45,
      axisLine: {
        lineStyle: {
          width: 12,
          color: props.stages.map(stage => [
            (stage.max - props.min) / (props.max - props.min),
            stage.color
          ])
        }
      },
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '15%',
        width: 24,
        offsetCenter: [0, '-60%'],
        itemStyle: {
          color: 'auto',
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      axisTick: {
        length: 15,
        lineStyle: {
          color: 'auto',
          width: 2
        }
      },
      splitLine: {
        length: 25,
        lineStyle: {
          color: 'auto',
          width: 4
        }
      },
      axisLabel: {
        color: themeColors.value.textSecondary,
        fontSize: 12,
        distance: -65,
        fontWeight: 500,
        formatter: function (value: number) {
          return Math.round(value).toString()
        }
      },
      title: {
        offsetCenter: [0, '-25%'],
        fontSize: 14,
        color: themeColors.value.textMuted,
        fontWeight: 500
      },
      detail: {
        fontSize: 28,
        offsetCenter: [0, '5%'],
        valueAnimation: true,
        fontWeight: 700,
        formatter: function (value: number) {
          return Math.round(value) + props.unit
        },
        color: 'auto'
      },
      data: [
        {
          value: props.value,
          name: getCurrentStageLabel(props.value)
        }
      ]
    }
  ]
}))

function getCurrentStageLabel(value: number): string {
  const stage = props.stages.find(s => value >= s.min && value <= s.max)
  return stage?.label || ''
}
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
