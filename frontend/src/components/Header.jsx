import { NavLink } from 'react-router-dom'

/** 공통 헤더: 서비스명 + 주요 메뉴 */
export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/festivals" className="site-brand">
          <svg className="site-brand__logo" viewBox="0 0 32 32" aria-hidden="true">
            <g strokeLinecap="round" strokeWidth="2.4">
              <path d="M16 4v6M16 22v6M4 16h6M22 16h6" stroke="#fbbf24" />
              <path d="M7.5 7.5l4.2 4.2M20.3 20.3l4.2 4.2M24.5 7.5l-4.2 4.2M11.7 20.3l-4.2 4.2" stroke="#f472b6" />
            </g>
            <circle cx="16" cy="16" r="2.6" fill="#ffd166" />
          </svg>
          <span>전국 축제 정보</span>
        </NavLink>
        <nav className="site-nav" aria-label="주요 메뉴">
          <NavLink
            to="/festivals"
            className={({ isActive }) => (isActive ? 'site-nav__link is-active' : 'site-nav__link')}
          >
            축제 찾기
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => (isActive ? 'site-nav__link is-active' : 'site-nav__link')}
          >
            일자·지역
          </NavLink>
          <NavLink
            to="/favorites"
            className={({ isActive }) => (isActive ? 'site-nav__link is-active' : 'site-nav__link')}
          >
            즐겨찾기
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? 'site-nav__link is-active' : 'site-nav__link')}
          >
            서비스 소개
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
