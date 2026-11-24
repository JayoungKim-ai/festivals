import { useEffect, useState } from 'react'
import { ApiError, fetchFestivals, fetchRegions } from '../api'
import FestivalCard from '../components/FestivalCard'
import FestivalListSkeleton from '../components/FestivalListSkeleton'
import { useFavorites } from '../hooks/useFavorites'

/** 한 페이지에 표시할 축제 수 (N-1) */
const LIST_SIZE = 10

/** 진행 상태 탭 정의 (value 는 백엔드 status 파라미터와 일치) */
const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'ongoing', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'ended', label: '종료' },
]

/** 기본 선택 탭: 진행중 */
const DEFAULT_STATUS = 'ongoing'

function buildResultLabel(search, region, total) {
  const parts = []
  if (search) parts.push(`"${search}"`)
  if (region) parts.push(region)
  if (parts.length === 0) return `전체 ${total.toLocaleString()}건`
  return `${parts.join(' · ')} 검색 결과 ${total.toLocaleString()}건`
}

/** 결과 없음 안내에 쓸 현재 조건 문구 (예: "불꽃" · 서울특별시 · 진행중) */
function buildEmptyConditionLabel(search, region, statusValue) {
  const parts = []
  if (search) parts.push(`"${search}"`)
  if (region) parts.push(region)
  const tab = STATUS_TABS.find((item) => item.value === statusValue)
  if (statusValue && tab) parts.push(tab.label)
  return parts.length > 0 ? parts.join(' · ') : '현재'
}

/** 현재 페이지에 해당하는 건수 범위 문구 (예: 1–10번째) */
function buildPageRangeLabel(page, size, total) {
  if (total <= 0) return ''
  const start = (page - 1) * size + 1
  const end = Math.min(page * size, total)
  return `${start.toLocaleString()}–${end.toLocaleString()}번째`
}

/**
 * 축제 찾기 화면
 * - 축제명 검색 + 지역(시도) 필터 (동시 적용)
 * - 페이지당 10개 페이지네이션
 */
export default function FestivalListPage() {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [input, setInput] = useState('')
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState([])
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedRegion, setAppliedRegion] = useState('')
  const [statusTab, setStatusTab] = useState(DEFAULT_STATUS) // 진행 상태 탭 ('' | ongoing | ended)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [errorMessage, setErrorMessage] = useState('')
  const [ongoingCount, setOngoingCount] = useState(null)

  const totalPages = Math.max(1, Math.ceil(total / LIST_SIZE))

  async function loadFestivals(keyword, regionName, pageNumber, statusValue = statusTab) {
    setStatus('loading')
    setErrorMessage('')

    try {
      const data = await fetchFestivals({
        page: pageNumber,
        size: LIST_SIZE,
        search: keyword,
        region: regionName,
        status: statusValue,
      })
      const list = Array.isArray(data.items) ? data.items : []
      const nextTotal = typeof data.total === 'number' ? data.total : list.length
      setItems(list)
      setTotal(nextTotal)
      setPage(typeof data.page === 'number' ? data.page : pageNumber)

      if (nextTotal === 0 || list.length === 0) {
        setStatus('empty')
      } else {
        setStatus('ok')
      }
    } catch (err) {
      setItems([])
      setTotal(0)
      setStatus('error')
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : '축제 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  // 지역 목록 + 초기 전체 축제 목록 (1페이지)
  useEffect(() => {
    fetchRegions()
      .then((data) => {
        setRegions(Array.isArray(data.items) ? data.items : [])
      })
      .catch(() => {
        setRegions([])
      })
    // 히어로에 보여줄 "지금 진행중인 축제" 수 (검색 조건과 무관한 전국 기준)
    fetchFestivals({ page: 1, size: 1, status: 'ongoing' })
      .then((data) => {
        if (typeof data.total === 'number') setOngoingCount(data.total)
      })
      .catch(() => {})
    // 초기 로드는 기본 탭(진행중) 기준
    loadFestivals('', '', 1, DEFAULT_STATUS)
  }, [])

  function handleStatusChange(nextStatus) {
    if (nextStatus === statusTab) return
    setStatusTab(nextStatus)
    setPage(1)
    // 탭 변경 시 현재 검색어·지역을 유지한 채 1페이지부터 다시 조회
    loadFestivals(appliedSearch, appliedRegion, 1, nextStatus)
  }

  /** 검색어·지역을 입력창과 적용값에 함께 반영하고 1페이지부터 다시 조회 */
  function applyFilters(keyword, regionName) {
    setInput(keyword)
    setRegion(regionName)
    setAppliedSearch(keyword)
    setAppliedRegion(regionName)
    setPage(1)
    loadFestivals(keyword, regionName, 1)
  }

  function handleSearch(event) {
    event.preventDefault()
    const keyword = input.trim()
    setAppliedSearch(keyword)
    setAppliedRegion(region)
    setPage(1)
    loadFestivals(keyword, region, 1)
  }

  function handleRegionChange(event) {
    const nextRegion = event.target.value
    setRegion(nextRegion)
    setAppliedRegion(nextRegion)
    const keyword = input.trim()
    setAppliedSearch(keyword)
    setPage(1)
    // 지역 변경 즉시 반영 (현재 검색어와 함께, 1페이지로)
    loadFestivals(keyword, nextRegion, 1)
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    setPage(nextPage)
    loadFestivals(appliedSearch, appliedRegion, nextPage)
    // 목록 상단으로 스크롤해 페이지 전환 후에도 읽기 쉽게
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="page festival-list-page">
      <div className="festival-hero">
        <svg className="festival-hero__burst" viewBox="0 0 200 200" aria-hidden="true">
          <g strokeLinecap="round" strokeWidth="3">
            {Array.from({ length: 16 }, (_, i) => {
              const angle = (i / 16) * Math.PI * 2
              const inner = i % 2 === 0 ? 26 : 38
              const outer = i % 2 === 0 ? 86 : 66
              return (
                <line
                  key={i}
                  x1={100 + Math.cos(angle) * inner}
                  y1={100 + Math.sin(angle) * inner}
                  x2={100 + Math.cos(angle) * outer}
                  y2={100 + Math.sin(angle) * outer}
                  stroke={i % 2 === 0 ? '#fbbf24' : '#f472b6'}
                />
              )
            })}
          </g>
        </svg>
        <p className="festival-hero__eyebrow">✦ 전국 축제 한눈에</p>
        <h1 className="festival-hero__title">오늘, 어떤 축제 보러 갈까요?</h1>
        <p className="festival-hero__stat">
          {ongoingCount === null ? (
            '지금 열리고 있는 축제를 확인해 보세요'
          ) : (
            <>
              지금 전국에서 <strong>{ongoingCount.toLocaleString()}개</strong>의 축제가 열리고
              있어요
            </>
          )}
        </p>

        <form className="search-bar" onSubmit={handleSearch} role="search">
          <div className="search-bar__filters">
            <div className="search-bar__field">
              <label className="search-bar__label" htmlFor="festival-region">
                지역
              </label>
              <select
                id="festival-region"
                className="search-bar__select"
                value={region}
                onChange={handleRegionChange}
              >
                <option value="">전체 지역</option>
                {regions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-bar__field search-bar__field--grow">
              <label className="search-bar__label" htmlFor="festival-search">
                축제명 검색
              </label>
              <div className="search-bar__row">
                <input
                  id="festival-search"
                  className="search-bar__input"
                  type="search"
                  placeholder="예: 불꽃축제, 벚꽃축제"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoComplete="off"
                />
                <button className="search-bar__button" type="submit">
                  검색
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="status-tabs" role="tablist" aria-label="축제 진행 상태">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            role="tab"
            aria-selected={statusTab === tab.value}
            className={`status-tab${statusTab === tab.value ? ' status-tab--active' : ''}`}
            onClick={() => handleStatusChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <FestivalListSkeleton
          count={5}
          label="축제 목록을 불러오는 중…"
          slowHint="서버를 깨우는 중이에요. 처음 접속하면 최대 1분 정도 걸릴 수 있어요."
        />
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <p className="state-box__title">오류가 발생했습니다</p>
          <p className="state-box__body">{errorMessage}</p>
          <button
            type="button"
            className="state-box__action"
            onClick={() => loadFestivals(appliedSearch, appliedRegion, page)}
          >
            다시 시도
          </button>
        </div>
      )}

      {status === 'empty' && (
        <div className="empty-state" role="status">
          <p className="empty-state__title">조건에 맞는 축제가 없어요</p>
          <p className="empty-state__body">
            {buildEmptyConditionLabel(appliedSearch, appliedRegion, statusTab)}
            {' '}조건으로 찾은 결과가 없습니다. 조건을 넓혀 보세요.
          </p>
          <div className="empty-state__actions">
            {statusTab !== '' && (
              <button
                type="button"
                className="empty-state__button empty-state__button--primary"
                onClick={() => handleStatusChange('')}
              >
                전체 기간에서 찾기
              </button>
            )}
            {appliedRegion && (
              <button
                type="button"
                className="empty-state__button"
                onClick={() => applyFilters(appliedSearch, '')}
              >
                전체 지역에서 찾기
              </button>
            )}
            {(appliedSearch || appliedRegion) && (
              <button
                type="button"
                className="empty-state__button"
                onClick={() => applyFilters('', '')}
              >
                검색 조건 초기화
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'ok' && (
        <>
          <p className="result-count">
            {buildResultLabel(appliedSearch, appliedRegion, total)}
            <span className="result-count__hint">
              {' '}
              ({buildPageRangeLabel(page, LIST_SIZE, total)} · {page}/{totalPages}페이지)
            </span>
          </p>

          <ul className="festival-list">
            {items.map((festival) => (
              <FestivalCard
                key={festival.id}
                festival={festival}
                favorite={{
                  active: isFavorite(festival.id),
                  onToggle: () => toggleFavorite(festival.id),
                }}
              />
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="축제 목록 페이지">
              <button
                type="button"
                className="pagination__button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                이전
              </button>
              <p className="pagination__status" aria-live="polite">
                {page} / {totalPages}
              </p>
              <button
                type="button"
                className="pagination__button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
