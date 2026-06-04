import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Field, FieldGroup, FieldLabel, Select } from '../../../components/ui/form'

function AvailableGroupCard({ group, onJoin }) {
  return (
    <Card className="group-card">
      <CardHeader>
        <CardTitle>{group.name}</CardTitle>
        <CardDescription>{group.project?.title ?? 'Student-formed group'}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Class</span>
            <span>{group.class?.name ?? 'Class'}{group.class?.section ? ` / ${group.class.section}` : ''}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Members</span>
            <span>{(group.members ?? []).filter((member) => member.status === 'active').length} / {group.memberLimit ?? group.project?.memberCount ?? 1}</span>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => onJoin(group)}>Join group</Button>
      </CardContent>
    </Card>
  )
}

export function StudentAvailableGroupsPanel({
  classes,
  availableGroups,
  joinedGroups,
  filters,
  setFilters,
  isLoading = false,
  error = '',
  onJoin,
}) {
  const [pendingGroup, setPendingGroup] = useState(null)
  const classOptions = useMemo(() => classes.filter((item) => item.id), [classes])
  const activeGroups = joinedGroups.filter((group) => (group.members ?? []).some((member) => member.status === 'active'))

  useEffect(() => {
    if (!filters.classId && classOptions[0]?.id) {
      setFilters((current) => ({ ...current, classId: current.classId || classOptions[0].id }))
    }
  }, [classOptions, filters.classId, setFilters])

  return (
    <div className="flex flex-col gap-4">
      {activeGroups.length > 0 ? (
        <section className="class-group-section">
          <h3>Your group</h3>
          <div className="group-card-grid">
            {activeGroups.map((group) => (
              <Card className="group-card" key={group.id}>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.project?.title ?? 'Project group'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="muted-copy">You are already in this group. Other available groups are hidden.</p>
                  <div className="card-actions">
                    <Link className="secondary-link-button" to={`/student/groups/${group.id}`}>Open group</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <>
          <FieldGroup className="group-filter-bar">
            <Field>
              <FieldLabel htmlFor="studentGroupClass">Class</FieldLabel>
              <Select
                id="studentGroupClass"
                value={filters.classId}
                onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}
              >
                <option value="">Select class</option>
                {classOptions.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.title ?? classItem.name}{classItem.section ? ` - ${classItem.section}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGroup>

          {filters.classId ? (
            <section className="class-group-section">
              <h3>Available student-formed groups</h3>
              {error ? <p className="form-error">{error}</p> : null}
              {isLoading ? <p className="muted-copy">Loading available groups...</p> : null}
              <div className="group-card-grid">
                {availableGroups.map((group) => (
                  <AvailableGroupCard key={group.id} group={group} onJoin={setPendingGroup} />
                ))}
              </div>
              {!isLoading && !availableGroups.length ? <div className="empty-state"><h3>No open groups yet</h3><p>Pick another class or wait for formation to open.</p></div> : null}
            </section>
          ) : (
            <div className="empty-state">
              <h3>Select a class</h3>
              <p>Open student-formed groups appear after choosing the class.</p>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(pendingGroup)} onOpenChange={(open) => (!open ? setPendingGroup(null) : null)}>
        <DialogContent className="group-creation-dialog">
          <DialogHeader>
            <DialogTitle>Join group</DialogTitle>
            <DialogDescription>
              {pendingGroup ? `Join ${pendingGroup.name} for ${pendingGroup.project?.title ?? 'this project'}?` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => onJoin(pendingGroup.id).then(() => setPendingGroup(null)).catch(() => {})}>Confirm join</Button>
            <Button type="button" variant="outline" onClick={() => setPendingGroup(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
