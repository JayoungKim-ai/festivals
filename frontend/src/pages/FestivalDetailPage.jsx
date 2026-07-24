import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchFestival } from '../api'
import FestivalMap, { hasValidCoordinates } from '../components/FestivalMap'
import FavoriteButton from '../components/FavoriteButton'
import { useFavorites } from '../hooks/useFavorites'

const EMPTY = '정보 없음'

/** 빈 값을 “정보 없음”으로 표시 */
function displayText(value) {
  if (value === null || value === undefined) return EMPTY
  const text = String(value).trim()
  return text || EMPTY
}

/** YYYY.MM.DD */
function formatDate(value) {
  if (!value) return null
  return String(value).slice(0, 10).replaceAll('-', '.')
}

/** 2026.05.01 ~ 2026.05.05 */
function formatPeriod(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} ~ ${end}`
  if (start) return start
  if (end) return end
  return EMPTY
}

/** http/https 만 외부 링크로 허용 */
function safeHomepageUrl(url) {
  const text = (url || '').trim()
  if (!text) return null
  try {
    const parsed = new URL(text)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href
    }
  } catch {
    // 스킴 없는 경우 https 가정해 시도
    try {
      const parsed = new URL(`https://${text}`)
      return parsed.href
    } catch {
      return null
    }
  }
  return null
}

/** 전화 연결용 tel: 링크 (숫자·+ 만 유지) */
function telHref(phone) {
  const text = (phone || '').trim()
  if (!text) return null
  const normalized = text.replace(/[^\d+]/g, '')
  return normalized ? `tel:${normalized}` : null
}

function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * 축제 상세 화면
 * PRD §4.3 표시 항목·규칙을 따른다.
 */
export default function FestivalDetailPage() {
  const { id } = useParams()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [festival, setFestival] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | error
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setErrorMessage('')
      setFestival(null)

      try {
        const data = await fetchFestival(id)
        if (!cancelled) {
          setFestival(data)
          setStatus('ok')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        if (err instanceof ApiError && err.status === 404) {
          setErrorMessage('요청하신 축제 정보를 찾을 수 없습니다.')
        } else if (err instanceof ApiError) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage('축제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const homepage = festival ? safeHomepageUrl(festival.homepage_url) : null
  const phoneLink = festival ? telHref(festival.phone) : null

  return (
    <section className="page festival-detail-page">
      <p className="page__back">
        <Link to="/festivals">← 목록으로</Link>
      </p>

      {status === 'loading' && (
        <p className="state-message" role="status">
          축제 정보를 불러오는 중…
        </p>
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <p className="state-box__title">상세 정보를 표시할 수 없습니다</p>
          <p className="state-box__body">{errorMessage}</p>
          <Link className="state-box__action state-box__action--link" to="/festivals">
            목록으로 돌아가기
          </Link>
        </div>
      )}

      {status === 'ok' && festival && (
        <>
          <div className="detail-header">
            <div className="detail-header__text">
              <h1 className="page__title">{displayText(festival.festival_name)}</h1>
              <p className="detail-period">{formatPeriod(festival.start_date, festival.end_date)}</p>
            </div>
            <FavoriteButton
              active={isFavorite(festival.id)}
              onToggle={() => toggleFavorite(festival.id)}
            />
          </div>

          <dl className="detail-grid">
            <DetailRow label="개최장소">{displayText(festival.location)}</DetailRow>
            <DetailRow label="개최기간">
              {formatPeriod(festival.start_date, festival.end_date)}
            </DetailRow>

            <DetailRow label="축제내용">
              <p className="detail-description">{displayText(festival.description)}</p>
            </DetailRow>

            <DetailRow label="주관기관">{displayText(festival.managing_org)}</DetailRow>
            <DetailRow label="주최기관">{displayText(festival.hosting_org)}</DetailRow>
            <DetailRow label="후원기관">{displayText(festival.sponsoring_org)}</DetailRow>

            <DetailRow label="전화번호">
              {phoneLink ? (
                <a className="detail-link" href={phoneLink}>
                  {displayText(festival.phone)}
                </a>
              ) : (
                displayText(festival.phone)
              )}
            </DetailRow>

            <DetailRow label="홈페이지">
              {homepage ? (
                <a
                  className="detail-link"
                  href={homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {displayText(festival.homepage_url)}
                </a>
              ) : (
                displayText(festival.homepage_url)
              )}
            </DetailRow>

            <DetailRow label="관련정보">{displayText(festival.related_info)}</DetailRow>
            <DetailRow label="도로명주소">{displayText(festival.road_address)}</DetailRow>
            <DetailRow label="지번주소">{displayText(festival.parcel_address)}</DetailRow>
          </dl>

          <section className="detail-map-section" aria-label="개최 위치 지도">
            <h2 className="detail-map-section__title">지도</h2>
            {hasValidCoordinates(festival.latitude, festival.longitude) ? (
              <FestivalMap
                latitude={festival.latitude}
                longitude={festival.longitude}
                name={festival.festival_name}
              />
            ) : (
              <p className="state-message detail-map-section__empty">
                위치 좌표 정보가 없어 지도를 표시할 수 없습니다.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
