// Common API response wrappers and domain types

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageMeta {
  page: number
  size: number
  total: number
}

export interface PageResponse<T> extends ApiResponse<{ list: T[]; meta: PageMeta }> {}

// Macro
export interface MacroIndicator {
  name: string
  category: string
  categoryName: string
  value: string
  change: number
  unit: string
  updateTime: string
  source: string
}

// Portfolio
export interface PortfolioSummary {
  id: string
  name: string
  value: number
  pnl: number
  positions: number
  updatedAt: string
}

// Execution
export interface OrderItem {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  qty: number
  price?: number
  status: 'NEW' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  ts: string
}

// Flowhub Tasks
export interface FlowTask {
  id: string
  name: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  createdAt: string
  updatedAt: string
}

// Monitoring
export interface ServiceHealth {
  name: string
  status: 'UP' | 'DOWN' | 'DEGRADED'
  latencyMs: number
  lastCheck: string
}

// System
export interface ServiceInfo {
  id: string
  name: string
  version: string
  status: 'RUNNING' | 'STOPPED' | 'ERROR'
}

// Market - Sectors & Concepts
export interface SectorItem {
  id: string
  name: string
  code: string
  change: number // 涨跌幅 (%)
  changeAmount?: number // 涨跌额
  turnover?: number // 成交额
  flow?: number // 资金流向 (亿元)
  momentum?: number // 动量指标
  volume?: number // 成交量
  marketCap?: number // 市值
  updatedAt?: string
}

export interface ConceptItem {
  id: string
  name: string
  code: string
  change: number
  attention?: number // 市场关注度
  momentum?: number
  stockCount?: number // 成分股数量
  leadingStocks?: string[] // 龙头股代码
  updatedAt?: string
}

// Execution - Top Stocks & Analysis
export interface TopStock {
  symbol: string
  name: string
  score: number // 综合评分
  price: number
  change: number
  factors?: Record<string, number> // 因子得分 {momentum: 0.85, value: 0.72, ...}
  signalStrength?: number // 信号强度 0-1
  backtestReturn?: number // 回测收益率
  rank?: number
  sector?: string
  updatedAt?: string
}

export interface PoolStatus {
  poolId: string
  poolName: string
  stockCount: number
  activeCount?: number
  inCount?: number // 新入池数量
  outCount?: number // 出池数量
  avgScore?: number
  strategy?: string
  updatedAt?: string
}

export interface AnalysisSignal {
  symbol: string
  signalType: 'BUY' | 'SELL' | 'HOLD'
  strength: number // 0-1
  factors: Record<string, number>
  timestamp: string
}

// Portfolio - Overview & Positions
export interface PortfolioOverview {
  id: string
  name: string
  code: string
  totalValue: number
  cashValue?: number
  positionValue?: number
  totalReturn: number // 总收益率 (%)
  annualizedReturn?: number // 年化收益率
  volatility?: number // 波动率
  sharpe?: number // 夏普比率
  maxDrawdown?: number // 最大回撤
  positionCount?: number
  updatedAt: string
}

export interface PositionSlice {
  symbol: string
  name: string
  value: number // 持仓市值
  weight: number // 权重 (%)
  shares?: number
  cost?: number
  currentPrice?: number
  pnl?: number // 盈亏
  pnlPercent?: number // 盈亏比例
}

// Portfolio - 详细持仓信息
export interface PositionDetail extends PositionSlice {
  sector?: string // 所属行业
  avgCost?: number // 平均成本
  totalCost?: number // 总成本
  marketValue?: number // 市值
  unrealizedPnl?: number // 未实现盈亏
  realizedPnl?: number // 已实现盈亏
  dayChange?: number // 当日涨跌
  dayChangePercent?: number // 当日涨跌幅
  updatedAt?: string
}

// Portfolio - 历史调仓记录
export interface RebalanceHistory {
  id: string
  portfolioId: string
  executedAt: string // 执行时间
  reason: string // 调仓原因
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
  changes: Array<{
    symbol: string
    name: string
    action: 'BUY' | 'SELL' | 'ADJUST'
    fromWeight: number
    toWeight: number
    shares?: number
    price?: number
    amount?: number
  }>
  performance?: {
    beforeValue: number
    afterValue: number
    impact: number // 影响 (%)
  }
  notes?: string
}

// Portfolio - 绩效数据
export interface PerformanceData {
  date: string
  portfolioReturn: number // 组合收益率
  benchmarkReturn?: number // 基准收益率
  drawdown?: number // 回撤
  value?: number // 组合净值
}

export interface RebalanceSuggestion {
  id: string
  portfolioId: string
  portfolioName?: string
  reason: string // 调仓原因
  targetPositions: Array<{
    symbol: string
    name: string
    targetWeight: number
    currentWeight: number
    action: 'BUY' | 'SELL' | 'HOLD'
    shares?: number
  }>
  expectedReturn?: number
  expectedRisk?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED'
  createdAt: string
  executedAt?: string
}

// Macro - Cycle & Indicators
export interface CyclePosition {
  position: number // 0-100 周期位置
  phase: 'RECOVERY' | 'EXPANSION' | 'SLOWDOWN' | 'RECESSION' // 周期阶段
  phaseName?: string
  trend: 'UP' | 'DOWN' | 'FLAT' // 中期趋势
  confidence?: number // 置信度
  updatedAt?: string
}

export interface MacroIndicatorSnapshot {
  key: string // GDP, CPI, PMI, RATE
  name: string
  value: number
  unit: string
  change?: number // 环比变化
  trend?: Array<{ date: string; value: number }> // 迷你趋势数据
  updatedAt?: string
}

export interface MarketSummary {
  totalTurnoverBillion: number // 总成交额 (亿元)
  diffBillion?: number // 较前一日变化
  upCount?: number
  downCount?: number
  flatCount?: number
  indexQuotes?: Array<{
    code: string
    name: string
    price: number
    change: number
    changePercent: number
  }>
  updatedAt?: string
}
