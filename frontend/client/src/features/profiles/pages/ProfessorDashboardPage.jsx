import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  LineChart,
  Megaphone,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useActivity } from '../../activity/hooks/useActivity'
import { useAuth } from '../../auth/hooks/useAuth'
import { getClassDetails } from '../../classes/services/classService'
import { useClasses } from '../../classes/hooks/useClasses'
import { useGroups } from '../../groups/hooks/useGroups'
import { useNotifications } from '../../notifications/hooks/useNotifications'
import { NotificationDropdown } from '../../notifications/components/NotificationDropdown'
import { useProgress } from '../../progress/hooks/useProgress'
import { useProjects } from '../../projects/hooks/useProjects'
import { useTasks } from '../../tasks/hooks/useTasks'

const ANNOUNCEMENTS_PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function fullNameFromProfile(profile, user) {
  const combined = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
  if (combined) return combined
  if (profile?.fullName) return profile.fullName
  if (profile?.displayName) return profile.displayName
  if (profile?.display_name) return profile.display_name
  return user?.email ?? 'Professor'
}

function initials(name = 'P') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('') || 'P'
}

function flattenTasks(items) {
  return items.flatMap((task) => [task, ...(task.children?.length ? flattenTasks(task.children) : [])])
}

function dueLabel(value) {
  if (!value) return 'No deadline'
  const due = new Date(value)
  const now = new Date()
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `${diff}d left`
}

function riskFromProgress(progress) {
  if (progress >= 80) return 'Low'
  if (progress >= 55) return 'Medium'
  return 'High'
}

export function ProfessorDashboardPage() {
  const { profile, user } = useAuth()
  const { classes, isLoading: isLoadingClasses } = useClasses()
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const { groups, isLoading: isLoadingGroups } = useGroups()
  const taskFilters = useMemo(() => ({}), [])
  const activityFilters = useMemo(() => ({ limit: 30 }), [])
  const { tasks, isLoading: isLoadingTasks } = useTasks(taskFilters)
  const { progress } = useProgress()
  const { activity } = useActivity(activityFilters)
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
  } = useNotifications()

  const [search, setSearch] = useState('')
  const [isBellOpen, setIsBellOpen] = useState(false)
  const [announcementFeed, setAnnouncementFeed] = useState([])
  const [visibleAnnouncements, setVisibleAnnouncements] = useState(ANNOUNCEMENTS_PAGE_SIZE)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true)
  const feedLoadAnchorRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function loadAnnouncements() {
      setIsLoadingAnnouncements(true)
      try {
        const details = await Promise.all(classes.map((classItem) => getClassDetails(classItem.id).catch(() => null)))
        if (!mounted) return
        const merged = details
          .filter(Boolean)
          .flatMap((detail) => (detail.announcements ?? []).map((announcement) => ({
            ...announcement,
            classId: detail.class.id,
            className: detail.class.name,
            type: announcement.projectId ? 'Project Announcement' : 'Class Announcement',
            commentCount: announcement.commentCount ?? 0,
          })))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
            return new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() - new Date(a.publishedAt ?? a.createdAt ?? 0).getTime()
          })
        setAnnouncementFeed(merged)
      } finally {
        if (mounted) setIsLoadingAnnouncements(false)
      }
    }
    loadAnnouncements()
    return () => {
      mounted = false
    }
  }, [classes])

  useEffect(() => {
    const anchor = feedLoadAnchorRef.current
    if (!anchor) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setVisibleAnnouncements((current) => Math.min(current + ANNOUNCEMENTS_PAGE_SIZE, announcementFeed.length))
    }, { rootMargin: '220px' })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [announcementFeed.length])

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks])
  const activeProjects = useMemo(() => projects.filter((project) => project.status !== 'archived'), [projects])
  const activeClasses = useMemo(() => classes.filter((classItem) => !classItem.isArchived), [classes])
  const progressProjectById = useMemo(() => new Map((progress?.projects ?? []).map((project) => [project.id, project])), [progress?.projects])
  const progressGroupById = useMemo(() => new Map((progress?.groups ?? []).map((group) => [group.id, group])), [progress?.groups])

  const projectRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return activeProjects
      .filter((project) => !query || project.title.toLowerCase().includes(query))
      .map((project) => {
        const metrics = progressProjectById.get(project.id)
        const projectGroups = groups.filter((group) => group.projectId === project.id)
        const progressValue = metrics?.progress ?? 0
        const remaining = Math.max(0, (metrics?.taskCompletion?.total ?? 0) - (metrics?.taskCompletion?.completed ?? 0))
        return {
          ...project,
          groups: projectGroups.length,
          progress: progressValue,
          health: progressValue >= 75 ? 'Healthy' : progressValue >= 50 ? 'Watch' : 'At Risk',
          risk: riskFromProgress(progressValue),
          remaining,
        }
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 6)
  }, [activeProjects, groups, progressProjectById, search])

  const classRows = useMemo(() => {
    return activeClasses
      .map((classItem) => {
        const classGroups = groups.filter((group) => group.classId === classItem.id)
        const classProjectIds = [...new Set(classGroups.map((group) => group.projectId).filter(Boolean))]
        const classProjectProgress = classProjectIds.map((projectId) => progressProjectById.get(projectId)?.progress ?? 0)
        const avgProgress = classProjectProgress.length ? Math.round(classProjectProgress.reduce((sum, value) => sum + value, 0) / classProjectProgress.length) : 0
        return {
          ...classItem,
          projects: classProjectIds.length,
          members: classItem.memberCount ?? 0,
          progress: avgProgress,
          health: avgProgress >= 75 ? 'Healthy' : avgProgress >= 50 ? 'Watch' : 'At Risk',
        }
      })
      .slice(0, 4)
  }, [activeClasses, groups, progressProjectById])

  const alerts = useMemo(() => {
    const overdueTasks = flatTasks.filter((task) => task.status !== 'done' && dueLabel(task.dueAt).includes('overdue')).length
    const blockedTasks = flatTasks.filter((task) => task.status === 'blocked').length
    const pendingReassignments = notifications.filter((item) => item.type === 'reassignment' && !item.isRead).length
    const inactiveGroups = (progress?.groups ?? []).filter((group) => (group.progress ?? 0) < 40).length
    const imbalanceGroups = (progress?.groups ?? []).filter((group) => {
      const points = (group.members ?? []).map((member) => member.contributionPoints ?? 0)
      if (points.length < 2) return false
      const max = Math.max(...points)
      const min = Math.min(...points)
      return max - min > 25
    }).length
    return [
      { icon: TriangleAlert, label: 'Contribution Imbalance', value: imbalanceGroups, to: '/professor/contributions' },
      { icon: Users, label: 'Inactive Groups', value: inactiveGroups, to: '/professor/progress' },
      { icon: CalendarDays, label: 'Deadline Risks', value: overdueTasks, to: '/professor/projects' },
      { icon: RefreshCcw, label: 'Pending Reassignment', value: pendingReassignments, to: '/professor/reassignments' },
      { icon: ClipboardList, label: 'Overdue Tasks', value: overdueTasks + blockedTasks, to: '/professor/tasks' },
    ]
  }, [flatTasks, notifications, progress?.groups])

  const announcementRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return announcementFeed
      .filter((announcement) => !query || `${announcement.title} ${announcement.body} ${announcement.className}`.toLowerCase().includes(query))
      .slice(0, visibleAnnouncements)
  }, [announcementFeed, search, visibleAnnouncements])

  const activityRows = useMemo(() => activity.slice(0, 10), [activity])

  const taskHealth = useMemo(() => {
    const total = flatTasks.length
    const completed = flatTasks.filter((task) => task.status === 'done').length
    const pending = flatTasks.filter((task) => task.status === 'todo').length
    const blocked = flatTasks.filter((task) => task.status === 'blocked').length
    const overdue = flatTasks.filter((task) => task.status !== 'done' && dueLabel(task.dueAt).includes('overdue')).length
    const completedRate = total ? Math.round((completed / total) * 100) : 0
    return { total, completed, pending, blocked, overdue, completedRate }
  }, [flatTasks])

  const groupInsights = useMemo(() => {
    return (progress?.groups ?? [])
      .map((group) => {
        const points = (group.members ?? []).map((member) => member.contributionPoints ?? 0)
        const max = points.length ? Math.max(...points) : 0
        const min = points.length ? Math.min(...points) : 0
        const contribution = max - min <= 25 ? 'Balanced' : 'Uneven'
        const groupProgress = group.progress ?? 0
        return {
          id: group.id,
          name: group.name,
          progress: groupProgress,
          contribution,
          health: groupProgress >= 75 ? 'Healthy' : groupProgress >= 50 ? 'Watch' : 'At Risk',
          risk: riskFromProgress(groupProgress),
        }
      })
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 8)
  }, [progress?.groups])

  const learningInsights = useMemo(() => {
    const avgLearning = Math.round((progress?.overview?.averageProjectProgress ?? 0) * 0.9)
    return [
      { label: 'Outcome Achievement', value: Math.min(100, avgLearning + 7) },
      { label: 'Skill Growth', value: Math.min(100, avgLearning + 3) },
      { label: 'Learning Score', value: Math.min(100, avgLearning + 5) },
    ]
  }, [progress?.overview?.averageProjectProgress])

  const aiInsights = useMemo(() => ([
    { text: 'Group Beta requires intervention.', action: '/professor/groups' },
    { text: 'Extend deadline by 3 days for at-risk projects.', action: '/professor/projects' },
    { text: 'Redistribute workload to reduce imbalance.', action: '/professor/reassignments' },
    { text: 'Increase documentation checkpoints.', action: '/professor/tasks' },
  ]), [])

  const contributionSnapshot = useMemo(() => {
    const rows = groupInsights
    const top = rows.reduce((best, row) => (row.progress > (best?.progress ?? -1) ? row : best), null)
    const low = rows.reduce((worst, row) => (row.progress < (worst?.progress ?? 101) ? row : worst), null)
    const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0
    const fairness = rows.filter((row) => row.contribution === 'Balanced').length
    return {
      average,
      top: top?.name ?? 'N/A',
      low: low?.name ?? 'N/A',
      fairness: rows.length ? Math.round((fairness / rows.length) * 100) : 0,
    }
  }, [groupInsights])

  const upcomingDeadlines = useMemo(() => {
    const rows = flatTasks
      .filter((task) => task.status !== 'done' && task.dueAt)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 8)
    return {
      today: rows.filter((task) => dueLabel(task.dueAt) === 'Due today'),
      tomorrow: rows.filter((task) => dueLabel(task.dueAt) === 'Due tomorrow'),
      upcoming: rows.filter((task) => {
        const label = dueLabel(task.dueAt)
        return label !== 'Due today' && label !== 'Due tomorrow'
      }),
    }
  }, [flatTasks])

  const rightSidebarEvents = useMemo(() => activityRows.slice(0, 4), [activityRows])
  const messageNotifications = useMemo(() => notifications.filter((notification) => notification.type === 'message').slice(0, 4), [notifications])

  const quickActions = useMemo(() => ([
    { icon: GraduationCap, label: 'Create Class', text: 'Open class setup', to: '/professor/classes' },
    { icon: FolderKanban, label: 'Create Project', text: 'Schedule new project', to: '/professor/projects' },
    { icon: BookOpen, label: 'Upload Syllabus', text: 'Manage course docs', to: '/professor/syllabi' },
    { icon: Bot, label: 'Generate Tasks', text: 'AI task planner', to: '/professor/tasks/ai-planner' },
    { icon: RefreshCcw, label: 'Review Reassignment', text: 'Pending approvals', to: '/professor/reassignments' },
    { icon: LineChart, label: 'Open Analytics', text: 'Class insights', to: '/professor/analytics' },
    { icon: Megaphone, label: 'Create Announcement', text: 'Post updates', to: '/professor/classes' },
    { icon: HeartPulse, label: 'View Project Health', text: 'Risk overview', to: '/professor/health' },
  ]), [])

  const kpis = useMemo(() => {
    const students = activeClasses.reduce((sum, classItem) => sum + (classItem.memberCount ?? 0), 0)
    const pendingReviews = notifications.filter((notification) => !notification.isRead && (notification.type === 'submission' || notification.type === 'reassignment')).length
    const avgCompletion = progress?.overview?.taskCompletion?.progress ?? 0
    const atRiskGroups = (progress?.groups ?? []).filter((group) => (group.progress ?? 0) < 50).length
    const learningScore = learningInsights[2]?.value ?? 0
    const health = projectRows.length ? Math.round(projectRows.reduce((sum, project) => sum + project.progress, 0) / projectRows.length) : 0
    return [
      { label: 'Active Classes', value: activeClasses.length, hint: 'Teaching now' },
      { label: 'Active Projects', value: activeProjects.length, hint: 'Running' },
      { label: 'Students', value: students, hint: 'Enrolled' },
      { label: 'Pending Reviews', value: pendingReviews, hint: 'Action needed' },
      { label: 'Average Completion', value: `${avgCompletion}%`, hint: 'Across tasks' },
      { label: 'At Risk Groups', value: atRiskGroups, hint: 'Monitor' },
      { label: 'Average Learning', value: `${learningScore}%`, hint: 'Estimated' },
      { label: 'Overall Health', value: `${health}%`, hint: health >= 70 ? 'Healthy' : 'Needs attention' },
    ]
  }, [activeClasses, activeProjects.length, learningInsights, notifications, progress?.groups, progress?.overview?.taskCompletion?.progress, projectRows])

  const name = fullNameFromProfile(profile, user)
  const isLoading = isLoadingClasses || isLoadingProjects || isLoadingGroups || isLoadingTasks
  if (isLoading) return <div className="route-state">Loading dashboard...</div>

  return (
    <section className="prof-dashboard-page">
      <motion.header className="prof-dashboard-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="prof-dashboard-kicker">Good day,</p>
          <h1>Professor {name}</h1>
          <p>You manage {activeClasses.length} classes, {activeProjects.length} projects, {activeClasses.reduce((sum, classItem) => sum + (classItem.memberCount ?? 0), 0)} students.</p>
        </div>
        <div className="prof-dashboard-header-tools">
          <label className="prof-dashboard-search-wrap">
            <Search size={14} aria-hidden="true" />
            <input
              aria-label="Search dashboard"
              placeholder="Search classes, projects, groups..."
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="prof-dashboard-bell-wrap">
            <button className="prof-dashboard-bell" type="button" onClick={() => setIsBellOpen((current) => !current)}>
              <Bell size={16} aria-hidden="true" />
              {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
            </button>
            {isBellOpen ? (
              <NotificationDropdown
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
              />
            ) : null}
          </div>
          <div className="prof-dashboard-avatar">{initials(name)}</div>
        </div>
      </motion.header>

      <section className="prof-dashboard-actions-grid">
        {quickActions.map((action) => (
          <Link className="prof-dashboard-action-card" key={action.label} to={action.to}>
            <action.icon size={18} aria-hidden="true" />
            <div>
              <strong>{action.label}</strong>
              <p>{action.text}</p>
            </div>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <section className="prof-dashboard-kpi-grid">
        {kpis.map((kpi) => (
          <article className="prof-dashboard-kpi-card" key={kpi.label}>
            <p>{kpi.label}</p>
            <strong>{kpi.value}</strong>
            <span>{kpi.hint}</span>
          </article>
        ))}
      </section>

      <div className="prof-dashboard-main-grid">
        <div className="prof-dashboard-main-column">
          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>My Classes</h2>
              <Link to="/professor/classes">View All</Link>
            </header>
            <div className="prof-dashboard-class-grid">
              {classRows.map((row) => (
                <article className="prof-dashboard-class-card" key={row.id}>
                  <div>
                    <h3>{row.subject}</h3>
                    <p>{row.section} · Year {row.yearLevel}</p>
                  </div>
                  <dl>
                    <div><dt>Students</dt><dd>{row.members}</dd></div>
                    <div><dt>Projects</dt><dd>{row.projects}</dd></div>
                    <div><dt>Progress</dt><dd>{row.progress}%</dd></div>
                    <div><dt>Health</dt><dd>{row.health}</dd></div>
                  </dl>
                  <div className="prof-dashboard-inline-actions">
                    <Link to={`/professor/classes/${row.id}`}>Open</Link>
                    <Link to="/professor/analytics">Analytics</Link>
                    <Link to="/professor/classes">Manage</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Project Command Center</h2>
              <Link to="/professor/projects">View All</Link>
            </header>
            <div className="prof-dashboard-project-grid">
              {projectRows.map((project) => (
                <article className="prof-dashboard-project-card" key={project.id}>
                  <h3>{project.title}</h3>
                  <p>{project.groups} groups · {project.remaining} tasks left</p>
                  <dl>
                    <div><dt>Progress</dt><dd>{project.progress}%</dd></div>
                    <div><dt>Health</dt><dd>{project.health}</dd></div>
                    <div><dt>Risk</dt><dd>{project.risk}</dd></div>
                    <div><dt>Deadline</dt><dd>{dueLabel(project.deadlineAt)}</dd></div>
                  </dl>
                  <div className="prof-dashboard-inline-actions">
                    <Link to={`/professor/projects/${project.id}`}>Open</Link>
                    <Link to="/professor/projects">Manage</Link>
                    <button type="button">Archive</button>
                    <Link to="/professor/analytics">Analytics</Link>
                    <Link to="/professor/tasks/ai-planner">Generate Tasks</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Attention Required</h2>
            </header>
            <div className="prof-dashboard-alert-grid">
              {alerts.map((alert) => (
                <article className="prof-dashboard-alert-card" key={alert.label}>
                  <div>
                    <alert.icon size={16} aria-hidden="true" />
                    <strong>{alert.label}</strong>
                  </div>
                  <p>{alert.value} flagged</p>
                  <div className="prof-dashboard-inline-actions">
                    <Link to={alert.to}>Open</Link>
                    <button type="button">Resolve</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Announcements</h2>
              <Link to="/professor/classes">Create</Link>
            </header>
            <div className="prof-dashboard-announcement-feed">
              {isLoadingAnnouncements ? <p className="prof-dashboard-muted">Loading announcements...</p> : null}
              {announcementRows.map((announcement) => {
                const expanded = expandedIds.has(announcement.id)
                return (
                  <article className="prof-dashboard-announcement-card" key={announcement.id}>
                    <header>
                      <div>
                        <strong>{announcement.authorName ?? 'Professor'}</strong>
                        <p>{announcement.className} · {formatDate(announcement.publishedAt ?? announcement.createdAt)}</p>
                      </div>
                      {announcement.isPinned ? <span>Pinned</span> : null}
                    </header>
                    <h3>{announcement.title}</h3>
                    <p className={expanded ? '' : 'line-clamp-3'}>{announcement.body}</p>
                    {announcement.body?.length > 180 ? (
                      <button
                        className="prof-dashboard-inline-link"
                        type="button"
                        onClick={() => setExpandedIds((current) => {
                          const next = new Set(current)
                          if (next.has(announcement.id)) next.delete(announcement.id)
                          else next.add(announcement.id)
                          return next
                        })}
                      >
                        {expanded ? 'Read less' : 'Read more'}
                      </button>
                    ) : null}
                    <footer>
                      <small>{announcement.type} · {announcement.commentCount} comments</small>
                      <div className="prof-dashboard-inline-actions">
                        <button type="button">Edit</button>
                        <button type="button">{announcement.isPinned ? 'Unpin' : 'Pin'}</button>
                        <button type="button">Delete</button>
                      </div>
                    </footer>
                  </article>
                )
              })}
              {!isLoadingAnnouncements && announcementRows.length === 0 ? <p className="prof-dashboard-muted">No announcements yet.</p> : null}
              <div ref={feedLoadAnchorRef} />
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Recent Activity</h2>
            </header>
            <div className="prof-dashboard-activity-list">
              {activityRows.map((item) => (
                <article className="prof-dashboard-activity-row" key={item.id}>
                  <span />
                  <div>
                    <strong>{item.action.replaceAll('_', ' ')}</strong>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="prof-dashboard-side-column">
          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Task Health</h2>
            </header>
            <div className="prof-dashboard-mini-grid">
              <article><p>Completed</p><strong>{taskHealth.completedRate}%</strong></article>
              <article><p>Pending</p><strong>{taskHealth.pending}</strong></article>
              <article><p>Overdue</p><strong>{taskHealth.overdue}</strong></article>
              <article><p>Blocked</p><strong>{taskHealth.blocked}</strong></article>
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Group Insights</h2>
            </header>
            <div className="prof-dashboard-group-table">
              <div className="prof-dashboard-group-head">
                <span>Group</span><span>Progress</span><span>Contribution</span><span>Health</span><span>Risk</span><span>Actions</span>
              </div>
              {groupInsights.map((group) => (
                <div className="prof-dashboard-group-row" key={group.id}>
                  <span>{group.name}</span>
                  <span>{group.progress}%</span>
                  <span>{group.contribution}</span>
                  <span>{group.health}</span>
                  <span>{group.risk}</span>
                  <Link to="/professor/groups">View</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Learning Insights</h2>
            </header>
            <div className="prof-dashboard-mini-grid">
              {learningInsights.map((item) => (
                <article key={item.label}>
                  <p>{item.label}</p>
                  <strong>{item.value}%</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>AI Insights</h2>
            </header>
            <div className="prof-dashboard-ai-list">
              {aiInsights.map((insight) => (
                <article key={insight.text}>
                  <p>{insight.text}</p>
                  <div className="prof-dashboard-inline-actions">
                    <Link to={insight.action}>View</Link>
                    <button type="button">Apply</button>
                    <button type="button">Dismiss</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Contribution Snapshot</h2>
            </header>
            <div className="prof-dashboard-mini-grid">
              <article><p>Average</p><strong>{contributionSnapshot.average}%</strong></article>
              <article><p>Top Group</p><strong>{contributionSnapshot.top}</strong></article>
              <article><p>Lowest Group</p><strong>{contributionSnapshot.low}</strong></article>
              <article><p>Fairness</p><strong>{contributionSnapshot.fairness}%</strong></article>
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Project Health</h2>
            </header>
            <div className="prof-dashboard-health-list">
              {projectRows.slice(0, 5).map((project) => (
                <p key={project.id}>
                  <span>{project.title}</span>
                  <strong>{project.progress} · {project.health}</strong>
                </p>
              ))}
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Upcoming Deadlines</h2>
            </header>
            <div className="prof-dashboard-deadline-columns">
              <div>
                <h3>Today</h3>
                {upcomingDeadlines.today.map((task) => <p key={task.id}>{task.title} · {dueLabel(task.dueAt)}</p>)}
              </div>
              <div>
                <h3>Tomorrow</h3>
                {upcomingDeadlines.tomorrow.map((task) => <p key={task.id}>{task.title} · {dueLabel(task.dueAt)}</p>)}
              </div>
              <div>
                <h3>Upcoming</h3>
                {upcomingDeadlines.upcoming.slice(0, 4).map((task) => <p key={task.id}>{task.title} · {dueLabel(task.dueAt)}</p>)}
              </div>
            </div>
          </section>

          <section className="prof-dashboard-panel">
            <header className="prof-dashboard-panel-head">
              <h2>Sidebar</h2>
            </header>
            <div className="prof-dashboard-side-feed">
              <article>
                <h3>Notifications</h3>
                <p>{unreadCount} unread</p>
              </article>
              <article>
                <h3>Calendar</h3>
                <p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}</p>
              </article>
              <article>
                <h3>Upcoming Events</h3>
                {rightSidebarEvents.map((item) => <p key={item.id}>{item.action.replaceAll('_', ' ')}</p>)}
              </article>
              <article>
                <h3>Recent Messages</h3>
                {messageNotifications.map((item) => <p key={item.id}>{item.title}</p>)}
              </article>
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
