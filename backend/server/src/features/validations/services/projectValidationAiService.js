import { env } from '../../../config/env.js'
import { buildProjectValidationPrompt } from './projectValidationPrompt.js'

const REQUIRED_SCORE_CATEGORIES = [
  'curriculum_alignment',
  'syllabus_alignment',
  'year_level_appropriateness',
  'scope_realism',
  'timeline_feasibility',
  'team_size_suitability',
  'workload_balance',
  'skill_coverage',
  'learning_outcome_prediction',
  'rubric_quality',
  'project_type_fit',
]

function fallbackLabel(score) {
  if (score >= 90) return 'Ready for Release'
  if (score >= 75) return 'Ready with Minor Improvements'
  if (score >= 60) return 'Needs Revision'
  return 'High Risk Project'
}

function scoreLabel(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Moderate'
  return 'Poor'
}

function clampScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getDurationDays(project) {
  const start = new Date(project.startAt ?? project.visibilityAt ?? Date.now()).getTime()
  const end = new Date(project.deadlineAt ?? Date.now()).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1
  return Math.max(1, Math.ceil((end - start) / 86400000))
}

function getFeatureLoad(project) {
  return `${project.title ?? ''} ${project.description ?? ''} ${project.guidelines ?? ''} ${project.rubrics ?? ''}`
    .split(/[,\n.;:]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .length
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your', 'are', 'was', 'were', 'have', 'has', 'had',
  'will', 'would', 'could', 'should', 'about', 'project', 'system', 'test', 'tests', 'data', 'use', 'using', 'into',
])

function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

function uniqueCount(tokens) {
  return new Set(tokens).size
}

function looksPlaceholder(text) {
  const value = String(text ?? '').trim().toLowerCase()
  if (!value) return true
  if (/^(test|sample|n\/a|none|null|temp|tmp|draft|tbd|todo)+$/.test(value.replace(/\s+/g, ''))) return true
  return value.length <= 4
}

function overlapRatio(leftTokens, rightTokens) {
  if (!leftTokens.length || !rightTokens.length) return 0
  const right = new Set(rightTokens)
  const hits = new Set(leftTokens.filter((token) => right.has(token))).size
  return hits / Math.max(1, new Set(leftTokens).size)
}

function upsertScore(scores, category, patch) {
  const index = scores.findIndex((score) => score.category === category)
  const next = {
    category,
    score: clampScore(patch.score),
    label: patch.label,
    explanation: patch.explanation,
  }

  if (index >= 0) scores[index] = { ...scores[index], ...next }
  else scores.push(next)
}

function addRisk(risks, risk) {
  if (risks.some((item) => item.riskType === risk.riskType && item.reason === risk.reason)) return
  risks.push(risk)
}

function addRecommendation(recommendations, recommendation) {
  if (recommendations.some((item) => item.actionType === recommendation.actionType && item.title === recommendation.title)) return
  recommendations.push(recommendation)
}

export function enforceAcademicValidationRules(input, validation) {
  const project = input.project ?? {}
  const classYearLevel = Number(input.class?.yearLevel ?? project.yearLevel ?? 1)
  const projectYearLevel = Number(project.yearLevel ?? classYearLevel)
  const featureLoad = getFeatureLoad(project)
  const durationDays = getDurationDays(project)
  const teamSize = project.workMode === 'individual' ? 1 : Math.max(1, Number(project.memberCount ?? 1))
  const hasSyllabus = Array.isArray(input.syllabus) && input.syllabus.some((item) => (
    Boolean(item?.id)
    || Boolean(item?.title?.trim?.())
    || Boolean(item?.description?.trim?.())
    || Boolean(item?.file_name?.trim?.())
  ))
  const hasCurriculum = Boolean(input.curriculum?.id)
    || Boolean(input.curriculum?.title?.trim?.())
    || Boolean(input.curriculum?.description?.trim?.())
    || Boolean(input.curriculum?.program_objectives?.trim?.())
    || Boolean(input.curriculum?.program_outcomes?.trim?.())
    || Boolean(input.curriculum?.curriculum_components?.trim?.())
    || Boolean(input.curriculum?.fileText?.trim?.())
    || (Array.isArray(input.curriculum?.programStudies) && input.curriculum.programStudies.some((item) => Boolean(item?.content?.trim?.())))
  const scores = Array.isArray(validation.scores) ? [...validation.scores] : []
  const risks = Array.isArray(validation.risks) ? [...validation.risks] : []
  const recommendations = Array.isArray(validation.recommendations) ? [...validation.recommendations] : []
  const difficultyScore = clampScore(validation.difficultyScore ?? featureLoad * 5 + projectYearLevel * 12)
  const isAdvancedProject = difficultyScore >= 70 || /capstone|system|mobile|web|ai|database|management/i.test(`${project.projectType ?? ''} ${project.title ?? ''}`)
  const workloadDaysNeeded = Math.ceil((featureLoad * 1.6 + difficultyScore / 5) / teamSize)
  const timelineTooShort = durationDays < Math.max(14, workloadDaysNeeded)
  const yearMismatch = classYearLevel <= 2 && isAdvancedProject
  const projectNarrative = [project.title, project.description, project.guidelines, project.rubrics].filter(Boolean).join(' ')
  const syllabusNarrative = (Array.isArray(input.syllabus) ? input.syllabus : [])
    .map((item) => [item?.title, item?.description, item?.file_name].filter(Boolean).join(' '))
    .join(' ')
  const curriculumNarrative = input.curriculum
    ? [
      input.curriculum.title,
      input.curriculum.description,
      input.curriculum.program_objectives,
      input.curriculum.program_outcomes,
      input.curriculum.curriculum_components,
      input.curriculum.academic_year,
      input.curriculum.fileText,
      ...(input.curriculum.programStudies ?? []).map((item) => item?.content),
    ].filter(Boolean).join(' ')
    : ''
  const projectTokens = tokenize(projectNarrative)
  const syllabusTokens = tokenize(syllabusNarrative)
  const curriculumTokens = tokenize(curriculumNarrative)
  const projectEvidenceWeak = looksPlaceholder(project.title) || looksPlaceholder(project.description) || uniqueCount(projectTokens) < 12
  const syllabusEvidenceWeak = !hasSyllabus || uniqueCount(syllabusTokens) < 8
  const curriculumEvidenceWeak = !hasCurriculum || uniqueCount(curriculumTokens) < 8
  const syllabusAlignmentEvidence = overlapRatio(projectTokens, syllabusTokens)
  const curriculumAlignmentEvidence = overlapRatio(projectTokens, curriculumTokens)

  if (!hasCurriculum) {
    upsertScore(scores, 'curriculum_alignment', {
      score: 20,
      label: 'Missing Curriculum',
      explanation: 'No curriculum is assigned to this class, so program-level alignment cannot be verified.',
    })
    addRisk(risks, {
      riskType: 'learning',
      severity: 'high',
      probability: 90,
      reason: 'The class has no assigned curriculum, so the project cannot be verified against program objectives, outcomes, and program of study.',
      mitigation: 'Assign the correct curriculum to the class before relying on this analysis.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Assign curriculum before release',
      description: 'Attach the official curriculum so project scope can be validated against program objectives and outcomes.',
      actionType: 'other',
    })
  }

  if (hasCurriculum && (curriculumEvidenceWeak || curriculumAlignmentEvidence < 0.08)) {
    upsertScore(scores, 'curriculum_alignment', {
      score: Math.min(35, scores.find((score) => score.category === 'curriculum_alignment')?.score ?? 35),
      label: 'Weak Curriculum Evidence',
      explanation: 'Project details and curriculum outcomes/components have weak keyword overlap; alignment evidence is insufficient.',
    })
    addRisk(risks, {
      riskType: 'learning',
      severity: 'high',
      probability: 78,
      reason: 'The analysis found weak evidence linking project scope to curriculum outcomes and program study content.',
      mitigation: 'Map project objectives and deliverables to specific curriculum outcomes and program components.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Map project to curriculum outcomes',
      description: 'Rewrite project details to explicitly reference curriculum objectives, outcomes, and program of study topics.',
      actionType: 'other',
    })
  }

  if (!hasSyllabus) {
    upsertScore(scores, 'syllabus_alignment', {
      score: 20,
      label: 'Missing Syllabus',
      explanation: 'No syllabus is assigned to this class, so course-level alignment cannot be verified.',
    })
    addRisk(risks, {
      riskType: 'learning',
      severity: 'high',
      probability: 90,
      reason: 'The class has no assigned syllabus, so the project cannot be verified against learning outcomes and course topics.',
      mitigation: 'Assign the correct syllabus to the class before relying on this analysis.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Assign syllabus before release',
      description: 'Attach the official class syllabus so project scope, outcomes, and assessment criteria can be validated.',
      actionType: 'other',
    })
  }

  if (hasSyllabus && (syllabusEvidenceWeak || syllabusAlignmentEvidence < 0.08)) {
    upsertScore(scores, 'syllabus_alignment', {
      score: Math.min(35, scores.find((score) => score.category === 'syllabus_alignment')?.score ?? 35),
      label: 'Weak Syllabus Evidence',
      explanation: 'Project details and syllabus outcomes have weak keyword overlap; alignment evidence is insufficient.',
    })
    addRisk(risks, {
      riskType: 'learning',
      severity: 'high',
      probability: 78,
      reason: 'The analysis found weak evidence linking project scope to syllabus outcomes and topics.',
      mitigation: 'Add concrete project requirements mapped to specific syllabus outcomes and competencies.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Map project to syllabus outcomes',
      description: 'Rewrite description/guidelines to explicitly reference syllabus outcomes, competencies, and assessment criteria.',
      actionType: 'other',
    })
  }

  if (projectEvidenceWeak) {
    const weakEvidenceText = 'Project information is too short or placeholder-like, so validation confidence is low.'
    upsertScore(scores, 'scope_realism', {
      score: Math.min(35, scores.find((score) => score.category === 'scope_realism')?.score ?? 35),
      label: 'Insufficient Detail',
      explanation: weakEvidenceText,
    })
    upsertScore(scores, 'skill_coverage', {
      score: Math.min(35, scores.find((score) => score.category === 'skill_coverage')?.score ?? 35),
      label: 'Insufficient Detail',
      explanation: weakEvidenceText,
    })
    upsertScore(scores, 'learning_outcome_prediction', {
      score: Math.min(35, scores.find((score) => score.category === 'learning_outcome_prediction')?.score ?? 35),
      label: 'Insufficient Detail',
      explanation: weakEvidenceText,
    })
    addRisk(risks, {
      riskType: 'scope',
      severity: 'high',
      probability: 85,
      reason: 'Project fields appear too minimal or placeholder-based to support reliable analysis.',
      mitigation: 'Provide specific objectives, modules, constraints, deliverables, and measurable acceptance criteria.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Replace placeholder project details',
      description: 'Use specific functional requirements and detailed guidelines instead of short test placeholders.',
      actionType: 'other',
    })
  }

  if (yearMismatch) {
    upsertScore(scores, 'year_level_appropriateness', {
      score: Math.min(45, scores.find((score) => score.category === 'year_level_appropriateness')?.score ?? 45),
      label: 'Year Level Risk',
      explanation: `This appears too advanced for a Year ${classYearLevel} class unless the scope is reduced substantially.`,
    })
    addRisk(risks, {
      riskType: 'learning',
      severity: 'high',
      probability: 75,
      reason: `Advanced or capstone-level work may not be appropriate for Year ${classYearLevel} students.`,
      mitigation: 'Reduce scope, provide scaffolding, or assign this project to a higher year level.',
    })
  }

  if (timelineTooShort) {
    upsertScore(scores, 'timeline_feasibility', {
      score: Math.min(55, scores.find((score) => score.category === 'timeline_feasibility')?.score ?? 55),
      label: 'Deadline Risk',
      explanation: `The ${durationDays}-day timeline appears short for the estimated feature load, difficulty, testing, documentation, and team size.`,
    })
    addRisk(risks, {
      riskType: 'timeline',
      severity: durationDays < workloadDaysNeeded * 0.6 ? 'critical' : 'high',
      probability: durationDays < workloadDaysNeeded * 0.6 ? 88 : 72,
      reason: 'Deadline may be too short for the expected project complexity and required deliverables.',
      mitigation: 'Extend the deadline, reduce scope, or split deliverables into smaller milestones.',
    })
    addRecommendation(recommendations, {
      priority: 'high',
      title: 'Adjust deadline or scope',
      description: 'The current deadline may not leave enough time for implementation, testing, documentation, and revision.',
      actionType: durationDays < workloadDaysNeeded ? 'extend_deadline' : 'reduce_scope',
    })
  }

  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + clampScore(score.score), 0) / scores.length) : 0
  const readinessCap = Math.min(
    hasCurriculum ? 100 : 65,
    hasSyllabus ? 100 : 65,
    yearMismatch ? 65 : 100,
    timelineTooShort ? 70 : 100,
    projectEvidenceWeak ? 55 : 100,
    (hasCurriculum && (curriculumEvidenceWeak || curriculumAlignmentEvidence < 0.08)) ? 60 : 100,
    (hasSyllabus && (syllabusEvidenceWeak || syllabusAlignmentEvidence < 0.08)) ? 60 : 100,
  )
  const readinessScore = Math.min(readinessCap, clampScore(validation.readinessScore ?? averageScore))
  const executiveSummary = projectEvidenceWeak
    ? `Validation confidence is low because project details are too minimal or placeholder-like. Provide richer description, guidelines, and rubric before relying on scores.`
    : (validation.executiveSummary || `${project.title} has been analyzed against curriculum, syllabus, year level, timeline, team size, scope, and rubric readiness.`)

  return {
    ...validation,
    executiveSummary,
    readinessScore,
    readinessLabel: readinessScore >= 90 ? 'Ready for Release' : readinessScore >= 75 ? 'Ready with Minor Improvements' : readinessScore >= 60 ? 'Needs Revision' : 'High Risk Project',
    difficultyScore,
    difficultyLabel: validation.difficultyLabel ?? (difficultyScore >= 85 ? 'Capstone-Level' : difficultyScore >= 70 ? 'Advanced' : difficultyScore >= 40 ? 'Intermediate' : 'Beginner'),
    scores,
    risks,
    recommendations,
  }
}

export function buildFallbackValidation(input) {
  const project = input.project
  const days = Math.max(1, (new Date(project.deadlineAt).getTime() - new Date(project.startAt).getTime()) / 86400000)
  const featureLoad = `${project.description ?? ''} ${project.guidelines ?? ''}`.split(/[,\n.]/).filter(Boolean).length
  const teamSize = project.workMode === 'individual' ? 1 : Number(project.memberCount ?? 1)
  const scopeScore = Math.max(35, Math.min(95, 100 - Math.max(0, featureLoad - 10) * 4))
  const timelineScore = Math.max(30, Math.min(95, days * teamSize * 4 - featureLoad * 2))
  const teamScore = project.workMode === 'individual' ? (featureLoad > 10 ? 55 : 85) : Math.min(95, 60 + teamSize * 6)
  const rubricScore = project.rubrics ? 82 : 45
  const curriculumScore = input.curriculum?.id ? 78 : 20
  const curriculumHasFileText = Boolean(input.curriculum?.fileText?.trim?.())
  const syllabusHasFileText = Array.isArray(input.syllabus) && input.syllabus.some((item) => Boolean(item?.fileText?.trim?.()))
  const syllabusScore = (input.syllabus?.length || syllabusHasFileText) ? 78 : 20
  const learningScore = Math.round((curriculumScore + syllabusScore + scopeScore + rubricScore) / 4)
  const readinessScore = Math.round((curriculumScore + syllabusScore + scopeScore + timelineScore + teamScore + rubricScore + learningScore) / 7)

  const scores = [
    ['curriculum_alignment', curriculumScore, (input.curriculum?.id || curriculumHasFileText) ? 'Curriculum evidence was available.' : 'No assigned curriculum evidence was available.'],
    ['syllabus_alignment', syllabusScore, (input.syllabus?.length || syllabusHasFileText) ? 'Syllabus evidence was available.' : 'No assigned syllabus evidence was available.'],
    ['year_level_appropriateness', Math.min(95, 55 + Number(project.yearLevel ?? 1) * 9), 'Complexity was compared against the declared year level.'],
    ['scope_realism', scopeScore, 'Scope was estimated from deliverables, description, and guidelines.'],
    ['timeline_feasibility', timelineScore, 'Timeline was estimated from duration, feature load, and team size.'],
    ['team_size_suitability', teamScore, 'Team size was evaluated against project complexity.'],
    ['workload_balance', Math.round((teamScore + scopeScore) / 2), 'Workload balance was inferred from team size and deliverables.'],
    ['skill_coverage', learningScore, 'Skill coverage was inferred from project type and outputs.'],
    ['learning_outcome_prediction', learningScore, 'Learning impact was estimated from alignment and assessment design.'],
    ['rubric_quality', rubricScore, project.rubrics ? 'Rubrics are present.' : 'Rubrics need clearer measurable criteria.'],
    ['project_type_fit', 80, `Project was evaluated as ${project.projectType}.`],
  ].map(([category, score, explanation]) => ({ category, score, label: scoreLabel(score), explanation }))

  const risks = []
  if (!(input.curriculum?.id || curriculumHasFileText)) risks.push({ riskType: 'learning', severity: 'high', probability: 90, reason: 'No curriculum is assigned or readable, so program alignment cannot be verified.', mitigation: 'Assign a curriculum before releasing the project.' })
  if (!(input.syllabus?.length || syllabusHasFileText)) risks.push({ riskType: 'learning', severity: 'high', probability: 90, reason: 'No syllabus is assigned or readable, so course alignment cannot be verified.', mitigation: 'Assign a syllabus before releasing the project.' })
  if (timelineScore < 60) risks.push({ riskType: 'timeline', severity: 'high', probability: 78, reason: 'Allocated duration appears short for the expected workload.', mitigation: 'Reduce scope or extend the deadline.' })
  if (scopeScore < 60) risks.push({ riskType: 'scope', severity: 'high', probability: 72, reason: 'Feature count may exceed realistic classroom project scope.', mitigation: 'Prioritize core features and move extras to optional milestones.' })
  if (rubricScore < 60) risks.push({ riskType: 'assessment', severity: 'medium', probability: 65, reason: 'Rubric criteria are missing or too vague.', mitigation: 'Add measurable grading criteria.' })

  const recommendations = [
    ...(scopeScore < 75 ? [{ priority: 'high', title: 'Reduce scope', description: 'Limit deliverables to the strongest learning outcomes.', actionType: 'reduce_scope' }] : []),
    ...(timelineScore < 75 ? [{ priority: 'high', title: 'Extend deadline', description: 'Add more time or reduce milestone count.', actionType: 'extend_deadline' }] : []),
    ...(rubricScore < 75 ? [{ priority: 'medium', title: 'Improve rubric criteria', description: 'Add measurable criteria for functionality, documentation, testing, and presentation.', actionType: 'improve_rubric' }] : []),
    { priority: 'medium', title: 'Add testing phase', description: 'Require test cases or user acceptance testing before final submission.', actionType: 'add_testing' },
  ]

  return enforceAcademicValidationRules(input, {
    executiveSummary: `${project.title} has a readiness score of ${readinessScore}%. The professor should review scope, timeline, assessment clarity, and team fit before release.`,
    readinessScore,
    readinessLabel: fallbackLabel(readinessScore),
    difficultyScore: Math.min(100, Math.round(featureLoad * 5 + Number(project.yearLevel ?? 1) * 12)),
    difficultyLabel: readinessScore < 60 ? 'Advanced' : Number(project.yearLevel ?? 1) >= 4 ? 'Capstone-Level' : 'Intermediate',
    scores,
    risks,
    recommendations,
    skillCoverage: ['Programming', 'Database Design', 'Documentation', 'Testing', 'Problem Solving', 'Team Collaboration'],
    coveredOutcomes: [
      ...(input.curriculum?.programStudies ?? []).slice(0, 2).map((item) => item.content),
      ...(input.syllabus?.slice(0, 2).flatMap((item) => [item.title, item.fileText].filter(Boolean)) ?? []),
    ],
    missingOutcomes: ['Explicit software testing practice', 'Deployment reflection'],
    comparisonReport: input.historicalData?.length ? 'Historical analytics were considered.' : 'No strong historical comparison data was available.',
    validationReport: {
      curriculumAlignment: 'The project should be mapped explicitly to curriculum outcomes.',
      syllabusAlignment: 'The project should be mapped explicitly to syllabus outcomes.',
      yearLevelSuitability: 'Complexity should match expected BSIT competencies.',
      scopeAnalysis: 'Scope should prioritize required deliverables over optional features.',
      timelineAnalysis: 'Timeline should include design, implementation, testing, documentation, and revision.',
      teamAnalysis: 'Team size should match workload and collaboration goals.',
      skillCoverage: 'Project supports technical and collaboration skills.',
      learningOutcomePrediction: 'Expected learning impact depends on assessment clarity and milestone design.',
      riskAssessment: risks.map((risk) => risk.reason).join(' ') || 'No critical risks detected.',
      recommendations: recommendations.map((item) => item.title).join(', '),
    },
  })
}

export async function runProjectValidationAi(input) {
  if (!env.n8nProjectValidationWebhookUrl) return buildFallbackValidation(input)

  const headers = { 'Content-Type': 'application/json' }
  if (env.n8nWebhookSecret) {
    headers['x-collabify-webhook-secret'] = env.n8nWebhookSecret
  }

  const response = await fetch(env.n8nProjectValidationWebhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: buildProjectValidationPrompt(input),
      input,
    }),
  })

  if (!response.ok) return buildFallbackValidation(input)
  const data = await response.json().catch(() => null)
  const validation = data?.validation ?? data

  if (!validation || typeof validation !== 'object') return buildFallbackValidation(input)
  if (!Array.isArray(validation.scores)) return buildFallbackValidation(input)
  if (!REQUIRED_SCORE_CATEGORIES.every((category) => validation.scores.some((score) => score.category === category))) {
    return buildFallbackValidation(input)
  }

  return enforceAcademicValidationRules(input, validation)
}
