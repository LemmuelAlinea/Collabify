import { useMemo, useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { SKILL_CATEGORIES } from '../../onboarding/constants/skills'

const initialForm = {
  projectId: '',
  groupId: '',
  groupIds: [],
  groupMode: 'all',
  taskType: 'standalone',
  parentTaskId: '',
  title: '',
  description: '',
  dueAt: '',
  priority: 'medium',
  skillCategory: '',
  assigneeIds: [],
}

function toDateTime(value) {
  return value ? new Date(value).toISOString() : null
}

function allGroupsParentValue(title) {
  return `all:${encodeURIComponent(title)}`
}

function isAllGroupsParentValue(value) {
  return value.startsWith('all:')
}

function getAllGroupsParentTitle(value) {
  return decodeURIComponent(value.replace(/^all:/, ''))
}

export function TaskCreateModal({
  groups,
  isOpen,
  onClose,
  onGenerateAI,
  onSave,
  projects,
  role,
  tasks,
}) {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isProfessor = role === USER_ROLES.PROFESSOR

  const projectGroups = useMemo(
    () => groups.filter((group) => !form.projectId || group.projectId === form.projectId),
    [form.projectId, groups],
  )

  const selectedGroup = projectGroups.find((group) => group.id === form.groupId)
  const mainTasks = useMemo(
    () => tasks
      .flatMap((task) => [task, ...(task.children ?? [])])
      .filter((task) => task.taskType === 'main' || (!task.parentTaskId && task.children?.length))
      .filter((task) => !form.projectId || task.projectId === form.projectId)
      .filter((task) => !form.groupId || task.groupId === form.groupId),
    [form.groupId, form.projectId, tasks],
  )
  const parentTaskOptions = useMemo(() => {
    const taskOptions = mainTasks.map((task) => ({
      id: task.id,
      label: `${task.title} - ${task.group?.name ?? 'No group'}`,
    }))

    if (!isProfessor || form.groupMode !== 'all') return taskOptions

    const titles = [...new Set(mainTasks.map((task) => task.title).filter(Boolean))]
    return [
      ...titles.map((title) => ({
        id: allGroupsParentValue(title),
        label: `${title} - All groups`,
      })),
      ...taskOptions,
    ]
  }, [form.groupMode, isProfessor, mainTasks])

  if (!isOpen) return null

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'projectId' || name === 'groupId' || name === 'groupMode' ? { parentTaskId: '' } : {}),
    }))
  }

  function toggleGroup(groupId, checked) {
    setForm((current) => ({
      ...current,
      groupIds: checked
        ? [...new Set([...current.groupIds, groupId])]
        : current.groupIds.filter((id) => id !== groupId),
    }))
  }

  function toggleAssignee(userId, checked) {
    setForm((current) => ({
      ...current,
      assigneeIds: checked
        ? [...new Set([...current.assigneeIds, userId])]
        : current.assigneeIds.filter((id) => id !== userId),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const isAllGroupsParent = form.taskType === 'child' && isAllGroupsParentValue(form.parentTaskId)
      const parentTask = isAllGroupsParent ? null : mainTasks.find((task) => task.id === form.parentTaskId)
      await onSave({
        projectId: form.projectId,
        groupId: isProfessor ? undefined : form.groupId || parentTask?.groupId,
        groupIds: isProfessor ? form.groupIds : undefined,
        groupMode: isProfessor ? form.groupMode : 'selected',
        taskType: form.taskType,
        parentTaskId: form.taskType === 'child' && !isAllGroupsParent ? form.parentTaskId : null,
        parentTaskGroupMode: isAllGroupsParent ? 'all' : null,
        parentTaskTitle: isAllGroupsParent ? getAllGroupsParentTitle(form.parentTaskId) : null,
        title: form.title,
        description: form.description,
        dueAt: toDateTime(form.dueAt),
        priority: form.priority,
        skillCategory: form.skillCategory || null,
        assigneeIds: isProfessor ? [] : form.assigneeIds,
      })
      setForm(initialForm)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="task-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="task-modal-header">
          <div>
            <p className="eyebrow">Tasks</p>
            <h3>Create task</h3>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>

        <label className="form-field">
          <span>Project</span>
          <select name="projectId" required value={form.projectId} onChange={updateField}>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
        </label>

        {isProfessor ? (
          <div className="task-modal-section">
            <p className="eyebrow">Group assignment</p>
            <div className="segmented-control">
              {[
                ['selected', 'Selected groups'],
                ['all', 'All groups'],
                ['future', 'Future groups'],
              ].map(([value, label]) => (
                <label key={value}>
                  <input type="radio" name="groupMode" value={value} checked={form.groupMode === value} onChange={updateField} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {form.groupMode === 'selected' ? (
              <div className="task-picker-grid">
                {projectGroups.map((group) => (
                  <label className="check-row" key={group.id}>
                    <input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={(event) => toggleGroup(group.id, event.target.checked)} />
                    <span>{group.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <label className="form-field">
            <span>Group</span>
            <select name="groupId" required value={form.groupId} onChange={updateField}>
              <option value="">Select group</option>
              {projectGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="task-modal-section">
          <p className="eyebrow">Task type</p>
          <div className="segmented-control">
            {[
              ['standalone', 'Standalone'],
              ['main', 'Main task'],
              ['child', 'Child task'],
            ].map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="taskType" value={value} checked={form.taskType === value} onChange={updateField} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.taskType === 'child' ? (
          <label className="form-field">
            <span>Parent main task</span>
            <select name="parentTaskId" required value={form.parentTaskId} onChange={updateField}>
              <option value="">Select main task</option>
              {parentTaskOptions.map((task) => (
                <option key={task.id} value={task.id}>{task.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="form-grid">
          <label className="form-field">
            <span>Title</span>
            <input name="title" required maxLength="180" value={form.title} onChange={updateField} />
          </label>
          <label className="form-field">
            <span>Deadline</span>
            <input name="dueAt" type="datetime-local" value={form.dueAt} onChange={updateField} />
          </label>
        </div>

        <label className="form-field">
          <span>Description</span>
          <textarea name="description" rows="3" value={form.description} onChange={updateField} />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Priority</span>
            <select name="priority" value={form.priority} onChange={updateField}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          {isProfessor ? (
            <label className="form-field">
              <span>Related skill</span>
              <select name="skillCategory" value={form.skillCategory} onChange={updateField}>
                <option value="">Auto-detect from title/description</option>
                {SKILL_CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>{category.label}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {!isProfessor && selectedGroup ? (
          <div className="task-modal-section">
            <p className="eyebrow">Assignees</p>
            <div className="task-picker-grid">
              {(selectedGroup.members ?? []).filter((member) => member.status === 'active').map((member) => (
                <label className="check-row" key={member.userId}>
                  <input type="checkbox" checked={form.assigneeIds.includes(member.userId)} onChange={(event) => toggleAssignee(member.userId, event.target.checked)} />
                  <span>{member.displayName}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="task-modal-actions">
          {isProfessor ? <button className="secondary-button" type="button" onClick={onGenerateAI}>Generate with AI</button> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save task'}</button>
        </div>
      </form>
    </div>
  )
}
