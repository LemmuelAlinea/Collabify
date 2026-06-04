import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { runTaskGenerationAi } from './taskGenerationAiService.js'

const GENERATION_SELECT = `
  id,
  project_id,
  group_id,
  generated_by,
  status,
  project_version,
  prompt_inputs,
  generated_structure,
  project_summary,
  complexity_score,
  complexity_label,
  structure_type,
  total_weight,
  report,
  accepted_at,
  created_at,
  updated_at
`

function normalizeGeneration(row, tasks = [], milestones = [], workload = null) {
  return {
    id: row.id,
    projectId: row.project_id,
    groupId: row.group_id,
    generatedBy: row.generated_by,
    status: row.status,
    projectVersion: row.project_version,
    promptInputs: row.prompt_inputs,
    generatedStructure: row.generated_structure,
    projectSummary: row.project_summary,
    complexityScore: row.complexity_score,
    complexityLabel: row.complexity_label,
    structureType: row.structure_type,
    totalWeight: row.total_weight,
    report: row.report,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tasks,
    milestones,
    workload,
  }
}

function normalizeGeneratedTask(row, subtasks = []) {
  return {
    id: row.id,
    generationId: row.generation_id,
    title: row.title,
    description: row.description,
    milestoneKey: row.milestone_key,
    roleSuggestion: row.role_suggestion,
    priority: row.priority,
    estimatedHours: row.estimated_hours,
    points: row.points,
    weight: row.weight,
    dueAt: row.due_at,
    position: row.position,
    reasoning: row.reasoning,
    learningOutcomes: row.learning_outcomes ?? [],
    acceptedTaskId: row.accepted_task_id,
    subtasks,
  }
}

async function assertCanPlan(userId, role, projectId, groupId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, description, guidelines, rubric, project_type, year_level, work_mode, member_count, start_at, deadline_at, classes:class_id (professor_id, subject, year_level, semester, term)')
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(project.class_id, userId)
  } else {
    if (!groupId) throw new HttpError(422, 'Students must choose a group')
    const { data: member } = await supabaseAdminClient
      .from('group_members')
      .select('id, groups:group_id (project_id)')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!member || member.groups?.project_id !== projectId) throw new HttpError(403, 'You do not have permission to plan this project')
  }

  if (groupId) {
    const { data: group } = await supabaseAdminClient
      .from('groups')
      .select('id, project_id, class_id, name')
      .eq('id', groupId)
      .single()

    if (!group || group.project_id !== projectId) throw new HttpError(422, 'Group must belong to this project')
  }

  return project
}

async function listProjectGroups(projectId) {
  const { data, error } = await supabaseAdminClient
    .from('groups')
    .select('id, project_id, class_id, name')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load project groups', error.message)
  return data ?? []
}

async function getInputContext(userId, role, payload) {
  const project = await assertCanPlan(userId, role, payload.projectId, payload.groupId)

  const [{ data: syllabus }, { data: validation }, { data: members }, { data: existingTasks }] = await Promise.all([
    supabaseAdminClient.from('syllabi').select('id, title, description, file_name, metadata').eq('class_id', project.class_id).eq('is_active', true),
    supabaseAdminClient.from('project_validations').select('readiness_score, difficulty_score, full_report').eq('project_id', project.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    payload.groupId ? supabaseAdminClient.from('group_members').select('user_id, is_leader, profiles:user_id (display_name)').eq('group_id', payload.groupId).eq('status', 'active') : { data: [] },
    payload.groupId ? supabaseAdminClient.from('tasks').select('id, title, status').eq('group_id', payload.groupId) : { data: [] },
  ])

  return {
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      guidelines: project.guidelines,
      rubrics: project.rubric,
      projectType: project.project_type,
      yearLevel: project.year_level,
      workMode: project.work_mode,
      memberCount: project.member_count,
      startAt: project.start_at,
      deadlineAt: project.deadline_at,
    },
    class: {
      id: project.class_id,
      subject: project.classes?.subject,
      yearLevel: project.classes?.year_level,
      semester: project.classes?.semester ?? project.classes?.term,
    },
    syllabus: syllabus ?? [],
    validation: validation ?? null,
    members: members ?? [],
    existingTasks: existingTasks ?? [],
  }
}

async function hydrateGeneration(row) {
  const [{ data: taskRows }, { data: subtaskRows }, { data: milestones }, { data: workloadRows }] = await Promise.all([
    supabaseAdminClient.from('ai_generated_tasks').select('*').eq('generation_id', row.id).order('position'),
    supabaseAdminClient.from('ai_generated_subtasks').select('*').eq('generation_id', row.id).order('position'),
    supabaseAdminClient.from('milestones').select('*').eq('generation_id', row.id).order('position'),
    supabaseAdminClient.from('workload_analysis').select('*').eq('generation_id', row.id).maybeSingle(),
  ])

  const subtasksByTaskId = new Map()
  for (const subtask of subtaskRows ?? []) {
    const items = subtasksByTaskId.get(subtask.generated_task_id) ?? []
    items.push({
      id: subtask.id,
      title: subtask.title,
      description: subtask.description,
      roleSuggestion: subtask.role_suggestion,
      priority: subtask.priority,
      estimatedHours: subtask.estimated_hours,
      points: subtask.points,
      weight: subtask.weight,
      dueAt: subtask.due_at,
      position: subtask.position,
      reasoning: subtask.reasoning,
      learningOutcomes: subtask.learning_outcomes ?? [],
      acceptedTaskId: subtask.accepted_task_id,
    })
    subtasksByTaskId.set(subtask.generated_task_id, items)
  }

  const tasks = (taskRows ?? []).map((task) => normalizeGeneratedTask(task, subtasksByTaskId.get(task.id) ?? []))
  return normalizeGeneration(row, tasks, milestones ?? [], workloadRows ?? null)
}

function applyGeneratedTaskEdits(tasks, editedTasks = []) {
  const editsById = new Map()

  function collect(rows = []) {
    for (const row of rows) {
      editsById.set(row.id, row)
      collect(row.subtasks ?? [])
    }
  }

  function apply(rows = []) {
    return rows.map((task) => {
      const edit = editsById.get(task.id)
      return {
        ...task,
        title: edit?.title ?? task.title,
        description: edit?.description ?? task.description,
        dueAt: edit && Object.prototype.hasOwnProperty.call(edit, 'dueAt') ? edit.dueAt : task.dueAt,
        subtasks: apply(task.subtasks ?? []),
      }
    })
  }

  collect(editedTasks)
  return apply(tasks)
}

export async function generateProjectPlan(userId, role, payload) {
  const input = await getInputContext(userId, role, payload)
  const plan = await runTaskGenerationAi(input)

  let countQuery = supabaseAdminClient
    .from('ai_task_generations')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', payload.projectId)

  countQuery = payload.groupId ? countQuery.eq('group_id', payload.groupId) : countQuery.is('group_id', null)
  const { count } = await countQuery

  const { data: generation, error } = await supabaseAdminClient
    .from('ai_task_generations')
    .insert({
      project_id: payload.projectId,
      group_id: payload.groupId,
      generated_by: userId,
      project_version: (count ?? 0) + 1,
      prompt_inputs: input,
      generated_structure: plan,
      project_summary: plan.projectSummary,
      complexity_score: plan.complexityScore ?? 0,
      complexity_label: plan.complexityLabel ?? 'Moderate',
      structure_type: plan.structureType ?? 'hierarchical',
      total_weight: 100,
      report: plan.report ?? {},
    })
    .select(GENERATION_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to save generated plan', error.message)

  const generatedTaskRows = []
  for (const [index, task] of (plan.tasks ?? []).entries()) {
    const { data: taskRow, error: taskError } = await supabaseAdminClient
      .from('ai_generated_tasks')
      .insert({
        generation_id: generation.id,
        title: task.title,
        description: task.description,
        milestone_key: task.milestoneKey,
        role_suggestion: task.roleSuggestion,
        priority: task.priority ?? 'medium',
        estimated_hours: task.estimatedHours ?? 0,
        points: task.points ?? 5,
        weight: task.weight ?? 0,
        due_at: task.dueAt,
        position: index,
        reasoning: task.reasoning,
        learning_outcomes: task.learningOutcomes ?? [],
      })
      .select('id')
      .single()

    if (taskError) throw new HttpError(400, 'Unable to save generated task', taskError.message)
    generatedTaskRows.push({ key: task.key, id: taskRow.id, subtasks: task.subtasks ?? [] })

    if (task.subtasks?.length) {
      const { error: subtaskError } = await supabaseAdminClient.from('ai_generated_subtasks').insert(task.subtasks.map((subtask, subIndex) => ({
        generation_id: generation.id,
        generated_task_id: taskRow.id,
        title: subtask.title,
        description: subtask.description,
        role_suggestion: subtask.roleSuggestion,
        priority: subtask.priority ?? 'medium',
        estimated_hours: subtask.estimatedHours ?? 0,
        points: subtask.points ?? 2,
        weight: subtask.weight ?? 0,
        due_at: subtask.dueAt,
        position: subIndex,
        reasoning: subtask.reasoning,
        learning_outcomes: subtask.learningOutcomes ?? [],
      })))

      if (subtaskError) throw new HttpError(400, 'Unable to save generated subtasks', subtaskError.message)
    }
  }

  if (plan.milestones?.length) {
    await supabaseAdminClient.from('milestones').insert(plan.milestones.map((milestone, index) => ({
      project_id: payload.projectId,
      group_id: payload.groupId,
      generation_id: generation.id,
      title: milestone.title,
      description: milestone.description,
      due_at: milestone.dueAt,
      position: milestone.position ?? index,
    })))
  }

  await supabaseAdminClient.from('workload_analysis').insert({
    generation_id: generation.id,
    project_id: payload.projectId,
    group_id: payload.groupId,
    team_size: plan.workloadAnalysis?.teamSize ?? input.members.length ?? 1,
    total_estimated_hours: plan.workloadAnalysis?.totalEstimatedHours ?? 0,
    balance_score: plan.workloadAnalysis?.balanceScore ?? 0,
    contribution_plan: plan.workloadAnalysis?.contributionPlan ?? [],
    role_suggestions: plan.workloadAnalysis?.roleSuggestions ?? [],
    warnings: plan.workloadAnalysis?.warnings ?? [],
  })

  return hydrateGeneration(generation)
}

export async function listProjectPlans(userId, role, projectId, groupId) {
  await assertCanPlan(userId, role, projectId, groupId)

  let query = supabaseAdminClient
    .from('ai_task_generations')
    .select(GENERATION_SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (groupId) query = query.eq('group_id', groupId)

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load generated plans', error.message)
  return Promise.all((data ?? []).map(hydrateGeneration))
}

export async function acceptGeneratedPlan(userId, role, generationId, payload) {
  const { data: generation, error } = await supabaseAdminClient
    .from('ai_task_generations')
    .select(GENERATION_SELECT)
    .eq('id', generationId)
    .single()

  if (error || !generation) throw new HttpError(404, 'Generated plan not found')
  await assertCanPlan(userId, role, generation.project_id, generation.group_id)
  const targetGroups = generation.group_id
    ? [{ id: generation.group_id }]
    : await listProjectGroups(generation.project_id)

  if (targetGroups.length === 0) throw new HttpError(422, 'This project has no groups yet')

  if (payload.mode === 'replace') {
    const deleteQuery = supabaseAdminClient.from('tasks').delete().eq('project_id', generation.project_id)
    if (generation.group_id) {
      await deleteQuery.eq('group_id', generation.group_id)
    } else {
      await deleteQuery.in('group_id', targetGroups.map((group) => group.id))
    }
  }

  const plan = await hydrateGeneration(generation)
  const acceptedTasks = applyGeneratedTaskEdits(plan.tasks, payload.tasks ?? [])
  const taskIdByGeneratedId = new Map()

  for (const group of targetGroups) {
    for (const task of acceptedTasks) {
      const { data: taskRow, error: taskError } = await supabaseAdminClient
        .from('tasks')
        .insert({
          project_id: generation.project_id,
          group_id: group.id,
          created_by: userId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_at: task.dueAt,
          estimated_hours: task.estimatedHours,
          metadata: { aiGenerationId: generationId, points: task.points, weight: task.weight, roleSuggestion: task.roleSuggestion, reasoning: task.reasoning, learningOutcomes: task.learningOutcomes },
        })
        .select('id')
        .single()

      if (taskError) throw new HttpError(400, 'Unable to create generated task', taskError.message)
      if (!taskIdByGeneratedId.has(task.id)) taskIdByGeneratedId.set(task.id, taskRow.id)
      await supabaseAdminClient.from('ai_generated_tasks').update({ accepted_task_id: taskRow.id }).eq('id', task.id)

      for (const subtask of task.subtasks) {
        const { data: subtaskRow, error: subtaskError } = await supabaseAdminClient
          .from('tasks')
          .insert({
            project_id: generation.project_id,
            group_id: group.id,
            parent_task_id: taskRow.id,
            created_by: userId,
            title: subtask.title,
            description: subtask.description,
            priority: subtask.priority,
            due_at: subtask.dueAt,
            estimated_hours: subtask.estimatedHours,
            metadata: { aiGenerationId: generationId, points: subtask.points, weight: subtask.weight, roleSuggestion: subtask.roleSuggestion, reasoning: subtask.reasoning, learningOutcomes: subtask.learningOutcomes },
          })
          .select('id')
          .single()

        if (subtaskError) throw new HttpError(400, 'Unable to create generated subtask', subtaskError.message)
        await supabaseAdminClient.from('ai_generated_subtasks').update({ accepted_task_id: subtaskRow.id }).eq('id', subtask.id)
      }
    }
  }

  const { data: milestones } = await supabaseAdminClient.from('milestones').select('id, title').eq('generation_id', generationId)
  for (const milestone of milestones ?? []) {
    const matchingTaskIds = acceptedTasks
      .filter((task) => task.milestoneKey && milestone.title.toLowerCase().includes(task.milestoneKey.toLowerCase()))
      .map((task) => taskIdByGeneratedId.get(task.id))
      .filter(Boolean)

    if (matchingTaskIds.length) {
      await supabaseAdminClient.from('milestone_tasks').insert(matchingTaskIds.map((taskId) => ({ milestone_id: milestone.id, task_id: taskId })))
    }
  }

  const { data: updated } = await supabaseAdminClient
    .from('ai_task_generations')
    .update({ status: payload.mode === 'replace' ? 'accepted' : 'merged', accepted_at: new Date().toISOString() })
    .eq('id', generationId)
    .select(GENERATION_SELECT)
    .single()

  return hydrateGeneration(updated)
}
