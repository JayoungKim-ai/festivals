import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fetchFestival } from '../api'
import FavoriteButton from '../components/FavoriteButton'
import { useFavorites } from '../hooks/useFavorites'

function formatDate(value) {
  if (!value) return null
  return String(value).slice(0, 10).replaceAll('-', '.')
}

function formatPeriod(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} ~ ${end}`
  if (start) return start
  if (end) return end
  return '정보 없음'
}

/**
 * 즐겨찾기 목록 화면
 * - localStorage ID 로 서버에서 최신 정보 재조회
 * - 삭제/없는 ID 는 저장소에서 정리
 */
export default function FavoritesPage() {
  const { favoriteIds, toggleFavorite, pruneMissing, isFavorite } = useFavorites()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [removedCount, setRemovedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const ids = favoriteIds
      if (ids.length === 0) {
        setItems([])
        setRemovedCount(0)
        setStatus('empty')
        return
      }

      setStatus('loading')
      setErrorMessage('')

      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const festival = await fetchFestival(id)
              return { ok: true, festival }
            } catch (err) {
              if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
                return { ok: false, id }
              }
              // 일시 오류는 항목만 스킵하고 ID 는 유지
              return { ok: false, id, keep: true }
            }
          }),
        )

        if (cancelled) return

        const festivals = []
        const validIds = []
        let removed = 0

        for (const result of results) {
          if (result.ok) {
            festivals.push(result.festival)
            validIds.push(result.festival.id)
          } else if (result.keep) {
            validIds.push(result.id)
          } else {
            removed += 1
          }
        }

        pruneMissing(validIds)
        setItems(festivals)
        setRemovedCount(removed)
        setStatus(festivals.length === 0 ? 'empty' : 'ok')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : '즐겨찾기 목록을 불러오지 못했습니다.',
        )
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // favoriteIds 변경 시 다시 로드 (토글 직후 반영)
  }, [favoriteIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="page favorites-page">
      <h1 className="page__title">즐겨찾기</h1>
      <p className="page__lead">
        관심 있는 축제를 이 브라우저에 저장해 두고 다시 확인할 수 있습니다. 다른 기기와는
        동기화되지 않습니다.
      </p>

      {removedCount > 0 && (
        <p className="favorites-notice" role="status">
          더 이상 조회할 수 없는 축제 {removedCount}건을 즐겨찾기에서 정리했습니다.
        </p>
      )}

      {status === 'loading' && (
        <p className="state-message" role="status">
          즐겨찾기를 불러오는 중…
        </p>
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <p className="state-box__title">오류가 발생했습니다</p>
          <p className="state-box__body">{errorMessage}</p>
        </div>
      )}

      {status === 'empty' && (
        <div className="state-message" role="status">
          <p>저장한 축제가 없습니다.</p>
          <p>
            <Link to="/festivals">축제 찾기</Link>에서 관심 있는 축제를 즐겨찾기에 추가해
            보세요.
          </p>
        </div>
      )}

      {status === 'ok' && (
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
                </dl>
              </div>
              <Link className="festival-card__link" to={`/festivals/${festival.id}`}>
                상세 보기
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
