// ---------------------------------------------------------------
// 백엔드(FastAPI) 호출 함수 모음
// 화면은 여기 함수만 부른다. 공공데이터 API는 직접 호출하지 않는다.
// ---------------------------------------------------------------
// API 주소 우선순위:
// 1) VITE_API_BASE_URL (로컬 .env / Vercel Environment Variables)
// 2) 프로덕션 빌드면 Render 백엔드
// 3) 로컬 개발이면 127.0.0.1:8000
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://festivals-nmj9.onrender.com'
    : 'http://127.0.0.1:8000')
).replace(/\/$/, '')

/** Render Free 콜드스타트·네트워크 지연을 고려한 대기 시간(ms) */
const REQUEST_TIMEOUT_MS = 60_000

/**
 * UI에서 구분할 수 있는 API 오류.
 * - status: HTTP 상태 코드 (네트워크 실패 시 0)
 * - body: 서버가 준 원본 본문(있으면)
 */
export class ApiError extends Error {
  constructor(message, { status = 0, body = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function createTimeoutSignal(ms) {
  // AbortSignal.timeout 미지원 브라우저(구형 모바일) 대비
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function request(path, options = {}) {
  const { signal: userSignal, ...rest } = options
  const timeoutSignal = createTimeoutSignal(REQUEST_TIMEOUT_MS)
  // 호출측 signal과 타임아웃을 함께 반영
  const signal =
    userSignal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([userSignal, timeoutSignal])
      : timeoutSignal

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...rest, signal })
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new ApiError(
        '서버 응답이 너무 깁니다. 잠시 쉬고 있던 서버가 깨어나는 중일 수 있어요. 잠시 후 다시 시도해 주세요.',
        { status: 0 },
      )
    }
    // DNS/연결 거부 등 네트워크 오류
    throw new ApiError('서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인하세요.', {
      status: 0,
    })
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && data.detail
        ? typeof data.detail === 'string'
          ? data.detail
          : '요청을 처리하지 못했습니다.'
        : `요청 실패 (HTTP ${response.status})`

    throw new ApiError(detail, { status: response.status, body: data })
  }

  return data
}

/** 백엔드 생존 확인 */
export async function checkHealth() {
  return request('/health')
}

/**
 * 축제 목록 조회
 * @param {{ page?: number, size?: number, search?: string, region?: string, status?: string }} params
 *   status: '' (전체) | 'ongoing' (진행중) | 'ended' (종료)
 */
export async function fetchFestivals({
  page = 1,
  size = 10,
  search = '',
  region = '',
  status = '',
} = {}) {
  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('size', String(size))
  const keyword = (search || '').trim()
  if (keyword) query.set('search', keyword)
  const regionName = (region || '').trim()
  if (regionName) query.set('region', regionName)
  const statusValue = (status || '').trim()
  if (statusValue) query.set('status', statusValue)

  return request(`/api/festivals?${query.toString()}`)
}

/** 지역(시도) 목록 조회 — 필터 UI용 */
export async function fetchRegions() {
  return request('/api/regions')
}

/**
 * 축제 상세 조회
 * @param {number|string} festivalId
 */
export async function fetchFestival(festivalId) {
  return request(`/api/festivals/${festivalId}`)
}

/**
 * 월별 일자별 축제 건수
 * @param {{ year: number, month: number, region?: string }} params
 */
export async function fetchFestivalCalendar({ year, month, region = '' } = {}) {
  const query = new URLSearchParams()
  query.set('year', String(year))
  query.set('month', String(month))
  const regionName = (region || '').trim()
  if (regionName) query.set('region', regionName)
  return request(`/api/festivals/calendar?${query.toString()}`)
}

/**
 * 특정 날짜 축제 목록
 * @param {{ date: string, region?: string }} params  date: YYYY-MM-DD
 */
export async function fetchFestivalsByDate({ date, region = '' } = {}) {
  const query = new URLSearchParams()
  query.set('date', date)
  const regionName = (region || '').trim()
  if (regionName) query.set('region', regionName)
  return request(`/api/festivals/by-date?${query.toString()}`)
}
