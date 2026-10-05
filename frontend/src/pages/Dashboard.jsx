import { useEffect, useState } from 'react'
import Parse from '../lib/parse'

function Dashboard() {
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const Parcel = Parse.Object.extend('Parcel')
        const query = new Parse.Query(Parcel)

        query.descending('createdAt')

        const results = await query.find()

        setParcels(
          results.map((parcel) => ({
            id: parcel.id,
            trackingNumber: parcel.get('trackingNumber'),
            recipientName: parcel.get('recipientName'),
            roomNumber: parcel.get('roomNumber'),
            courier: parcel.get('courier'),
            status: parcel.get('status'),
          }))
        )
      } catch (err) {
        console.error('DASHBOARD ERROR:', err)
        setError(err?.message || 'Unable to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const total = parcels.length

  const waiting = parcels.filter(
    (parcel) => parcel.status === 'WAITING'
  ).length

  const received = parcels.filter(
    (parcel) => parcel.status === 'RECEIVED'
  ).length

  const recentParcels = parcels.slice(0, 5)

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Parcel Dashboard</h1>
          <p>Overview of dormitory parcel management</p>
        </div>
      </header>

      {error && (
        <div className="panel">
          <p style={{ color: 'red' }}>
            Error: {error}
          </p>
        </div>
      )}

      <section className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon blue">📦</div>

          <div>
            <span>Total Parcels</span>
            <h2>{loading ? '-' : total}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">⌛</div>

          <div>
            <span>Waiting</span>
            <h2>{loading ? '-' : waiting}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">✓</div>

          <div>
            <span>Received</span>
            <h2>{loading ? '-' : received}</h2>
          </div>
        </div>

      </section>

      <section className="panel">

        <div className="panel-header">
          <div>
            <h3>Recent Parcels</h3>
            <p>Latest parcels delivered to the dormitory</p>
          </div>
        </div>

        {loading && <p>Loading parcels...</p>}

        {!loading && !error && recentParcels.length === 0 && (
          <p>No parcels found.</p>
        )}

        {!loading &&
          !error &&
          recentParcels.map((parcel) => (
            <div
              className="alert-row"
              key={parcel.id}
            >
              <div className="alert-symbol">
                📦
              </div>

              <div className="alert-info">
                <strong>
                  {parcel.trackingNumber}
                </strong>

                <span>
                  {parcel.recipientName}
                  {' • '}
                  Room {parcel.roomNumber}
                  {' • '}
                  {parcel.courier}
                </span>
              </div>

              <span
                className={`badge ${
                  parcel.status === 'RECEIVED'
                    ? 'low'
                    : 'medium'
                }`}
              >
                {parcel.status}
              </span>
            </div>
          ))}

      </section>
    </>
  )
}

export default Dashboard