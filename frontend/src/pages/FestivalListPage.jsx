import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fetchFestivals, fetchRegions } from '../api'
import FavoriteButton from '../components/FavoriteButton'
import { useFavorites } from '../hooks/useFavorites'

/** 한 페이지에 표시할 축제 수 (N-1) */
const LIST_SIZE = 10

/** 날짜를 PRD 형식으로 표시 (YYYY.MM.DD) */
function formatDate(value) {
  if (!value) return null
  const text = String(value).slice(0, 10)
  return text.replaceAll('-', '.')
}

/** 개최기간 문자열 */
function formatPeriod(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} ~ ${end}`
  if (start) return start
  if (end) return end
  return '정보 없음'
}

/** 주소 일부 표시 (도로명 우선, 없으면 지번) */
function formatAddress(festival) {
  const address = festival.road_address || festival.parcel_address
  if (!address) return '정보 없음'
  return address.length > 40 ? `${address.slice(0, 40)}…` : address
}

function buildResultLabel(search, region, total) {
  const parts = []
  if (search) parts.push(`"${search}"`)
  if (region) parts.push(region)
  if (parts.length === 0) return `전체 ${total.toLocaleString()}건`
  return `${parts.join(' · ')} 검색 결과 ${total.toLocaleString()}건`
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
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [errorMessage, setErrorMessage] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LIST_SIZE))

  async function loadFestivals(keyword, regionName, pageNumber) {
    setStatus('loading')
    setErrorMessage('')

    try {
      const data = await fetchFestivals({
        page: pageNumber,
        size: LIST_SIZE,
        search: keyword,
        region: regionName,
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
    loadFestivals('', '', 1)
  }, [])

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
      <h1 className="page__title">축제 찾기</h1>
      <p className="page__lead">
        축제 이름과 지역으로 검색하거나, 목록에서 관심 있는 축제를 골라 상세 정보를 확인하세요.
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

      {status === 'loading' && (
        <p className="state-message" role="status">
          축제 목록을 불러오는 중…
        </p>
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
        <p className="state-message" role="status">
          검색 결과가 없습니다
        </p>
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
              <li key={festival.id} className="festival-card">
                <div className="festival-card__body">
                  <div className="festival-card__heading">
                    <h2 className="festival-card__title">{festival.festival_name}</h2>
                    <FavoriteButton
                      compact
                      active={isFavorite(festival.id)}
                      onToggle={() => toggleFavorite(festival.id)}
                    />
                  </div>
                  <dl className="festival-card__meta">
                    <div>
                      <dt>개최기간</dt>
                      <dd>{formatPeriod(festival.start_date, festival.end_date)}</dd>
                    </div>
                    <div>
                      <dt>개최장소</dt>
                      <dd>{festival.location || '정보 없음'}</dd>
                    </div>
                    <div>
                      <dt>주소</dt>
                      <dd>{formatAddress(festival)}</dd>
                    </div>
                  </dl>
                </div>
                <Link className="festival-card__link" to={`/festivals/${festival.id}`}>
                  상세 보기
                </Link>
              </li>
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
