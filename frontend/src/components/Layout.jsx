import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileNav from './MobileNav'
import Fireworks from './Fireworks'

/** 모든 페이지에 헤더·푸터를 공통으로 감싸는 레이아웃 */
export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <Fireworks />
    </div>
  )
}
