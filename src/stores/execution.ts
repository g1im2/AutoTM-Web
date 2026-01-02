import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/clients'
import { asArray, pickNumber, pickString } from '../api/normalize'
import type { TopStock, PoolStatus, AnalysisSignal } from '../api/types'

export const useExecutionStore = defineStore('execution', () => {
  // 状态
  const topStocks = ref<TopStock[]>([])
  const activePools = ref<PoolStatus[]>([])
  const latestSignals = ref<AnalysisSignal[]>([])
  
  // 缓存时间戳
  const stocksTimestamp = ref(0)
  const poolsTimestamp = ref(0)
  const signalsTimestamp = ref(0)
  
  // TTL 配置（毫秒）
  const STOCKS_TTL = 5 * 60 * 1000 // 5分钟
  const POOLS_TTL = 5 * 60 * 1000 // 5分钟
  const SIGNALS_TTL = 1 * 60 * 1000 // 1分钟
  
  // 加载状态
  const loading = ref({
    stocks: false,
    pools: false,
    signals: false
  })
  
  // Actions
  async function fetchTopStocks(limit = 20, force = false) {
    const now = Date.now()
    if (!force && topStocks.value.length > 0 && (now - stocksTimestamp.value < STOCKS_TTL)) {
      return topStocks.value
    }
    
    loading.value.stocks = true
    try {
      // TODO: 需与后端确认端点 /api/v1/analyze/screener/top
      const data = await api.getTopStocks(limit)
      topStocks.value = asArray<Record<string, unknown>>(data).map((item, index: number) => ({
        symbol: pickString(item.symbol, item.code) ?? '',
        name: pickString(item.name) ?? '',
        score: pickNumber(item.score) ?? 0,
        price: pickNumber(item.price) ?? 0,
        change: pickNumber(item.change) ?? 0,
        factors: item.factors as TopStock['factors'],
        signalStrength: pickNumber(item.signalStrength, item.signal_strength),
        backtestReturn: pickNumber(item.backtestReturn, item.backtest_return),
        rank: pickNumber(item.rank) ?? index + 1,
        sector: pickString(item.sector, item.industry),
        updatedAt: pickString(item.updatedAt, item.updated_at)
      }))
      stocksTimestamp.value = now
      return topStocks.value
    } catch (error) {
      console.error('获取优质股票失败:', error)
      // 保留上次数据，避免刷新时闪断清空
      return topStocks.value
    } finally {
      loading.value.stocks = false
    }
  }
  
  async function fetchActivePools(force = false) {
    const now = Date.now()
    if (!force && activePools.value.length > 0 && (now - poolsTimestamp.value < POOLS_TTL)) {
      return activePools.value
    }
    
    loading.value.pools = true
    try {
      // TODO: 需与后端确认端点 /api/v1/quantum/pools/active
      const data = await api.getActivePools()
      activePools.value = asArray<Record<string, unknown>>(data).map((item) => ({
        poolId: pickString(item.poolId, item.pool_id, item.id) ?? '',
        poolName: pickString(item.poolName, item.pool_name, item.name) ?? '',
        stockCount: pickNumber(item.stockCount, item.stock_count) ?? 0,
        activeCount: pickNumber(item.activeCount, item.active_count),
        inCount: pickNumber(item.inCount, item.in_count),
        outCount: pickNumber(item.outCount, item.out_count),
        avgScore: pickNumber(item.avgScore, item.avg_score),
        strategy: pickString(item.strategy),
        updatedAt: pickString(item.updatedAt, item.updated_at)
      }))
      poolsTimestamp.value = now
      return activePools.value
    } catch (error) {
      console.error('获取股票池状态失败:', error)
      return activePools.value
    } finally {
      loading.value.pools = false
    }
  }
  
  async function fetchLatestSignals(symbols?: string, force = false) {
    const now = Date.now()
    if (!force && latestSignals.value.length > 0 && (now - signalsTimestamp.value < SIGNALS_TTL)) {
      return latestSignals.value
    }
    
    loading.value.signals = true
    try {
      // TODO: 需与后端确认端点 /api/v1/analyze/signal/latest
      const data = await api.getLatestSignals(symbols)
      latestSignals.value = asArray<Record<string, unknown>>(data).map((item) => ({
        symbol: pickString(item.symbol, item.code) ?? '',
        signalType: (pickString(item.signalType, item.signal_type) ?? 'HOLD') as AnalysisSignal['signalType'],
        strength: pickNumber(item.strength) ?? 0,
        factors: (item.factors ?? {}) as AnalysisSignal['factors'],
        timestamp: pickString(item.timestamp, item.ts) ?? new Date().toISOString()
      }))
      signalsTimestamp.value = now
      return latestSignals.value
    } catch (error) {
      console.error('获取最新信号失败:', error)
      return latestSignals.value
    } finally {
      loading.value.signals = false
    }
  }
  
  // 刷新所有数据
  async function refreshAll() {
    await Promise.all([
      fetchTopStocks(20, true),
      fetchActivePools(true)
    ])
  }
  
  return {
    // State
    topStocks,
    activePools,
    latestSignals,
    loading,
    
    // Actions
    fetchTopStocks,
    fetchActivePools,
    fetchLatestSignals,
    refreshAll
  }
})
