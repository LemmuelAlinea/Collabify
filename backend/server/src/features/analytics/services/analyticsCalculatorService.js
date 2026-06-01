import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { generateAnalyticsInsight } from './aiInsightService.js'

function pct(part, total) {
  if (!total) return 0
  return Math.round((Number(part) / Number(total)) * 10000) / 100
}

function average(values) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value))
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 100) / 100
}

function label(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Moderate'
  return 'Needs Improvement'
}

function fairnessLabel(score) {
  if (score >= 80) return 'Balanced Team'
  if (score >= 55) return 'Uneven Contribution'
  return 'Critical Imbalance'
}

async function table(name, query) {
  const { data, error } = await query(supabaseAdminClient.from(name))
  if (error) throw error
  return data ?? []
}

export async function calculateProjectAnalytics(projectId) {
  const { data: project, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, title, project_type, deadline_at, due_at, status, created_by')
    .eq('id', projectId)
    .single()

  if (error || !project) throw error ?? new Error('Project not found')

  const [tasks, submissions, versions, answers, groups, contributions, reassignments, messages] = await Promise.all([
    table('tasks', (q) => q.select('id, status, due_at, completed_at, group_id').eq('project_id', projectId)),
    Promise.resolve([]),
    Promise.resolve([]),
    table('analytics_answers', (q) => q.select('rating, student_id, group_id').eq('project_id', projectId)),
    table('groups', (q) => q.select('id, class_id, name').eq('project_id', projectId)),
    table('contribution_logs', (q) => q.select('user_id, group_id, points').eq('project_id', projectId)),
    table('reassignment_requests', (q) => q.select('id, status').eq('project_id', projectId)),
    table('messages', (q) => q.select('id, group_chat_id')),
  ])

  const taskIds = tasks.map((task) => task.id)
  const submissionRows = taskIds.length
    ? await table('task_submissions', (q) => q.select('id, status, task_id, group_id, submitted_at, reviewed_at').in('task_id', taskIds))
    : submissions
  const submissionIds = submissionRows.map((submission) => submission.id)
  const versionRows = submissionIds.length
    ? await table('submission_versions', (q) => q.select('id, submission_id, version').in('submission_id', submissionIds))
    : versions

  const completedTasks = tasks.filter((task) => task.status === 'done')
  const completionRate = pct(completedTasks.length, tasks.length)
  const onTimeTasks = completedTasks.filter((task) => !task.due_at || new Date(task.completed_at ?? task.due_at) <= new Date(task.due_at))
  const deadlineCompliance = pct(onTimeTasks.length, completedTasks.length)
  const acceptedSubmissions = submissionRows.filter((submission) => ['accepted', 'reviewed'].includes(submission.status))
  const submissionQuality = pct(acceptedSubmissions.length, submissionRows.length) || pct(versionRows.length, Math.max(1, groups.length))
  const learningEffectiveness = average(answers.map((answer) => Number(answer.rating ?? 0) * 20))
  const successRate = average([completionRate, submissionQuality])

  const pointsByUser = new Map()
  contributions.forEach((log) => pointsByUser.set(log.user_id, (pointsByUser.get(log.user_id) ?? 0) + Number(log.points ?? 0)))
  const points = [...pointsByUser.values()]
  const maxPoints = Math.max(...points, 0)
  const minPoints = Math.min(...points, maxPoints)
  const contributionFairness = points.length <= 1 || maxPoints === 0 ? 100 : Math.max(0, 100 - pct(maxPoints - minPoints, maxPoints))
  const healthScore = Math.max(0, average([completionRate, deadlineCompliance, contributionFairness]) - (reassignments.length * 2))
  const projectEffectiveness = average([completionRate, successRate, deadlineCompliance, submissionQuality, learningEffectiveness || completionRate])

  const metrics = {
    label: label(projectEffectiveness),
    tasksCreated: tasks.length,
    tasksCompleted: completedTasks.length,
    overdueTasks: tasks.filter((task) => task.due_at && task.status !== 'done' && new Date(task.due_at) < new Date()).length,
    reassignedTasks: reassignments.length,
    submissionVersions: versionRows.length,
    surveyAnswers: answers.length,
    communicationActivity: messages.length,
    contributionFairnessLabel: fairnessLabel(contributionFairness),
  }

  const aiInsights = await generateAnalyticsInsight({
    scope: 'project',
    project,
    scores: { completionRate, successRate, deadlineCompliance, submissionQuality, learningEffectiveness, projectEffectiveness, contributionFairness, healthScore },
    metrics,
  })

  const row = {
    project_id: projectId,
    class_id: project.class_id,
    completion_rate: completionRate,
    success_rate: successRate,
    deadline_compliance: deadlineCompliance,
    submission_quality: submissionQuality,
    learning_effectiveness: learningEffectiveness,
    project_effectiveness: projectEffectiveness,
    contribution_fairness: contributionFairness,
    health_score: healthScore,
    ai_insights: aiInsights,
    metrics,
    generated_at: new Date().toISOString(),
  }

  await supabaseAdminClient.from('project_analytics').upsert(row, { onConflict: 'project_id' })
  await Promise.all(groups.map((group) => calculateGroupAnalytics(group.id)))
  await calculateClassAnalytics(project.class_id)
  await calculateProfessorAnalytics(project.created_by)
  return row
}

export async function calculateGroupAnalytics(groupId) {
  const { data: group, error } = await supabaseAdminClient
    .from('groups')
    .select('id, class_id, project_id, name')
    .eq('id', groupId)
    .single()

  if (error || !group) throw error ?? new Error('Group not found')

  const [members, tasks, contributions, submissionRows, comments] = await Promise.all([
    table('group_members', (q) => q.select('user_id').eq('group_id', groupId).eq('status', 'active')),
    table('tasks', (q) => q.select('id, status, created_at, completed_at').eq('group_id', groupId)),
    table('contribution_logs', (q) => q.select('user_id, points').eq('group_id', groupId)),
    table('task_submissions', (q) => q.select('id, status').eq('group_id', groupId)),
    Promise.resolve([]),
  ])

  const taskIds = tasks.map((task) => task.id)
  const commentRows = taskIds.length
    ? await table('task_comments', (q) => q.select('id, task_id').in('task_id', taskIds))
    : comments

  const completedTasks = tasks.filter((task) => task.status === 'done')
  const taskCompletion = pct(completedTasks.length, tasks.length)
  const tasksPerMember = pct(new Set(tasks.map((task) => task.id)).size, Math.max(members.length, 1) * Math.max(tasks.length / Math.max(members.length, 1), 1))
  const pointsByUser = new Map(members.map((member) => [member.user_id, 0]))
  contributions.forEach((log) => pointsByUser.set(log.user_id, (pointsByUser.get(log.user_id) ?? 0) + Number(log.points ?? 0)))
  const points = [...pointsByUser.values()]
  const maxPoints = Math.max(...points, 0)
  const minPoints = Math.min(...points, maxPoints)
  const contributionBalance = points.length <= 1 || maxPoints === 0 ? 100 : Math.max(0, 100 - pct(maxPoints - minPoints, maxPoints))
  const communicationActivity = Math.min(100, commentRows.length * 5)
  const submissionActivity = Math.min(100, submissionRows.length * 20)
  const groupPerformance = average([taskCompletion, tasksPerMember, contributionBalance, communicationActivity, submissionActivity])

  const row = {
    group_id: groupId,
    project_id: group.project_id,
    class_id: group.class_id,
    group_performance: groupPerformance,
    task_distribution: tasksPerMember,
    contribution_balance: contributionBalance,
    communication_activity: communicationActivity,
    submission_activity: submissionActivity,
    status_label: label(groupPerformance),
    metrics: {
      members: members.length,
      tasks: tasks.length,
      completedTasks: completedTasks.length,
      submissions: submissionRows.length,
      comments: commentRows.length,
      contributionLabel: fairnessLabel(contributionBalance),
    },
    generated_at: new Date().toISOString(),
  }

  await supabaseAdminClient.from('group_analytics').upsert(row, { onConflict: 'group_id' })
  await Promise.all(members.map((member) => calculateStudentAnalytics(member.user_id, group.project_id)))
  return row
}

export async function calculateStudentAnalytics(studentId, projectId = null) {
  const memberships = await table('group_members', (q) => q.select('group_id, groups:group_id (project_id, class_id)').eq('user_id', studentId).eq('status', 'active'))
  const filteredMemberships = projectId ? memberships.filter((row) => row.groups?.project_id === projectId) : memberships
  const groupIds = filteredMemberships.map((row) => row.group_id)
  const projectIds = [...new Set(filteredMemberships.map((row) => row.groups?.project_id).filter(Boolean))]
  const classId = filteredMemberships[0]?.groups?.class_id ?? null

  const [assignments, contributions, answers, submissions] = await Promise.all([
    table('task_assignments', (q) => q.select('task_id, tasks:task_id (status, project_id, group_id)').eq('assignee_id', studentId)),
    table('contribution_logs', (q) => q.select('points, project_id, group_id, logged_at').eq('user_id', studentId)),
    table('analytics_answers', (q) => q.select('rating, project_id').eq('student_id', studentId)),
    table('task_submissions', (q) => q.select('id, status, submitted_by, group_id').eq('submitted_by', studentId)),
  ])

  const visibleAssignments = projectId ? assignments.filter((row) => row.tasks?.project_id === projectId) : assignments
  const completed = visibleAssignments.filter((row) => row.tasks?.status === 'done')
  const relevantContributions = projectId ? contributions.filter((row) => row.project_id === projectId) : contributions
  const relevantAnswers = projectId ? answers.filter((row) => row.project_id === projectId) : answers
  const relevantSubmissions = groupIds.length ? submissions.filter((row) => groupIds.includes(row.group_id)) : submissions
  const contributionScore = Math.min(100, relevantContributions.reduce((sum, row) => sum + Number(row.points ?? 0), 0))
  const row = {
    student_id: studentId,
    project_id: projectId,
    group_id: groupIds[0] ?? null,
    class_id: classId,
    projects_completed: projectIds.length,
    personal_completion: pct(completed.length, visibleAssignments.length),
    task_completion: pct(completed.length, visibleAssignments.length),
    contribution_score: contributionScore,
    average_learning_score: average(relevantAnswers.map((answer) => Number(answer.rating ?? 0) * 20)),
    submission_success_rate: pct(relevantSubmissions.filter((submission) => ['accepted', 'reviewed'].includes(submission.status)).length, relevantSubmissions.length),
    trend: relevantContributions.map((item) => ({ date: item.logged_at, points: item.points })),
    metrics: {
      assignedTasks: visibleAssignments.length,
      completedTasks: completed.length,
      contributionEvents: relevantContributions.length,
      submissions: relevantSubmissions.length,
    },
    generated_at: new Date().toISOString(),
  }

  await supabaseAdminClient.from('student_analytics').upsert(row, { onConflict: 'student_id,project_id' })
  return row
}

export async function calculateClassAnalytics(classId) {
  const [projects, projectAnalytics, groupAnalytics] = await Promise.all([
    table('projects', (q) => q.select('id, project_type, status').eq('class_id', classId)),
    table('project_analytics', (q) => q.select('*').eq('class_id', classId)),
    table('group_analytics', (q) => q.select('*').eq('class_id', classId)),
  ])

  const curriculum = {}
  for (const project of projects) {
    const analytics = projectAnalytics.find((item) => item.project_id === project.id)
    const key = project.project_type ?? 'General'
    curriculum[key] = curriculum[key] ?? []
    curriculum[key].push(analytics?.learning_effectiveness ?? 0)
  }

  const curriculumEffectiveness = Object.fromEntries(
    Object.entries(curriculum).map(([key, values]) => [key, average(values)]),
  )

  const row = {
    class_id: classId,
    completion_rate: pct(projects.filter((project) => project.status === 'completed').length, projects.length),
    average_learning: average(projectAnalytics.map((item) => item.learning_effectiveness)),
    average_contribution: average(projectAnalytics.map((item) => item.contribution_fairness)),
    average_project_health: average(projectAnalytics.map((item) => item.health_score)),
    average_task_completion: average(projectAnalytics.map((item) => item.completion_rate)),
    curriculum_effectiveness: curriculumEffectiveness,
    metrics: {
      projects: projects.length,
      groups: groupAnalytics.length,
      averageGroupPerformance: average(groupAnalytics.map((item) => item.group_performance)),
    },
    generated_at: new Date().toISOString(),
  }

  await supabaseAdminClient.from('class_analytics').upsert(row, { onConflict: 'class_id' })
  return row
}

export async function calculateProfessorAnalytics(professorId) {
  const classes = await table('classes', (q) => q.select('id').eq('professor_id', professorId))
  const classIds = classes.map((item) => item.id)
  const projects = classIds.length ? await table('projects', (q) => q.select('id, status').in('class_id', classIds)) : []
  const projectIds = projects.map((project) => project.id)
  const projectAnalytics = projectIds.length ? await table('project_analytics', (q) => q.select('*').in('project_id', projectIds)) : []
  const groupAnalytics = classIds.length ? await table('group_analytics', (q) => q.select('*').in('class_id', classIds)) : []
  const reassignments = projectIds.length ? await table('reassignment_requests', (q) => q.select('id').in('project_id', projectIds)) : []

  const aiInsights = await generateAnalyticsInsight({
    scope: 'professor',
    professorId,
    projectAnalytics,
    groupAnalytics,
  })

  const row = {
    professor_id: professorId,
    projects_created: projects.length,
    projects_completed: projects.filter((project) => project.status === 'completed').length,
    average_learning_effectiveness: average(projectAnalytics.map((item) => item.learning_effectiveness)),
    average_project_effectiveness: average(projectAnalytics.map((item) => item.project_effectiveness)),
    average_completion_rate: average(projectAnalytics.map((item) => item.completion_rate)),
    average_group_performance: average(groupAnalytics.map((item) => item.group_performance)),
    deadline_extension_frequency: reassignments.length,
    contribution_fairness_trends: projectAnalytics.map((item) => ({ projectId: item.project_id, score: item.contribution_fairness })),
    project_health_trends: projectAnalytics.map((item) => ({ projectId: item.project_id, score: item.health_score })),
    ai_insights: aiInsights,
    metrics: { classes: classes.length },
    generated_at: new Date().toISOString(),
  }

  await supabaseAdminClient.from('professor_analytics').upsert(row, { onConflict: 'professor_id' })
  return row
}
