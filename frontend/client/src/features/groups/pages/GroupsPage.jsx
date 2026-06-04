import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { USER_ROLES } from '../../auth/constants/roles'
import { useAuth } from '../../auth/hooks/useAuth'
import { useClasses } from '../../classes/hooks/useClasses'
import { useProjects } from '../../projects/hooks/useProjects'
import { GroupCard } from '../components/GroupCard'
import { GroupCreationDialog } from '../components/GroupCreationDialog'
import { StudentAvailableGroupsPanel } from '../components/StudentAvailableGroupsPanel'
import { useGroups } from '../hooks/useGroups'

function ManageGroupModal({ group, onClose, onSave }) {
  const activeCount = (group.members ?? []).filter((member) => member.status !== 'removed').length
  const [form, setForm] = useState({
    description: group.description ?? '',
    memberLimit: group.memberLimit ?? group.project?.memberCount ?? 1,
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
        <label className="form-field" htmlFor="manageGroupMemberLimit">
          <span>Member count</span>
          <input
            id="manageGroupMemberLimit"
            min={Math.max(1, activeCount)}
            required
            type="number"
            value={form.memberLimit}
            onChange={(event) => setForm((current) => ({ ...current, memberLimit: event.target.value }))}
          />
        </label>
        <p className="muted-copy">Current active members: {activeCount}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save group'}</button>
      </form>
    </div>
  )
}

function AddGroupMemberModal({ group, loadEligibleMembers, onAdd, onClose, onSave }) {
  const activeCount = (group.members ?? []).filter((member) => member.status !== 'removed').length
  const currentLimit = group.memberLimit ?? group.project?.memberCount ?? 1
  const [eligibleMembers, setEligibleMembers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [memberLimit, setMemberLimit] = useState(currentLimit)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return eligibleMembers
    return eligibleMembers.filter((member) => {
      const name = member.displayName ?? ''
      const email = member.email ?? ''
      return `${name} ${email}`.toLowerCase().includes(term)
    })
  }, [eligibleMembers, search])

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

  useEffect(() => {
    if (!filteredMembers.some((member) => member.userId === userId)) {
      setUserId(filteredMembers[0]?.userId ?? '')
    }
  }, [filteredMembers, userId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const nextLimit = Number(memberLimit)
      if (Number.isFinite(nextLimit) && nextLimit !== currentLimit) {
        await onSave(group.id, { memberLimit: nextLimit })
      }
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
        <label className="form-field" htmlFor="eligibleMemberSearch">
          <span>Search student</span>
          <input
            id="eligibleMemberSearch"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={isLoading || eligibleMembers.length === 0}
          />
        </label>
        <label className="form-field" htmlFor="eligibleMember">
          <span>Member</span>
          <select id="eligibleMember" required value={userId} onChange={(event) => setUserId(event.target.value)} disabled={isLoading || filteredMembers.length === 0}>
            {filteredMembers.map((member) => (
              <option key={member.userId} value={member.userId}>{member.displayName}</option>
            ))}
          </select>
        </label>
        <label className="form-field" htmlFor="addGroupMemberLimit">
          <span>Member count</span>
          <input
            id="addGroupMemberLimit"
            min={Math.max(1, activeCount)}
            required
            type="number"
            value={memberLimit}
            onChange={(event) => setMemberLimit(event.target.value)}
          />
        </label>
        <p className="muted-copy">Active members: {activeCount}. Current limit: {currentLimit}. Increase this when adding beyond the project limit.</p>
        {!isLoading && eligibleMembers.length > 0 && filteredMembers.length === 0 ? <p className="muted-copy">No matching students.</p> : null}
        {!isLoading && eligibleMembers.length === 0 ? <p className="muted-copy">No eligible class members available.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSaving || !userId}>{isSaving ? 'Adding...' : 'Add member'}</button>
      </form>
    </div>
  )
}

function getClassLabel(classItem) {
  if (!classItem) return 'Class'
  return classItem.title ?? classItem.name ?? 'Class'
}

export function GroupsPage() {
  const [searchParams] = useSearchParams()
  const { role } = useAuth()
  const { classes, isLoading: isClassesLoading } = useClasses()
  const { projects, isLoading: isProjectsLoading } = useProjects()
  const {
    addGroup,
    addMember,
    error,
    generateCreation,
    groups,
    isLoading,
    join,
    loadAvailableGroups,
    loadEligibleMembers,
    previewCreation,
    saveGroup,
    updateFormationStatus,
  } = useGroups()

  const [createOpen, setCreateOpen] = useState(false)
  const [managedGroup, setManagedGroup] = useState(null)
  const [memberGroup, setMemberGroup] = useState(null)
  const [notice, setNotice] = useState('')
  const [availableGroups, setAvailableGroups] = useState([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [availableError, setAvailableError] = useState('')
  const [studentFilters, setStudentFilters] = useState({
    classId: searchParams.get('classId') ?? '',
  })
  const [filters, setFilters] = useState({
    classId: '',
    projectId: searchParams.get('projectId') ?? '',
    search: '',
    section: '',
  })

  const isStudent = role === USER_ROLES.STUDENT
  const isProfessor = role === USER_ROLES.PROFESSOR
  const activeJoinedGroups = useMemo(
    () => groups.filter((group) => (group.members ?? []).some((member) => member.status === 'active')),
    [groups],
  )
  const hasJoinedGroup = activeJoinedGroups.length > 0
  const groupProjects = useMemo(
    () => projects.filter((project) => project.workMode === 'group'),
    [projects],
  )
  const classOptions = useMemo(() => classes.filter((item) => item.id), [classes])
  const sectionOptions = useMemo(() => [...new Set(classOptions.map((item) => item.section).filter(Boolean))], [classOptions])

  useEffect(() => {
    const projectId = searchParams.get('projectId') ?? ''
    setFilters((current) => (current.projectId === projectId ? current : { ...current, projectId }))
  }, [searchParams])

  useEffect(() => {
    if (!isStudent) return
    if (!studentFilters.classId && classOptions[0]?.id) {
      setStudentFilters((current) => ({ ...current, classId: current.classId || classOptions[0].id }))
    }
  }, [classOptions, isStudent, studentFilters.classId])

  useEffect(() => {
    if (!isStudent) return
    let cancelled = false

    async function load() {
      if (!studentFilters.classId || hasJoinedGroup) {
        setAvailableGroups([])
        setAvailableError('')
        return
      }

      setAvailableLoading(true)
      setAvailableError('')
      try {
        const result = await loadAvailableGroups({ classId: studentFilters.classId })
        if (!cancelled) setAvailableGroups(result)
      } catch (loadError) {
        if (!cancelled) setAvailableError(loadError.message)
      } finally {
        if (!cancelled) setAvailableLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [hasJoinedGroup, isStudent, loadAvailableGroups, studentFilters.classId])

  const visibleGroups = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return groups.filter((group) => {
      const matchesClass = !filters.classId || group.classId === filters.classId
      const matchesProject = !filters.projectId || group.projectId === filters.projectId
      const matchesSection = !filters.section || group.class?.section === filters.section
      const matchesSearch = !query || [
        group.name,
        group.description,
        group.project?.title,
        ...(group.members ?? []).map((member) => member.displayName),
      ].some((value) => value?.toLowerCase().includes(query))

      return matchesClass && matchesProject && matchesSection && matchesSearch
    })
  }, [filters.classId, filters.projectId, filters.search, filters.section, groups])

  const groupedByClass = useMemo(() => visibleGroups.reduce((map, group) => {
    const key = group.classId ?? 'none'
    const rows = map.get(key) ?? {
      className: `${group.class?.name ?? 'Class'}${group.class?.section ? ` - ${group.class.section}` : ''}`,
      groups: [],
    }
    rows.groups.push(group)
    map.set(key, rows)
    return map
  }, new Map()), [visibleGroups])

  async function handleCreate(payload) {
    await addGroup(payload)
    setNotice('Group created.')
    setCreateOpen(false)
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

  if (isLoading || isClassesLoading || isProjectsLoading) return <div className="route-state">Loading groups...</div>

  return (
    <section className="module-page groups-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">{isProfessor ? 'Professor' : 'Student'}</p>
          <h2>Groups</h2>
          <p>{isProfessor ? 'Review and manage all project groups.' : 'Create, join, and manage your project group.'}</p>
        </div>
        {isProfessor ? (
          <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}>
            Create Groups
          </button>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {availableError ? <p className="form-error">{availableError}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <GroupCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={groupProjects}
        defaultProjectId={filters.projectId}
        onCreateManual={handleCreate}
        onPreviewCreation={previewCreation}
        onGenerateCreation={generateCreation}
        onUpdateFormationStatus={updateFormationStatus}
      />

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
          onSave={handleManageGroup}
        />
      ) : null}

      {isStudent ? (
        <StudentAvailableGroupsPanel
          classes={classes}
          availableGroups={availableGroups}
          joinedGroups={activeJoinedGroups}
          filters={studentFilters}
          setFilters={setStudentFilters}
          isLoading={availableLoading}
          error={availableError}
          onJoin={handleJoin}
        />
      ) : null}

      {isProfessor ? (
        <>
          <div className="group-filter-bar">
            <label className="form-field" htmlFor="groupProjectFilter">
              <span>Project</span>
              <select id="groupProjectFilter" value={filters.projectId} onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}>
                <option value="">All projects</option>
                {groupProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </label>
            <label className="form-field" htmlFor="groupClassFilter">
              <span>Class</span>
              <select id="groupClassFilter" value={filters.classId} onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}>
                <option value="">All classes</option>
                {classOptions.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>{getClassLabel(classItem)}</option>
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
            {visibleGroups.length === 0 ? (
              <div className="empty-state">
                <h3>No groups found</h3>
                <p>Try another class, section, project, or search term.</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
