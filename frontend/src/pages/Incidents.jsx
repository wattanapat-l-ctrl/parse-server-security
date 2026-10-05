function Incidents() {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Security Incidents</h1>
          <p>Track and manage security incidents</p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Incident Management</h3>
            <p>Investigation and response status</p>
          </div>
        </div>

        <div className="incident-item">
          <span className="dot open"></span>
          <div>
            <strong>Suspicious SSH Login Incident</strong>
            <p>Assigned to Security Analyst</p>
          </div>
          <span className="badge high">OPEN</span>
        </div>

        <div className="incident-item">
          <span className="dot resolved"></span>
          <div>
            <strong>Failed Login Investigation</strong>
            <p>Investigation completed</p>
          </div>
          <span className="badge low">RESOLVED</span>
        </div>
      </div>
    </>
  )
}

export default Incidents