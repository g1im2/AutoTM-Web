import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/clients'
import { asArray, asRecord, pickNumber, pickString } from '../api/normalize'
import type { CyclePosition, MacroIndicatorSnapshot, MarketSummary } from '../api/types'

export const useMacroStore = defineStore('macro', () => {
  // 状态
  const cyclePosition = ref<CyclePosition | null>(null)
  const indicators = ref<MacroIndicatorSnapshot[]>([])
  const marketSummary = ref<MarketSummary | null>(null)
  type IndexQuote = NonNullable<MarketSummary['indexQuotes']>[number]
  const indexQuotes = ref<IndexQuote[]>([])
  
  // 缓存时间戳
  const cycleTimestamp = ref(0)
  const indicatorsTimestamp = ref(0)
  const summaryTimestamp = ref(0)
  const quotesTimestamp = ref(0)
  
  // TTL 配置（毫秒）
  const CYCLE_TTL = 10 * 60 * 1000 // 10分钟
  const INDICATORS_TTL = 10 * 60 * 1000 // 10分钟
  const SUMMARY_TTL = 5 * 60 * 1000 // 5分钟
  const QUOTES_TTL = 1 * 60 * 1000 // 1分钟
  
  // 加载状态
  const loading = ref({
    cycle: false,
    indicators: false,
    summary: false,
    quotes: false
  })
  
  // Actions
  async function fetchCyclePosition(force = false) {
    const now = Date.now()
    if (!force && cyclePosition.value && (now - cycleTimestamp.value < CYCLE_TTL)) {
      return cyclePosition.value
    }

    loading.value.cycle = true
    try {
      const data = await api.getMacroCyclePosition()
      const record = asRecord(data)
      if (record) {
        // API返回的数据结构: { cycle_position: { current_phase, phase_completion, confidence_score, historical_position } }
        const cycleData = asRecord(record.cycle_position) ?? record
        const historicalPos = asRecord(cycleData.historical_position) ?? {}

        // 将康波周期位置转换为0-100的百分比
        const kondratieffPosition = pickNumber(historicalPos.kondratieff_position) ?? 0
        const position = Math.round(kondratieffPosition * 100)

        cyclePosition.value = {
          position: position,
          phase: (pickString(cycleData.current_phase, cycleData.phase) ?? 'EXPANSION') as CyclePosition['phase'],
          phaseName: pickString(cycleData.kondratieff_phase, historicalPos.kondratieff_phase, cycleData.phase_name),
          trend: (pickString(cycleData.trend) ?? 'FLAT') as CyclePosition['trend'],
          confidence: pickNumber(cycleData.confidence_score, cycleData.confidence),
          updatedAt: pickString(cycleData.update_time, cycleData.updated_at) ?? new Date().toISOString()
        }
      }
      cycleTimestamp.value = now
      return cyclePosition.value
    } catch (error) {
      console.error('获取周期位置失败:', error)
      // 返回空数据而不是Mock数据
      cyclePosition.value = null
      return null
    } finally {
      loading.value.cycle = false
    }
  }
  
  async function fetchIndicators(keys?: string, force = false) {
    const now = Date.now()
    if (!force && indicators.value.length > 0 && (now - indicatorsTimestamp.value < INDICATORS_TTL)) {
      return indicators.value
    }
    
    loading.value.indicators = true
    try {
      const data = await api.getMacroIndicators(keys)
      // 兼容数组或对象响应
      if (Array.isArray(data)) {
        indicators.value = asArray<Record<string, unknown>>(data).map((item) => ({
          key: pickString(item.key, item.code) ?? '',
          name: pickString(item.name) ?? '',
          value: pickNumber(item.value) ?? 0,
          unit: pickString(item.unit) ?? '',
          change: pickNumber(item.change),
          trend: Array.isArray(item.trend) ? (item.trend as MacroIndicatorSnapshot['trend']) : undefined,
          updatedAt: pickString(item.updatedAt, item.updated_at)
        }))
      } else {
        const record = asRecord(data)
        if (record) {
          // 如果返回的是对象形式 {GDP: {...}, CPI: {...}}
          indicators.value = Object.entries(record).map(([key, val]) => {
            const item = asRecord(val) ?? {}
            return {
              key: pickString(item.key, item.code) ?? key,
              name: pickString(item.name) ?? key,
              value: pickNumber(item.value) ?? 0,
              unit: pickString(item.unit) ?? '',
              change: pickNumber(item.change),
              trend: Array.isArray(item.trend) ? (item.trend as MacroIndicatorSnapshot['trend']) : undefined,
              updatedAt: pickString(item.updatedAt, item.updated_at)
            }
          })
        }
      }
      indicatorsTimestamp.value = now
      return indicators.value
    } catch (error) {
      console.error('获取宏观指标失败:', error)
      // 返回空数据而不是Mock数据
      indicators.value = []
      return []
    } finally {
      loading.value.indicators = false
    }
  }
  
  async function fetchMarketSummary(force = false) {
    const now = Date.now()
    if (!force && marketSummary.value && (now - summaryTimestamp.value < SUMMARY_TTL)) {
      return marketSummary.value
    }

    loading.value.summary = true
    try {
      const data = await api.getMarketSummary()
      console.log('fetchMarketSummary API data:', data)
      const record = asRecord(data)
      if (record) {
        const quotes = asArray<Record<string, unknown>>(record.index_quotes ?? record.indexQuotes).map((item) => ({
          code: pickString(item.code) ?? '',
          name: pickString(item.name) ?? '',
          price: pickNumber(item.price) ?? 0,
          change: pickNumber(item.change) ?? 0,
          changePercent: pickNumber(item.changePercent, item.change_percent) ?? 0
        }))
        marketSummary.value = {
          totalTurnoverBillion: pickNumber(record.total_turnover_billion, record.totalTurnoverBillion) ?? 0,
          diffBillion: pickNumber(record.diff_billion, record.diffBillion) ?? 0,
          upCount: pickNumber(record.up_count, record.upCount) ?? 0,
          downCount: pickNumber(record.down_count, record.downCount) ?? 0,
          flatCount: pickNumber(record.flat_count, record.flatCount) ?? 0,
          indexQuotes: quotes.length ? quotes : undefined,
          updatedAt: pickString(record.updatedAt, record.updated_at) ?? new Date().toISOString()
        }
      }
      console.log('fetchMarketSummary mapped:', marketSummary.value)
      summaryTimestamp.value = now
      return marketSummary.value
    } catch (error) {
      console.error('获取市场概览失败:', error)
      // 返回空数据而不是Mock数据
      marketSummary.value = null
      return null
    } finally {
      loading.value.summary = false
    }
  }
  
  async function fetchIndexQuotes(codes: string, force = false) {
    const now = Date.now()
    if (!force && indexQuotes.value.length > 0 && (now - quotesTimestamp.value < QUOTES_TTL)) {
      return indexQuotes.value
    }
    
    loading.value.quotes = true
    try {
      const data = await api.getIndexQuotes(codes)
      indexQuotes.value = asArray<IndexQuote>(data)
      quotesTimestamp.value = now
      return indexQuotes.value
    } catch (error) {
      console.error('获取指数行情失败:', error)
      // 返回空数据而不是Mock数据
      indexQuotes.value = []
      return []
    } finally {
      loading.value.quotes = false
    }
  }
  
  // 刷新所有数据
  async function refreshAll() {
    await Promise.all([
      fetchCyclePosition(true),
      fetchIndicators(undefined, true),
      fetchMarketSummary(true)
    ])
  }
  
  return {
    // State
    cyclePosition,
    indicators,
    marketSummary,
    indexQuotes,
    loading,
    
    // Actions
    fetchCyclePosition,
    fetchIndicators,
    fetchMarketSummary,
    fetchIndexQuotes,
    refreshAll
  }
})
