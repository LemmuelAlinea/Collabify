import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { useClasses } from '../../classes/hooks/useClasses'
import { ProjectCard } from '../components/ProjectCard'
import { ProjectForm } from '../components/ProjectForm'
import { useProjects } from '../hooks/useProjects'
import { useGroups } from '../../groups/hooks/useGroups'

export function ProjectsPage() {
  const { role } = useAuth()
  const { classes } = useClasses()
  const {
    addProject,
    archive,
    error,
    isLoading,
    projects,
    reopen,
    saveProject,
  } = useProjects()
  const { groups } = useGroups()
  const [mode, setMode] = useState('list')
  const [selectedProject, setSelectedProject] = useState(null)
  const [notice, setNotice] = useState('')
  const isProfessor = role === USER_ROLES.PROFESSOR
  const groupByProjectId = new Map(groups.map((group) => [group.projectId, group]))

  function startCreate() {
    setSelectedProject(null)
    setNotice('')
    setMode('form')
  }

  function startEdit(project) {
    setSelectedProject(project)
    setNotice('')
    setMode('form')
  }

  async function handleSave(payload) {
    if (selectedProject) {
      await saveProject(selectedProject.id, payload)
      setNotice('Project updated.')
    } else {
      await addProject(payload)
      setNotice('Project created.')
    }

    setSelectedProject(null)
    setMode('list')
  }

  if (isLoading) return <div className="route-state">Loading projects...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{isProfessor ? 'Professor' : 'Student'}</p>
          <h2>Projects</h2>
          <p>{isProfessor ? 'Create, schedule, archive, and reopen class projects.' : 'View visible projects from your joined classes.'}</p>
        </div>
        {isProfessor && mode === 'list' ? <button className="primary-button" type="button" onClick={startCreate}>Create project</button> : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
      {mode === 'form' ? (
        <ProjectForm
          classes={classes}
          project={selectedProject}
          onCancel={() => {
            setSelectedProject(null)
            setMode('list')
          }}
          onSave={handleSave}
        />
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={archive}
              onEdit={startEdit}
              onReopen={reopen}
              viewGroupPath={!isProfessor && groupByProjectId.has(project.id) ? `/student/groups/${groupByProjectId.get(project.id).id}` : ''}
            />
          ))}
          {projects.length === 0 ? <div className="empty-state"><h3>No projects yet</h3><p>{isProfessor ? 'Create your first class project.' : 'Visible projects will appear here.'}</p></div> : null}
        </div>
      )}
    </section>
  )
}
