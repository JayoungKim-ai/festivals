import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fetchFestival } from '../api'
import FestivalCard from '../components/FestivalCard'
import FestivalListSkeleton from '../components/FestivalListSkeleton'
import { useFavorites } from '../hooks/useFavorites'

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
        <FestivalListSkeleton
          count={Math.min(Math.max(favoriteIds.length, 1), 4)}
          label="즐겨찾기를 불러오는 중…"
          slowHint="서버를 깨우는 중이에요. 처음 접속하면 최대 1분 정도 걸릴 수 있어요."
        />
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <p className="state-box__title">오류가 발생했습니다</p>
          <p className="state-box__body">{errorMessage}</p>
        </div>
      )}

      {status === 'empty' && (
        <div className="empty-state" role="status">
          <p className="empty-state__title">아직 저장한 축제가 없어요</p>
          <p className="empty-state__body">
            축제 카드의 ☆ 버튼을 누르면 이곳에 모아 볼 수 있습니다.
          </p>
          <div className="empty-state__actions">
            <Link className="empty-state__button empty-state__button--primary" to="/festivals">
              축제 찾으러 가기
            </Link>
          </div>
        </div>
      )}

      {status === 'ok' && (
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
      )}
    </section>
  )
}
