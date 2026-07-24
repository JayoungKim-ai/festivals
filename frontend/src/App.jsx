import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import FestivalListPage from './pages/FestivalListPage'
import FestivalDetailPage from './pages/FestivalDetailPage'
import FavoritesPage from './pages/FavoritesPage'
import CalendarPage from './pages/CalendarPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/festivals" replace />} />
        <Route path="festivals" element={<FestivalListPage />} />
        <Route path="festivals/:id" element={<FestivalDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/festivals" replace />} />
      </Route>
    </Routes>
  )
}
