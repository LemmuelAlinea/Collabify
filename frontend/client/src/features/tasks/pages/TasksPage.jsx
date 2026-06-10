import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useStudentSkills } from '../../onboarding/hooks/useStudentSkills'
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

function taskMatchesSearch(task, query) {
  if (!query) return true
  return [
    task.title,
    task.description,
    ...(task.assignments ?? []).map((assignment) => assignment.displayName),
  ].some((value) => value?.toLowerCase().includes(query))
}

function filterTasksBySearch(tasks, search) {
  const query = search.trim().toLowerCase()
  if (!query) return tasks

  return tasks
    .map((task) => {
      const filteredChildren = filterTasksBySearch(task.children ?? [], search)
      const keepTask = taskMatchesSearch(task, query) || filteredChildren.length > 0

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
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const filters = useMemo(() => ({ groupId, projectId }), [groupId, projectId])
  const { add, comment, error, isLoading, remove, save, tasks } = useTasks(filters)
  const isProfessor = role === USER_ROLES.PROFESSOR
  const { skills } = useStudentSkills({ skipInitialLoad: isProfessor })
  const mySkillKeys = useMemo(() => new Set(skills.map((skill) => skill.skillKey)), [skills])
  const aiPath = isProfessor ? '/professor/tasks/ai-planner' : '/student/tasks/ai-planner'
  const taskDetailsPath = isProfessor ? '/professor/tasks' : '/student/tasks'
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
    () => {
      const filtered = isProfessor ? tasks : filterTasksByAssignee(tasks, memberFilter === 'mine' ? user?.id : memberFilter)
      return isProfessor ? filterTasksBySearch(filtered, search) : filtered
    },
    [isProfessor, memberFilter, search, tasks, user?.id],
  )

  if (isLoading || isLoadingGroups || isLoadingProjects) return <StudentPageSkeleton variant="tasks" />

  return (
    <section className="module-page task-system-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{isProfessor ? 'Professor' : 'Student'}</p>
          <h2>Tasks</h2>
          <p>{isProfessor ? 'Manage project task structures.' : 'Manage ownership and execution inside your group.'}</p>
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
        {isProfessor ? (
          <label className="form-field" htmlFor="taskSearch">
            <span>Search</span>
            <input id="taskSearch" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Task or member" />
          </label>
        ) : null}
        <div className="button-row task-page-actions">
          <button className="primary-button" type="button" onClick={() => setIsModalOpen(true)}>Create Task</button>
          <button className="secondary-button" type="button" onClick={() => navigate(aiPath)}>Generate Tasks with AI</button>
        </div>
      </div>

      <div className="task-board">
        {displayedTasks.map((task) => (
          <TaskCard
            currentUserId={user?.id}
            key={task.id}
            groups={groups}
            task={task}
            role={role}
            mySkillKeys={mySkillKeys}
            onComment={comment}
            onDelete={remove}
            onOpen={(id) => navigate(`${taskDetailsPath}/${id}`)}
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
