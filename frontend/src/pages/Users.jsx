function Users() {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Users & Roles</h1>
          <p>Manage security users and permissions</p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Security Users</h3>
            <p>Users registered in the security system</p>
          </div>
        </div>

        <div className="incident-item">
          <div className="avatar">A</div>
          <div>
            <strong>Security Analyst</strong>
            <p>Role: SecurityAnalyst</p>
          </div>
          <span className="badge low">ACTIVE</span>
        </div>
      </div>
    </>
  )
}

export default Users