import { useId } from 'react'
import { shortRegionName } from '../regions'

/**
 * 지역(시도) 여러 개 선택 버튼
 * - options: 전체 지역 이름 목록 (예: ["서울특별시", ...])
 * - selected: 선택된 지역 이름 배열 (빈 배열이면 전체)
 * - onChange(nextSelected): 버튼을 누를 때마다 바뀐 배열을 넘긴다
 * - tone: 'dark' (남색 히어로 위) | 'light' (흰 카드 위)
 */
export default function RegionChips({ options, selected, onChange, tone = 'light' }) {
  const labelId = useId()
  const isAll = selected.length === 0

  function toggle(name) {
    onChange(
      selected.includes(name)
        ? selected.filter((item) => item !== name)
        : // 목록 순서를 유지해 같은 조합이면 같은 요청이 되도록
          options.filter((item) => item === name || selected.includes(item)),
    )
  }

  return (
    <div className={`region-chips region-chips--${tone}`}>
      <p className="region-chips__label" id={labelId}>
        지역
        <span className="region-chips__hint">
          {isAll ? ' · 전체' : ` · ${selected.length}곳 선택`} (여러 곳 선택 가능)
        </span>
      </p>
      <div className="region-chips__list" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className={`region-chip${isAll ? ' region-chip--active' : ''}`}
          aria-pressed={isAll}
          onClick={() => onChange([])}
        >
          전체
        </button>
        {options.map((name) => {
          const active = selected.includes(name)
          return (
            <button
              key={name}
              type="button"
              className={`region-chip${active ? ' region-chip--active' : ''}`}
              aria-pressed={active}
              title={name}
              onClick={() => toggle(name)}
            >
              {shortRegionName(name)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
