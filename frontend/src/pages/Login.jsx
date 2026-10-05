import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Parse from '../lib/parse'

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      // ล้าง session เก่าก่อน
      const currentUser = Parse.User.current()

      if (currentUser) {
        await Parse.User.logOut()
      }

      // Login กับ Parse Server
      const user = await Parse.User.logIn(
        username.trim(),
        password
      )

      console.log('LOGIN SUCCESS')
      console.log('User:', user.get('username'))
      console.log('User ID:', user.id)

      navigate('/', { replace: true })

    } catch (err) {
      console.error('LOGIN ERROR:', err)

      // แสดง error จริงเพื่อให้เราหาสาเหตุได้ง่าย
      setError(
        err?.message ||
        'ไม่สามารถเข้าสู่ระบบได้'
      )

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          🛡️
        </div>

        <h1>Security Management</h1>

        <p className="login-subtitle">
          Sign in to Security Management System
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <div className="login-footer">
          Parse Server Security
        </div>

      </div>
    </div>
  )
}

export default Login