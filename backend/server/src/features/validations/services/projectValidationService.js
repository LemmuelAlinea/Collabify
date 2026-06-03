import { HttpError } from '../../../core/errors/httpError.js'
import { env } from '../../../config/env.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { extractAttachmentText } from '../../../core/utils/attachmentText.js'
import { runProjectValidationAi } from './projectValidationAiService.js'

const VALIDATION_SELECT = `
  id,
  project_id,
  professor_id,
  version,
  readiness_score,
  readiness_label,
  difficulty_score,
  difficulty_label,
  executive_summary,
  full_report,
  decision,
  decided_at,
  created_at,
  updated_at
`

function normalizeValidation(row, scores = [], recommendations = [], risks = [], history = []) {
  return {
    id: row.id,
    projectId: row.project_id,
    professorId: row.professor_id,
    version: row.version,
    readinessScore: row.readiness_score,
    readinessLabel: row.readiness_label,
    difficultyScore: row.difficulty_score,
    difficultyLabel: row.difficulty_label,
    executiveSummary: row.executive_summary,
    fullReport: row.full_report,
    decision: row.decision,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scores,
    recommendations,
    risks,
    history,
  }
}

function normalizeScore(row) {
  return {
    id: row.id,
    validationId: row.validation_id,
    category: row.category,
    score: row.score,
    label: row.label,
    explanation: row.explanation,
  }
}

function normalizeRecommendation(row) {
  return {
    id: row.id,
    validationId: row.validation_id,
    priority: row.priority,
    title: row.title,
    description: row.description,
    actionType: row.action_type,
    isAccepted: row.is_accepted,
  }
}

function normalizeRisk(row) {
  return {
    id: row.id,
    validationId: row.validation_id,
    riskType: row.risk_type,
    severity: row.severity,
    probability: row.probability,
    reason: row.reason,
    mitigation: row.mitigation,
  }
}

async function getProjectContext(projectId, professorId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select(`
      id,
      class_id,
      created_by,
      title,
      description,
      guidelines,
      project_type,
      year_level,
      work_mode,
      member_count,
      start_at,
      deadline_at,
      visibility_at,
      rubric,
      classes:class_id (
      id,
      syllabus_id,
      curriculum_id,
      title,
      subject,
        year_level,
        semester,
        term,
        professor_id
      )
    `)
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')
  await assertProfessorOwnsClass(project.class_id, professorId)

  const [{ data: assignedSyllabus }, { data: assignedCurriculum }, { data: curriculumStudies }, { data: classSyllabi }, { data: analytics }, { data: similarProjects }] = await Promise.all([
    project.classes.syllabus_id
      ? supabaseAdminClient
        .from('syllabi')
        .select('id, class_id, title, description, storage_path, file_name, mime_type, file_size_bytes, version, is_active, effective_from, effective_to, created_at, updated_at')
        .eq('id', project.classes.syllabus_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    project.classes.curriculum_id
      ? supabaseAdminClient
        .from('curricula')
        .select('id, professor_id, title, description, program_objectives, program_outcomes, curriculum_components, academic_year, storage_path, file_name, mime_type, file_size_bytes, is_active, created_at, updated_at')
        .eq('id', project.classes.curriculum_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    project.classes.curriculum_id
      ? supabaseAdminClient
        .from('curriculum_program_studies')
        .select('id, curriculum_id, content, sort_order')
        .eq('curriculum_id', project.classes.curriculum_id)
        .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabaseAdminClient
      .from('syllabi')
      .select('id, class_id, title, description, storage_path, file_name, mime_type, file_size_bytes, version, is_active, effective_from, effective_to, created_at, updated_at')
      .eq('class_id', project.class_id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdminClient
      .from('project_analytics')
      .select('project_id, learning_effectiveness, project_effectiveness, completion_rate, contribution_fairness, health_score')
      .eq('class_id', project.class_id)
      .limit(12),
    supabaseAdminClient
      .from('projects')
      .select('id, title, project_type, year_level, work_mode, member_count, deadline_at')
      .eq('project_type', project.project_type)
      .neq('id', project.id)
      .limit(8),
  ])

  const allClassSyllabi = classSyllabi ?? []
  const activeClassSyllabi = allClassSyllabi.filter((item) => item.is_active)
  const syllabusById = new Map()

  if (assignedSyllabus?.id) syllabusById.set(assignedSyllabus.id, assignedSyllabus)
  for (const syllabus of activeClassSyllabi) {
    if (syllabus?.id && !syllabusById.has(syllabus.id)) syllabusById.set(syllabus.id, syllabus)
  }
  if (syllabusById.size === 0) {
    for (const syllabus of allClassSyllabi) {
      if (syllabus?.id && !syllabusById.has(syllabus.id)) syllabusById.set(syllabus.id, syllabus)
    }
  }

  const resolvedSyllabus = await Promise.all(Array.from(syllabusById.values()).map(async (syllabus) => ({
    ...syllabus,
    fileText: syllabus.storage_path
      ? await extractAttachmentText({
        bucket: env.syllabiBucket,
        storagePath: syllabus.storage_path,
        mimeType: syllabus.mime_type,
        fileName: syllabus.file_name,
      })
      : null,
  })))

  const resolvedCurriculum = assignedCurriculum
    ? {
      ...assignedCurriculum,
      fileText: assignedCurriculum.storage_path
        ? await extractAttachmentText({
          bucket: env.curriculaBucket,
          storagePath: assignedCurriculum.storage_path,
          mimeType: assignedCurriculum.mime_type,
          fileName: assignedCurriculum.file_name,
        })
        : null,
      programStudies: curriculumStudies ?? [],
    }
    : null

  return {
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      guidelines: project.guidelines,
      rubrics: project.rubric,
      projectType: project.project_type,
      workMode: project.work_mode,
      memberCount: project.member_count,
      startAt: project.start_at,
      deadlineAt: project.deadline_at,
      visibilityAt: project.visibility_at,
      yearLevel: project.year_level,
    },
    class: {
      id: project.classes.id,
      subject: project.classes.subject,
      yearLevel: project.classes.year_level,
      semester: project.classes.semester ?? project.classes.term,
      syllabusId: project.classes.syllabus_id ?? null,
      curriculumId: project.classes.curriculum_id ?? null,
    },
    curriculum: resolvedCurriculum,
    curriculumSource: resolvedCurriculum ? 'assigned_class_curriculum' : 'none',
    syllabus: resolvedSyllabus,
    syllabusSource: assignedSyllabus
      ? 'assigned_class_syllabus'
      : activeClassSyllabi.length
        ? 'active_class_syllabi'
        : allClassSyllabi.length
          ? 'class_syllabi_fallback'
          : 'none',
    historicalData: analytics ?? [],
    similarProjects: similarProjects ?? [],
  }
}

async function hydrateValidation(row) {
  const [{ data: scores }, { data: recommendations }, { data: risks }, { data: history }] = await Promise.all([
    supabaseAdminClient.from('validation_scores').select('*').eq('validation_id', row.id).order('category'),
    supabaseAdminClient.from('validation_recommendations').select('*').eq('validation_id', row.id).order('created_at'),
    supabaseAdminClient.from('validation_risks').select('*').eq('validation_id', row.id).order('severity'),
    supabaseAdminClient.from('validation_history').select('*').eq('validation_id', row.id).order('created_at', { ascending: false }),
  ])

  return normalizeValidation(
    row,
    (scores ?? []).map(normalizeScore),
    (recommendations ?? []).map(normalizeRecommendation),
    (risks ?? []).map(normalizeRisk),
    history ?? [],
  )
}

export async function analyzeProject(professorId, projectId) {
  const context = await getProjectContext(projectId, professorId)

  const { count } = await supabaseAdminClient
    .from('project_validations')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const version = (count ?? 0) + 1
  const report = await runProjectValidationAi(context)

  const { data: validation, error } = await supabaseAdminClient
    .from('project_validations')
    .insert({
      project_id: projectId,
      professor_id: professorId,
      version,
      readiness_score: report.readinessScore ?? 0,
      readiness_label: report.readinessLabel ?? 'Needs Revision',
      difficulty_score: report.difficultyScore ?? 0,
      difficulty_label: report.difficultyLabel ?? 'Intermediate',
      executive_summary: report.executiveSummary,
      full_report: report,
    })
    .select(VALIDATION_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to save validation', error.message)

  const scoreRows = (report.scores ?? []).map((score) => ({
      validation_id: validation.id,
      category: score.category,
      score: score.score,
      label: score.label,
      explanation: score.explanation,
    }))
  const recommendationRows = (report.recommendations ?? []).map((item) => ({
      validation_id: validation.id,
      priority: item.priority ?? 'medium',
      title: item.title,
      description: item.description,
      action_type: item.actionType,
    }))
  const riskRows = (report.risks ?? []).map((risk) => ({
      validation_id: validation.id,
      risk_type: risk.riskType,
      severity: risk.severity ?? 'medium',
      probability: risk.probability,
      reason: risk.reason,
      mitigation: risk.mitigation,
    }))

  await Promise.all([
    scoreRows.length ? supabaseAdminClient.from('validation_scores').insert(scoreRows) : Promise.resolve(),
    recommendationRows.length ? supabaseAdminClient.from('validation_recommendations').insert(recommendationRows) : Promise.resolve(),
    riskRows.length ? supabaseAdminClient.from('validation_risks').insert(riskRows) : Promise.resolve(),
    supabaseAdminClient.from('validation_history').insert({
      validation_id: validation.id,
      project_id: projectId,
      professor_id: professorId,
      event: 'analyzed',
      snapshot: { project: context.project, report },
    }),
  ])

  return hydrateValidation(validation)
}

export async function listProjectValidations(userId, role, projectId) {
  if (role === 'professor') await getProjectContext(projectId, userId)

  const { data, error } = await supabaseAdminClient
    .from('project_validations')
    .select(VALIDATION_SELECT)
    .eq('project_id', projectId)
    .neq('decision', 'ignored_suggestions')
    .order('created_at', { ascending: false })

  if (error) throw new HttpError(400, 'Unable to load validations', error.message)
  return Promise.all((data ?? []).map(hydrateValidation))
}

export async function getValidation(userId, role, validationId) {
  const { data, error } = await supabaseAdminClient
    .from('project_validations')
    .select(VALIDATION_SELECT)
    .eq('id', validationId)
    .single()

  if (error || !data) throw new HttpError(404, 'Validation not found')
  if (role === 'professor') await getProjectContext(data.project_id, userId)
  return hydrateValidation(data)
}

export async function updateValidationDecision(professorId, validationId, decision) {
  const validation = await getValidation(professorId, 'professor', validationId)

  const { data, error } = await supabaseAdminClient
    .from('project_validations')
    .update({
      decision,
      decided_at: new Date().toISOString(),
    })
    .eq('id', validationId)
    .select(VALIDATION_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to update validation decision', error.message)

  await supabaseAdminClient.from('validation_history').insert({
    validation_id: validationId,
    project_id: validation.projectId,
    professor_id: professorId,
    event: decision,
    snapshot: validation,
  })

  return hydrateValidation(data)
}
