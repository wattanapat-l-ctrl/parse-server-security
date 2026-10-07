import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import Parse from './lib/parse'

import Dashboard from './pages/Dashboard'
import Parcels from './pages/Parcels'
import AddParcel from './pages/AddParcel'
import Login from './pages/Login'
import Register from './pages/Register'

function RequireAuth({ children }) {
  if (!Parse.User.current()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppLayout() {
  const navigate = useNavigate()
  const currentUser = Parse.User.current()

  async function handleLogout() {
    await Parse.User.logOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">📦</div>

          <div>
            <h2>Parcel</h2>
            <span>Dormitory Management</span>
          </div>
        </div>

        <nav className="menu">

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >
            <span>▦</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/parcels"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >
            <span>📦</span>
            Parcels
          </NavLink>

          <NavLink
            to="/add-parcel"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >
            <span>＋</span>
            Add Parcel
          </NavLink>

        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span>●</span>
            {currentUser?.get('username') || 'Parse Server'}
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parcels" element={<Parcels />} />
          <Route path="/add-parcel" element={<AddParcel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
