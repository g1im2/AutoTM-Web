import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/clients'
import { asArray, pickNumber, pickString } from '../api/normalize'
import type { SectorItem, ConceptItem } from '../api/types'

export const useMarketStore = defineStore('market', () => {
  // 状态
  const topSectors = ref<SectorItem[]>([])
  const topConcepts = ref<ConceptItem[]>([])
  
  // 缓存时间戳
  const sectorsTimestamp = ref(0)
  const conceptsTimestamp = ref(0)
  
  // TTL 配置（毫秒）
  const SECTORS_TTL = 5 * 60 * 1000 // 5分钟
  const CONCEPTS_TTL = 5 * 60 * 1000 // 5分钟
  
  // 加载状态
  const loading = ref({
    sectors: false,
    concepts: false
  })
  
  // Actions
  async function fetchTopSectors(metric = 'momentum', period = '20d', force = false) {
    const now = Date.now()
    if (!force && topSectors.value.length > 0 && (now - sectorsTimestamp.value < SECTORS_TTL)) {
      return topSectors.value
    }

    loading.value.sectors = true
    try {
      const data = await api.getTopSectors(metric, period)
      console.log('Fetched sectors data:', data)
      topSectors.value = asArray<Record<string, unknown>>(data).map((item) => ({
        id: pickString(item.id, item.code) ?? '',
        name: pickString(item.name) ?? '',
        code: pickString(item.code) ?? '',
        change: pickNumber(item.change) ?? 0,
        changeAmount: pickNumber(item.changeAmount, item.change_amount),
        turnover: pickNumber(item.turnover, item.flow),  // 使用flow作为turnover的备选
        flow: pickNumber(item.flow, item.fund_flow, item.turnover),
        momentum: pickNumber(item.momentum, item.change),
        volume: pickNumber(item.volume),
        marketCap: pickNumber(item.marketCap, item.market_cap),
        updatedAt: pickString(item.updatedAt, item.updated_at)
      }))
      console.log('Mapped sectors:', topSectors.value.length, topSectors.value.slice(0, 2))
      sectorsTimestamp.value = now
      return topSectors.value
    } catch (error) {
      console.error('获取热门行业失败:', error)
      // 不要清空已有数据，避免刷新后数据瞬间消失
      return topSectors.value
    } finally {
      loading.value.sectors = false
    }
  }
  
  async function fetchTopConcepts(metric = 'attention', period = '20d', force = false) {
    const now = Date.now()
    if (!force && topConcepts.value.length > 0 && (now - conceptsTimestamp.value < CONCEPTS_TTL)) {
      return topConcepts.value
    }

    loading.value.concepts = true
    try {
      const data = await api.getTopConcepts(metric, period)
      console.log('Fetched concepts data:', data)
      topConcepts.value = asArray<Record<string, unknown>>(data).map((item) => ({
        id: pickString(item.id, item.code) ?? '',
        name: pickString(item.name) ?? '',
        code: pickString(item.code) ?? '',
        change: pickNumber(item.change) ?? 0,
        attention: pickNumber(item.attention, item.flow),
        momentum: pickNumber(item.momentum, item.change),
        flow: pickNumber(item.flow, item.attention),
        turnover: pickNumber(item.turnover, item.flow),
        stockCount: pickNumber(item.stockCount, item.stock_count),
        leadingStocks: (item.leadingStocks ?? item.leading_stocks) as ConceptItem['leadingStocks'],
        updatedAt: pickString(item.updatedAt, item.updated_at)
      }))
      console.log('Mapped concepts:', topConcepts.value.length, topConcepts.value.slice(0, 2))
      conceptsTimestamp.value = now
      return topConcepts.value
    } catch (error) {
      console.error('获取热门概念失败:', error)
      // 不要清空已有数据，避免刷新后数据瞬间消失
      return topConcepts.value
    } finally {
      loading.value.concepts = false
    }
  }
  
  // 刷新所有数据
  async function refreshAll() {
    await Promise.all([
      fetchTopSectors('momentum', '20d', true),
      fetchTopConcepts('attention', '20d', true)
    ])
  }
  
  return {
    // State
    topSectors,
    topConcepts,
    loading,
    
    // Actions
    fetchTopSectors,
    fetchTopConcepts,
    refreshAll
  }
})
