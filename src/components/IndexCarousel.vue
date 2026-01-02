<template>
  <div class="index-carousel">
    <el-carousel :interval="interval" height="88px" indicator-position="none" arrow="never">
      <el-carousel-item v-for="(item, idx) in items" :key="idx">
        <div class="index-item vertical" :class="{ up: item.change >= 0, down: item.change < 0 }">
          <div class="primary">
            <div class="name">{{ item.name }}</div>
            <div class="price">{{ formatNumber(item.price) }}</div>
          </div>
          <div class="secondary">
            <div class="code">{{ item.code }}</div>
            <div class="change">
              <el-icon v-if="item.change >= 0"><CaretTop /></el-icon>
              <el-icon v-else><CaretBottom /></el-icon>
              <span>{{ Math.abs(item.change).toFixed(2) }}%</span>
            </div>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CaretTop, CaretBottom } from '@element-plus/icons-vue'

interface IndexQuote { name: string; code: string; price: number; change: number }

interface Props {
  data: IndexQuote[]
  icon?: any
  interval?: number
}

const props = withDefaults(defineProps<Props>(), {
  interval: 2500
})

const items = computed(() => props.data || [])

function formatNumber(val: number) {
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}
</script>

<style scoped>
.index-carousel { width: 100%; }
.index-item.vertical { display:flex; flex-direction:column; justify-content:center; height:88px; padding:4px 6px; gap:6px; }
.primary{ display:flex; align-items:baseline; justify-content:space-between; }
.primary .name{ font-weight:600; color:var(--text-primary); font-size:18px; }
.primary .price{ font-size:20px; font-weight:700; line-height:1.1; }
.secondary{ display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--text-secondary); }
.secondary .change{ display:flex; align-items:center; gap:4px; }
.up .primary .price, .up .secondary .change{ color:var(--success-color); }
.down .primary .price, .down .secondary .change{ color:var(--danger-color); }
</style>

