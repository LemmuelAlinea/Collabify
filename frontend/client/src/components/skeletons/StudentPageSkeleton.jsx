function Line({ className = '' }) {
  return <span className={`student-skeleton-line ${className}`} />
}

function Card({ className = '', children }) {
  return <div className={`student-skeleton-card ${className}`}>{children}</div>
}

function Header({ title = 'Page', action = false }) {
  return (
    <div className="student-skeleton-header">
      <div>
        <Line className="xs" />
        <Line className="title" />
        <Line className="subtitle" />
      </div>
      {action ? <Line className="button" /> : null}
    </div>
  )
}

function Cards({ count = 2, kind = 'default' }) {
  return (
    <div className={`student-skeleton-card-grid ${kind}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className={kind}>
          <Line className="tag" />
          <Line className="heading" />
          <Line className="text" />
          <div className="student-skeleton-detail-grid">
            <Line />
            <Line />
          </div>
        </Card>
      ))}
    </div>
  )
}

function Filters({ count = 3 }) {
  return (
    <div className="student-skeleton-filters">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <Line className="label" />
          <Line className="input" />
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <section className="student-skeleton-page dashboard">
      <div className="student-skeleton-dashboard-head">
        <div>
          <Line className="xs" />
          <Line className="hero-title" />
          <Line className="subtitle" />
        </div>
        <Line className="search" />
      </div>
      <div className="student-skeleton-quick-grid">
        {Array.from({ length: 6 }).map((_, index) => <Card key={index} className="quick"><Line /><Line className="short" /></Card>)}
      </div>
      <div className="student-skeleton-dashboard-grid">
        <Card className="panel large"><Line className="heading" /><Line className="feed" /></Card>
        <div className="student-skeleton-stack">
          <Card className="panel"><Line className="heading" />{Array.from({ length: 5 }).map((_, index) => <Line key={index} className="row" />)}</Card>
          <Card className="panel"><Line className="heading" />{Array.from({ length: 2 }).map((_, index) => <Line key={index} className="row" />)}</Card>
        </div>
      </div>
    </section>
  )
}

function TasksSkeleton() {
  return (
    <section className="student-skeleton-page tasks">
      <Filters count={3} />
      <div className="student-skeleton-task-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="task">
            <Line className="tag" />
            <Line className="heading" />
            <Line className="text" />
            <Line className="meta" />
            <Line className="progress" />
          </Card>
        ))}
      </div>
    </section>
  )
}

function MessagesSkeleton() {
  return (
    <section className="student-skeleton-page messages">
      <Header title="Messages" />
      <div className="student-skeleton-message-layout">
        <Card className="chat-list">
          <div className="student-skeleton-tabs"><Line /><Line /></div>
          {Array.from({ length: 2 }).map((_, index) => <Line key={index} className="chat-item" />)}
        </Card>
        <Card className="chat-panel">
          <Line className="heading" />
          <Line className="message-box" />
          <Line className="composer" />
        </Card>
      </div>
    </section>
  )
}

function ProgressSkeleton() {
  return (
    <section className="student-skeleton-page progress">
      <Filters count={2} />
      <div className="student-skeleton-metric-grid">
        {Array.from({ length: 5 }).map((_, index) => <Card key={index} className="metric"><Line /><Line className="big" /><Line /></Card>)}
      </div>
      <Card className="timeline">
        <Line className="heading" />
        {Array.from({ length: 7 }).map((_, index) => <Line key={index} className="timeline-row" />)}
      </Card>
    </section>
  )
}

function ProfileSkeleton() {
  return (
    <section className="student-skeleton-page profile">
      <Card className="profile-head"><Line className="avatar" /><div><Line className="xs" /><Line className="heading" /><Line className="text" /></div><Line className="button" /></Card>
      <div className="student-skeleton-profile-grid">
        {Array.from({ length: 5 }).map((_, index) => <Card key={index} className="field"><Line className="label" /><Line className="text" /></Card>)}
      </div>
    </section>
  )
}

function PlannerSkeleton() {
  return (
    <section className="student-skeleton-page planner">
      <Header title="AI Task Generation" action />
      <Filters count={2} />
      <Card className="empty-plan"><Line className="heading" /><Line className="text" /></Card>
      <Line className="section-title" />
    </section>
  )
}

function ReassignmentsSkeleton() {
  return (
    <section className="student-skeleton-page reassignments">
      <Header title="Task Reassignment" action />
      <div className="student-skeleton-reassignment-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="table">
            <Line className="heading" />
            <Line className="search" />
            {Array.from({ length: index === 1 ? 5 : 2 }).map((__, row) => <Line key={row} className="row" />)}
          </Card>
        ))}
      </div>
    </section>
  )
}

function AnalyticsSkeleton() {
  return (
    <section className="student-skeleton-page analytics">
      <Header title="Analytics" />
      <Filters count={4} />
      <div className="student-skeleton-metric-grid analytics">
        {Array.from({ length: 6 }).map((_, index) => <Card key={index} className="metric"><Line /><Line className="big" /></Card>)}
      </div>
      <div className="student-skeleton-metric-grid analytics-summary">
        {Array.from({ length: 4 }).map((_, index) => <Card key={index} className="metric"><Line /><Line className="big" /><Line /></Card>)}
      </div>
      <div className="student-skeleton-analytics-charts">
        <Card className="chart"><Line className="heading" /><Line className="chart-body" /></Card>
        <Card className="chart"><Line className="heading" /><Line className="chart-body" /></Card>
      </div>
      <Card className="archive-table">
        <div className="student-skeleton-tabs"><Line /><Line /><Line /></div>
        {Array.from({ length: 5 }).map((_, index) => <Line key={index} className="row" />)}
      </Card>
    </section>
  )
}

function ArchiveSkeleton() {
  return (
    <section className="student-skeleton-page archive">
      <Header title="Archive" />
      <Card className="archive-table">
        <div className="student-skeleton-archive-controls">
          <Line className="search" />
          <Line className="input" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => <Line key={index} className="row" />)}
      </Card>
    </section>
  )
}

export function StudentPageSkeleton({ variant }) {
  if (variant === 'dashboard') return <DashboardSkeleton />
  if (variant === 'classes') return <section className="student-skeleton-page"><Header title="My Classes" action /><Cards count={2} kind="class" /></section>
  if (variant === 'projects') return <section className="student-skeleton-page"><Header title="Projects" /><Cards count={2} kind="project" /></section>
  if (variant === 'groups') return <section className="student-skeleton-page"><Header title="Groups" /><Line className="section-title" /><Cards count={2} kind="group" /></section>
  if (variant === 'tasks') return <TasksSkeleton />
  if (variant === 'planner') return <PlannerSkeleton />
  if (variant === 'reassignments') return <ReassignmentsSkeleton />
  if (variant === 'messages') return <MessagesSkeleton />
  if (variant === 'progress') return <ProgressSkeleton />
  if (variant === 'profile') return <ProfileSkeleton />
  if (variant === 'analytics') return <AnalyticsSkeleton />
  if (variant === 'archive') return <ArchiveSkeleton />
  return <section className="student-skeleton-page"><Header /></section>
}
