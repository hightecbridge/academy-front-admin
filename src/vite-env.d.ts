/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TOSS_PAYMENTS_CLIENT_KEY?: string
  /** 결제위젯 연동용 (test_gck_ / live_gck_). 포인트 충전 페이지에서만 사용 */
  readonly VITE_TOSS_PAYMENTS_WIDGET_CLIENT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
