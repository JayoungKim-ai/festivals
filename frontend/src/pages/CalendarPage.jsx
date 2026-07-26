import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  fetchFestivalCalendar,
  fetchFestivalsByDate,
  fetchRegions,
} from '../api'
import { FestivalsMap, hasValidCoordinates } from '../components/FestivalMap'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatDateLabel(iso) {
  return String(iso).replaceAll('-', '.')
}

function formatPeriod(startDate, endDate) {
  const start = startDate ? String(startDate).slice(0, 10).replaceAll('-', '.') : null
  const end = endDate ? String(endDate).slice(0, 10).replaceAll('-', '.') : null
  if (start && end) return `${start} ~ ${end}`
  if (start) return start
  if (end) return end
  return '정보 없음'
}

function buildCalendarCells(year, month) {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = first.getDay()
  const cells = []

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ type: 'empty', key: `e-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      type: 'day',
      key: `d-${day}`,
      day,
      date: toDateKey(year, month, day),
    })
  }
  return cells
}

/**
 * 일자별·지역별 검색 — 달력 + 월/선택일 지도·목록
 * - 날짜 미선택: 해당 월 축제 기준
 * - 날짜 선택: 해당 일 축제 기준 (다시 누르면 월 보기로 복귀)
 */
export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState([])
  const [countsByDate, setCountsByDate] = useState({})
  const [monthFestivalTotal, setMonthFestivalTotal] = useState(0)
  const [monthItems, setMonthItems] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [errorMessage, setErrorMessage] = useState('')

  const [dayItems, setDayItems] = useState([])
  const [dayStatus, setDayStatus] = useState('idle') // idle | loading | ok | empty | error
  const [dayError, setDayError] = useState('')

  const cells = useMemo(() => buildCalendarCells(year, month), [year, month])

  // 날짜 미선택이면 월 목록, 선택하면 해당일 목록
  const panelItems = selectedDate ? dayItems : monthItems
  const panelStatus = selectedDate
    ? dayStatus
    : status === 'loading'
      ? 'loading'
      : status === 'error'
        ? 'error'
        : monthItems.length === 0
          ? 'empty'
          : 'ok'
  const panelError = selectedDate ? dayError : errorMessage

  const mappedFestivals = useMemo(
    () => panelItems.filter((f) => hasValidCoordinates(f.latitude, f.longitude)),
    [panelItems],
  )

  useEffect(() => {
    fetchRegions()
      .then((data) => setRegions(Array.isArray(data.items) ? data.items : []))
      .catch(() => setRegions([]))
  }, [])

  // 월·지역 변경 → 달력 건수 + 월 축제 목록
  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setErrorMessage('')
      setSelectedDate(null)
      setDayItems([])
      setDayStatus('idle')
      setMonthItems([])

      try {
        const data = await fetchFestivalCalendar({ year, month, region })
        if (cancelled) return

        const map = {}
        for (const item of data.days || []) {
          map[item.date] = item.count
        }
        setCountsByDate(map)

        const list = Array.isArray(data.items) ? data.items : []
        setMonthItems(list)

        const festivalTotal =
          typeof data.total === 'number' ? data.total : list.length
        setMonthFestivalTotal(festivalTotal)
        setStatus(festivalTotal === 0 ? 'empty' : 'ok')
      } catch (err) {
        if (cancelled) return
        setCountsByDate({})
        setMonthFestivalTotal(0)
        setMonthItems([])
        setStatus('error')
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : '달력 데이터를 불러오지 못했습니다.',
        )
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [year, month, region])

  // 날짜 선택 → 해당일 축제 목록 (지역 필터 유지)
  useEffect(() => {
    if (!selectedDate) {
      setDayItems([])
      setDayStatus('idle')
      return undefined
    }

    let cancelled = false

    async function loadDay() {
      setDayStatus('loading')
      setDayError('')

      try {
        const data = await fetchFestivalsByDate({ date: selectedDate, region })
        if (cancelled) return
        const list = Array.isArray(data.items) ? data.items : []
        setDayItems(list)
        setDayStatus(list.length === 0 ? 'empty' : 'ok')
      } catch (err) {
        if (cancelled) return
        setDayItems([])
        setDayStatus('error')
        setDayError(
          err instanceof ApiError
            ? err.message
            : '선택한 날짜의 축제를 불러오지 못했습니다.',
        )
      }
    }

    loadDay()
    return () => {
      cancelled = true
    }
  }, [selectedDate, region])

  function goPrevMonth() {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }

  function goNextMonth() {
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }

  function handleMonthInput(event) {
    const value = event.target.value
    if (!value) return
    const [y, m] = value.split('-').map(Number)
    if (y && m) {
      setYear(y)
      setMonth(m)
    }
  }

  /** 같은 날짜를 다시 누르면 선택 해제 → 월 전체 보기로 돌아감 */
  function handleDayClick(dateKey) {
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey))
  }

  const panelTitle = selectedDate
    ? `${formatDateLabel(selectedDate)} 축제`
    : `${year}년 ${month}월 축제`

  return (
    <section className="page calendar-page">
      <h1 className="page__title">일자별 · 지역별 검색</h1>
      <p className="page__lead">
        월을 고르면 달력과 함께 해당 월의 축제 지도·목록이 표시됩니다. 날짜를 누르면 그날
        축제로 좁혀 볼 수 있습니다.
      </p>

      <div className="calendar-controls">
        <div className="calendar-controls__field">
          <label className="search-bar__label" htmlFor="calendar-region">
            지역
          </label>
          <select
            id="calendar-region"
            className="search-bar__select"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">전체 지역</option>
            {regions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="calendar-controls__field calendar-controls__month">
          <label className="search-bar__label" htmlFor="calendar-month">
            월 선택
          </label>
          <div className="calendar-month-nav">
            <button type="button" className="calendar-month-nav__btn" onClick={goPrevMonth}>
              이전
            </button>
            <input
              id="calendar-month"
              className="calendar-month-nav__input"
              type="month"
              value={`${year}-${pad2(month)}`}
              onChange={handleMonthInput}
            />
            <button type="button" className="calendar-month-nav__btn" onClick={goNextMonth}>
              다음
            </button>
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <p className="state-message" role="status">
          달력 정보를 불러오는 중…
        </p>
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <p className="state-box__title">오류가 발생했습니다</p>
          <p className="state-box__body">{errorMessage}</p>
        </div>
      )}

      {(status === 'ok' || status === 'empty') && (
        <>
          <p className="result-count">
            {year}년 {month}월
            {region ? ` · ${region}` : ' · 전체 지역'}
            {' — '}
            <button
              type="button"
              className={
                selectedDate
                  ? 'result-count__action'
                  : 'result-count__action result-count__action--active'
              }
              onClick={() => setSelectedDate(null)}
              aria-pressed={!selectedDate}
              title="이 달의 모든 축제 보기"
            >
              축제 {monthFestivalTotal.toLocaleString()}건
            </button>
            {status === 'empty' && ' (이 달에는 표시할 축제가 없습니다)'}
          </p>

          <div className="calendar-grid" role="grid" aria-label={`${year}년 ${month}월 달력`}>
            {WEEKDAYS.map((label) => (
              <div key={label} className="calendar-grid__weekday" role="columnheader">
                {label}
              </div>
            ))}
            {cells.map((cell) => {
              if (cell.type === 'empty') {
                return (
                  <div
                    key={cell.key}
                    className="calendar-grid__cell calendar-grid__cell--empty"
                  />
                )
              }
              const count = countsByDate[cell.date] || 0
              const isSelected = selectedDate === cell.date
              const classNames = [
                'calendar-grid__cell',
                'calendar-grid__cell--day',
                count > 0 ? 'calendar-grid__cell--has-events' : 'calendar-grid__cell--zero',
                isSelected ? 'calendar-grid__cell--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={classNames}
                  onClick={() => handleDayClick(cell.date)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.date}, 축제 ${count}건`}
                >
                  <span className="calendar-grid__day">{cell.day}</span>
                  <span className="calendar-grid__count">
                    {count > 0 ? `${count}건` : '—'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="calendar-day-panel">
            <h2 className="calendar-day-panel__title">
              {panelTitle}
              {region ? ` · ${region}` : ''}
              {!selectedDate && (
                <span className="result-count__hint"> · 날짜를 누르면 해당 일만 볼 수 있습니다</span>
              )}
              {selectedDate && (
                <span className="result-count__hint"> · 같은 날짜를 다시 누르면 월 전체로 돌아갑니다</span>
              )}
            </h2>

            {panelStatus === 'loading' && (
              <p className="state-message" role="status">
                {selectedDate
                  ? '선택한 날짜의 축제를 불러오는 중…'
                  : '이 달의 축제를 불러오는 중…'}
              </p>
            )}

            {panelStatus === 'error' && (
              <div className="state-box state-box--error" role="alert">
                <p className="state-box__title">오류가 발생했습니다</p>
                <p className="state-box__body">{panelError}</p>
              </div>
            )}

            {panelStatus === 'empty' && (
              <p className="state-message" role="status">
                {selectedDate
                  ? '이 날짜에 해당하는 축제가 없습니다.'
                  : '이 달에 해당하는 축제가 없습니다.'}
              </p>
            )}

            {panelStatus === 'ok' && (
              <>
                <section
                  className="calendar-day-map"
                  aria-label={selectedDate ? '선택일 축제 지도' : '이 달 축제 지도'}
                >
                  {mappedFestivals.length > 0 ? (
                    <FestivalsMap festivals={mappedFestivals} />
                  ) : (
                    <p className="state-message">
                      위치 좌표가 있는 축제가 없어 지도를 표시할 수 없습니다.
                      {panelItems.length > 0 &&
                        ` (목록 ${panelItems.length}건은 아래에 표시됩니다)`}
                    </p>
                  )}
                </section>

                <p className="result-count">
                  총 {panelItems.length.toLocaleString()}건
                  {mappedFestivals.length < panelItems.length && (
                    <span className="result-count__hint">
                      {' '}
                      · 지도 마커 {mappedFestivals.length}곳
                    </span>
                  )}
                </p>

                <ul className="festival-list">
                  {panelItems.map((festival) => (
                    <li key={festival.id} className="festival-card">
                      <div className="festival-card__body">
                        <h2 className="festival-card__title">{festival.festival_name}</h2>
                        <dl className="festival-card__meta">
                          <div>
                            <dt>개최기간</dt>
                            <dd>
                              {formatPeriod(festival.start_date, festival.end_date)}
                            </dd>
                          </div>
                          <div>
                            <dt>개최장소</dt>
                            <dd>{festival.location || '정보 없음'}</dd>
                          </div>
                          <div>
                            <dt>지역</dt>
                            <dd>{festival.region || '정보 없음'}</dd>
                          </div>
                        </dl>
                      </div>
                      <Link
                        className="festival-card__link"
                        to={`/festivals/${festival.id}`}
                      >
                        상세 보기
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
