import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProjects } from '../../projects/hooks/useProjects'
import { GroupCard } from '../components/GroupCard'
import { GroupForm } from '../components/GroupForm'
import { JoinGroupForm } from '../components/JoinGroupForm'
import { useGroups } from '../hooks/useGroups'

function ManageGroupModal({ group, onClose, onSave }) {
  const [form, setForm] = useState({
    description: group.description ?? '',
    name: group.name ?? '',
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await onSave(group.id, form)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel group-manage-modal" onSubmit={handleSubmit}>
        <div className="task-section-heading">
          <div>
            <p className="eyebrow">Group</p>
            <h3>Manage group</h3>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>
        <label className="form-field" htmlFor="manageGroupName">
          <span>Group name</span>
          <input id="manageGroupName" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="form-field" htmlFor="manageGroupDescription">
          <span>Description</span>
          <textarea id="manageGroupDescription" rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save group'}</button>
      </form>
    </div>
  )
}

function AddGroupMemberModal({ group, loadEligibleMembers, onAdd, onClose }) {
  const [eligibleMembers, setEligibleMembers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')
    loadEligibleMembers(group.id)
      .then((members) => {
        if (!isMounted) return
        setEligibleMembers(members)
        setUserId(members[0]?.userId ?? '')
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [group.id, loadEligibleMembers])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await onAdd(group.id, userId)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel group-manage-modal" onSubmit={handleSubmit}>
        <div className="task-section-heading">
          <div>
            <p className="eyebrow">Group</p>
            <h3>Add member</h3>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>
        {isLoading ? <p className="muted-copy">Loading eligible members...</p> : null}
        <label className="form-field" htmlFor="eligibleMember">
          <span>Member</span>
          <select id="eligibleMember" required value={userId} onChange={(event) => setUserId(event.target.value)} disabled={isLoading || eligibleMembers.length === 0}>
            {eligibleMembers.map((member) => (
              <option key={member.userId} value={member.userId}>{member.displayName}</option>
            ))}
          </select>
        </label>
        {!isLoading && eligibleMembers.length === 0 ? <p className="muted-copy">No eligible class members available.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSaving || !userId}>{isSaving ? 'Adding...' : 'Add member'}</button>
      </form>
    </div>
  )
}

export function GroupsPage() {
  const [searchParams] = useSearchParams()
  const { role } = useAuth()
  const { groups, error, isLoading, addGroup, addMember, join, loadEligibleMembers, saveGroup } = useGroups()
  const { projects } = useProjects()
  const [mode, setMode] = useState('list')
  const [managedGroup, setManagedGroup] = useState(null)
  const [memberGroup, setMemberGroup] = useState(null)
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState({
    classId: '',
    projectId: searchParams.get('projectId') ?? '',
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
    const matchesProject = !filters.projectId || group.projectId === filters.projectId
    const matchesSection = !filters.section || group.class?.section === filters.section
    const matchesSearch = !query || [
      group.name,
      group.description,
      group.project?.title,
      ...group.members.map((member) => member.displayName),
    ].some((value) => value?.toLowerCase().includes(query))

    return matchesClass && matchesProject && matchesSection && matchesSearch
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

  async function handleManageGroup(groupId, payload) {
    await saveGroup(groupId, payload)
    setNotice('Group updated.')
  }

  async function handleAddMember(groupId, userId) {
    await addMember(groupId, userId)
    setNotice('Member added.')
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

      {managedGroup ? (
        <ManageGroupModal
          group={managedGroup}
          onClose={() => setManagedGroup(null)}
          onSave={handleManageGroup}
        />
      ) : null}

      {memberGroup ? (
        <AddGroupMemberModal
          group={memberGroup}
          loadEligibleMembers={loadEligibleMembers}
          onAdd={handleAddMember}
          onClose={() => setMemberGroup(null)}
        />
      ) : null}

      {isStudent && mode === 'list' ? <JoinGroupForm onJoin={handleJoin} /> : null}

      {isProfessor && mode === 'list' ? (
        <div className="group-filter-bar">
          <label className="form-field" htmlFor="groupProjectFilter">
            <span>Project</span>
            <select id="groupProjectFilter" value={filters.projectId} onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
          </label>
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
                    onAddMember={setMemberGroup}
                    onLock={handleLock}
                    onManage={setManagedGroup}
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
