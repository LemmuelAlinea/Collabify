import { useEffect, useState } from 'react'
import { GeneratedTaskTree } from './GeneratedTaskTree'

export function ProjectPlanViewer({ generation, onAccept }) {
  const [editableTasks, setEditableTasks] = useState([])

  useEffect(() => {
    setEditableTasks(generation?.tasks ? structuredClone(generation.tasks) : [])
  }, [generation])

  if (!generation) return <div className="empty-state"><h3>No generated plan</h3><p>Select a project and generate a plan.</p></div>

  function updateTask(taskId, patch) {
    function updateRows(rows) {
      return rows.map((task) => {
        if (task.id === taskId) return { ...task, ...patch }
        return { ...task, subtasks: updateRows(task.subtasks ?? []) }
      })
    }

    setEditableTasks((current) => updateRows(current))
  }

  return (
    <article className="project-plan-viewer">
      <div className="validation-scorebar">
        <div>
          <span>Complexity</span>
          <strong>{generation.complexityScore}%</strong>
          <p>{generation.complexityLabel}</p>
        </div>
        <div>
          <span>Structure</span>
          <strong>{generation.structureType}</strong>
          <p>{generation.totalWeight}% total weight</p>
        </div>
        <div>
          <span>Workload</span>
          <strong>{generation.workload?.total_estimated_hours ?? 0}h</strong>
          <p>{generation.workload?.balance_score ?? 0}% balance</p>
        </div>
      </div>
      <section className="analytics-panel">
        <h3>Project Summary</h3>
        <p>{generation.projectSummary}</p>
      </section>
      <section className="analytics-panel">
        <h3>Milestones</h3>
        <div className="validation-list">
          {generation.milestones.map((milestone) => (
            <div className="validation-row" key={milestone.id}>
              <strong>{milestone.title}</strong>
              <p>{milestone.description}</p>
              <small>{milestone.due_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(milestone.due_at)) : 'No deadline'}</small>
            </div>
          ))}
        </div>
      </section>
      <GeneratedTaskTree editable={generation.status === 'draft'} onTaskChange={updateTask} tasks={editableTasks} />
      <section className="analytics-panel">
        <h3>AI Project Plan Report</h3>
        <div className="detail-grid">
          {Object.entries(generation.report ?? {}).filter(([, value]) => typeof value === 'string').map(([key, value]) => (
            <section key={key}>
              <h3>{key.replaceAll('_', ' ')}</h3>
              <p>{value}</p>
            </section>
          ))}
        </div>
      </section>
      <div className="button-row">
        <button className="primary-button" type="button" disabled={generation.status !== 'draft'} onClick={() => onAccept(generation.id, 'merge', editableTasks)}>Merge with Existing Tasks</button>
        <button className="danger-button" type="button" disabled={generation.status !== 'draft'} onClick={() => onAccept(generation.id, 'replace', editableTasks)}>Replace Group Tasks</button>
      </div>
    </article>
  )
}
