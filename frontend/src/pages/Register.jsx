import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Parse from '../lib/parse'

function Register() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setSuccess('')

    const cleanUsername = username.trim()

    if (cleanUsername.length < 4) {
      setError('Username ต้องมีอย่างน้อย 4 ตัวอักษร')
      return
    }

    if (password.length < 8) {
      setError('Password ต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    if (password !== confirmPassword) {
      setError('Password ทั้งสองช่องไม่ตรงกัน')
      return
    }

    setLoading(true)

    try {
      const result = await Parse.Cloud.run('registerUser', {
        username: cleanUsername,
        password: password
      })

      console.log('REGISTER SUCCESS:', result)

      setSuccess('สร้างบัญชีสำเร็จ กำลังกลับไปหน้า Login...')

      setUsername('')
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch (err) {
      console.error('REGISTER ERROR:', err)

      setError(
        err?.message ||
        'ไม่สามารถสร้างบัญชีได้'
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

        <h1>Create Account</h1>

        <p className="login-subtitle">
          Create a Security Management account
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>
              Username
            </label>

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

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

          </div>

          <div className="form-group">

            <label>
              Confirm Password
            </label>

            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {success && (
            <div className="register-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? 'Creating Account...'
              : 'Create Account'}
          </button>

        </form>

        <div className="register-link">
          Already have an account?{' '}
          <Link to="/login">
            Sign In
          </Link>
        </div>

        <div className="login-footer">
          Parse Server Security
        </div>

      </div>

    </div>
  )
}

export default Register