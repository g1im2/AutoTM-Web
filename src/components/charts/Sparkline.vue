<template>
  <div class="sparkline-container">
    <v-chart class="sparkline" :option="option" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

interface Point { date: string; value: number }

interface Props {
  data: Point[]
  color?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#409EFF',
  height: '90px'
})

const option = computed(() => ({
  backgroundColor: 'transparent',
  grid: { left: 0, right: 0, top: 6, bottom: 6 },
  xAxis: {
    type: 'category',
    data: props.data.map(d => d.date),
    boundaryGap: false,
    show: false
  },
  yAxis: { type: 'value', show: false },
  tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'none' } },
  series: [{
    type: 'line',
    data: props.data.map(d => d.value),
    smooth: true,
    showSymbol: false,
    lineStyle: { color: props.color, width: 2 },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [ { offset: 0, color: props.color + '33' }, { offset: 1, color: props.color + '00' } ]
      }
    }
  }]
}))
</script>

<style scoped>
.sparkline-container { width: 100%; height: v-bind(height); }
.sparkline { width: 100%; height: 100%; }
</style>

