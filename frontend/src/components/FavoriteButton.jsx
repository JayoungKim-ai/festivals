/**
 * 즐겨찾기 토글 버튼
 * - active: 이미 저장된 상태 시각 표시
 */
export default function FavoriteButton({ active, onToggle, compact = false }) {
  return (
    <button
      type="button"
      className={
        active
          ? 'favorite-button favorite-button--active'
          : 'favorite-button'
      }
      aria-pressed={active}
      aria-label={active ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <span className="favorite-button__icon" aria-hidden="true">
        {active ? '★' : '☆'}
      </span>
      {!compact && (
        <span className="favorite-button__label">
          {active ? '즐겨찾기됨' : '즐겨찾기'}
        </span>
      )}
    </button>
  )
}
