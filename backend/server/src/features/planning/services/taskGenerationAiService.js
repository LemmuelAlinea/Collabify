import { env } from '../../../config/env.js'
import { buildTaskGenerationPrompt } from './taskGenerationPrompt.js'

function addDays(start, deadline, fraction) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(deadline).getTime()
  return new Date(startTime + ((endTime - startTime) * fraction)).toISOString()
}

function normalizeWeights(tasks) {
  const flat = tasks.flatMap((task) => task.subtasks?.length ? task.subtasks : [task])
  const total = flat.reduce((sum, task) => sum + Number(task.weight || task.points || 1), 0) || 1
  let used = 0

  flat.forEach((task, index) => {
    task.weight = index === flat.length - 1 ? Math.round((100 - used) * 100) / 100 : Math.round((Number(task.weight || task.points || 1) / total) * 10000) / 100
    used += task.weight
  })

  tasks.forEach((task) => {
    if (task.subtasks?.length) task.weight = Math.round(task.subtasks.reduce((sum, subtask) => sum + Number(subtask.weight), 0) * 100) / 100
  })

  return tasks
}

export function buildFallbackPlan(input) {
  const project = input.project
  const teamSize = project.workMode === 'individual' ? 1 : Number(project.memberCount ?? 1)
  const complex = ['web_development', 'mobile_application', 'system_development', 'capstone'].includes(project.projectType)
  const phases = project.projectType === 'research'
    ? ['Research Planning', 'Literature Review', 'Methodology', 'Data Gathering', 'Analysis', 'Paper Writing', 'Presentation']
    : ['Planning', 'UI/UX Design', 'Database Design', 'Core Development', 'Testing', 'Documentation', 'Presentation Preparation']

  const milestones = phases.map((phase, index) => ({
    key: `M${index + 1}`,
    title: `${phase} Complete`,
    description: `${phase} deliverables are ready for review.`,
    dueAt: addDays(project.startAt, project.deadlineAt, (index + 1) / phases.length),
    position: index + 1,
  }))

  const tasks = phases.map((phase, index) => ({
    key: `T${index + 1}`,
    title: phase,
    description: `Complete ${phase.toLowerCase()} deliverables for ${project.title}.`,
    priority: index >= phases.length - 2 ? 'high' : 'medium',
    estimatedHours: complex ? 10 + index * 2 : 6 + index,
    points: index >= phases.length - 2 ? 8 : 5,
    weight: 0,
    dueAt: milestones[index].dueAt,
    milestoneKey: milestones[index].key,
    roleSuggestion: ['Project Lead', 'UI/UX Designer', 'Database Manager', 'Developer', 'QA Tester', 'Documentation Lead', 'Presenter'][index] ?? 'Developer',
    reasoning: `${phase} is required to make the project manageable and measurable.`,
    learningOutcomes: input.syllabus?.slice(0, 2).map((item) => item.title ?? item.file_name ?? 'Course outcome') ?? [],
    dependencies: index === 0 ? [] : [`T${index}`],
    subtasks: complex ? [
      {
        key: `T${index + 1}.1`,
        title: `Define ${phase} requirements`,
        description: `List concrete requirements and acceptance criteria for ${phase.toLowerCase()}.`,
        priority: 'medium',
        estimatedHours: 3,
        points: 2,
        weight: 0,
        dueAt: addDays(project.startAt, project.deadlineAt, (index + 0.4) / phases.length),
        roleSuggestion: 'Project Lead',
        reasoning: 'Clear requirements reduce rework.',
        learningOutcomes: [],
        dependencies: index === 0 ? [] : [`T${index}`],
      },
      {
        key: `T${index + 1}.2`,
        title: `Produce ${phase} output`,
        description: `Create the required ${phase.toLowerCase()} artifact and prepare it for review.`,
        priority: index >= phases.length - 2 ? 'high' : 'medium',
        estimatedHours: 7 + index,
        points: index >= phases.length - 2 ? 8 : 5,
        weight: 0,
        dueAt: milestones[index].dueAt,
        roleSuggestion: ['Developer', 'Designer', 'Database Manager', 'Developer', 'QA Tester', 'Documentation Lead', 'Presenter'][index] ?? 'Developer',
        reasoning: 'This is the measurable output for the phase.',
        learningOutcomes: [],
        dependencies: [`T${index + 1}.1`],
      },
    ] : [],
  }))

  normalizeWeights(tasks)

  const totalHours = tasks.reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.reduce((inner, subtask) => inner + subtask.estimatedHours, 0) : task.estimatedHours), 0)
  const roleSuggestions = [...new Set(tasks.flatMap((task) => [task.roleSuggestion, ...(task.subtasks ?? []).map((subtask) => subtask.roleSuggestion)]))]

  return {
    projectSummary: `This project requires students to complete ${project.title} through structured planning, development, testing, documentation, and presentation work.`,
    complexityScore: complex ? 78 : 55,
    complexityLabel: complex ? 'Complex' : 'Moderate',
    structureType: complex ? 'hierarchical' : 'standalone',
    tasks,
    milestones,
    workloadAnalysis: {
      teamSize,
      totalEstimatedHours: totalHours,
      balanceScore: teamSize > 1 ? 86 : 72,
      contributionPlan: roleSuggestions.map((role) => ({ role, workloadPercent: Math.round(100 / roleSuggestions.length), estimatedHours: Math.round(totalHours / roleSuggestions.length) })),
      roleSuggestions,
      warnings: teamSize < 3 && complex ? ['Small team may be overloaded for this project scope.'] : [],
    },
    report: {
      complexityAnalysis: complex ? 'The project has multiple technical phases and should use main tasks with subtasks.' : 'The project can be managed with standalone tasks.',
      taskStructure: complex ? 'Hierarchical tasks are recommended.' : 'Standalone tasks are recommended.',
      taskHierarchy: 'Tasks are organized by phase and measurable outputs.',
      milestones: 'Milestones are distributed across the timeline.',
      dependencies: 'Dependency chains start with planning and end with testing, documentation, and presentation.',
      workloadAnalysis: `Estimated workload is ${totalHours} hours.`,
      contributionAnalysis: 'Suggested roles distribute work by phase and skill area.',
      learningOutcomeMapping: 'Tasks map to technical, collaboration, documentation, and problem-solving outcomes.',
      riskAnalysis: teamSize < 3 && complex ? 'Team size may create workload risk.' : 'No critical workload risk detected.',
      recommendations: 'Review generated tasks before publishing.',
      alternativePlans: {
        optimistic: 'Compress planning and design to start development earlier.',
        balanced: 'Use the generated milestone schedule.',
        conservative: 'Add buffer time before testing and submission.',
      },
    },
  }
}

export async function runTaskGenerationAi(input) {
  if (!env.n8nTaskGenerationWebhookUrl) return buildFallbackPlan(input)

  const response = await fetch(env.n8nTaskGenerationWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: buildTaskGenerationPrompt(input),
      input,
    }),
  })

  if (!response.ok) return buildFallbackPlan(input)
  const data = await response.json().catch(() => null)
  return data?.plan ?? data ?? buildFallbackPlan(input)
}
