/**
 * API関連の定数
 */
export const API = {
  /** デフォルトのプロキシサーバーURL */
  DEFAULT_PROXY_URL: 'http://localhost:3001',

  /** HTTPメソッド */
  METHOD: {
    POST: 'POST' as const
  },

  /** APIエンドポイント */
  ENDPOINTS: {
    SEND_EMAIL: '/api/send-email'
  }
} as const
