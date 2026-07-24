import { NavLink } from 'react-router-dom'

/**
 * 모바일 전용 하단 탭 내비게이션
 * - 데스크톱에서는 CSS로 숨기고, 상단 헤더 메뉴를 사용한다.
 * - 화면 하단에 고정되어 한 손으로 이동하기 쉽게 한다.
 */

const TABS = [
  {
    to: '/calendar',
    label: '일자·지역',
    // 달력
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
      </>
    ),
  },
  {
    to: '/festivals',
    label: '축제 찾기',
    // 돋보기
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </>
    ),
  },
  {
    to: '/favorites',
    label: '즐겨찾기',
    // 별
    icon: (
      <polygon points="12 3 14.9 8.9 21.4 9.8 16.7 14.4 17.8 20.9 12 17.8 6.2 20.9 7.3 14.4 2.6 9.8 9.1 8.9" />
    ),
  },
  {
    to: '/about',
    label: '소개',
    // 정보
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16" />
        <line x1="12" y1="8" x2="12" y2="8" />
      </>
    ),
  },
]

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="모바일 메뉴">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            isActive ? 'mobile-nav__item is-active' : 'mobile-nav__item'
          }
        >
          <svg
            className="mobile-nav__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {tab.icon}
          </svg>
          <span className="mobile-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
