import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Parse from '../lib/parse'

function Parcels() {
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchParcels() {
    const Parcel = Parse.Object.extend('Parcel')
    const query = new Parse.Query(Parcel)

    query.descending('createdAt')

    const results = await query.find()

    return results.map((parcel) => ({
      id: parcel.id,
      trackingNumber: parcel.get('trackingNumber'),
      recipientName: parcel.get('recipientName'),
      roomNumber: parcel.get('roomNumber'),
      courier: parcel.get('courier'),
      receivedDate: parcel.get('receivedDate'),
      status: parcel.get('status'),
      notes: parcel.get('notes'),
    }))
  }

  async function loadParcels() {
    setLoading(true)
    setError('')

    try {
      setParcels(await fetchParcels())
    } catch (err) {
      console.error('LOAD PARCEL ERROR:', err)
      setError(err?.message || 'Unable to load parcels')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function initialLoad() {
      try {
        setParcels(await fetchParcels())
      } catch (err) {
        console.error('LOAD PARCEL ERROR:', err)
        setError(err?.message || 'Unable to load parcels')
      } finally {
        setLoading(false)
      }
    }

    initialLoad()
  }, [])

  async function markReceived(id) {
    try {
      const Parcel = Parse.Object.extend('Parcel')
      const query = new Parse.Query(Parcel)

      const parcel = await query.get(id)

      parcel.set('status', 'RECEIVED')

      await parcel.save()

      await loadParcels()
    } catch (err) {
      console.error('UPDATE PARCEL ERROR:', err)
      alert(`Error: ${err.message}`)
    }
  }

  async function deleteParcel(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this parcel?'
    )

    if (!confirmed) return

    try {
      const Parcel = Parse.Object.extend('Parcel')
      const query = new Parse.Query(Parcel)

      const parcel = await query.get(id)

      await parcel.destroy()

      await loadParcels()
    } catch (err) {
      console.error('DELETE PARCEL ERROR:', err)
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Parcels</h1>
          <p>Manage dormitory parcels</p>
        </div>

        <Link
          to="/add-parcel"
          className="parcel-add-link"
        >
          + Add Parcel
        </Link>
      </header>

      <div className="panel">

        <div className="panel-header">
          <div>
            <h3>Parcel List</h3>
            <p>All parcels registered in the system</p>
          </div>
        </div>

        {loading && (
          <p>Loading parcels...</p>
        )}

        {error && (
          <p style={{ color: 'red' }}>
            Error: {error}
          </p>
        )}

        {!loading && !error && parcels.length === 0 && (
          <p>No parcels found.</p>
        )}

        {!loading && !error && parcels.length > 0 && (
          <div className="parcel-table-wrapper">

            <table className="parcel-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Recipient</th>
                  <th>Room</th>
                  <th>Courier</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {parcels.map((parcel) => (
                  <tr key={parcel.id}>

                    <td>
                      <strong>
                        {parcel.trackingNumber}
                      </strong>
                    </td>

                    <td>
                      {parcel.recipientName}
                    </td>

                    <td>
                      {parcel.roomNumber}
                    </td>

                    <td>
                      {parcel.courier}
                    </td>

                    <td>
                      {parcel.receivedDate}
                    </td>

                    <td>
                      <span
                        className={
                          parcel.status === 'RECEIVED'
                            ? 'parcel-status received'
                            : 'parcel-status waiting'
                        }
                      >
                        {parcel.status}
                      </span>
                    </td>

                    <td>
                      <div className="parcel-actions">

                        {parcel.status !== 'RECEIVED' && (
                          <button
                            className="parcel-received-button"
                            onClick={() =>
                              markReceived(parcel.id)
                            }
                          >
                            Received
                          </button>
                        )}

                        <button
                          className="parcel-delete-button"
                          onClick={() =>
                            deleteParcel(parcel.id)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        )}

      </div>
    </>
  )
}

export default Parcels