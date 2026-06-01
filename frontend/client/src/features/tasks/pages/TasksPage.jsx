import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useProjects } from '../../projects/hooks/useProjects'
import { TaskCard } from '../components/TaskCard'
import { TaskCreateModal } from '../components/TaskCreateModal'
import { useTasks } from '../hooks/useTasks'

function filterTasksByAssignee(tasks, memberFilter) {
  if (!memberFilter || memberFilter === 'all') return tasks

  return tasks
    .map((task) => {
      const filteredChildren = filterTasksByAssignee(task.children ?? [], memberFilter)
      const assignedToMember = (task.assignments ?? []).some((assignment) => assignment.assigneeId === memberFilter)
      const keepTask = assignedToMember || filteredChildren.length > 0

      if (!keepTask) return null
      return { ...task, children: filteredChildren }
    })
    .filter(Boolean)
}

export function TasksPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const { groups, isLoading: isLoadingGroups } = useGroups()
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const [groupId, setGroupId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [memberFilter, setMemberFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const filters = useMemo(() => ({ groupId, projectId }), [groupId, projectId])
  const { add, comment, error, isLoading, remove, save, tasks } = useTasks(filters)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const aiPath = isProfessor ? '/professor/tasks/ai-planner' : '/student/tasks/ai-planner'
  const selectableMembers = useMemo(() => {
    if (isProfessor) return []
    const visibleGroups = groups.filter((group) => !groupId || group.id === groupId)
    const byId = new Map()

    visibleGroups.forEach((group) => {
      ;(group.members ?? [])
        .filter((member) => member.status === 'active')
        .forEach((member) => {
          if (!byId.has(member.userId)) byId.set(member.userId, member.displayName)
        })
    })

    return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [groupId, groups, isProfessor])
  const displayedTasks = useMemo(
    () => (isProfessor ? tasks : filterTasksByAssignee(tasks, memberFilter === 'mine' ? user?.id : memberFilter)),
    [isProfessor, memberFilter, tasks, user?.id],
  )

  if (isLoading || isLoadingGroups || isLoadingProjects) return <div className="route-state">Loading tasks...</div>

  return (
    <section className="module-page task-system-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{isProfessor ? 'Professor' : 'Student'}</p>
          <h2>Tasks</h2>
          <p>{isProfessor ? 'Manage project task structures.' : 'Manage ownership and execution inside your group.'}</p>
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => setIsModalOpen(true)}>Create Task</button>
          <button className="secondary-button" type="button" onClick={() => navigate(aiPath)}>Generate Tasks with AI</button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="task-filter-row">
        <label className="form-field" htmlFor="taskProjectFilter">
          <span>Project</span>
          <select id="taskProjectFilter" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
        </label>
        <label className="form-field" htmlFor="taskGroupFilter">
          <span>Group</span>
          <select id="taskGroupFilter" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">All visible groups</option>
            {groups.filter((group) => !projectId || group.projectId === projectId).map((group) => (
              <option key={group.id} value={group.id}>{group.name} - {group.project?.title}</option>
            ))}
          </select>
        </label>
        {!isProfessor ? (
          <label className="form-field" htmlFor="taskMemberFilter">
            <span>Member tasks</span>
            <select id="taskMemberFilter" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
              <option value="all">All members</option>
              <option value="mine">My tasks</option>
              {selectableMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="task-board">
        {displayedTasks.map((task) => (
          <TaskCard
            currentUserId={user?.id}
            key={task.id}
            groups={groups}
            task={task}
            role={role}
            onComment={comment}
            onDelete={remove}
            onUpdate={save}
          />
        ))}
        {displayedTasks.length === 0 ? <div className="empty-state"><h3>No tasks found</h3><p>Try another member filter.</p></div> : null}
      </div>

      <TaskCreateModal
        groups={groups}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerateAI={() => navigate(aiPath)}
        onSave={add}
        projects={projects}
        role={role}
        tasks={tasks}
      />
    </section>
  )
}
