import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Parse from '../lib/parse'

function AddParcel() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    trackingNumber: '',
    recipientName: '',
    roomNumber: '',
    courier: '',
    receivedDate: '',
    status: 'WAITING',
    notes: '',
  })

  function handleChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function clearForm() {
    setForm({
      trackingNumber: '',
      recipientName: '',
      roomNumber: '',
      courier: '',
      receivedDate: '',
      status: 'WAITING',
      notes: '',
    })

    setMessage('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const Parcel = Parse.Object.extend('Parcel')
      const parcel = new Parcel()

      parcel.set('trackingNumber', form.trackingNumber.trim())
      parcel.set('recipientName', form.recipientName.trim())
      parcel.set('roomNumber', form.roomNumber.trim())
      parcel.set('courier', form.courier)
      parcel.set('receivedDate', form.receivedDate)
      parcel.set('status', form.status)
      parcel.set('notes', form.notes.trim())

      await parcel.save()

      setMessage('เพิ่มพัสดุสำเร็จ')

      setTimeout(() => {
        navigate('/parcels')
      }, 1000)
    } catch (err) {
      console.error('ADD PARCEL ERROR:', err)
      setError(err?.message || 'ไม่สามารถเพิ่มพัสดุได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Add Parcel</h1>
          <p>Register a new parcel to the dormitory</p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Parcel Information</h3>
            <p>Enter the parcel details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="parcel-form-grid">

            <div className="form-group">
              <label>Tracking Number *</label>

              <input
                type="text"
                name="trackingNumber"
                placeholder="e.g. TH123456789"
                value={form.trackingNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Recipient Name *</label>

              <input
                type="text"
                name="recipientName"
                placeholder="Enter recipient name"
                value={form.recipientName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Room Number *</label>

              <input
                type="text"
                name="roomNumber"
                placeholder="e.g. 302"
                value={form.roomNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Courier *</label>

              <select
                name="courier"
                value={form.courier}
                onChange={handleChange}
                required
              >
                <option value="">Select courier</option>
                <option value="Flash Express">
                  Flash Express
                </option>
                <option value="J&T Express">
                  J&T Express
                </option>
                <option value="Kerry Express">
                  Kerry Express
                </option>
                <option value="Thailand Post">
                  Thailand Post
                </option>
                <option value="Shopee Express">
                  Shopee Express
                </option>
                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Received Date *</label>

              <input
                type="date"
                name="receivedDate"
                value={form.receivedDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Status *</label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                required
              >
                <option value="WAITING">
                  Waiting
                </option>

                <option value="RECEIVED">
                  Received
                </option>
              </select>
            </div>

          </div>

          <div className="form-group parcel-notes">
            <label>Notes</label>

            <textarea
              name="notes"
              placeholder="Additional information..."
              value={form.notes}
              onChange={handleChange}
              rows="4"
            />
          </div>

          {message && (
            <div className="register-success">
              {message}
            </div>
          )}

          {error && (
            <div className="login-error">
              Error: {error}
            </div>
          )}

          <div className="parcel-form-actions">

            <button
              type="button"
              className="parcel-cancel-button"
              onClick={clearForm}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              className="parcel-submit-button"
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : '+ Add Parcel'}
            </button>

          </div>
        </form>
      </div>
    </>
  )
}

export default AddParcel