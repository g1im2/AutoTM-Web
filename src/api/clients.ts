import axios from 'axios'

const env = import.meta.env
const runtimeConfig = window.__APP_CONFIG__ || {}

function getBaseUrl(key: string, fallback?: string) {
  return runtimeConfig[key] || env[`VITE_${key}`] || fallback || ''
}

function parseBoolean(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase())
  }
  return false
}

const gatewayFallback = env.VITE_API_GATEWAY || runtimeConfig.API_GATEWAY || ''
const USE_MOCK = parseBoolean(runtimeConfig.USE_MOCK ?? env.VITE_USE_MOCK)

const BRAIN_BASE = getBaseUrl('API_BRAIN', gatewayFallback)
const MACRO_BASE = BRAIN_BASE
const PORTFOLIO_BASE = BRAIN_BASE
const EXECUTION_BASE = BRAIN_BASE
const FLOWHUB_BASE = BRAIN_BASE

export const brainApi = axios.create({ baseURL: BRAIN_BASE })
export const macroApi = axios.create({ baseURL: MACRO_BASE })
export const portfolioApi = axios.create({ baseURL: PORTFOLIO_BASE })
export const executionApi = axios.create({ baseURL: EXECUTION_BASE })
export const flowhubApi = axios.create({ baseURL: FLOWHUB_BASE })
export const monitoringApi = axios.create({ baseURL: BRAIN_BASE })
export const systemApi = axios.create({ baseURL: BRAIN_BASE })

// 统一拦截器（错误处理 / 鉴权 Token / 超时）
import type { AxiosInstance, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

function attachInterceptors(instance: AxiosInstance) {
  instance.defaults.timeout = 45000

  instance.interceptors.request.use((config) => {
    if (USE_MOCK) {
      const mockError = new Error('MOCK_MODE') as Error & { isMock?: boolean }
      mockError.isMock = true
      return Promise.reject(mockError)
    }
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (resp) => resp,
    (error: AxiosError & { isMock?: boolean }) => {
      if (error?.isMock) {
        return Promise.reject(error)
      }
      const status = error.response?.status
      const msg =
        (error.response?.data as any)?.message ||
        error.message ||
        '网络请求失败，请稍后重试'

      if (status && status >= 500) {
        ElMessage.error(`服务器错误(${status})：${msg}`)
      } else if (status && status >= 400) {
        ElMessage.error(`请求错误(${status})：${msg}`)
      } else {
        ElMessage.error(msg)
      }
      return Promise.reject(error)
    }
  )
}

;[brainApi, macroApi, portfolioApi, executionApi, flowhubApi, monitoringApi, systemApi].forEach(
  (api) => attachInterceptors(api)
)

// 统一请求封装：自动解包 ApiResponse<T> 并提供类型安全
async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 1000): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      const axiosErr = err as any
      if (axiosErr?.isMock || axiosErr?.message === 'MOCK_MODE') {
        throw err
      }
      const status = axiosErr?.response?.status
      const code = axiosErr?.code
      const isTimeout = code === 'ECONNABORTED'
      const isNetwork = !axiosErr?.response
      const isServerErr = typeof status === 'number' && status >= 500
      if (attempt < retries && (isTimeout || isNetwork || isServerErr)) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 300)
        console.warn(`API请求失败，准备第${attempt + 1}次重试，原因:`, code || status, '，等待', delay, 'ms')
        await sleep(delay)
        attempt++
        continue
      }
      throw err
    }
  }
}

export async function request<T>(fn: () => Promise<any>, opts?: { retries?: number; baseDelay?: number }): Promise<T> {
  if (USE_MOCK) {
    const mockError = new Error('MOCK_MODE') as Error & { isMock?: boolean }
    mockError.isMock = true
    return Promise.reject(mockError)
  }
  const retries = opts?.retries ?? 2
  const baseDelay = opts?.baseDelay ?? 1000
  try {
    const resp = await withRetry(() => fn(), retries, baseDelay)
    return (resp?.data?.data ?? resp?.data) as T
  } catch (error) {
    throw error
  }
}

// 便捷的 API 调用封装（可选，供各模块使用）
export const api = {
  // Macro
  getMacroCyclePosition: () => request<unknown>(() => macroApi.get('/api/v1/macro/cycle/position')),
  getMarketSummary: () => request<unknown>(() => macroApi.get('/api/v1/market/summary')),
  getIndexQuotes: (codes: string) =>
    request<unknown>(() => macroApi.get('/api/v1/market/index/quotes', { params: { codes } })),
  getMacroIndicators: (keys?: string) =>
    request<unknown>(() => macroApi.get('/api/v1/macro/indicators', { params: { keys } })),

  // Market (需与后端确认端点)
  getTopSectors: (metric = 'momentum', period = '20d') =>
    request<unknown[]>(() => macroApi.get('/api/v1/market/sectors/top', { params: { metric, period } })),
  getTopConcepts: (metric = 'attention', period = '20d') =>
    request<unknown[]>(() => macroApi.get('/api/v1/market/concepts/top', { params: { metric, period } })),

  // Portfolio
  getPortfolios: () => request<unknown[]>(() => portfolioApi.get('/api/v1/portfolios')),
  getPortfolioSummary: (id: string) => request<unknown>(() => portfolioApi.get(`/api/v1/portfolio/${id}/summary`)),
  getPortfolioReturns: (id: string, window = '30d') =>
    request<unknown[]>(() => portfolioApi.get(`/api/v1/portfolio/${id}/performance/returns`, { params: { window } })),
  getPortfolioPositions: (id: string) => request<unknown[]>(() => portfolioApi.get(`/api/v1/portfolio/${id}/positions`)),
  getRebalanceHistory: (id: string, limit = 20) =>
    request<unknown[]>(() => portfolioApi.get(`/api/v1/portfolio/${id}/rebalance/history`, { params: { limit } })),
  getRebalanceSuggestions: (id: string) =>
    request<unknown>(() => portfolioApi.get(`/api/v1/portfolio/${id}/rebalance/suggestions`)),

  // Execution
  getTopStocks: (limit = 20) =>
    request<unknown[]>(() => executionApi.get('/api/v1/analyze/screener/top', { params: { limit } })),
  getActivePools: () => request<unknown[]>(() => executionApi.get('/api/v1/quantum/pools')),
  getLatestSignals: (symbols?: string) =>
    request<unknown[]>(() => executionApi.get('/api/v1/analyze/signal/latest', { params: { symbols } })),
}
