import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

import Dashboard from './pages/Dashboard'
import Parcels from './pages/Parcels'
import AddParcel from './pages/AddParcel'

function App() {
  return (
    <BrowserRouter>
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
              Parse Server
            </div>
          </div>
        </aside>

        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parcels" element={<Parcels />} />
            <Route path="/add-parcel" element={<AddParcel />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}

export default App