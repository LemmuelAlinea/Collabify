import { useEffect, useMemo, useState } from 'react'
import { StudentPageSkeleton } from '../../../components/skeletons/StudentPageSkeleton'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGroups } from '../../groups/hooks/useGroups'
import { useProjects } from '../../projects/hooks/useProjects'
import { ProjectPlanViewer } from '../components/ProjectPlanViewer'
import { useTaskGeneration } from '../hooks/useTaskGeneration'

export function TaskGenerationPage() {
  const { role } = useAuth()
  const { groups, isLoading: isLoadingGroups } = useGroups()
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const [projectId, setProjectId] = useState('')
  const [groupId, setGroupId] = useState('')
  const visibleGroups = useMemo(() => groups.filter((group) => !projectId || group.projectId === projectId), [groups, projectId])
  const isStudent = role === USER_ROLES.STUDENT
  const isProfessor = role === USER_ROLES.PROFESSOR
  const selectedGroupId = isProfessor && groupId === 'all' ? null : groupId

  useEffect(() => {
    if (!projectId || groupId || visibleGroups.length !== 1) return
    setGroupId(visibleGroups[0].id)
  }, [groupId, projectId, visibleGroups])

  const {
    accept,
    error,
    generate,
    generations,
    isGenerating,
    isLoading,
  } = useTaskGeneration(projectId, selectedGroupId, { requiresGroup: isStudent })
  const activeGeneration = generations[0]

  if (isLoadingGroups || isLoadingProjects) return <StudentPageSkeleton variant="planner" />

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">AI Planner</p>
          <h2>AI Task Generation</h2>
          <p>Generate tasks, subtasks, milestones, dependencies, deadlines, points, and workload plans.</p>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {isStudent && projectId && !groupId ? <p className="form-error">Choose your group before generating tasks.</p> : null}
      <div className="analytics-form">
        <label className="form-field" htmlFor="aiProject">
          <span>Project</span>
          <select id="aiProject" value={projectId} onChange={(event) => {
            setProjectId(event.target.value)
            setGroupId('')
          }}>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label className="form-field" htmlFor="aiGroup">
          <span>Group</span>
          <select id="aiGroup" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Select group</option>
            {isProfessor ? <option value="all">All groups</option> : null}
            {visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <div className="ai-planner-actions">
          <button className="primary-button" type="button" disabled={!projectId || (isStudent && !groupId) || isGenerating} onClick={generate}>
            {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
          </button>
        </div>
      </div>
      {isLoading ? <StudentPageSkeleton variant="planner" /> : null}
      <ProjectPlanViewer generation={activeGeneration} onAccept={accept} />
      <section className="validation-section">
        <h3>Task Generation History</h3>
        <div className="validation-list">
          {generations.map((generation) => (
            <article className="validation-row" key={generation.id}>
              <strong>Version {generation.projectVersion}</strong>
              <p>{generation.complexityLabel} / {generation.status}</p>
              <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generation.createdAt))}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
