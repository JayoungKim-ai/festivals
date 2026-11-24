import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'

/** YYYY-MM-DD → YYYY.MM.DD */
function formatDate(value) {
  if (!value) return null
  return String(value).slice(0, 10).replaceAll('-', '.')
}

function formatPeriod(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return start === end ? start : `${start} ~ ${end}`
  return start || end || '기간 정보 없음'
}

/** YYYY-MM-DD → 로컬 Date (시각 00:00) */
function parseDateOnly(value) {
  if (!value) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** 오늘(로컬)부터 target 까지 남은 일수 (당일=0, 지난 날짜는 음수) */
function daysFromToday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * 날짜로 진행 상태와 배지 문구를 계산한다.
 * 종료일이 없으면 시작일 당일까지로 본다 (백엔드 status 필터와 동일).
 * @returns {{ status: 'ongoing'|'upcoming'|'ended'|'unknown', badge: string|null }}
 */
function getFestivalStatus(festival) {
  const start = parseDateOnly(festival.start_date)
  const end = parseDateOnly(festival.end_date) || start
  if (!start || !end) return { status: 'unknown', badge: null }

  const untilStart = daysFromToday(start)
  const untilEnd = daysFromToday(end)

  if (untilStart > 0) {
    return { status: 'upcoming', badge: `시작까지 ${untilStart}일` }
  }
  if (untilStart === 0) {
    return { status: 'upcoming', badge: '오늘 시작' }
  }
  if (untilEnd >= 0) {
    return { status: 'ongoing', badge: untilEnd === 0 ? '오늘 종료' : `종료까지 ${untilEnd}일` }
  }
  return { status: 'ended', badge: '종료' }
}

/** 시도 이름 줄임 (지역 태그를 짧게) */
const SIDO_SHORT = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  전남광주통합특별시: '전남광주',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
}

/** 주소에서 지역 태그를 만든다 (예: "충청북도 보은군 …" → "충북 보은군") */
function shortArea(festival) {
  const address = festival.road_address || festival.parcel_address
  if (address) {
    const [sido, sigungu] = address.split(/\s+/)
    const sidoShort = SIDO_SHORT[sido] || sido
    // 세종처럼 시군구가 없고 바로 도로명이 오는 경우는 시도만
    return sigungu && /[시군구]$/.test(sigungu) ? `${sidoShort} ${sigungu}` : sidoShort
  }
  return festival.region ? SIDO_SHORT[festival.region] || festival.region : null
}

function CalendarIcon() {
  return (
    <svg className="festival-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="festival-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  )
}

/**
 * 축제 목록 카드 (축제 찾기·달력·즐겨찾기 공용)
 * - 카드 전체가 상세 페이지 링크 (제목 링크를 카드 크기로 늘림)
 * - favorite 를 넘기면 즐겨찾기 버튼 표시: { active, onToggle }
 */
export default function FestivalCard({ festival, favorite }) {
  const { status, badge } = getFestivalStatus(festival)
  const area = shortArea(festival)
  // 지역은 윗줄 태그로 보여주므로 장소 줄에는 장소명만
  const placeText = festival.location || area || '장소 정보 없음'

  return (
    <li className={`festival-card festival-card--${status}`}>
      <div className="festival-card__body">
        {/* 윗줄: 상태 배지 + 지역 태그 — 제목 길이와 상관없이 같은 자리 */}
        <div className="festival-card__top">
          <div className="festival-card__tags">
            {badge && (
              <span className={`festival-card__badge festival-card__badge--${status}`}>
                {badge}
              </span>
            )}
            {area && <span className="festival-card__area">{area}</span>}
          </div>
          {favorite && (
            <FavoriteButton compact active={favorite.active} onToggle={favorite.onToggle} />
          )}
        </div>

        <h2 className="festival-card__title">
          <Link className="festival-card__link" to={`/festivals/${festival.id}`}>
            {festival.festival_name}
          </Link>
        </h2>

        <p className="festival-card__period">
          <CalendarIcon />
          {formatPeriod(festival.start_date, festival.end_date)}
        </p>
        <p className="festival-card__place">
          <PinIcon />
          <span>{placeText}</span>
        </p>
      </div>
      <span className="festival-card__chevron" aria-hidden="true">
        ›
      </span>
    </li>
  )
}
