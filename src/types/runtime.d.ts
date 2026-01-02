interface RuntimeConfig {
  API_GATEWAY?: string
  API_BRAIN?: string
  API_MACRO?: string
  API_PORTFOLIO?: string
  API_EXECUTION?: string
  API_FLOWHUB?: string
  USE_MOCK?: boolean | string
}

interface Window {
  __APP_CONFIG__?: RuntimeConfig
}
