import { useEffect, useState } from 'react'

/** 이 시간(ms)이 지나도 로딩 중이면 서버 기동 안내를 보여준다 */
const SLOW_HINT_DELAY = 3000

/**
 * 축제 카드 모양의 로딩 자리표시
 * - label: 스크린리더용 로딩 문구
 * - slowHint: 로딩이 길어질 때 보여줄 안내 (없으면 표시 안 함)
 */
export default function FestivalListSkeleton({ count = 4, label = '불러오는 중…', slowHint }) {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (!slowHint) return undefined
    const timer = window.setTimeout(() => setShowHint(true), SLOW_HINT_DELAY)
    return () => window.clearTimeout(timer)
  }, [slowHint])

  return (
    <div className="skeleton-list" role="status">
      <span className="sr-only">{label}</span>
      {showHint && <p className="skeleton-list__hint">{slowHint}</p>}
      <ul className="festival-list" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="festival-card festival-card--skeleton">
            <div className="festival-card__body">
              <span className="skeleton skeleton--title" />
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line skeleton--short" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
