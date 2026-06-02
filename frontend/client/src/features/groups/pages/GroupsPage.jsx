import { useState } from 'react'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProjects } from '../../projects/hooks/useProjects'
import { GroupCard } from '../components/GroupCard'
import { GroupForm } from '../components/GroupForm'
import { JoinGroupForm } from '../components/JoinGroupForm'
import { useGroups } from '../hooks/useGroups'

export function GroupsPage() {
  const { role } = useAuth()
  const { groups, error, isLoading, addGroup, join, saveGroup, saveMember } = useGroups()
  const { projects } = useProjects()
  const [mode, setMode] = useState('list')
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState({
    classId: '',
    search: '',
    section: '',
  })
  const isStudent = role === USER_ROLES.STUDENT
  const isProfessor = role === USER_ROLES.PROFESSOR
  const classOptions = [...new Map(groups.map((group) => [group.classId, group.class]).filter(([id]) => id)).entries()]
  const sectionOptions = [...new Set(groups.map((group) => group.class?.section).filter(Boolean))]
  const visibleGroups = groups.filter((group) => {
    const query = filters.search.trim().toLowerCase()
    const matchesClass = !filters.classId || group.classId === filters.classId
    const matchesSection = !filters.section || group.class?.section === filters.section
    const matchesSearch = !query || [
      group.name,
      group.description,
      group.project?.title,
      ...group.members.map((member) => member.displayName),
    ].some((value) => value?.toLowerCase().includes(query))

    return matchesClass && matchesSection && matchesSearch
  })
  const groupedByClass = visibleGroups.reduce((map, group) => {
    const key = group.classId ?? 'none'
    const rows = map.get(key) ?? {
      className: `${group.class?.name ?? 'Class'}${group.class?.section ? ` - ${group.class.section}` : ''}`,
      groups: [],
    }
    rows.groups.push(group)
    map.set(key, rows)
    return map
  }, new Map())

  async function handleCreate(payload) {
    await addGroup(payload)
    setNotice('Group created.')
    setMode('list')
  }

  async function handleJoin(groupId) {
    await join(groupId)
    setNotice('Joined group.')
  }

  async function handleLock(groupId, isLocked) {
    await saveGroup(groupId, { isLocked })
    setNotice(isLocked ? 'Group locked.' : 'Group unlocked.')
  }

  async function handleMemberUpdate(groupId, userId, payload) {
    await saveMember(groupId, userId, payload)
    setNotice('Group member updated.')
  }

  if (isLoading) return <div className="route-state">Loading groups...</div>

  return (
    <section className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{isProfessor ? 'Professor' : 'Student'}</p>
          <h2>Groups</h2>
          <p>{isProfessor ? 'Review and manage all project groups.' : 'Create, join, and manage your project group.'}</p>
        </div>
        {isProfessor && mode === 'list' ? <button className="primary-button" type="button" onClick={() => setMode('form')}>Create Group</button> : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {mode === 'form' ? (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <GroupForm
              projects={projects}
              onCancel={() => setMode('list')}
              onSave={handleCreate}
            />
          </div>
        </div>
      ) : null}

      {isStudent && mode === 'list' ? <JoinGroupForm onJoin={handleJoin} /> : null}

      {isProfessor && mode === 'list' ? (
        <div className="group-filter-bar">
          <label className="form-field" htmlFor="groupClassFilter">
            <span>Class</span>
            <select id="groupClassFilter" value={filters.classId} onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}>
              <option value="">All classes</option>
              {classOptions.map(([classId, classItem]) => (
                <option key={classId} value={classId}>{classItem?.name ?? 'Class'}</option>
              ))}
            </select>
          </label>
          <label className="form-field" htmlFor="groupSectionFilter">
            <span>Section</span>
            <select id="groupSectionFilter" value={filters.section} onChange={(event) => setFilters((current) => ({ ...current, section: event.target.value }))}>
              <option value="">All sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          <label className="form-field" htmlFor="groupSearch">
            <span>Search</span>
            <input id="groupSearch" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Group, project, member" />
          </label>
        </div>
      ) : null}

      {mode === 'list' ? (
        <div className="class-group-sections">
          {[...groupedByClass.values()].map((section) => (
            <section className="class-group-section" key={section.className}>
              <h3>{section.className}</h3>
              <div className="group-card-grid">
                {section.groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onLock={handleLock}
                    onMemberUpdate={handleMemberUpdate}
                  />
                ))}
              </div>
            </section>
          ))}
          {visibleGroups.length === 0 ? <div className="empty-state"><h3>No groups found</h3><p>{isProfessor ? 'Try another class, section, or search term.' : 'Create a group or join with a group ID.'}</p></div> : null}
        </div>
      ) : null}
    </section>
  )
}
