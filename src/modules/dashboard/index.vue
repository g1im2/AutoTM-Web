<template>
  <PageTemplate>
    <!-- 第一行：4个小卡片 - KPI指标 -->
    <div class="dashboard-row-1">
      <!-- 经济周期位置 -->
      <el-card class="mini-kpi-card">
        <template #header>
          <div class="mini-card-header">
            <span class="mini-card-title">经济周期</span>
          </div>
        </template>
        <div class="mini-card-body">
          <div class="kpi-value">{{ cyclePosition ?? '未获取' }}</div>
          <div class="kpi-label">{{ cyclePhaseLabel }}</div>
        </div>
      </el-card>

      <!-- 市场情绪 -->
      <el-card class="mini-kpi-card">
        <template #header>
          <div class="mini-card-header">
            <span class="mini-card-title">市场情绪</span>
          </div>
        </template>
        <div class="mini-card-body">
          <div class="kpi-value" :class="sentimentClass">{{ marketSentiment ?? '未获取' }}</div>
          <div class="kpi-label">{{ sentimentLabel }}</div>
        </div>
      </el-card>

      <!-- 市场成交 -->
      <el-card class="mini-kpi-card">
        <template #header>
          <div class="mini-card-header">
            <span class="mini-card-title">市场成交</span>
          </div>
        </template>
        <div class="mini-card-body">
          <div class="kpi-value">{{ marketSummary ? formatAmountYI(totalTurnover) : '未获取' }}</div>
          <div class="kpi-trend" v-if="marketSummary" :class="{ up: turnoverDiff >= 0, down: turnoverDiff < 0 }">
            <el-icon v-if="turnoverDiff >= 0"><CaretTop /></el-icon>
            <el-icon v-else><CaretBottom /></el-icon>
            <span>{{ turnoverDiff !== null && turnoverDiff !== undefined ? Math.abs(turnoverDiff).toFixed(2) : '0.00' }}亿</span>
          </div>
        </div>
      </el-card>

      <!-- 涨跌比 -->
      <el-card class="mini-kpi-card">
        <template #header>
          <div class="mini-card-header">
            <span class="mini-card-title">涨跌比</span>
          </div>
        </template>
        <div class="mini-card-body">
          <div class="kpi-value" :class="upDownRatioClass">{{ upDownRatio != null ? upDownRatio.toFixed(2) : '未获取' }}</div>
          <div class="kpi-label">{{ upDownRatio != null ? `${upCount}涨 / ${downCount}跌` : '未获取' }}</div>
        </div>
      </el-card>
    </div>

    <!-- 第二行：热门行业 + 热门概念 -->
    <div class="dashboard-row-2">
      <HotSectorsHeatmapCard />
      <HotConceptsHeatmapCard />
    </div>

    <!-- 第三行：核心分析结果 + 投资组合概览 -->
    <div class="dashboard-row-3">
      <TopStocksTable />
      <PortfolioOverviewCard />
    </div>

    <!-- 第四行：最新交易信号 -->
    <div class="dashboard-row-4">
      <LatestSignalsCard />
    </div>

    <!-- 康波周期分析 - 重构 -->
    <el-card class="cycles-analysis-card">
      <template #header>
        <div class="cycles-card-header">
          <span class="cycles-card-title">康波周期分析</span>
          <el-button size="small" :icon="Refresh" @click="refreshCyclesData" type="text" class="refresh-btn" />
        </div>
      </template>
      <div class="cycles-card-content">
        <div class="chart-controls">
          <div class="phase-status">
            <el-tag
              :style="{
                backgroundColor: currentPhaseColor,
                color: currentPhaseTextColor,
                borderColor: currentPhaseColor
              }"
              effect="dark"
            >
              当前时期：{{ currentPhase?.name || '未知' }}
            </el-tag>
          </div>
          <el-radio-group size="small" v-model="selectedRange" @change="onRangeChange">
            <el-radio-button label="1y" />
            <el-radio-button label="5y" />
            <el-radio-button label="10y" />
            <el-radio-button label="30y" />
            <el-radio-button label="60y" />
            <el-radio-button label="all" />
          </el-radio-group>
        </div>
        <div class="cycles-chart-container">
          <div ref="nativeChartContainer" style="height: 340px; width: 100%;"></div>
          <!-- 备用：vue-echarts 版本 -->
          <!-- <v-chart class="cycles-chart" :option="cyclesOption" autoresize /> -->
        </div>
      </div>
    </el-card>

  </PageTemplate>
</template>



<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import PageTemplate from '../../components/PageTemplate.vue'
import IndexCarousel from '../../components/IndexCarousel.vue'
import MacroCycleCard from './cards/MacroCycleCard.vue'
import HotSectorsHeatmapCard from './cards/HotSectorsHeatmapCard.vue'
import HotConceptsHeatmapCard from './cards/HotConceptsHeatmapCard.vue'
import TopStocksTable from './cards/TopStocksTable.vue'
import PortfolioOverviewCard from './cards/PortfolioOverviewCard.vue'
import LatestSignalsCard from './cards/LatestSignalsCard.vue'
import { useMacroStore } from '../../stores/macro'
import { CaretTop, CaretBottom, Refresh } from '@element-plus/icons-vue'

// ECharts imports (保留用于Kondratieff Wave图表)
import { use, init } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, ScatterChart, TreemapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkAreaComponent } from 'echarts/components'
use([CanvasRenderer, LineChart, ScatterChart, TreemapChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkAreaComponent])

// 使用 Pinia store
const macroStore = useMacroStore()

// 指数轮播数据（从store获取）
const indexQuotes = ref<Array<{ name: string; code: string; price: number; change: number }>>([])

// 直接从 store 读取市场概览为单一数据源
const { marketSummary } = storeToRefs(macroStore)

// 市场成交金额（从store获取）
const totalTurnover = computed<number>(() => marketSummary.value?.totalTurnoverBillion ?? 0)
const turnoverDiff = computed<number>(() => marketSummary.value?.diffBillion ?? 0)

// 第一行4个小卡片的数据
const cyclePosition = ref<number | null>(null)
const cyclePhaseLabel = ref<string>('未获取')
const marketSentiment = ref<number | null>(null)
const sentimentLabel = ref<string>('未获取')
// 涨跌数量直接从 store 读取，避免本地状态被异步覆盖
const upCount = computed<number>(() => marketSummary.value?.upCount ?? 0)
const downCount = computed<number>(() => marketSummary.value?.downCount ?? 0)

// 计算属性
const sentimentClass = computed(() => {
  if (marketSentiment.value == null) return ''
  if (marketSentiment.value >= 70) return 'sentiment-high'
  if (marketSentiment.value >= 50) return 'sentiment-medium'
  return 'sentiment-low'
})

const upDownRatio = computed<number | null>(() => {
  const total = upCount.value + downCount.value
  return total > 0 ? (upCount.value / total) * 100 : null
})

const upDownRatioClass = computed(() => {
  if (upDownRatio.value == null) return ''
  if (upDownRatio.value >= 55) return 'ratio-high'
  if (upDownRatio.value >= 45) return 'ratio-medium'
  return 'ratio-low'
})

// 康波周期折线图数据（保留原有逻辑）
const selectedRange = ref<'1y'|'5y'|'10y'|'30y'|'60y'|'all'>('60y')
const cyclesSeries = ref<Array<{ key:string; name:string; color:string; data:Array<[string, number]> }>>([])
const phases = ref<Array<{ name:string; start:string; end:string|null }>>([])
const nativeChartContainer = ref<HTMLDivElement>()
let nativeChart: any = null

const currentPhase = computed(() => phases.value[phases.value.length - 1])
const currentPhaseColor = computed(() => {
  if (!currentPhase.value) return '#909399'
  const phaseColorMap = {
    '复苏': '#409EFF',
    '繁荣': '#67C23A',
    '衰退': '#E6A23C',
    '萧条': '#F56C6C'
  }
  return phaseColorMap[currentPhase.value.name as keyof typeof phaseColorMap] || '#909399'
})


// 根据背景色计算文字颜色
const currentPhaseTextColor = computed(() => {
  const color = currentPhaseColor.value
  // 计算颜色亮度
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  // 如果背景色较亮，使用深色文字；否则使用浅色文字
  return brightness > 128 ? '#303133' : '#FFFFFF'
})



function rangeStartDate(range: typeof selectedRange.value, endISO: string) {
  if (range === 'all') return null
  const end = new Date(endISO + '-01')
  const years = range === '1y' ? 1 : range === '5y' ? 5 : range === '10y' ? 10 : range === '30y' ? 30 : 60
  const start = new Date(end)
  start.setFullYear(end.getFullYear() - years)
  const m = String(start.getMonth()+1).padStart(2,'0')
  return `${start.getFullYear()}-${m}`
}



function onRangeChange() {
  /* 计算属性会自动更新 */
  updateNativeChart()
}

  // 工具：将十六进制颜色转换为带透明度的 rgba
  function colorWithAlpha(hex: string, alpha: number) {
    const m = hex.replace('#', '')
    const r = parseInt(m.substring(0, 2), 16)
    const g = parseInt(m.substring(2, 4), 16)
    const b = parseInt(m.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 生成 1924-2024 的模拟康波周期数据（按月）与经济阶段
  function generateCenturyCycles() {
    const startYear = 1924
    const endYear = 2024
    const months: string[] = []
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 1; m <= 12; m++) {
        months.push(`${y}-${String(m).padStart(2, '0')}`)
      }
    }

    const toIdx = (y: number, m: number) => (y - startYear) * 12 + (m - 1)

    // 事件（中心月份索引、影响强度与宽度）
    const events = [
      { year: 1933, month: 6, ampK: -40, ampO: -25, sigma: 30 }, // 大萧条
      { year: 1976, month: 1, ampK: -25, ampO: -15, sigma: 18 }, // 石油危机
      { year: 2001, month: 6, ampK: -20, ampO: -12, sigma: 10 }, // 互联网泡沫
      { year: 2008, month: 9, ampK: -35, ampO: -20, sigma: 10 }, // 金融危机
      { year: 2020, month: 4, ampK: -30, ampO: -18, sigma: 8 },  // 新冠冲击
    ].map(e => ({ ...e, center: toIdx(e.year, e.month) }))

    const P = { K: 54 * 12, Ku: 20 * 12, J: 9 * 12, I: 4 * 12 } // 各周期（月）
    const A = { K: 60, Ku: 35, J: 25, I: 15 }                    // 振幅

    const seriesData: Record<string, Array<[string, number]>> = {
      '康波周期': [],
      '库兹涅茨周期': [],
      '朱格拉周期': [],
      '库存周期': [],
    }

    months.forEach((ym, i) => {
      const k = Math.sin((2 * Math.PI * i) / P.K) * A.K
      const ku = Math.sin((2 * Math.PI * i) / P.Ku) * A.Ku
      const j = Math.sin((2 * Math.PI * i) / P.J) * A.J
      const inv = Math.sin((2 * Math.PI * i) / P.I) * A.I

      // 事件冲击（高斯脉冲）
      let shockK = 0
      let shockO = 0
      for (const e of events) {
        const t = (i - e.center) / e.sigma
        const g = Math.exp(-0.5 * t * t)
        shockK += e.ampK * g
        shockO += e.ampO * g
      }

      const clamp = (v: number) => Math.max(-100, Math.min(100, v))
      seriesData['康波周期']!.push([`${ym}`, clamp(k + shockK)])
      seriesData['库兹涅茨周期']!.push([`${ym}`, clamp(ku + shockO * 0.7)])
      seriesData['朱格拉周期']!.push([`${ym}`, clamp(j + shockO * 0.5)])
      seriesData['库存周期']!.push([`${ym}`, clamp(inv + shockO * 0.3)])
    })

    // 生成经济阶段（按 ~54 年周期拆分为 4 阶段：复苏/繁荣/衰退/萧条）
    const phaseOrder = ['复苏', '繁荣', '衰退', '萧条'] as const
    const phaseYears = [12, 14, 14, 14] // 合计 54 年
    const phases: Array<{ name: string; start: string; end: string | null }> = []
    let y = startYear
    while (y <= endYear) {
      for (let k = 0; k < phaseOrder.length; k++) {
        const years = phaseYears[k]!
        const phaseName = phaseOrder[k]!
        const start = `${y}-01`
        const endYearPhase = Math.min(y + years - 1, endYear)
        const end = endYearPhase === endYear ? null : `${endYearPhase}-12`
        phases.push({ name: phaseName, start, end })
        y += years
        if (y > endYear) break
      }
    }

    const palette = {
      '康波周期': '#EF4444',
      '库兹涅茨周期': '#E6A23C',
      '朱格拉周期': '#67C23A',
      '库存周期': '#409EFF',
    } as Record<string, string>

    const series = Object.keys(seriesData).map(key => ({
      key,
      name: key,
      color: palette[key] || '#409EFF',
      data: seriesData[key] || [],
    }))

    return { series, phases }
  }


// 原生 ECharts 初始化和更新
function initNativeChart() {
  if (!nativeChartContainer.value) {
    console.error('❌ Chart container not found!')
    console.log('nativeChartContainer.value:', nativeChartContainer.value)
    return
  }

  console.log('✅ Chart container found:', nativeChartContainer.value)
  console.log('Container dimensions:', {
    width: nativeChartContainer.value.offsetWidth,
    height: nativeChartContainer.value.offsetHeight,
    clientWidth: nativeChartContainer.value.clientWidth,
    clientHeight: nativeChartContainer.value.clientHeight
  })

  console.log('=== INITIALIZING NATIVE ECHARTS ===')
  try {
    nativeChart = init(nativeChartContainer.value)
    console.log('✅ ECharts instance created:', nativeChart)

    // 确保有数据后再更新图表
    if (!cyclesSeries.value.length) {
      console.log('📊 No data available, calling refreshCyclesData first')
      refreshCyclesData()
    } else {
      console.log('📊 Data available, updating chart directly')
      updateNativeChart()
    }
  } catch (error) {
    console.error('❌ Failed to initialize ECharts:', error)
  }
}

function updateNativeChart() {
  if (!nativeChart) {
    console.error('❌ Native chart instance not found!')
    return
  }

  console.log('=== UPDATING NATIVE CHART ===')
  console.log('📊 Chart instance:', nativeChart)
  console.log('📊 cyclesSeries.value:', cyclesSeries.value.length, 'series')
  console.log('📊 phases.value:', phases.value.length, 'phases')
  console.log('📊 selectedRange.value:', selectedRange.value)

  // 如果没有数据，生成完整的100年数据
  if (!cyclesSeries.value.length) {
    console.log('📊 No data found, generating century cycles...')
    try {
      const { series, phases: p } = generateCenturyCycles()
      cyclesSeries.value = series
      phases.value = p
      console.log('✅ Generated data - series:', series.length, 'phases:', p.length)
      console.log('📊 First series sample:', series[0]?.name, 'data points:', series[0]?.data?.length)
    } catch (e) {
      console.error('❌ Failed to generate data:', e)
      // 使用简单的测试数据作为后备
      cyclesSeries.value = [
        {
          key: 'test',
          name: '测试数据',
          color: '#EF4444',
          data: [['2020-01', 20], ['2021-01', 30], ['2022-01', -10], ['2023-01', 40], ['2024-01', 25]] as [string, number][]
        }
      ]
      phases.value = [
        { name: '测试阶段', start: '2020-01', end: '2024-01' }
      ]
    }
  }

  // 构建按选择区间过滤后的数据
  const first = cyclesSeries.value[0]
  const allDates = first?.data ? (first as any).data.map((d: any) => d[0]) : []
  if (!allDates.length) {
    console.warn('Still no data after generation attempt')
    return
  }

  const endISO = allDates[allDates.length - 1] as string
  const startISO = rangeStartDate(selectedRange.value, endISO)
  const inRange = (iso: string) => !startISO || iso >= startISO

  const series = cyclesSeries.value.map(s => ({
    type: 'line',
    name: s.name,
    smooth: true,
    showSymbol: false,
    symbol: 'none',
    lineStyle: { width: 2, color: s.color },
    itemStyle: { color: s.color },
    data: s.data
      .filter(d => inRange(d[0]))
      .map(d => {
        // 确保时间格式正确：YYYY-MM-DD
        const timeStr = d[0].includes('-01') ? d[0] : `${d[0]}-01`
        // 转换为时间戳，ECharts 更好地处理时间戳
        const timestamp = new Date(timeStr).getTime()
        return [timestamp, d[1]]
      })
  }))

  console.log('Filtered series data:', series.map(s => ({ name: s.name, dataLength: s.data.length })))

  // 经济阶段颜色映射（按要求：繁荣=绿、衰退=橙、萧条=红、复苏=蓝）
  const phaseColorMap: Record<string, string> = {
    '复苏': '#409EFF',
    '繁荣': '#67C23A',
    '衰退': '#E6A23C',
    '萧条': '#F56C6C'
  }

  // 过滤当前时间范围内的周期
  const visiblePhases = phases.value.filter(p => {
    if (!startISO) return true
    const phaseEnd = p.end || endISO
    return phaseEnd >= startISO && p.start <= endISO
  })

  const markAreaData = visiblePhases.map(p => {
    const phaseStart = startISO && p.start < startISO ? startISO : p.start
    const phaseEnd = p.end || endISO
    const col = phaseColorMap[p.name] || '#60a5fa'

    // 转换为时间戳
    const startTimestamp = new Date(`${phaseStart}-01`).getTime()
    const endTimestamp = new Date(`${phaseEnd}-01`).getTime()

    return [
      {
        name: p.name,
        xAxis: startTimestamp,
        yAxis: 105,  // 固定在顶部
        itemStyle: {
          color: colorWithAlpha(col, 0.06),  // 提高透明度
          borderColor: col,
          borderWidth: 1,  // 减小边框宽度
          borderType: 'dashed'
        },
        label: {
          show: true,
          position: 'insideTop',
          formatter: `${p.name}期`,
          color: col,
          fontSize: 11,
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderColor: col,
          borderWidth: 1,
          borderRadius: 3,
          padding: [2, 4]
        }
      },
      {
        xAxis: endTimestamp,
        yAxis: -105,  // 固定在底部
        itemStyle: {
          color: colorWithAlpha(col, 0.06),  // 提高透明度
          borderColor: col,
          borderWidth: 1,  // 减小边框宽度
          borderType: 'dashed'
        }
      }
    ]
  })

  const seriesWithMarkArea = series.length ? [{
    ...(series[0] as any),
    markArea: markAreaData.length ? {
      silent: true,
      data: markAreaData
    } : undefined
  }, ...series.slice(1)] : series

  // 获取实际的CSS变量值
  const getComputedCSSVar = (varName: string, fallback: string) => {
    if (typeof window !== 'undefined' && document.documentElement) {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      return value || fallback
    }
    return fallback
  }

  const colors = {
    textPrimary: getComputedCSSVar('--text-primary', '#f8fafc'),
    textSecondary: getComputedCSSVar('--text-secondary', '#cbd5e1'),
    surfaceBg: getComputedCSSVar('--surface-bg', '#2d3748'),
    borderColor: getComputedCSSVar('--border-color', '#374151'),
    borderLight: getComputedCSSVar('--border-light', '#4b5563')
  }

  console.log('🎨 Resolved colors:', colors)

  // 周期标签现在直接在 markArea 中显示

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.surfaceBg,
      borderColor: colors.borderColor,
      textStyle: { color: colors.textPrimary },
      formatter: (params: any) => {
        try {
          if (!params || !params[0]) return ''

          const date = new Date(params[0].axisValue)
          const year = date.getFullYear()
          const month = date.getMonth() + 1

          let result = `<div style="margin-bottom: 4px; font-weight: bold;">${year}年${month}月</div>`
          params.forEach((param: any) => {
            if (param.seriesName && !param.seriesName.includes('标签')) {
              const value = Array.isArray(param.value) ? param.value[1] : param.value
              result += `<div style="margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 8px;"></span>
                ${param.seriesName}: ${Number(value).toFixed(1)}
              </div>`
            }
          })
          return result
        } catch (e) {
          console.warn('Tooltip formatter error:', e)
          return 'Error formatting tooltip'
        }
      }
    },
    legend: {
      top: 5,  // 减少顶部间距
      textStyle: { color: colors.textSecondary, fontSize: 12 },  // 稍微减小字体
      selector: false,
      itemGap: 15,  // 减少图例项之间的间距
      // 只显示实际的数据系列
      data: series.map(s => s.name)
    },
    grid: { left: 45, right: 25, top: 50, bottom: 70 },  // 增加网格底部，为X轴标签与dataZoom拉开空间
    xAxis: {
      type: 'time',
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,  // 稍微减小字体
        margin: 12,    // 再增加一点距离，避免贴近dataZoom
        formatter: function(value: any) {
          try {
            const date = new Date(value)
            return date.getFullYear().toString()
          } catch (e) {
            console.warn('Time axis formatter error:', e, 'value:', value)
            return String(value)
          }
        }
      },
      axisLine: { lineStyle: { color: colors.borderColor } },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value', min: -100, max: 110,  // 增加上边界为标签留出空间
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,  // 稍微减小字体
        margin: 8      // 减少标签与轴线的距离
      },
      axisLine: { lineStyle: { color: colors.borderColor } },
      splitLine: { lineStyle: { color: colors.borderLight, type: 'dashed' } }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 2,   // 将滑块贴近容器底部，减少滑块下方留白
        height: 20,  // 稍微增加高度，提高可操作性
        textStyle: { fontSize: 10 },
        handleStyle: {
          color: '#409EFF',
          borderColor: '#409EFF'
        },
        dataBackground: {
          areaStyle: {
            color: 'rgba(64, 158, 255, 0.1)'
          },
          lineStyle: {
            color: 'rgba(64, 158, 255, 0.3)'
          }
        }
      }
    ],
    series: seriesWithMarkArea
  }

  console.log('=== SETTING CHART OPTION ===')
  console.log('Option series count:', option.series.length)
  console.log('First series data sample:', option.series[0]?.data?.slice(0, 3))
  console.log('Chart instance:', nativeChart)

  console.log('🔄 Setting chart option...')
  console.log('📊 Series data sample:', series.map(s => ({
    name: s.name,
    dataLength: s.data.length,
    firstPoint: s.data[0],
    lastPoint: s.data[s.data.length - 1]
  })))
  console.log('📊 MarkArea data:', markAreaData.length, 'areas')
  console.log('📊 MarkArea phases:', markAreaData.length, 'areas with labels')

  try {
    nativeChart.setOption(option, true)
    console.log('✅ Chart option set successfully')

    // 强制重绘
    nativeChart.resize()
    console.log('✅ Chart resized')

    // 验证图表是否有数据
    const chartOption = nativeChart.getOption()
    console.log('📊 Chart series count:', chartOption.series?.length)
  } catch (error) {
    console.error('❌ Error setting chart option:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
  }
}

async function refreshCyclesData() {
  console.log('=== REFRESH CYCLES DATA ===')
  try {
    const { series, phases: p } = generateCenturyCycles()
    cyclesSeries.value = series
    phases.value = p
    console.log('✅ Data refreshed - series:', series.length, 'phases:', p.length)
    console.log('📊 First series sample:', series[0]?.name, 'data points:', series[0]?.data?.length)

    // 确保图表在数据更新后重新渲染
    await nextTick()
    if (nativeChart) {
      console.log('🔄 Updating chart with new data...')
      updateNativeChart()
    } else {
      console.warn('⚠️ Native chart instance not available')
    }
  } catch (e) {
    console.error('❌ Error in refreshCyclesData:', e)
    cyclesSeries.value = []
    phases.value = []
  }
}






// 刷新趋势数据
async function refreshTrendData() {
  console.log('refreshTrendData called')
  trendLoading.value = true
  try {
    // 生成 30 天的趋势数据
    const data: Array<{ date: string; value: number }> = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0] as string
      data.push({
        date: dateStr,
        value: 50 + Math.sin(i * 0.2) * 20 + Math.random() * 10
      })
    }
    trendData.value = data
    console.log('Trend data generated:', trendData.value.length, 'points')
  } catch (e) {
    console.error('获取趋势数据失败:', e)
    trendData.value = []
  } finally {
    trendLoading.value = false
  }
}


// 刷新大盘指数报价（使用store）
async function refreshIndexQuotes() {
  try {
    const codes = '000001.SH,399001.SZ,399006.SZ,000688.SH'
    const quotes = await macroStore.fetchIndexQuotes(codes, true)
    if (Array.isArray(quotes) && quotes.length > 0) {
      indexQuotes.value = quotes.map((q: any) => ({
        name: q.name,
        code: q.code,
        price: q.price ?? 0,
        change: q.change ?? q.changePercent ?? 0
      }))
    }
  } catch (e) {
    console.warn('获取指数行情失败:', e)
  }
}

// 刷新市场成交金额（使用store）
async function refreshMarketTurnover() {
  try {
    // 仅触发 store 刷新，不在本地重复维护状态
    const summary = await macroStore.fetchMarketSummary(true)
    console.log('refreshMarketTurnover - summary (from store):', summary)
  } catch (e) {
    console.warn('获取市场成交失败:', e)
  }
}

// 刷新周期和情绪数据
async function refreshCycleAndSentiment() {
  try {
    // 1. 更新经济周期
    const cycleData = await macroStore.fetchCyclePosition(true)
    console.log('refreshCycleAndSentiment - cycleData:', cycleData)

    if (cycleData) {
      cyclePosition.value = (typeof cycleData.position === 'number') ? cycleData.position : null

      // 根据周期位置设置阶段标签
      if (cyclePosition.value != null) {
        const pos = cyclePosition.value
        if (pos < 25) {
          cyclePhaseLabel.value = '复苏期'
        } else if (pos < 50) {
          cyclePhaseLabel.value = '繁荣期'
        } else if (pos < 75) {
          cyclePhaseLabel.value = '衰退期'
        } else {
          cyclePhaseLabel.value = '萧条期'
        }
      } else {
        cyclePhaseLabel.value = '未获取'
      }

      console.log('refreshCycleAndSentiment - cycle updated:', cyclePosition.value, cyclePhaseLabel.value)
    }

    // 2. 计算市场情绪（基于已有的upCount和downCount）
    if (upCount.value > 0 || downCount.value > 0) {
      const total = upCount.value + downCount.value
      const ratio = upCount.value / total
      marketSentiment.value = Math.round(ratio * 100)

      if (marketSentiment.value >= 55) {
        sentimentLabel.value = '偏乐观'
      } else if (marketSentiment.value >= 45) {
        sentimentLabel.value = '中性'
      } else {
        sentimentLabel.value = '偏悲观'
      }

      console.log('refreshCycleAndSentiment - sentiment updated:', marketSentiment.value, sentimentLabel.value)
    }
  } catch (e) {
    console.warn('获取周期和情绪数据失败:', e)
  }
}

function formatAmountYI(val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(val)) {
    return '0.00亿'
  }
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + '亿'
}

// 刷新周期数据
async function refreshCycleData() {
  console.log('refreshCycleData called')
  cycleLoading.value = true
  try {
    // 生成一个在 0-100 之间的随机值
    cycleValue.value = Math.floor(Math.random() * 100)
    console.log('Cycle value set to:', cycleValue.value)
  } catch (e) {
    console.error('获取周期数据失败:', e)
    cycleValue.value = 50
  } finally {
    cycleLoading.value = false
  }
}




// 板块热力图已移至 HotSectorsHeatmapCard 组件

onMounted(async () => {
  console.log('Dashboard mounted, starting initialization...')

  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)

  // 初始化数据（使用store）
  try {
    // 第一步：先加载市场数据（包含upCount和downCount）
    await refreshMarketTurnover()

    // 第二步：并行加载其他数据
    await Promise.all([
      macroStore.fetchIndicators('GDP,CPI,PMI,RATE'),
      refreshIndexQuotes(),
      refreshCyclesData() // 保留Kondratieff Wave图表
    ])

    // 第三步：基于已加载的市场数据计算周期和情绪
    await refreshCycleAndSentiment()

    console.log('Dashboard initialization complete:', {
      cycle: cyclePosition.value,
      sentiment: marketSentiment.value,
      up: upCount.value,
      down: downCount.value
    })

    // 设置轮询刷新
    setInterval(async () => {
      await refreshMarketTurnover()
      await refreshCycleAndSentiment()
    }, 30000)
    setInterval(refreshIndexQuotes, 30000)

    // 初始化Kondratieff Wave图表
    await nextTick()
    setTimeout(() => {
      initNativeChart()
    }, 200)
  } catch (error) {
    console.error('Dashboard初始化失败:', error)
  }
})

// 窗口大小变化时重新调整图表大小
function handleResize() {
  if (nativeChart) nativeChart.resize()
}

// 清理图表实例
onUnmounted(() => {
  if (nativeChart) {
    nativeChart.dispose()
    nativeChart = null
  }
  window.removeEventListener('resize', handleResize)
})


</script>

<style scoped>
/* Dashboard布局 - 统一使用 gap，移除硬编码的 margin-bottom */
.dashboard-row-1 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--card-gap-lg);
}

.dashboard-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--card-gap-lg);
}

.dashboard-row-3 {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: var(--card-gap-lg);
}

.dashboard-row-4 {
  /* 不需要 margin-bottom，由 PageTemplate 的 gap 控制 */
}

/* 第一行4个小卡片样式 */
.mini-kpi-card {
  min-height: 110px;
  transition: all 0.2s ease;
}

.mini-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mini-kpi-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.mini-kpi-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.mini-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.mini-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.kpi-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.kpi-trend.up {
  color: var(--success-color);
}

.kpi-trend.down {
  color: var(--danger-color);
}

/* 情绪颜色 */
.sentiment-high {
  color: #10b981;
}

.sentiment-medium {
  color: #3b82f6;
}

.sentiment-low {
  color: #ef4444;
}

/* 涨跌比颜色 */
.ratio-high {
  color: #10b981;
}

.ratio-medium {
  color: #f59e0b;
}

.ratio-low {
  color: #ef4444;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .dashboard-row-1 {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .dashboard-row-2 {
    gap: var(--card-gap-xs);
  }

  .dashboard-row-3 {
    grid-template-columns: 1fr;
    gap: var(--card-gap-xs);
  }

  .mini-kpi-card {
    min-height: 110px;
  }

  .kpi-value {
    font-size: 24px;
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .dashboard-row-1 {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--card-gap-md);
  }

  .dashboard-row-2 {
    gap: var(--card-gap-md);
  }

  .dashboard-row-3 {
    grid-template-columns: 1fr;
    gap: var(--card-gap-md);
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .dashboard-row-1 {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--card-gap-lg);
  }

  .dashboard-row-2 {
    gap: var(--card-gap-lg);
  }

  .dashboard-row-3 {
    gap: var(--card-gap-lg);
  }
}

@media (min-width: 1600px) {
  .dashboard-row-1 {
    gap: var(--card-gap-xl);
  }

  .dashboard-row-2 {
    gap: var(--card-gap-xl);
  }

  .dashboard-row-3 {
    gap: var(--card-gap-xl);
  }
}

/* 保留Kondratieff Wave图表样式 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--card-gap-lg);
}


.table-actions {
  margin-bottom: var(--spacing-md);
}

.table-title {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-secondary);
}

/* 顶部迷你卡片统一标题栏与内容布局（更紧凑） */
.kpi-grid { align-items: stretch; }
.mini-card { min-height: 136px; display: flex; flex-direction: column; }
.mini-card :deep(.el-card__header){ padding: var(--spacing-sm); border-bottom:1px solid var(--border-color); line-height: 1.1; }
.mini-card :deep(.el-card__body){ padding: var(--spacing-sm); display: flex; flex-direction: column; gap: 6px; flex:1; justify-content:center; }
.mini-card-header{ display:flex; justify-content:space-between; align-items:center; }
.mini-card-title{ display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text-primary); }

/* 市场周期卡片内容 */
.cycle-body{ display:flex; flex-direction:column; gap:6px; align-items:center; justify-content:center; flex:1; text-align:center; }
.cycle-value{ font-size:20px; font-weight:700; color:var(--text-primary); }
.cycle-subtitle{ font-size:12px; color: var(--text-secondary); }

/* 市场成交卡片垂直布局 */
.turnover-body{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; flex:1; text-align:center; }
.turnover-value{ font-size:22px; font-weight:700; color:var(--text-primary); line-height:1.2; }
.turnover-diff{ display:flex; align-items:center; gap:4px; font-size:12px }
.turnover-diff.up{ color:var(--success-color) }
.turnover-diff.down{ color:var(--danger-color) }


.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;  /* 减少底部间距 */
  padding: 0 4px;      /* 减少左右内边距 */
  flex-wrap: wrap;
  gap: 8px;            /* 减少元素间距 */
}

.chart-controls .el-radio-group {
  gap: var(--spacing-xs);
}

.phase-status {
  display: flex;
  align-items: center;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 重构的康波周期分析卡片样式 */
.cycles-analysis-card {
  margin-bottom: var(--section-gap-md);
  transition: var(--transition-normal);
}

.cycles-analysis-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.cycles-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.cycles-card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.cycles-card-content {
  display: flex;
  flex-direction: column;
  height: auto;     /* 改为自适应高度，避免多余留白 */
  min-height: 320px;
  padding: 0;  /* 移除内边距 */
}

.cycles-chart-container {
  flex: 1;
  width: 100%;
  min-height: 340px;  /* 进一步增加最小高度，为底部布局留出空间 */
  height: 340px;      /* 增加高度以适应新的底部布局 */
  margin: 0;          /* 移除外边距 */
  padding: 0;         /* 移除内边距 */
}

.cycles-chart {
  width: 100%;
  height: 100%;
}


/* 通用刷新按钮样式 */
.refresh-btn {
  color: var(--text-secondary);
  padding: var(--spacing-xs);
}

.refresh-btn:hover {
  color: var(--finance-blue);
  background-color: var(--surface-bg);
}



/* 响应式优化 */
@media (max-width: 767px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
    margin-bottom: var(--section-gap-xs);
  }


  .chart-controls {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .chart-controls .el-radio-group {
    justify-content: center;
  }

  /* 重构卡片的响应式样式 */
  .cycles-card-content {
    height: auto;
    min-height: 300px;
  }

  .cycles-card-title {
    font-size: var(--text-base);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-md);
    margin-bottom: var(--section-gap-sm);
  }

}

@media (min-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--card-gap-lg);
    margin-bottom: var(--section-gap-lg);
  }

}

@media (min-width: 1600px) {
  .kpi-grid {
    gap: var(--card-gap-xl);
    margin-bottom: var(--section-gap-xl);
  }

}
</style>