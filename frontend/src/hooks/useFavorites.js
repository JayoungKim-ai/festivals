import { useCallback, useEffect, useState } from 'react'
import {
  getFavoriteIds,
  isFavorite as checkFavorite,
  pruneFavoriteIds,
  toggleFavorite as toggleFavoriteStorage,
} from '../favorites'

/**
 * 즐겨찾기 상태 훅.
 * 같은 탭 내 목록·상세·즐겨찾기 페이지가 동기화되도록 storage 이벤트를 흉내 낸다.
 */
export function useFavorites() {
  const [ids, setIds] = useState(() => getFavoriteIds())

  const refresh = useCallback(() => {
    setIds(getFavoriteIds())
  }, [])

  useEffect(() => {
    function onStorage(event) {
      if (event.key === 'festival-finder:favorites') {
        refresh()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const isFavorite = useCallback((festivalId) => checkFavorite(festivalId), [ids])

  const toggleFavorite = useCallback((festivalId) => {
    const active = toggleFavoriteStorage(festivalId)
    setIds(getFavoriteIds())
    return active
  }, [])

  const pruneMissing = useCallback((validIds) => {
    const next = pruneFavoriteIds(validIds)
    setIds(next)
    return next
  }, [])

  return {
    favoriteIds: ids,
    isFavorite,
    toggleFavorite,
    pruneMissing,
    refresh,
  }
}
