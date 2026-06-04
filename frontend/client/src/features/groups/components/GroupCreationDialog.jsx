import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Field, FieldGroup, FieldLabel, FieldDescription, Input, Select, Textarea } from '../../../components/ui/form'

const MODES = [
  { key: 'manual', label: 'Manual', description: 'Create one group and assign students manually.' },
  { key: 'random', label: 'Random', description: 'Shuffle eligible students into preview groups.' },
  { key: 'similar_performance', label: 'Similar Performance', description: 'Group students by contribution and task performance.' },
  { key: 'student_formed', label: 'Student-Formed', description: 'Generate empty groups students can join.' },
]

function formatMembers(group) {
  return (group.members ?? []).map((member) => member.displayName ?? member.email ?? member.userId)
}

function PreviewPanel({ title, preview, emptyLabel }) {
  if (!preview) {
    return (
      <Card className="group-generation-preview">
        <CardContent className="group-generation-empty">
          <p>{emptyLabel}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="group-generation-preview-grid">
      {preview.groups.map((group, index) => (
        <Card className="group-generation-preview" key={`${group.name}-${index}`}>
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
            <CardDescription>{group.description ?? title}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {formatMembers(group).length ? formatMembers(group).map((member) => (
              <div className="group-generation-member" key={member}>{member}</div>
            )) : <p className="muted-copy">Empty group</p>}
          </CardContent>
        </Card>
      ))}
      {preview.unassigned?.length ? (
        <Card className="group-generation-preview">
          <CardHeader>
            <CardTitle>Unassigned</CardTitle>
            <CardDescription>{preview.unassigned.length} students</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {preview.unassigned.map((student) => (
              <div className="group-generation-member" key={student.userId}>{student.displayName ?? student.email ?? student.userId}</div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ModePanel({
  active,
  description,
  mode,
  onPreview,
  onSave,
  onUpdateStatus,
  preview,
  projectId,
  projects,
  setProjectId,
  error,
  isPreviewing,
  isSaving,
  memberCount,
}) {
  const selectedProject = projects.find((project) => project.id === projectId)
  const groupProjects = useMemo(() => projects.filter((project) => project.workMode === 'group'), [projects])

  return (
    <Card className="group-generation-card" data-active={active}>
      <CardHeader>
        <CardTitle>{MODES.find((item) => item.key === mode)?.label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor={`${mode}-project`}>Project</FieldLabel>
            <Select
              id={`${mode}-project`}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">Select project</option>
              {groupProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} {project.memberCount ? `• ${project.memberCount} members` : ''}
                </option>
              ))}
            </Select>
          </Field>
          {mode === 'manual' ? null : (
            <Field className="md:col-span-2">
              <FieldDescription>
                {selectedProject ? `Member count: ${selectedProject.memberCount ?? memberCount ?? 1}` : 'Pick a project to generate a preview.'}
              </FieldDescription>
            </Field>
          )}
        </FieldGroup>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onPreview(mode, projectId)} disabled={isPreviewing || !projectId}>
            {isPreviewing ? 'Generating...' : 'Generate Preview'}
          </Button>
          {mode !== 'manual' ? (
            <Button type="button" variant="outline" onClick={() => onSave(mode, projectId, preview)} disabled={isSaving || !preview}>
              {isSaving ? 'Saving...' : 'Save Groups'}
            </Button>
          ) : null}
          {mode === 'student_formed' ? (
            <>
              <Button type="button" variant="secondary" onClick={() => onUpdateStatus(projectId, 'open')} disabled={!projectId}>Open Formation</Button>
              <Button type="button" variant="secondary" onClick={() => onUpdateStatus(projectId, 'closed')} disabled={!projectId}>Close Formation</Button>
              <Button type="button" variant="destructive" onClick={() => onUpdateStatus(projectId, 'finalized')} disabled={!projectId}>Finalize Groups</Button>
            </>
          ) : null}
        </div>

        {mode === 'manual' ? (
          <FieldDescription>
            Use the professor cards to assign members after creation.
          </FieldDescription>
        ) : (
          <PreviewPanel
            title={MODES.find((item) => item.key === mode)?.label}
            preview={preview}
            emptyLabel={`No ${MODES.find((item) => item.key === mode)?.label.toLowerCase()} preview generated yet.`}
          />
        )}
      </CardContent>
    </Card>
  )
}

export function GroupCreationDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId = '',
  onCreateManual,
  onPreviewCreation,
  onGenerateCreation,
  onUpdateFormationStatus,
}) {
  const [mode, setMode] = useState('manual')
  const [error, setError] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [manualForm, setManualForm] = useState({ projectId: '', name: '', description: '' })
  const [state, setState] = useState({
    random: { projectId: '', preview: null },
    similar_performance: { projectId: '', preview: null },
    student_formed: { projectId: '', preview: null },
  })

  const groupProjects = useMemo(() => projects.filter((project) => project.workMode === 'group'), [projects])

  useEffect(() => {
    if (!open) return
    const firstProjectId = defaultProjectId || groupProjects[0]?.id || ''
    setManualForm((current) => ({ ...current, projectId: current.projectId || firstProjectId }))
    setState((current) => ({
      random: { ...current.random, projectId: current.random.projectId || firstProjectId },
      similar_performance: { ...current.similar_performance, projectId: current.similar_performance.projectId || firstProjectId },
      student_formed: { ...current.student_formed, projectId: current.student_formed.projectId || firstProjectId },
    }))
  }, [defaultProjectId, groupProjects, open])

  function updateModeProject(modeKey, projectId) {
    setState((current) => ({
      ...current,
      [modeKey]: { ...current[modeKey], projectId, preview: null },
    }))
  }

  async function handleManualSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await onCreateManual({
        projectId: manualForm.projectId,
        name: manualForm.name,
        description: manualForm.description || null,
      })
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function handlePreview(modeKey, projectId) {
    if (!projectId) return
    setError('')
    setIsPreviewing(true)
    try {
      const preview = await onPreviewCreation({ projectId, mode: modeKey })
      setState((current) => ({
        ...current,
        [modeKey]: { projectId, preview },
      }))
    } catch (previewError) {
      setError(previewError.message)
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleSave(modeKey, projectId, preview) {
    if (!preview?.groups?.length) return
    setError('')
    setIsSaving(true)
    try {
      const payload = {
        projectId,
        mode: modeKey,
        groups: preview.groups,
      }
      if (modeKey === 'student_formed') payload.formationStatus = 'open'
      await onGenerateCreation(payload)
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="group-creation-dialog">
        <DialogHeader>
          <DialogTitle>Create Groups</DialogTitle>
          <DialogDescription>Manual, random, similar performance, and student-formed grouping.</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
            {MODES.map((item) => (
              <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="manual">
            <form className="flex flex-col gap-4" onSubmit={handleManualSubmit}>
              <FieldGroup className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="manual-project">Project</FieldLabel>
                  <Select id="manual-project" value={manualForm.projectId} onChange={(event) => setManualForm((current) => ({ ...current, projectId: event.target.value }))}>
                    <option value="">Select project</option>
                    {groupProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title}</option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="manual-name">Group name</FieldLabel>
                  <Input id="manual-name" value={manualForm.name} onChange={(event) => setManualForm((current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="manual-description">Description</FieldLabel>
                  <Textarea id="manual-description" rows="4" value={manualForm.description} onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))} />
                </Field>
              </FieldGroup>
              {error ? <p className="form-error">{error}</p> : null}
              <DialogFooter>
                <Button type="submit">Create Group</Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {MODES.filter((item) => item.key !== 'manual').map((item) => (
            <TabsContent key={item.key} value={item.key}>
              <ModePanel
                active={mode === item.key}
                description={item.description}
                mode={item.key}
                onPreview={handlePreview}
                onSave={handleSave}
                onUpdateStatus={onUpdateFormationStatus}
                preview={state[item.key].preview}
                projectId={state[item.key].projectId}
                projects={projects}
                setProjectId={(projectId) => updateModeProject(item.key, projectId)}
                error={error}
                isPreviewing={isPreviewing}
                isSaving={isSaving}
                memberCount={groupProjects.find((project) => project.id === state[item.key].projectId)?.memberCount}
              />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
