/**
 * 어드민 Axios `baseURL` (끝 슬래시 없음).
 *
 * 우선순위: `VITE_API_BASE_URL` → 모드별 기본값
 * - 로컬(`vite` 개발): Spring `http://localhost:8080` — Vite 프록시 `/api` 사용 → `/api/academy`
 * - 운영(`vite build`): `https://api.dbridgehub.com/api/academy`
 *
 * 값은 루트의 `.env.development` / `.env.production` 에서 설정합니다.
 */
const DEFAULT_LOCAL = '/api/academy'
const DEFAULT_PRODUCTION = 'https://api.dbridgehub.com/api/academy'

export const ACADEMY_API_BASE_PATH =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? DEFAULT_PRODUCTION : DEFAULT_LOCAL)
