import { Link } from 'react-router-dom'

export function AuthLayout({ children, eyebrow, title, subtitle }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-block">
          <img className="brand-logo" src="/brand/collabify-logo.png" alt="Collabify" />
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="auth-title">{title}</h1>
          </div>
        </div>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
      <aside className="auth-aside">
        <Link to="/" className="auth-aside-logo">
          <img src="/brand/collabify-logo.png" alt="" />
          <span>Collabify</span>
        </Link>
        <div className="auth-orbit" aria-hidden="true">
          <img className="auth-icon auth-icon-team" src="/illustrations/team.png" alt="" />
          <img className="auth-icon auth-icon-checklist" src="/illustrations/checklist.png" alt="" />
          <img className="auth-icon auth-icon-analytics" src="/illustrations/analytics.png" alt="" />
          <img className="auth-icon auth-icon-kanban" src="/illustrations/kanban.png" alt="" />
          <img className="auth-icon auth-icon-clock" src="/illustrations/clock.png" alt="" />
        </div>
        <div className="auth-aside-copy">
          <h2>Academic project management for BSIT teams.</h2>
          <p>Secure class spaces, role-aware collaboration, and AI-assisted project workflows.</p>
        </div>
      </aside>
    </main>
  )
}
