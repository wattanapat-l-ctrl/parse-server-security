import { useEffect, useState } from 'react'
import Parse from '../lib/parse'

function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true)
        setError('')

        const results = await Parse.Cloud.run('getSecurityAlerts')

        setAlerts(results || [])
      } catch (err) {
        console.error('GET ALERTS ERROR:', err)
        setError(err?.message || 'Unable to load security alerts')
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [])

  function getBadgeClass(severity) {
    const value = String(severity || '').toLowerCase()

    if (value === 'critical' || value === 'high') {
      return 'high'
    }

    if (value === 'medium') {
      return 'medium'
    }

    return 'low'
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Security Alerts</h1>
          <p>Monitor and review detected security events</p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>All Security Alerts</h3>
            <p>Security events detected by Parse Server</p>
          </div>
        </div>

        {loading && (
          <p>Loading security alerts...</p>
        )}

        {!loading && error && (
          <p style={{ color: 'red' }}>
            Error: {error}
          </p>
        )}

        {!loading && !error && alerts.length === 0 && (
          <p>No security alerts found.</p>
        )}

        {!loading &&
          !error &&
          alerts.map((alert) => (
            <div className="alert-row" key={alert.id}>

              <div className="alert-symbol">
                ⚠
              </div>

              <div className="alert-info">
                <strong>
                  {alert.title || 'Untitled Alert'}
                </strong>

                <span>
                  ID: {alert.id}

                  {alert.createdAt &&
                    ` • ${new Date(
                      alert.createdAt
                    ).toLocaleString()}`}
                </span>

                {alert.details && (
                  <span>{alert.details}</span>
                )}
              </div>

              <span
                className={`badge ${getBadgeClass(
                  alert.severity
                )}`}
              >
                {String(
                  alert.severity || 'unknown'
                ).toUpperCase()}
              </span>

            </div>
          ))}
      </div>
    </>
  )
}

export default Alerts