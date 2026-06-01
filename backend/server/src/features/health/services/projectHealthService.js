import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { generateHealthAiInsight } from './projectHealthAiService.js'

function pct(part, total) {
  if (!total) return 0
  return Math.round((Number(part) / Number(total)) * 10000) / 100
}

function avg(values) {
  const nums = values.map(Number).filter(Number.isFinite)
  if (!nums.length) return 0
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 100) / 100
}

function daysBetween(a, b) {
  return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function statusFromScore(score) {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'healthy'
  if (score >= 60) return 'warning'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

function labelFromScore(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Healthy'
  if (score >= 60) return 'Warning'
  if (score >= 40) return 'At Risk'
  return 'Critical'
}

async function assertCanView(userId, role, projectId, groupId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, start_at, deadline_at, due_at, status, classes:class_id (professor_id)')
    .eq('id', projectId)
    .single()

  if (error || !project) throw new HttpError(404, 'Project not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(project.class_id, userId)
  } else {
    const { data: member } = groupId
      ? await supabaseAdminClient.from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).eq('status', 'active').maybeSingle()
      : await supabaseAdminClient.from('class_members').select('id').eq('class_id', project.class_id).eq('user_id', userId).eq('status', 'active').maybeSingle()

    if (!member) throw new HttpError(403, 'You do not have permission to view project health')
  }

  return project
}

async function loadHealthInput(projectId, groupId) {
  const groupFilter = (query) => groupId ? query.eq('group_id', groupId) : query
  const [{ data: tasks }, { data: groups }, { data: milestones }, { data: contributions }, { data: reassignments }] = await Promise.all([
    groupFilter(supabaseAdminClient.from('tasks').select('id, title, status, priority, progress, due_at, completed_at, updated_at, group_id, metadata').eq('project_id', projectId)),
    groupId
      ? supabaseAdminClient.from('groups').select('id, name, class_id, project_id').eq('id', groupId)
      : supabaseAdminClient.from('groups').select('id, name, class_id, project_id').eq('project_id', projectId),
    groupFilter(supabaseAdminClient.from('milestones').select('id, title, due_at, is_completed, group_id').eq('project_id', projectId)),
    groupFilter(supabaseAdminClient.from('contribution_logs').select('user_id, group_id, points, logged_at').eq('project_id', projectId)),
    groupFilter(supabaseAdminClient.from('reassignment_requests').select('id, status, task_id, current_group_id').eq('project_id', projectId)),
  ])

  const taskIds = (tasks ?? []).map((task) => task.id)
  const groupIds = (groups ?? []).map((group) => group.id)
  const [{ data: assignments }, { data: members }, { data: comments }, { data: submissions }, { data: groupChats }] = await Promise.all([
    taskIds.length ? supabaseAdminClient.from('task_assignments').select('task_id, assignee_id').in('task_id', taskIds) : { data: [] },
    groupIds.length ? supabaseAdminClient.from('group_members').select('group_id, user_id, users:user_id (email)').in('group_id', groupIds).eq('status', 'active') : { data: [] },
    taskIds.length ? supabaseAdminClient.from('task_comments').select('id, task_id, author_id, created_at').in('task_id', taskIds) : { data: [] },
    taskIds.length ? supabaseAdminClient.from('task_submissions').select('id, task_id, group_id, status, submitted_at').in('task_id', taskIds) : { data: [] },
    groupIds.length ? supabaseAdminClient.from('group_chats').select('id, group_id').in('group_id', groupIds) : { data: [] },
  ])

  const chatIds = (groupChats ?? []).map((chat) => chat.id)
  const { data: messages } = chatIds.length
    ? await supabaseAdminClient.from('messages').select('id, sender_id, group_chat_id, created_at').in('group_chat_id', chatIds)
    : { data: [] }

  const userIds = [...new Set([...(members ?? []).map((item) => item.user_id), ...(assignments ?? []).map((item) => item.assignee_id), ...(contributions ?? []).map((item) => item.user_id)])]
  const { data: profiles } = userIds.length
    ? await supabaseAdminClient.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
    : { data: [] }

  return {
    assignments: assignments ?? [],
    comments: comments ?? [],
    contributions: contributions ?? [],
    groups: groups ?? [],
    groupChats: groupChats ?? [],
    members: members ?? [],
    messages: messages ?? [],
    milestones: milestones ?? [],
    profiles: profiles ?? [],
    reassignments: reassignments ?? [],
    submissions: submissions ?? [],
    tasks: tasks ?? [],
  }
}

function analyze(project, input) {
  const now = new Date()
  const startAt = project.start_at ?? project.created_at ?? now.toISOString()
  const deadlineAt = project.deadline_at ?? project.due_at ?? now.toISOString()
  const elapsed = daysBetween(startAt, now)
  const duration = Math.max(1, daysBetween(startAt, deadlineAt))
  const expectedProgress = Math.min(100, pct(elapsed, duration))
  const completedTasks = input.tasks.filter((task) => task.status === 'done')
  const actualProgress = avg(input.tasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0)))
  const overdueTasks = input.tasks.filter((task) => task.due_at && task.status !== 'done' && new Date(task.due_at) < now)
  const blockedTasks = input.tasks.filter((task) => task.status === 'blocked')
  const timelineAdherence = Math.max(0, 100 - Math.max(0, expectedProgress - actualProgress))
  const deadlineRisk = Math.min(100, Math.max(0, expectedProgress - actualProgress) + overdueTasks.length * 8 + blockedTasks.length * 10)
  const lastActivity = [
    ...input.tasks.map((task) => task.updated_at),
    ...input.contributions.map((item) => item.logged_at),
    ...input.comments.map((item) => item.created_at),
    ...input.messages.map((item) => item.created_at),
    ...input.submissions.map((item) => item.submitted_at),
  ].filter(Boolean).sort().at(-1)
  const inactivityDays = lastActivity ? daysBetween(lastActivity, now) : duration

  const pointsByUser = new Map(input.members.map((member) => [member.user_id, 0]))
  input.contributions.forEach((item) => pointsByUser.set(item.user_id, (pointsByUser.get(item.user_id) ?? 0) + Number(item.points ?? 0)))
  const pointValues = [...pointsByUser.values()]
  const maxPoints = Math.max(...pointValues, 0)
  const minPoints = Math.min(...pointValues, maxPoints)
  const contributionBalance = pointValues.length <= 1 || maxPoints === 0 ? 100 : Math.max(0, 100 - pct(maxPoints - minPoints, maxPoints))

  const assignmentsByUser = new Map(input.members.map((member) => [member.user_id, 0]))
  input.assignments.forEach((item) => assignmentsByUser.set(item.assignee_id, (assignmentsByUser.get(item.assignee_id) ?? 0) + 1))
  const workloadValues = [...assignmentsByUser.values()]
  const maxWorkload = Math.max(...workloadValues, 0)
  const minWorkload = Math.min(...workloadValues, maxWorkload)
  const workloadBalance = workloadValues.length <= 1 || maxWorkload === 0 ? 100 : Math.max(0, 100 - pct(maxWorkload - minWorkload, maxWorkload))

  const milestoneReport = input.milestones.map((milestone) => {
    const delayed = !milestone.is_completed && milestone.due_at && new Date(milestone.due_at) < now
    return {
      id: milestone.id,
      title: milestone.title,
      dueAt: milestone.due_at,
      isCompleted: milestone.is_completed,
      status: milestone.is_completed ? 'healthy' : delayed ? 'delayed' : 'warning',
    }
  })

  const phaseMap = new Map()
  for (const task of input.tasks) {
    const phase = task.metadata?.phase ?? task.metadata?.roleSuggestion ?? task.title.split(' ')[0] ?? 'General'
    const row = phaseMap.get(phase) ?? { phase, taskCount: 0, completedCount: 0, overdueCount: 0 }
    row.taskCount += 1
    if (task.status === 'done') row.completedCount += 1
    if (task.due_at && task.status !== 'done' && new Date(task.due_at) < now) row.overdueCount += 1
    phaseMap.set(phase, row)
  }

  const phaseReport = [...phaseMap.values()].map((phase) => {
    const score = Math.max(0, pct(phase.completedCount, phase.taskCount) - phase.overdueCount * 10)
    return { ...phase, score, status: statusFromScore(score) }
  })

  const memberReport = input.members.map((member) => {
    const profile = input.profiles.find((item) => item.user_id === member.user_id)
    const assigned = input.assignments.filter((item) => item.assignee_id === member.user_id)
    const done = assigned.filter((item) => completedTasks.some((task) => task.id === item.task_id))
    const points = pointsByUser.get(member.user_id) ?? 0
    const activityCount = input.contributions.filter((item) => item.user_id === member.user_id).length
      + input.comments.filter((item) => item.author_id === member.user_id).length
      + input.messages.filter((item) => item.sender_id === member.user_id).length
    const activityScore = Math.min(100, activityCount * 8)

    return {
      userId: member.user_id,
      displayName: profile?.display_name ?? member.users?.email,
      assignedTasks: assigned.length,
      completedTasks: done.length,
      contributionPoints: points,
      workloadPercent: pct(assigned.length, Math.max(1, input.assignments.length)),
      activityScore,
      status: activityScore >= 75 ? 'Highly Active' : activityScore >= 50 ? 'Active' : activityScore >= 25 ? 'Moderately Active' : activityScore > 0 ? 'Inactive' : 'Critical Inactivity',
    }
  })

  const groupReport = {
    groups: input.groups.map((group) => {
      const tasks = input.tasks.filter((task) => task.group_id === group.id)
      const completed = tasks.filter((task) => task.status === 'done')
      const score = avg([pct(completed.length, tasks.length), contributionBalance, workloadBalance, Math.max(0, 100 - inactivityDays * 7)])
      return { id: group.id, name: group.name, score, status: statusFromScore(score), taskCompletion: pct(completed.length, tasks.length) }
    }),
  }

  const risks = []
  const recommendations = []
  const statuses = []

  if (timelineAdherence < 75) {
    statuses.push('Delayed')
    risks.push({ riskType: 'timeline', severity: 'high', probability: deadlineRisk, description: `Expected ${expectedProgress}% progress but actual progress is ${actualProgress}%.`, evidence: { expectedProgress, actualProgress } })
    recommendations.push({ priority: 'high', title: 'Review timeline', description: 'Move delayed work into smaller tasks or adjust deadlines.', actionType: 'adjust_timeline' })
  }
  if (contributionBalance < 65) {
    statuses.push('Uneven Contribution')
    risks.push({ riskType: 'contribution', severity: 'high', probability: 100 - contributionBalance, description: 'Contribution points are unevenly distributed.', evidence: { pointsByUser: Object.fromEntries(pointsByUser) } })
    recommendations.push({ priority: 'high', title: 'Redistribute contribution workload', description: 'Assign pending tasks to under-contributing members.', actionType: 'redistribute_work' })
  }
  if (workloadBalance < 65) {
    statuses.push('Overloaded')
    risks.push({ riskType: 'workload', severity: 'medium', probability: 100 - workloadBalance, description: 'Task ownership is uneven.', evidence: { assignmentsByUser: Object.fromEntries(assignmentsByUser) } })
    recommendations.push({ priority: 'medium', title: 'Balance assignments', description: 'Reassign tasks from overloaded members.', actionType: 'rebalance_tasks' })
  }
  if (inactivityDays >= 7) {
    statuses.push('Inactive')
    risks.push({ riskType: 'inactivity', severity: inactivityDays >= 10 ? 'critical' : 'high', probability: Math.min(100, inactivityDays * 10), description: `No project activity for ${inactivityDays} days.`, evidence: { lastActivity } })
    recommendations.push({ priority: 'high', title: 'Schedule intervention', description: 'Ask the group for a status update and next action plan.', actionType: 'intervention' })
  }
  if (blockedTasks.length || overdueTasks.length) {
    risks.push({ riskType: 'blocker', severity: 'high', probability: Math.min(100, (blockedTasks.length + overdueTasks.length) * 15), description: 'Blocked or overdue tasks may prevent completion.', evidence: { blockedTasks: blockedTasks.length, overdueTasks: overdueTasks.length } })
    recommendations.push({ priority: 'high', title: 'Resolve blockers', description: 'Prioritize blocked and overdue critical tasks.', actionType: 'resolve_blockers' })
  }

  const score = Math.max(0, Math.round(avg([
    actualProgress,
    timelineAdherence,
    contributionBalance,
    workloadBalance,
    Math.max(0, 100 - deadlineRisk),
    Math.max(0, 100 - inactivityDays * 5),
  ])))

  const status = statusFromScore(score)
  const estimatedCompletionAt = new Date(new Date(startAt).getTime() + (duration / Math.max(actualProgress, 1)) * 100 * 86400000).toISOString()
  const forecast = {
    estimatedCompletionAt,
    trend: actualProgress >= expectedProgress ? 'improving' : 'declining',
    expectedRiskLevel: deadlineRisk >= 75 ? 'critical' : deadlineRisk >= 50 ? 'high' : deadlineRisk >= 25 ? 'medium' : 'low',
    missedDeadlineProbability: deadlineRisk,
    summary: new Date(estimatedCompletionAt) > new Date(deadlineAt) ? 'Deadline likely to be missed.' : 'Project is likely to finish within the deadline.',
  }

  return {
    score,
    status,
    statuses: [...new Set([labelFromScore(score), ...statuses])],
    riskFactors: risks,
    recommendations,
    timelineAdherence,
    deadlineRisk,
    contributionBalance,
    workloadBalance,
    inactivityDays,
    forecast,
    taskReport: { total: input.tasks.length, completed: completedTasks.length, pending: input.tasks.length - completedTasks.length, overdue: overdueTasks.length, blocked: blockedTasks.length, reassigned: input.reassignments.length },
    memberReport,
    groupReport,
    milestoneReport,
    phaseReport,
  }
}

async function saveHealth(project, groupId, analysis, ai) {
  const summary = ai?.summary ?? analysis.forecast.summary
  const recommendations = [...analysis.recommendations, ...(ai?.recommendations ?? [])]
  const risks = [...analysis.riskFactors, ...(ai?.warnings ?? []).map((warning) => ({
    riskType: 'ai_warning',
    severity: warning.severity ?? 'medium',
    probability: 70,
    description: warning.description ?? warning.title,
    evidence: warning,
  }))]

  const { data: health, error } = await supabaseAdminClient
    .from('project_health')
    .insert({
      project_id: project.id,
      class_id: project.class_id,
      group_id: groupId,
      status: analysis.status,
      statuses: analysis.statuses,
      score: analysis.score,
      risk_factors: risks,
      recommendations,
      timeline_adherence: analysis.timelineAdherence,
      deadline_risk: analysis.deadlineRisk,
      contribution_balance: analysis.contributionBalance,
      workload_balance: analysis.workloadBalance,
      inactivity_days: analysis.inactivityDays,
      ai_summary: summary,
      forecast: { ...analysis.forecast, ...(ai?.forecast ?? {}) },
      task_report: analysis.taskReport,
      member_report: analysis.memberReport,
      group_report: analysis.groupReport,
      milestone_report: analysis.milestoneReport,
      phase_report: analysis.phaseReport,
      generated_by: 'system',
    })
    .select('*')
    .single()

  if (error) throw new HttpError(400, 'Unable to save project health', error.message)

  await Promise.all([
    supabaseAdminClient.from('project_health_history').insert({ project_id: project.id, group_id: groupId, health_id: health.id, score: analysis.score, status: analysis.status, statuses: analysis.statuses, snapshot: health }),
    supabaseAdminClient.from('project_health_scores').insert([
      ['timeline_adherence', analysis.timelineAdherence],
      ['deadline_risk', Math.max(0, 100 - analysis.deadlineRisk)],
      ['contribution_balance', analysis.contributionBalance],
      ['workload_balance', analysis.workloadBalance],
      ['activity', Math.max(0, 100 - analysis.inactivityDays * 5)],
    ].map(([category, score]) => ({ health_id: health.id, category, score, label: labelFromScore(score), explanation: category.replaceAll('_', ' ') }))),
    risks.length ? supabaseAdminClient.from('health_risk_reports').insert(risks.map((risk) => ({ health_id: health.id, risk_type: risk.riskType, severity: risk.severity, probability: risk.probability, description: risk.description, evidence: risk.evidence ?? {} }))) : Promise.resolve(),
    supabaseAdminClient.from('health_forecasts').insert({ health_id: health.id, estimated_completion_at: analysis.forecast.estimatedCompletionAt, trend: analysis.forecast.trend, expected_risk_level: analysis.forecast.expectedRiskLevel, missed_deadline_probability: analysis.forecast.missedDeadlineProbability, summary: analysis.forecast.summary }),
    recommendations.length ? supabaseAdminClient.from('health_recommendations').insert(recommendations.map((item) => ({ health_id: health.id, priority: item.priority, title: item.title, description: item.description, action_type: item.actionType }))) : Promise.resolve(),
    analysis.phaseReport.length ? supabaseAdminClient.from('health_phase_reports').insert(analysis.phaseReport.map((phase) => ({ health_id: health.id, phase: phase.phase, score: phase.score, status: phase.status, task_count: phase.taskCount, completed_count: phase.completedCount, overdue_count: phase.overdueCount }))) : Promise.resolve(),
  ])

  if (['at_risk', 'critical', 'delayed'].includes(analysis.status) || analysis.deadlineRisk >= 60 || analysis.contributionBalance < 65 || analysis.inactivityDays >= 7) {
    await createHealthAlerts(project, groupId, health.id, risks, analysis)
  }

  return health
}

async function createHealthAlerts(project, groupId, healthId, risks, analysis) {
  const alerts = risks.map((risk) => ({
    health_id: healthId,
    project_id: project.id,
    group_id: groupId,
    alert_type: risk.riskType,
    severity: risk.severity,
    title: `Project health ${risk.riskType} warning`,
    body: risk.description,
  }))

  if (alerts.length) await supabaseAdminClient.from('health_alerts').insert(alerts)

  const { data: recipients } = groupId
    ? await supabaseAdminClient.from('group_members').select('user_id').eq('group_id', groupId).eq('status', 'active')
    : await supabaseAdminClient.from('class_members').select('user_id').eq('class_id', project.class_id).eq('status', 'active')

  const professorRows = await supabaseAdminClient.from('classes').select('professor_id').eq('id', project.class_id).single()
  const userIds = [...new Set([...(recipients ?? []).map((row) => row.user_id), professorRows.data?.professor_id].filter(Boolean))]
  await supabaseAdminClient.from('notifications').insert(userIds.map((userId) => ({
    user_id: userId,
    type: 'project_health',
    priority: analysis.status === 'critical' ? 'critical' : 'high',
    title: `Project Health: ${analysis.statuses.join(', ')}`,
    body: `Health score is ${analysis.score}%.`,
    entity_type: 'project_health',
    entity_id: healthId,
    class_id: project.class_id,
    project_id: project.id,
    group_id: groupId,
    action_url: '/professor/health',
  })))
}

async function hydrateHealth(row) {
  const [{ data: scores }, { data: risks }, { data: forecasts }, { data: recommendations }, { data: alerts }, { data: phases }, { data: history }] = await Promise.all([
    supabaseAdminClient.from('project_health_scores').select('*').eq('health_id', row.id),
    supabaseAdminClient.from('health_risk_reports').select('*').eq('health_id', row.id),
    supabaseAdminClient.from('health_forecasts').select('*').eq('health_id', row.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdminClient.from('health_recommendations').select('*').eq('health_id', row.id),
    supabaseAdminClient.from('health_alerts').select('*').eq('health_id', row.id),
    supabaseAdminClient.from('health_phase_reports').select('*').eq('health_id', row.id),
    supabaseAdminClient.from('project_health_history').select('*').eq('project_id', row.project_id).eq('group_id', row.group_id).order('created_at', { ascending: false }).limit(30),
  ])

  return { ...row, scores: scores ?? [], risks: risks ?? [], forecastRow: forecasts ?? null, recommendationsRows: recommendations ?? [], alerts: alerts ?? [], phases: phases ?? [], history: history ?? [] }
}

export async function evaluateProjectHealth(userId, role, filters = {}) {
  let projects = []

  if (filters.projectId) {
    projects = [await assertCanView(userId, role, filters.projectId, filters.groupId)]
  } else if (role === 'professor') {
    const { data: classes } = await supabaseAdminClient.from('classes').select('id').eq('professor_id', userId).eq('is_archived', false)
    const classIds = (classes ?? []).map((item) => item.id)
    const { data } = classIds.length ? await supabaseAdminClient.from('projects').select('id, class_id, title, start_at, deadline_at, due_at, status').in('class_id', classIds).neq('status', 'archived') : { data: [] }
    projects = data ?? []
  } else {
    const { data: memberships } = await supabaseAdminClient.from('group_members').select('group_id, groups:group_id (project_id)').eq('user_id', userId).eq('status', 'active')
    const projectIds = [...new Set((memberships ?? []).map((item) => item.groups?.project_id).filter(Boolean))]
    const { data } = projectIds.length ? await supabaseAdminClient.from('projects').select('id, class_id, title, start_at, deadline_at, due_at, status').in('id', projectIds).neq('status', 'archived') : { data: [] }
    projects = data ?? []
  }

  const saved = []
  for (const project of projects) {
    const groupIds = filters.groupId
      ? [filters.groupId]
      : (await supabaseAdminClient.from('groups').select('id').eq('project_id', project.id)).data?.map((item) => item.id) ?? [null]

    for (const groupId of groupIds) {
      const input = await loadHealthInput(project.id, groupId)
      const analysis = analyze(project, input)
      const ai = await generateHealthAiInsight({ project, groupId, input, analysis })
      saved.push(await saveHealth(project, groupId, analysis, ai))
    }
  }

  return Promise.all(saved.map(hydrateHealth))
}

export async function listProjectHealth(userId, role, filters = {}) {
  if (filters.projectId) await assertCanView(userId, role, filters.projectId, filters.groupId)

  let query = supabaseAdminClient
    .from('project_health')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(80)

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.groupId) query = query.eq('group_id', filters.groupId)

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load project health', error.message)
  return Promise.all((data ?? []).map(hydrateHealth))
}
