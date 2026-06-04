import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'

const DAY_MS = 86400000

const STATUS_LABELS = {
  done: 'Done',
  in_progress: 'In progress',
  review: 'In review',
  todo: 'Todo',
}

function parseDate(value) {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysBetween(start, end) {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return 1
  return Math.max(1, Math.ceil((startOfDay(endDate) - startOfDay(startDate)) / DAY_MS) + 1)
}

function formatDate(value) {
  const date = parseDate(value)
  if (!date) return 'No date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function normalizeStatus(status) {
  if (status === 'in_review') return 'review'
  if (status === 'blocked' || status === 'cancelled') return 'todo'
  return status || 'todo'
}

function statusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] ?? normalizeStatus(status).replaceAll('_', ' ')
}

function getTaskRange(tasks, fallbackStart, fallbackEnd) {
  const starts = tasks.map((task) => parseDate(task.startAt)).filter(Boolean)
  const ends = tasks.flatMap((task) => [parseDate(task.endAt), parseDate(task.dueAt)]).filter(Boolean)
  const today = new Date()
  const start = starts.length ? new Date(Math.min(...starts.map((date) => date.getTime()))) : parseDate(fallbackStart) ?? today
  const end = ends.length ? new Date(Math.max(...ends.map((date) => date.getTime()), today.getTime())) : parseDate(fallbackEnd) ?? today

  return {
    end: addDays(startOfDay(end), 1),
    start: startOfDay(start),
  }
}

function buildWeeks(start, end) {
  const totalDays = daysBetween(start, end)
  const weekCount = Math.max(1, Math.ceil(totalDays / 7))

  return Array.from({ length: weekCount }, (_, index) => {
    const date = addDays(start, index * 7)
    return {
      label: `Week ${index + 1}`,
      sublabel: formatShortDate(date),
      width: `${(7 / totalDays) * 100}%`,
    }
  })
}

function positionFor(value, start, totalDays) {
  const date = parseDate(value)
  if (!date) return 0
  const offset = Math.max(0, Math.floor((startOfDay(date) - start) / DAY_MS))
  return Math.min(100, (offset / totalDays) * 100)
}

function TaskTimelineRows({ onTaskClick, range, tasks }) {
  const totalDays = daysBetween(range.start, range.end)
  const weeks = buildWeeks(range.start, range.end)

  return (
    <>
      <div className="gantt-chart" style={{ '--week-count': weeks.length }}>
        <div className="gantt-label-spacer" />
        <div className="gantt-week-header">
          {weeks.map((week) => (
            <div className="gantt-week" key={`${week.label}-${week.sublabel}`}>
              <span>{week.label}</span>
              <small>{week.sublabel}</small>
            </div>
          ))}
        </div>

        {tasks.map((task) => {
          const status = normalizeStatus(task.status)
          const left = positionFor(task.startAt, range.start, totalDays)
          const visualEndValue = status === 'done' && task.completedAt ? task.completedAt : task.endAt
          const end = Math.max(positionFor(visualEndValue, range.start, totalDays), left + (100 / totalDays))
          const width = Math.max(5, end - left)
          const dueLeft = task.dueAt ? positionFor(task.dueAt, range.start, totalDays) : null
          const completedLeft = task.completedAt ? positionFor(task.completedAt, range.start, totalDays) : null
          const doneGapWidth = status === 'done' && completedLeft !== null && dueLeft !== null && dueLeft > completedLeft
            ? dueLeft - completedLeft
            : 0

          return (
            <div className="gantt-row" key={task.id}>
              <div className="gantt-task-label">
                <strong>{task.title}</strong>
                <span>{task.assigneeLabel}</span>
              </div>
              <div className="gantt-track">
                <button
                  className={`gantt-bar gantt-bar--${status}`}
                  onClick={() => onTaskClick(task)}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${task.title} | Started ${formatDate(task.startAt)} | Due ${formatDate(task.dueAt)}${task.completedAt ? ` | Done ${formatDate(task.completedAt)}` : ''} | ${task.assigneeLabel}`}
                  type="button"
                >
                  <span>{task.durationDays}d</span>
                </button>
                {doneGapWidth > 0 ? (
                  <span
                    className="gantt-done-gap"
                    style={{ left: `${completedLeft}%`, width: `${doneGapWidth}%` }}
                    title={`Done early: ${formatDate(task.completedAt)} to due date ${formatDate(task.dueAt)}`}
                  />
                ) : null}
                {dueLeft !== null ? (
                  <span className="gantt-due-marker" style={{ left: `${dueLeft}%` }} title={`Due ${formatDate(task.dueAt)}`} />
                ) : null}
                {completedLeft !== null ? (
                  <span className="gantt-completed-marker" style={{ left: `${completedLeft}%` }} title={`Done ${formatDate(task.completedAt)}`} />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="timeline-mobile-list">
        {tasks.map((task) => (
          <button className="timeline-mobile-card" key={task.id} onClick={() => onTaskClick(task)} type="button">
            <span>
              <strong>{task.title}</strong>
              <small>{task.assigneeLabel}</small>
            </span>
            <span>
              <Badge className={`timeline-status-badge timeline-status-${normalizeStatus(task.status)}`}>
                {statusLabel(task.status)}
              </Badge>
              {task.isOverdue ? <Badge className="timeline-overdue-badge">Overdue</Badge> : null}
            </span>
            <small>{formatDate(task.startAt)} - {formatDate(task.endAt)}</small>
          </button>
        ))}
      </div>
    </>
  )
}

function TimelinePanel({ fallbackEnd, fallbackStart, groups, onTaskClick, title }) {
  const tasks = groups.flatMap((group) => group.tasks.map((task) => ({
    ...task,
    groupName: task.groupName || group.name,
  })))

  if (tasks.length === 0) {
    return (
      <Card className="timeline-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No timeline data yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="timeline-panel-list">
      {groups.map((group) => {
        if (group.tasks.length === 0) return null
        const range = getTaskRange(group.tasks, fallbackStart, fallbackEnd)

        return (
          <Card className="timeline-card" key={group.id}>
            <CardHeader className="timeline-card-header">
              <div>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>{group.projectTitle || 'Project'} - {group.tasks.length} tasks</CardDescription>
              </div>
              <div className="timeline-card-badges">
                <Badge>{group.memberCount} members</Badge>
                <Badge>{daysBetween(range.start, range.end)} days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TaskTimelineRows onTaskClick={onTaskClick} range={range} tasks={group.tasks} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function TaskTimeline({ currentUserId, isProfessor, isLoading, onTaskClick, timeline, visibleGroupIds }) {
  if (isLoading) {
    return (
      <Card className="timeline-card timeline-card-loading">
        <CardHeader>
          <CardTitle>Task Timeline</CardTitle>
          <CardDescription>Loading task activity...</CardDescription>
        </CardHeader>
        <CardContent className="timeline-skeleton-stack">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </CardContent>
      </Card>
    )
  }

  const visibleIds = visibleGroupIds instanceof Set ? visibleGroupIds : new Set()
  const groups = (timeline?.groups ?? [])
    .filter((group) => visibleIds.size === 0 || visibleIds.has(group.id))
    .map((group) => ({
      ...group,
      tasks: [...(group.tasks ?? [])].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    }))

  const myGroups = groups
    .map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => (task.assignees ?? []).some((assignee) => assignee.userId === currentUserId)),
    }))
    .filter((group) => group.tasks.length > 0)

  return (
    <ProgressTimelineShell>
      {isProfessor ? (
        <TimelinePanel
          fallbackEnd={timeline?.rangeEnd}
          fallbackStart={timeline?.rangeStart}
          groups={groups}
          onTaskClick={onTaskClick}
          title="Group timeline"
        />
      ) : (
        <Tabs defaultValue="group" className="timeline-tabs">
          <TabsList>
            <TabsTrigger value="group">Group timeline</TabsTrigger>
            <TabsTrigger value="mine">My tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="group">
            <TimelinePanel
              fallbackEnd={timeline?.rangeEnd}
              fallbackStart={timeline?.rangeStart}
              groups={groups}
              onTaskClick={onTaskClick}
              title="Group timeline"
            />
          </TabsContent>
          <TabsContent value="mine">
            <TimelinePanel
              fallbackEnd={timeline?.rangeEnd}
              fallbackStart={timeline?.rangeStart}
              groups={myGroups}
              onTaskClick={onTaskClick}
              title="My tasks"
            />
          </TabsContent>
        </Tabs>
      )}
    </ProgressTimelineShell>
  )
}

function ProgressTimelineShell({ children }) {
  return (
    <section className="progress-timeline-section">
      <div className="progress-timeline-heading">
        <div>
          <p className="eyebrow">Timeline</p>
          <h3>Task Timeline</h3>
          <p>Assignment-to-completion timing, active work, and due markers.</p>
        </div>
        <div className="timeline-legend">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span key={status}><i className={`gantt-dot gantt-dot--${status}`} />{label}</span>
          ))}
        </div>
      </div>
      {children}
    </section>
  )
}
