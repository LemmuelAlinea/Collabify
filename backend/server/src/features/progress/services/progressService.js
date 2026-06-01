import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value))
  if (validValues.length === 0) return 0
  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length)
}

function taskCompletion(tasks) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'done').length
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return {
    blocked: tasks.filter((task) => task.status === 'blocked').length,
    completed,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    progress,
    total,
  }
}

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    const rows = map.get(key) ?? []
    rows.push(item)
    map.set(key, rows)
  }
  return map
}

async function getProfiles(userIds) {
  if (userIds.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', [...new Set(userIds)])

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function loadContributionLogs({ groupIds = [], projectIds = [], userIds = [] }) {
  let query = supabaseAdminClient
    .from('contribution_logs')
    .select('id, project_id, group_id, user_id, task_id, contribution_type, points, logged_at')
    .order('logged_at', { ascending: false })

  if (groupIds.length > 0) query = query.in('group_id', groupIds)
  else if (projectIds.length > 0) query = query.in('project_id', projectIds)
  else if (userIds.length > 0) query = query.in('user_id', userIds)
  else return []

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load contribution logs', error.message)
  return data ?? []
}

function buildMemberProgress({ assignments, contributionLogs, members, profileByUserId, tasks }) {
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const assignmentsByUser = groupBy(assignments, (assignment) => assignment.assignee_id)
  const contributionsByUser = groupBy(contributionLogs, (log) => log.user_id)

  return members.map((member) => {
    const assigned = assignmentsByUser.get(member.user_id) ?? []
    const assignedTasks = assigned.map((assignment) => tasksById.get(assignment.task_id)).filter(Boolean)
    const contributions = contributionsByUser.get(member.user_id) ?? []
    const profile = profileByUserId.get(member.user_id)

    return {
      avatarUrl: profile?.avatar_url,
      completedTasks: assignedTasks.filter((task) => task.status === 'done').length,
      contributionPoints: contributions.reduce((sum, log) => sum + Number(log.points ?? 0), 0),
      displayName: profile?.display_name ?? member.users?.email,
      email: member.users?.email,
      progress: average(assignedTasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      totalTasks: assignedTasks.length,
      userId: member.user_id,
    }
  })
}

function buildTaskRows(tasks, assignmentsByTaskId, profileByUserId) {
  return tasks.map((task) => ({
    assignees: (assignmentsByTaskId.get(task.id) ?? []).map((assignment) => ({
      displayName: profileByUserId.get(assignment.assignee_id)?.display_name ?? assignment.users?.email,
      userId: assignment.assignee_id,
    })),
    groupId: task.group_id,
    groupName: task.groups?.name,
    id: task.id,
    progress: task.progress ?? (task.status === 'done' ? 100 : 0),
    projectId: task.project_id,
    projectTitle: task.projects?.title,
    status: task.status,
    title: task.title,
  }))
}

async function loadProgressData({ classIds = [], groupIds = [], projectIds = [] }) {
  if (classIds.length === 0 && groupIds.length === 0 && projectIds.length === 0) {
    return {
      assignments: [],
      contributionLogs: [],
      groups: [],
      members: [],
      profileByUserId: new Map(),
      projects: [],
      tasks: [],
    }
  }

  const { data: groups, error: groupsError } = groupIds.length > 0
    ? await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('id', groupIds)
    : await supabaseAdminClient
      .from('groups')
      .select('id, class_id, project_id, name, projects:project_id (id, title), classes:class_id (id, title, section)')
      .in('class_id', classIds)

  if (groupsError) throw new HttpError(400, 'Unable to load groups', groupsError.message)

  const resolvedGroupIds = (groups ?? []).map((group) => group.id)
  const groupProjectIds = (groups ?? []).map((group) => group.project_id).filter(Boolean)
  const requestedProjectIds = projectIds.length > 0 ? projectIds : []
  const resolvedProjectIds = [...new Set([...requestedProjectIds, ...groupProjectIds])]

  const { data: projects, error: projectsError } = resolvedProjectIds.length > 0
    ? await supabaseAdminClient
      .from('projects')
      .select('id, class_id, title, status')
      .in('id', resolvedProjectIds)
    : await supabaseAdminClient
      .from('projects')
      .select('id, class_id, title, status')
      .in('class_id', classIds)

  if (projectsError) throw new HttpError(400, 'Unable to load projects', projectsError.message)

  const [{ data: tasks, error: tasksError }, { data: members, error: membersError }] = await Promise.all([
    resolvedGroupIds.length > 0
      ? supabaseAdminClient
        .from('tasks')
        .select('id, project_id, group_id, title, status, progress, groups:group_id (name), projects:project_id (title)')
        .in('group_id', resolvedGroupIds)
      : { data: [] },
    resolvedGroupIds.length > 0
      ? supabaseAdminClient
        .from('group_members')
        .select('group_id, user_id, users:user_id (email)')
        .in('group_id', resolvedGroupIds)
        .eq('status', 'active')
      : { data: [] },
  ])

  if (tasksError) throw new HttpError(400, 'Unable to load tasks', tasksError.message)
  if (membersError) throw new HttpError(400, 'Unable to load members', membersError.message)

  const taskIds = (tasks ?? []).map((task) => task.id)
  const { data: assignments, error: assignmentsError } = taskIds.length > 0
    ? await supabaseAdminClient
      .from('task_assignments')
      .select('task_id, assignee_id, users:assignee_id (email)')
      .in('task_id', taskIds)
    : { data: [] }

  if (assignmentsError) throw new HttpError(400, 'Unable to load task assignments', assignmentsError.message)

  const contributionLogs = await loadContributionLogs({ groupIds: resolvedGroupIds, projectIds: resolvedProjectIds })
  const profileByUserId = await getProfiles([
    ...(members ?? []).map((member) => member.user_id),
    ...(assignments ?? []).map((assignment) => assignment.assignee_id),
    ...contributionLogs.map((log) => log.user_id),
  ])

  return {
    assignments: assignments ?? [],
    contributionLogs,
    groups: groups ?? [],
    members: members ?? [],
    profileByUserId,
    projects: projects ?? [],
    tasks: tasks ?? [],
  }
}

function buildDashboard(data, scope) {
  const tasksByProject = groupBy(data.tasks, (task) => task.project_id)
  const tasksByGroup = groupBy(data.tasks, (task) => task.group_id)
  const membersByGroup = groupBy(data.members, (member) => member.group_id)
  const assignmentsByTaskId = groupBy(data.assignments, (assignment) => assignment.task_id)
  const contributionsByProject = groupBy(data.contributionLogs, (log) => log.project_id)
  const contributionsByGroup = groupBy(data.contributionLogs, (log) => log.group_id)

  const projects = data.projects.map((project) => {
    const tasks = tasksByProject.get(project.id) ?? []
    const completion = taskCompletion(tasks)
    return {
      classId: project.class_id,
      contributionPoints: (contributionsByProject.get(project.id) ?? []).reduce((sum, log) => sum + Number(log.points ?? 0), 0),
      id: project.id,
      progress: average(tasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      status: project.status,
      taskCompletion: completion,
      title: project.title,
    }
  })

  const groups = data.groups.map((group) => {
    const tasks = tasksByGroup.get(group.id) ?? []
    const members = membersByGroup.get(group.id) ?? []
    const groupContributions = contributionsByGroup.get(group.id) ?? []

    return {
      className: group.classes?.title,
      contributionPoints: groupContributions.reduce((sum, log) => sum + Number(log.points ?? 0), 0),
      id: group.id,
      memberCount: members.length,
      members: buildMemberProgress({
        assignments: data.assignments.filter((assignment) => tasks.some((task) => task.id === assignment.task_id)),
        contributionLogs: groupContributions,
        members,
        profileByUserId: data.profileByUserId,
        tasks,
      }),
      name: group.name,
      progress: average(tasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      projectId: group.project_id,
      projectTitle: group.projects?.title,
      taskCompletion: taskCompletion(tasks),
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    groups,
    overview: {
      averageGroupProgress: average(groups.map((group) => group.progress)),
      averageProjectProgress: average(projects.map((project) => project.progress)),
      contributionPoints: data.contributionLogs.reduce((sum, log) => sum + Number(log.points ?? 0), 0),
      groups: groups.length,
      projects: projects.length,
      taskCompletion: taskCompletion(data.tasks),
    },
    projects,
    scope,
    tasks: buildTaskRows(data.tasks, assignmentsByTaskId, data.profileByUserId),
  }
}

export async function getProgressDashboard(userId, role) {
  if (role === 'professor') {
    const { data: classes, error } = await supabaseAdminClient
      .from('classes')
      .select('id, title, section')
      .eq('professor_id', userId)
      .eq('is_archived', false)

    if (error) throw new HttpError(400, 'Unable to load classes', error.message)
    const data = await loadProgressData({ classIds: (classes ?? []).map((classItem) => classItem.id) })

    return {
      ...buildDashboard(data, { classes: classes ?? [], role }),
      personal: null,
    }
  }

  const { data: memberships, error } = await supabaseAdminClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
  const groupIds = (memberships ?? []).map((membership) => membership.group_id)
  const data = await loadProgressData({ groupIds })
  const assignedTasks = data.assignments
    .filter((assignment) => assignment.assignee_id === userId)
    .map((assignment) => data.tasks.find((task) => task.id === assignment.task_id))
    .filter(Boolean)
  const personalContributions = data.contributionLogs.filter((log) => log.user_id === userId)

  return {
    ...buildDashboard(data, { role }),
    personal: {
      contributionPoints: personalContributions.reduce((sum, log) => sum + Number(log.points ?? 0), 0),
      progress: average(assignedTasks.map((task) => task.progress ?? (task.status === 'done' ? 100 : 0))),
      taskCompletion: taskCompletion(assignedTasks),
    },
  }
}
