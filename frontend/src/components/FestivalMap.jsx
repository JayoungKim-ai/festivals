import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * 지도 타일: OpenStreetMap (API 키 불필요, 한글 지명 표시)
 * - CARTO 등 다른 무료 타일은 이제 API 키가 필요해 사용하지 않는다.
 */
const TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abc',
}

/** 테마 색 물방울 핀 (SVG) */
const PIN_HTML = `
<svg viewBox="0 0 36 46" width="36" height="46" aria-hidden="true">
  <path d="M18 44s-14-14.2-14-25.5A14 14 0 0 1 32 18.5C32 29.8 18 44 18 44z"
        fill="#be185d" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="18" cy="18.5" r="5.5" fill="#fbbf24"/>
</svg>`

const FestivalPinIcon = L.divIcon({
  className: 'festival-pin',
  html: PIN_HTML,
  iconSize: [36, 46],
  iconAnchor: [18, 44],
  popupAnchor: [0, -40],
})

/**
 * 마우스 환경(데스크톱)인지 판별.
 * 터치 기기에서 지도 드래그를 켜면 페이지 스크롤이 지도에 걸리므로 마우스일 때만 켠다.
 */
function isMousePointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** 핀 묶음 아이콘: 개수에 따라 크기 3단계 */
function createClusterIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 38 : count < 30 ? 46 : 54
  const level = count < 10 ? 'sm' : count < 30 ? 'md' : 'lg'
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `festival-cluster festival-cluster--${level}`,
    iconSize: L.point(size, size, true),
  })
}

function FestivalTileLayer() {
  return (
    <TileLayer
      attribution={TILE.attribution}
      url={TILE.url}
      subdomains={TILE.subdomains}
    />
  )
}

/** 좌표 유효 여부 (상세·달력 지도 공통) */
export function hasValidCoordinates(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return false
  return true
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions.length) return
    if (positions.length === 1) {
      map.setView(positions[0], 13)
      return
    }
    map.fitBounds(positions, { padding: [36, 36], maxZoom: 13 })
  }, [map, positions])
  return null
}

/**
 * 축제 위치 지도 (단일 마커) — 상세 화면용
 */
export default function FestivalMap({ latitude, longitude, name }) {
  if (!hasValidCoordinates(latitude, longitude)) {
    return null
  }

  const position = [Number(latitude), Number(longitude)]

  return (
    <div className="festival-map">
      {/* 축제 하나 보기: 확대·축소만 허용, 지도는 항상 축제 위치를 가운데에 둔다 */}
      <MapContainer
        center={position}
        zoom={14}
        dragging={false}
        scrollWheelZoom={false}
        // 두 손가락·더블클릭 확대도 누른 곳이 아니라 가운데(축제 위치) 기준
        touchZoom="center"
        doubleClickZoom="center"
        // 키보드 +/- 확대는 두고 방향키 이동만 막는다
        keyboardPanDelta={0}
        className="festival-map__canvas"
      >
        <FestivalTileLayer />
        <Marker position={position} icon={FestivalPinIcon}>
          {name ? (
            <Popup>
              <strong className="festival-popup__title">{name}</strong>
            </Popup>
          ) : null}
        </Marker>
      </MapContainer>
    </div>
  )
}

/**
 * 여러 축제 마커 지도 — 일자별 검색용
 * @param {{ id: number, festival_name: string, latitude: number, longitude: number }[]} festivals
 */
export function FestivalsMap({ festivals }) {
  const points = (festivals || [])
    .filter((f) => hasValidCoordinates(f.latitude, f.longitude))
    .map((f) => ({
      id: f.id,
      name: f.festival_name,
      location: f.location,
      position: [Number(f.latitude), Number(f.longitude)],
    }))

  if (points.length === 0) {
    return null
  }

  const positions = points.map((p) => p.position)
  const center = positions[0]

  return (
    <div className="festival-map">
      <MapContainer
        key={points.map((p) => p.id).join('-')}
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        dragging={isMousePointer()}
        touchZoom={true}
        className="festival-map__canvas festival-map__canvas--wide"
      >
        <FestivalTileLayer />
        <FitBounds positions={positions} />
        {/* 가까운 핀은 숫자 묶음으로 — 누르면 확대되고, 같은 자리 핀은 펼쳐진다 */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={48}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          iconCreateFunction={createClusterIcon}
        >
          {points.map((point) => (
            <Marker key={point.id} position={point.position} icon={FestivalPinIcon}>
              <Popup>
                <strong className="festival-popup__title">{point.name}</strong>
                {point.location && (
                  <span className="festival-popup__place">{point.location}</span>
                )}
                <Link className="festival-popup__link" to={`/festivals/${point.id}`}>
                  상세 보기 ›
                </Link>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      <p className="festival-map__note">
        숫자 묶음을 누르면 확대되고, 핀을 누르면 상세 링크가 보여요 · {points.length}곳 표시
      </p>
    </div>
  )
}
