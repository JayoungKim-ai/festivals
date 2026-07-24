import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Vite 번들에서 기본 마커 아이콘 경로가 깨지는 문제 보정
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

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
    map.fitBounds(positions, { padding: [28, 28], maxZoom: 13 })
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
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        className="festival-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          {name ? <Popup>{name}</Popup> : null}
        </Marker>
      </MapContainer>
      <p className="festival-map__note">지도 타일: OpenStreetMap</p>
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
        className="festival-map__canvas festival-map__canvas--wide"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {points.map((point) => (
          <Marker key={point.id} position={point.position}>
            <Popup>{point.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="festival-map__note">
        지도 타일: OpenStreetMap · 좌표가 있는 축제 {points.length}곳 표시
      </p>
    </div>
  )
}
