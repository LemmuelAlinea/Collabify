import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  LineChart,
  MessageSquare,
  ShieldAlert,
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

function formatDueLabel(value) {
  if (!value) return 'No deadline'
  const due = new Date(value)
  const now = new Date()
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `${diff}d left`
}

function initials(name = 'U') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

function fullNameFromProfile(profile, user) {
  const combined = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
  if (combined) return combined
  if (profile?.fullName) return profile.fullName
  if (profile?.displayName) return profile.displayName
  if (profile?.display_name) return profile.display_name
  return user?.email ?? 'Student'
}

function flattenTasks(items) {
  return items.flatMap((task) => [task, ...(task.children?.length ? flattenTasks(task.children) : [])])
}

function statusTone(status) {
  if (status === 'done') return 'good'
  if (status === 'in_progress') return 'warn'
  if (status === 'review') return 'mid'
  if (status === 'blocked') return 'bad'
  return 'muted'
}

function pct(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function StudentDashboardPage() {
  const { profile, user } = useAuth()
  const { classes, isLoading: isLoadingClasses } = useClasses()
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const { groups, isLoading: isLoadingGroups } = useGroups()
  const taskFilters = useMemo(() => ({}), [])
  const activityFilters = useMemo(() => ({ limit: 20 }), [])
  const { tasks, isLoading: isLoadingTasks } = useTasks(taskFilters)
  const { progress } = useProgress()
  const { activity } = useActivity(activityFilters)
  const {
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  } = useNotifications()

  const [search, setSearch] = useState('')
  const [isBellOpen, setIsBellOpen] = useState(false)
  const [visibleAnnouncements, setVisibleAnnouncements] = useState(ANNOUNCEMENTS_PAGE_SIZE)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [announcementFeed, setAnnouncementFeed] = useState([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true)
  const feedLoadAnchorRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function loadAnnouncements() {
      setIsLoadingAnnouncements(true)
      try {
        const details = await Promise.all(classes.map((classItem) => getClassDetails(classItem.id).catch(() => null)))
        if (!isMounted) return

        const merged = details
          .filter(Boolean)
          .flatMap((detail) => (detail.announcements ?? []).map((announcement) => ({
            ...announcement,
            classId: detail.class.id,
            className: detail.class.name,
            commentCount: announcement.commentCount ?? 0,
            type: announcement.projectId ? 'Project Announcement' : 'Class Announcement',
          })))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
            return new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() - new Date(a.publishedAt ?? a.createdAt ?? 0).getTime()
          })

        setAnnouncementFeed(merged)
      } finally {
        if (isMounted) setIsLoadingAnnouncements(false)
      }
    }

    loadAnnouncements()
    return () => {
      isMounted = false
    }
  }, [classes])

  useEffect(() => {
    const anchor = feedLoadAnchorRef.current
    if (!anchor) return undefined

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setVisibleAnnouncements((current) => Math.min(current + ANNOUNCEMENTS_PAGE_SIZE, announcementFeed.length))
    }, { rootMargin: '200px' })

    observer.observe(anchor)
    return () => observer.disconnect()
  }, [announcementFeed.length])

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks])
  const myTaskIds = useMemo(
    () => new Set(flatTasks.filter((task) => (task.assignments ?? []).some((assignment) => assignment.assigneeId === user?.id)).map((task) => task.id)),
    [flatTasks, user?.id],
  )
  const myTasks = useMemo(() => flatTasks.filter((task) => myTaskIds.has(task.id)), [flatTasks, myTaskIds])

  const activeProjects = useMemo(() => projects.filter((project) => project.status !== 'archived'), [projects])
  const dueTodayCount = useMemo(() => myTasks.filter((task) => formatDueLabel(task.dueAt) === 'Due today').length, [myTasks])
  const pendingTasks = useMemo(() => myTasks.filter((task) => task.status !== 'done').length, [myTasks])

  const taskRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return myTasks
      .filter((task) => !query || `${task.title} ${task.project?.title ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime())
      .slice(0, 5)
  }, [myTasks, search])

  const projectRows = useMemo(() => {
    const progressByProject = new Map((progress?.projects ?? []).map((project) => [project.id, project]))
    const query = search.trim().toLowerCase()
    return activeProjects
      .filter((project) => !query || project.title.toLowerCase().includes(query))
      .map((project) => {
        const metrics = progressByProject.get(project.id)
        return {
          ...project,
          health: metrics?.progress >= 75 ? 'Healthy' : metrics?.progress >= 45 ? 'Watch' : 'At Risk',
          progress: metrics?.progress ?? 0,
          remaining: (metrics?.taskCompletion?.total ?? 0) - (metrics?.taskCompletion?.completed ?? 0),
        }
      })
      .slice(0, 3)
  }, [activeProjects, progress?.projects, search])

  const selectedGroup = useMemo(() => {
    const mine = groups.find((group) => (group.members ?? []).some((member) => member.userId === user?.id && member.status === 'active'))
    return mine ?? groups[0] ?? null
  }, [groups, user?.id])

  const groupMetrics = useMemo(() => {
    if (!selectedGroup || !progress) return null
    const groupData = (progress.groups ?? []).find((group) => group.id === selectedGroup.id)
    if (!groupData) return null
    const me = (groupData.members ?? []).find((member) => member.userId === user?.id)
    return {
      name: groupData.name,
      overall: groupData.progress ?? 0,
      mine: me?.progress ?? 0,
      members: groupData.members ?? [],
    }
  }, [progress, selectedGroup, user?.id])

  const contributionCard = useMemo(() => {
    const myCompleted = myTasks.filter((task) => task.status === 'done').length
    const groupTasks = flatTasks.filter((task) => task.groupId === selectedGroup?.id)
    const groupCompleted = groupTasks.filter((task) => task.status === 'done').length
    return {
      group: pct(groupCompleted, groupTasks.length),
      mine: pct(myCompleted, myTasks.length),
    }
  }, [flatTasks, myTasks, selectedGroup?.id])

  const deadlines = useMemo(() => {
    const rows = myTasks
      .filter((task) => task.dueAt && task.status !== 'done')
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 8)

    return {
      today: rows.filter((task) => formatDueLabel(task.dueAt) === 'Due today'),
      tomorrow: rows.filter((task) => formatDueLabel(task.dueAt) === 'Due tomorrow'),
      upcoming: rows.filter((task) => {
        const label = formatDueLabel(task.dueAt)
        return label !== 'Due today' && label !== 'Due tomorrow'
      }),
    }
  }, [myTasks])

  const activityRows = useMemo(() => activity.slice(0, 8), [activity])

  const insights = useMemo(() => {
    const mine = progress?.personal?.progress ?? 0
    const groupAvg = progress?.overview?.averageGroupProgress ?? 0
    return [
      { label: 'Technical', value: Math.max(0, mine - 4) + 12 },
      { label: 'Collaboration', value: Math.max(0, groupAvg - 10) + 8 },
    ]
  }, [progress?.overview?.averageGroupProgress, progress?.personal?.progress])

  const announcementRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return announcementFeed
      .filter((announcement) => !query || `${announcement.title} ${announcement.body} ${announcement.className}`.toLowerCase().includes(query))
      .slice(0, visibleAnnouncements)
  }, [announcementFeed, search, visibleAnnouncements])

  const quickAccess = useMemo(() => ([
    { icon: BookOpen, label: 'My Classes', value: classes.length, hint: 'Joined', to: '/student/classes' },
    { icon: FolderKanban, label: 'My Projects', value: activeProjects.length, hint: 'Active', to: '/student/projects' },
    { icon: ClipboardList, label: 'My Tasks', value: pendingTasks, hint: 'Pending', to: '/student/tasks' },
    { icon: Users, label: 'My Group', value: groups.length, hint: 'Visible', to: '/student/groups' },
    { icon: MessageSquare, label: 'Messages', value: unreadCount, hint: 'Unread', to: '/student/messages' },
    { icon: LineChart, label: 'Analytics', value: progress?.overview?.averageProjectProgress ?? 0, hint: 'Avg %', to: '/student/analytics' },
    { icon: CalendarClock, label: 'Deadlines', value: dueTodayCount, hint: 'Today', to: '/student/tasks' },
    { icon: ShieldAlert, label: 'Project Health', value: projectRows.filter((project) => project.health === 'At Risk').length, hint: 'At risk', to: '/student/project-health' },
  ]), [activeProjects.length, classes.length, dueTodayCount, groups.length, pendingTasks, progress?.overview?.averageProjectProgress, projectRows, unreadCount])

  const greetingName = fullNameFromProfile(profile, user)
  const isLoading = isLoadingClasses || isLoadingProjects || isLoadingGroups || isLoadingTasks

  if (isLoading) return <div className="route-state">Loading dashboard...</div>

  return (
    <section className="student-dashboard-page">
      <motion.header className="student-dashboard-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="student-dashboard-greeting-label">Good day,</p>
          <h1>{greetingName}</h1>
          <p className="student-dashboard-subtitle">You have {dueTodayCount} deadlines today and {activeProjects.length} active projects.</p>
        </div>
        <div className="student-dashboard-header-actions">
          <input
            aria-label="Search dashboard"
            className="student-dashboard-search"
            placeholder="Search tasks, projects, announcements..."
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="student-dashboard-bell-wrap">
            <button className="student-dashboard-bell" type="button" onClick={() => setIsBellOpen((current) => !current)}>
              <Bell aria-hidden="true" />
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
          <div className="student-dashboard-avatar">{initials(greetingName)}</div>
        </div>
      </motion.header>

      <section className="student-dashboard-quick-grid">
        {quickAccess.map((item) => (
          <Link className="student-dashboard-quick-card" key={item.label} to={item.to}>
            <item.icon aria-hidden="true" />
            <div>
              <p>{item.label}</p>
              <strong>{item.value} <span>{item.hint}</span></strong>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>
        ))}
      </section>

      <div className="student-dashboard-main-grid">
        <section className="student-dashboard-panel student-dashboard-announcements">
          <div className="student-dashboard-panel-head">
            <h2>Announcements</h2>
            <span>{announcementFeed.length} total</span>
          </div>
          <div className="student-dashboard-feed">
            {isLoadingAnnouncements ? <p className="student-dashboard-muted">Loading announcements...</p> : null}
            {announcementRows.map((announcement) => {
              const expanded = expandedIds.has(announcement.id)
              return (
                <article className="student-dashboard-feed-item" key={announcement.id}>
                  <header>
                    <div className="student-dashboard-author-avatar">{initials(announcement.authorName ?? 'P')}</div>
                    <div>
                      <strong>{announcement.authorName ?? 'Professor'}</strong>
                      <p>{announcement.className} · {formatDate(announcement.publishedAt ?? announcement.createdAt)}</p>
                    </div>
                    {announcement.isPinned ? <span className="student-dashboard-pin">Pinned</span> : null}
                  </header>
                  <h3>{announcement.title}</h3>
                  <p className={expanded ? '' : 'line-clamp-3'}>{announcement.body}</p>
                  {announcement.body?.length > 180 ? (
                    <button
                      className="student-dashboard-inline"
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
                  {announcement.attachments?.[0]?.url ? (
                    <img alt={announcement.title} className="student-dashboard-feed-image" src={announcement.attachments[0].url} />
                  ) : null}
                  <footer>
                    <small>{announcement.type} · {announcement.commentCount} comments</small>
                    <Link to={`/student/classes/${announcement.classId}`}>View Class</Link>
                  </footer>
                </article>
              )
            })}
            {!isLoadingAnnouncements && announcementRows.length === 0 ? <p className="student-dashboard-muted">No announcements yet.</p> : null}
            <div ref={feedLoadAnchorRef} />
          </div>
        </section>

        <section className="student-dashboard-stack">
          <article className="student-dashboard-panel">
            <div className="student-dashboard-panel-head">
              <h2>My Tasks</h2>
              <Link to="/student/tasks">View all</Link>
            </div>
            <div className="student-dashboard-task-list">
              {taskRows.map((task) => (
                <div className="student-dashboard-task-item" key={task.id}>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{task.project?.title ?? 'Project'} · {formatDate(task.dueAt)}</p>
                  </div>
                  <div className={`student-dashboard-status tone-${statusTone(task.status)}`}>
                    <span>{task.priority}</span>
                    <strong>{task.status?.replaceAll('_', ' ')}</strong>
                    <small>{formatDueLabel(task.dueAt)}</small>
                  </div>
                </div>
              ))}
              {taskRows.length === 0 ? <p className="student-dashboard-muted">No upcoming tasks.</p> : null}
            </div>
          </article>

          <article className="student-dashboard-panel">
            <div className="student-dashboard-panel-head">
              <h2>My Projects</h2>
              <Link to="/student/projects">View all</Link>
            </div>
            <div className="student-dashboard-project-list">
              {projectRows.map((project) => (
                <Link className="student-dashboard-project-item" key={project.id} to={`/student/projects/${project.id}`}>
                  <div>
                    <h3>{project.title}</h3>
                    <p>{formatDate(project.deadlineAt)} · {project.remaining} tasks left</p>
                  </div>
                  <div>
                    <strong>{project.progress}%</strong>
                    <span className={`health-${project.health.toLowerCase().replace(' ', '-')}`}>{project.health}</span>
                  </div>
                </Link>
              ))}
              {projectRows.length === 0 ? <p className="student-dashboard-muted">No active projects.</p> : null}
            </div>
          </article>
        </section>
      </div>

      <section className="student-dashboard-lower-grid">
        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Group Status</h2></div>
          {groupMetrics ? (
            <>
              <h3>{groupMetrics.name}</h3>
              <div className="student-dashboard-progress-pair">
                <div><p>Overall</p><strong>{groupMetrics.overall}%</strong></div>
                <div><p>You</p><strong>{groupMetrics.mine}%</strong></div>
              </div>
              <div className="student-dashboard-member-dots">
                {groupMetrics.members.slice(0, 6).map((member) => (
                  <span key={member.userId} title={member.displayName}>{initials(member.displayName)}</span>
                ))}
              </div>
            </>
          ) : <p className="student-dashboard-muted">No active group data.</p>}
        </article>

        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Contribution</h2></div>
          <div className="student-dashboard-progress-pair">
            <div><p>Group</p><strong>{contributionCard.group}%</strong></div>
            <div><p>You</p><strong>{contributionCard.mine}%</strong></div>
          </div>
        </article>

        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Upcoming Deadlines</h2></div>
          <div className="student-dashboard-deadline-columns">
            <div><h3>Today</h3>{deadlines.today.map((task) => <p key={task.id}>{task.title} · {formatDueLabel(task.dueAt)}</p>) || null}</div>
            <div><h3>Tomorrow</h3>{deadlines.tomorrow.map((task) => <p key={task.id}>{task.title} · {formatDueLabel(task.dueAt)}</p>) || null}</div>
            <div><h3>Upcoming</h3>{deadlines.upcoming.slice(0, 3).map((task) => <p key={task.id}>{task.title} · {formatDueLabel(task.dueAt)}</p>) || null}</div>
          </div>
        </article>

        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Recent Activity</h2></div>
          <div className="student-dashboard-activity-list">
            {activityRows.map((item) => (
              <div className="student-dashboard-activity-item" key={item.id}>
                <span />
                <p>{item.action.replaceAll('_', ' ')}</p>
                <small>{formatDate(item.createdAt)}</small>
              </div>
            ))}
            {activityRows.length === 0 ? <p className="student-dashboard-muted">No recent activity.</p> : null}
          </div>
        </article>

        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Learning Insights</h2></div>
          <div className="student-dashboard-insight-list">
            {insights.map((insight) => (
              <div className="student-dashboard-insight-item" key={insight.label}>
                <p>{insight.label}</p>
                <strong>+{insight.value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="student-dashboard-panel">
          <div className="student-dashboard-panel-head"><h2>Project Health</h2></div>
          <div className="student-dashboard-health-list">
            {projectRows.map((project) => (
              <p key={project.id}>
                <span>{project.title}</span>
                <strong className={`health-${project.health.toLowerCase().replace(' ', '-')}`}>{project.health}</strong>
              </p>
            ))}
            {projectRows.length === 0 ? <p className="student-dashboard-muted">No project health data.</p> : null}
          </div>
        </article>
      </section>
    </section>
  )
}
