/**
 * 즐겨찾기 ID 저장소 (localStorage)
 * 로그인 없이 브라우저에 축제 id 만 보관한다.
 */
const STORAGE_KEY = 'festival-finder:favorites'

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  } catch {
    return []
  }
}

function writeIds(ids) {
  const unique = [...new Set(ids)]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
  return unique
}

/** 저장된 즐겨찾기 ID 목록 */
export function getFavoriteIds() {
  return readIds()
}

/** 즐겨찾기 여부 */
export function isFavorite(festivalId) {
  const id = Number(festivalId)
  return readIds().includes(id)
}

/** 추가. 이미 있으면 그대로 반환 */
export function addFavorite(festivalId) {
  const id = Number(festivalId)
  if (!Number.isInteger(id) || id <= 0) return readIds()
  const ids = readIds()
  if (ids.includes(id)) return ids
  return writeIds([...ids, id])
}

/** 삭제 */
export function removeFavorite(festivalId) {
  const id = Number(festivalId)
  return writeIds(readIds().filter((item) => item !== id))
}

/** 토글. 추가되면 true, 삭제되면 false */
export function toggleFavorite(festivalId) {
  if (isFavorite(festivalId)) {
    removeFavorite(festivalId)
    return false
  }
  addFavorite(festivalId)
  return true
}

/** 존재하지 않는 ID 등을 저장소에서 제거 */
export function pruneFavoriteIds(validIds) {
  const valid = new Set(
    (validIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0),
  )
  return writeIds(readIds().filter((id) => valid.has(id)))
}
