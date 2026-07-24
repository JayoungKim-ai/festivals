import { NavLink } from 'react-router-dom'

/** 공통 헤더: 서비스명 + 주요 메뉴 */
export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/festivals" className="site-brand">
          전국 축제 정보
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
