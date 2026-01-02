import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/clients'
import { asArray, asRecord, pickNumber, pickString } from '../api/normalize'
import type { PortfolioOverview, PositionSlice, PositionDetail, RebalanceSuggestion, RebalanceHistory, PerformanceData } from '../api/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  // 状态
  const portfolios = ref<PortfolioOverview[]>([])
  const currentPortfolio = ref<PortfolioOverview | null>(null)
  const positions = ref<PositionDetail[]>([])
  const rebalanceSuggestions = ref<RebalanceSuggestion[]>([])
  const rebalanceHistory = ref<RebalanceHistory[]>([])
  const performanceData = ref<PerformanceData[]>([])

  // 缓存时间戳
  const portfoliosTimestamp = ref(0)
  const summaryTimestamp = ref(0)
  const performanceTimestamp = ref(0)
  const suggestionsTimestamp = ref(0)
  const historyTimestamp = ref(0)

  // TTL 配置（毫秒）
  const PORTFOLIOS_TTL = 5 * 60 * 1000 // 5分钟
  const SUMMARY_TTL = 5 * 60 * 1000 // 5分钟
  const PERFORMANCE_TTL = 5 * 60 * 1000 // 5分钟
  const SUGGESTIONS_TTL = 10 * 60 * 1000 // 10分钟
  const HISTORY_TTL = 10 * 60 * 1000 // 10分钟

  // 加载状态
  const loading = ref({
    portfolios: false,
    summary: false,
    performance: false,
    suggestions: false,
    history: false,
    positions: false
  })
  
  // Actions
  async function fetchPortfolios(force = false) {
    const now = Date.now()
    if (!force && portfolios.value.length > 0 && (now - portfoliosTimestamp.value < PORTFOLIOS_TTL)) {
      return portfolios.value
    }
    
    loading.value.portfolios = true
    try {
      const data = await api.getPortfolios()
      portfolios.value = asArray<Record<string, unknown>>(data).map((item) => ({
        id: pickString(item.id) ?? '',
        name: pickString(item.name) ?? '',
        code: pickString(item.code) ?? '',
        totalValue: pickNumber(item.totalValue, item.total_value) ?? 0,
        cashValue: pickNumber(item.cashValue, item.cash_value),
        positionValue: pickNumber(item.positionValue, item.position_value),
        totalReturn: pickNumber(item.totalReturn, item.total_return, item['return']) ?? 0,
        annualizedReturn: pickNumber(item.annualizedReturn, item.annualized_return),
        volatility: pickNumber(item.volatility, item.risk),
        sharpe: pickNumber(item.sharpe),
        maxDrawdown: pickNumber(item.maxDrawdown, item.max_drawdown),
        positionCount: pickNumber(item.positionCount, item.position_count, item.positions),
        updatedAt: pickString(item.updatedAt, item.updated_at) ?? new Date().toISOString()
      }))
      portfoliosTimestamp.value = now
      return portfolios.value
    } catch (error) {
      console.warn('获取组合列表失败:', error)
      // 降级数据
      portfolios.value = [
        {
          id: 'PF001',
          name: '稳健配置组合',
          code: 'STABLE-001',
          totalValue: 1000000,
          totalReturn: 12.5,
          annualizedReturn: 15.2,
          volatility: 8.5,
          sharpe: 1.35,
          maxDrawdown: 6.8,
          positionCount: 15,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'PF002',
          name: '成长型组合',
          code: 'GROWTH-001',
          totalValue: 500000,
          totalReturn: 18.7,
          annualizedReturn: 22.3,
          volatility: 15.2,
          sharpe: 1.12,
          maxDrawdown: 12.5,
          positionCount: 20,
          updatedAt: new Date().toISOString()
        }
      ]
      return portfolios.value
    } finally {
      loading.value.portfolios = false
    }
  }
  
  async function fetchPortfolioSummary(id: string, force = false) {
    const now = Date.now()
    if (!force && currentPortfolio.value?.id === id && (now - summaryTimestamp.value < SUMMARY_TTL)) {
      return currentPortfolio.value
    }
    
    loading.value.summary = true
    try {
      // TODO: 需与后端确认端点 /api/v1/portfolio/{id}/summary
      const data = await api.getPortfolioSummary(id)
      const record = asRecord(data)
      if (record) {
        currentPortfolio.value = {
          id: pickString(record.id) ?? id,
          name: pickString(record.name) ?? '',
          code: pickString(record.code) ?? '',
          totalValue: pickNumber(record.totalValue, record.total_value) ?? 0,
          cashValue: pickNumber(record.cashValue, record.cash_value),
          positionValue: pickNumber(record.positionValue, record.position_value),
          totalReturn: pickNumber(record.totalReturn, record.total_return, record['return']) ?? 0,
          annualizedReturn: pickNumber(record.annualizedReturn, record.annualized_return),
          volatility: pickNumber(record.volatility, record.risk),
          sharpe: pickNumber(record.sharpe),
          maxDrawdown: pickNumber(record.maxDrawdown, record.max_drawdown),
          positionCount: pickNumber(record.positionCount, record.position_count),
          updatedAt: pickString(record.updatedAt, record.updated_at) ?? new Date().toISOString()
        }

        // 提取持仓数据
        const positionsData = asArray<Record<string, unknown>>(record.positions)
        if (positionsData.length > 0) {
          positions.value = positionsData.map((pos) => ({
            symbol: pickString(pos.symbol, pos.code) ?? '',
            name: pickString(pos.name) ?? '',
            value: pickNumber(pos.value, pos.market_value) ?? 0,
            weight: pickNumber(pos.weight) ?? 0,
            shares: pickNumber(pos.shares, pos.quantity),
            cost: pickNumber(pos.cost, pos.cost_price),
            currentPrice: pickNumber(pos.currentPrice, pos.current_price, pos.price),
            pnl: pickNumber(pos.pnl, pos.profit),
            pnlPercent: pickNumber(pos.pnlPercent, pos.pnl_percent, pos.profit_percent)
          }))
        }
      }
      
      summaryTimestamp.value = now
      return currentPortfolio.value
    } catch (error) {
      console.warn('获取组合概览失败:', error)
      // 降级数据
      currentPortfolio.value = {
        id,
        name: '示例组合',
        code: 'DEMO-001',
        totalValue: 1000000,
        totalReturn: 12.5,
        annualizedReturn: 15.2,
        volatility: 8.5,
        sharpe: 1.35,
        positionCount: 10,
        updatedAt: new Date().toISOString()
      }
      positions.value = [
        { symbol: '600519', name: '贵州茅台', value: 200000, weight: 20, pnl: 15000, pnlPercent: 8.1 },
        { symbol: '000858', name: '五粮液', value: 150000, weight: 15, pnl: 8000, pnlPercent: 5.6 },
        { symbol: '300750', name: '宁德时代', value: 180000, weight: 18, pnl: 12000, pnlPercent: 7.1 }
      ]
      return currentPortfolio.value
    } finally {
      loading.value.summary = false
    }
  }
  
  async function fetchPerformanceReturns(id: string, window = '30d', force = false) {
    const now = Date.now()
    if (!force && performanceData.value.length > 0 && (now - performanceTimestamp.value < PERFORMANCE_TTL)) {
      return performanceData.value
    }
    
    loading.value.performance = true
    try {
      // TODO: 需与后端确认端点 /api/v1/portfolio/{id}/performance/returns
      const data = await api.getPortfolioReturns(id, window)
      performanceData.value = asArray<Record<string, unknown>>(data).map((item) => ({
        date: pickString(item.date, item.timestamp) ?? '',
        value: pickNumber(item.value, item['return'], item.cumulative_return) ?? 0
      }))
      performanceTimestamp.value = now
      return performanceData.value
    } catch (error) {
      console.warn('获取组合收益曲线失败:', error)
      // 降级数据：生成30天模拟数据
      const mockData = []
      const now = new Date()
      let cumReturn = 100
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        cumReturn += (Math.random() - 0.4) * 2
        mockData.push({
          date: date.toISOString().split('T')[0]!,
          value: cumReturn
        })
      }
      performanceData.value = mockData
      return performanceData.value
    } finally {
      loading.value.performance = false
    }
  }
  
  async function fetchRebalanceHistory(id: string, limit = 20, force = false) {
    const now = Date.now()
    if (!force && rebalanceHistory.value.length > 0 && (now - historyTimestamp.value < HISTORY_TTL)) {
      return rebalanceHistory.value
    }

    loading.value.history = true
    try {
      // TODO: 需与后端确认端点 /api/v1/portfolio/{id}/rebalance/history
      const data = await api.getRebalanceHistory(id, limit)
      rebalanceHistory.value = asArray<Record<string, unknown>>(data).map((item) => ({
        id: pickString(item.id) ?? '',
        portfolioId: pickString(item.portfolioId, item.portfolio_id) ?? id,
        executedAt: pickString(item.executedAt, item.executed_at, item.timestamp) ?? '',
        reason: pickString(item.reason) ?? '定期调仓',
        status: (pickString(item.status) ?? 'EXECUTED') as RebalanceHistory['status'],
        changes: asArray<RebalanceHistory['changes'][number]>(item.changes),
        performance: item.performance as RebalanceHistory['performance'],
        notes: pickString(item.notes)
      }))
      historyTimestamp.value = now
      return rebalanceHistory.value
    } catch (error) {
      console.warn('获取调仓历史失败:', error)
      // 降级数据
      const mockHistory: RebalanceHistory[] = [
        {
          id: 'RB001',
          portfolioId: id,
          executedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reason: '市场风格切换，增加成长股配置',
          status: 'EXECUTED',
          changes: [
            { symbol: '300750', name: '宁德时代', action: 'BUY', fromWeight: 10, toWeight: 15, shares: 100, price: 180.5, amount: 18050 },
            { symbol: '600519', name: '贵州茅台', action: 'SELL', fromWeight: 25, toWeight: 20, shares: 50, price: 1800, amount: 90000 }
          ],
          performance: { beforeValue: 1000000, afterValue: 1025000, impact: 2.5 }
        },
        {
          id: 'RB002',
          portfolioId: id,
          executedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          reason: '定期再平衡，恢复目标权重',
          status: 'EXECUTED',
          changes: [
            { symbol: '000858', name: '五粮液', action: 'ADJUST', fromWeight: 18, toWeight: 15, shares: 30, price: 150, amount: 4500 }
          ],
          performance: { beforeValue: 980000, afterValue: 995000, impact: 1.5 }
        }
      ]
      rebalanceHistory.value = mockHistory
      return rebalanceHistory.value
    } finally {
      loading.value.history = false
    }
  }

  async function fetchRebalanceSuggestions(id: string, force = false) {
    const now = Date.now()
    if (!force && rebalanceSuggestions.value.length > 0 && (now - suggestionsTimestamp.value < SUGGESTIONS_TTL)) {
      return rebalanceSuggestions.value
    }

    loading.value.suggestions = true
    try {
      // TODO: 需与后端确认端点 /api/v1/portfolio/{id}/rebalance/suggestions
      const data = await api.getRebalanceSuggestions(id)
      const record = asRecord(data)
      const suggestions = Array.isArray(data) ? data : record?.suggestions
      rebalanceSuggestions.value = asArray<RebalanceSuggestion>(suggestions)
      suggestionsTimestamp.value = now
      return rebalanceSuggestions.value
    } catch (error) {
      console.warn('获取调仓建议失败:', error)
      // 降级数据
      rebalanceSuggestions.value = [
        {
          id: 'SUG001',
          portfolioId: id,
          portfolioName: '示例组合',
          reason: '当前市场环境下，建议增加科技股配置，降低传统行业权重',
          targetPositions: [
            { symbol: '300750', name: '宁德时代', targetWeight: 18, currentWeight: 15, action: 'BUY' },
            { symbol: '600519', name: '贵州茅台', targetWeight: 18, currentWeight: 20, action: 'SELL' }
          ],
          expectedReturn: 2.5,
          expectedRisk: 0.3,
          confidence: 0.85,
          createdAt: new Date().toISOString()
        }
      ]
      return rebalanceSuggestions.value
    } finally {
      loading.value.suggestions = false
    }
  }

  // 刷新所有数据
  async function refreshAll() {
    await fetchPortfolios(true)
  }

  return {
    // State
    portfolios,
    currentPortfolio,
    positions,
    rebalanceSuggestions,
    rebalanceHistory,
    performanceData,
    loading,

    // Actions
    fetchPortfolios,
    fetchPortfolioSummary,
    fetchPerformanceReturns,
    fetchRebalanceHistory,
    fetchRebalanceSuggestions,
    refreshAll
  }
})
