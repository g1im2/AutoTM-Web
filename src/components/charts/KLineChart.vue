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
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart, LineChart } from 'echarts/charts'
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
  CandlestickChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
])

interface KLineData {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume?: number
}

interface Props {
  title?: string
  data: KLineData[]
  height?: string
  showVolume?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'K线图',
  height: '400px',
  showVolume: false
})

const loading = ref(false)

const chartOption = computed(() => {
  const dates = props.data.map(item => item.date)
  const klineData = props.data.map(item => [item.open, item.close, item.low, item.high])
  const volumeData = props.data.map(item => item.volume || 0)

  return {
    title: {
      text: props.title,
      textStyle: {
        color: '#303133',
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: '#409EFF',
      textStyle: {
        color: '#fff'
      },
      formatter: function (params: any) {
        const data = params[0]
        const values = data.data
        return `
          ${data.name}<br/>
          开盘: ${values[0]}<br/>
          收盘: ${values[1]}<br/>
          最低: ${values[2]}<br/>
          最高: ${values[3]}
        `
      }
    },
    legend: {
      data: ['K线', '成交量'],
      textStyle: {
        color: '#606266'
      }
    },
    grid: props.showVolume ? [
      {
        left: '3%',
        right: '4%',
        height: '60%'
      },
      {
        left: '3%',
        right: '4%',
        top: '75%',
        height: '20%'
      }
    ] : {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: props.showVolume ? [
      {
        type: 'category',
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        splitNumber: 20,
        min: 'dataMin',
        max: 'dataMax'
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        splitNumber: 20,
        min: 'dataMin',
        max: 'dataMax'
      }
    ] : {
      type: 'category',
      data: dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      splitNumber: 20,
      min: 'dataMin',
      max: 'dataMax'
    },
    yAxis: props.showVolume ? [
      {
        scale: true,
        splitArea: {
          show: true
        }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      }
    ] : {
      scale: true,
      splitArea: {
        show: true
      }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: props.showVolume ? [0, 1] : 0,
        start: 80,
        end: 100
      },
      {
        show: true,
        xAxisIndex: props.showVolume ? [0, 1] : 0,
        type: 'slider',
        top: '90%',
        start: 80,
        end: 100
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: klineData,
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143'
        }
      },
      ...(props.showVolume ? [{
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
        itemStyle: {
          color: '#7fbe9e'
        }
      }] : [])
    ]
  }
})
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
