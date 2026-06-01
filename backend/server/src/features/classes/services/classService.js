import { randomBytes } from 'node:crypto'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'

const CLASS_SELECT = `
  id,
  professor_id,
  syllabus_id,
  code,
  title,
  description,
  subject,
  year_level,
  term,
  semester,
  academic_year,
  school_year,
  section,
  join_code,
  is_archived,
  created_at,
  updated_at
`

function normalizeClass(classItem) {
  return {
    id: classItem.id,
    professorId: classItem.professor_id,
    syllabusId: classItem.syllabus_id,
    code: classItem.code,
    classCode: classItem.join_code,
    name: classItem.title,
    description: classItem.description,
    subject: classItem.subject,
    yearLevel: classItem.year_level,
    semester: classItem.semester ?? classItem.term,
    schoolYear: classItem.school_year ?? classItem.academic_year,
    section: classItem.section,
    isArchived: classItem.is_archived,
    createdAt: classItem.created_at,
    updatedAt: classItem.updated_at,
  }
}

function normalizeAnnouncement(announcement) {
  return {
    id: announcement.id,
    classId: announcement.class_id,
    authorId: announcement.author_id,
    title: announcement.title,
    body: announcement.body,
    isPinned: announcement.is_pinned,
    publishedAt: announcement.published_at,
    createdAt: announcement.created_at,
    updatedAt: announcement.updated_at,
  }
}

function normalizeProjectSummary(project) {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    deadlineAt: project.release_deadline_at ?? project.deadline_at ?? project.due_at,
    startAt: project.release_start_at ?? project.start_at,
    visibilityAt: project.release_at ?? project.visibility_at,
    releaseAt: project.release_at ?? project.visibility_at,
    projectType: project.project_type,
    createdAt: project.created_at,
  }
}

async function generateUniqueClassCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `CLB-${randomBytes(3).toString('hex').toUpperCase()}`
    const { data, error } = await supabaseAdminClient
      .from('classes')
      .select('id')
      .eq('join_code', code)
      .maybeSingle()

    if (error) {
      throw new HttpError(400, 'Unable to generate class code', error.message)
    }

    if (!data) return code
  }

  throw new HttpError(500, 'Unable to generate a unique class code')
}

async function assignSyllabusToClass(syllabusId, classId, professorId) {
  if (!syllabusId) return null

  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select('id')
    .eq('id', syllabusId)
    .eq('uploaded_by', professorId)
    .single()

  if (error || !data) {
    throw new HttpError(400, 'Unable to assign syllabus to class', error?.message)
  }

  const { error: classUpdateError } = await supabaseAdminClient
    .from('classes')
    .update({ syllabus_id: syllabusId })
    .eq('id', classId)
    .eq('professor_id', professorId)

  if (classUpdateError) {
    throw new HttpError(400, 'Unable to assign syllabus to class', classUpdateError.message)
  }

  return data
}

async function assertProfessorOwnsSyllabus(syllabusId, professorId) {
  if (!syllabusId) return
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select('id')
    .eq('id', syllabusId)
    .eq('uploaded_by', professorId)
    .single()

  if (error || !data) {
    throw new HttpError(400, 'Selected syllabus is invalid', error?.message)
  }
}

export async function listProfessorClasses(professorId, includeArchived = false) {
  let query = supabaseAdminClient
    .from('classes')
    .select(CLASS_SELECT)
    .eq('professor_id', professorId)
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query

  if (error) {
    throw new HttpError(400, 'Unable to load classes', error.message)
  }

  return data.map(normalizeClass)
}

export async function listJoinedClasses(studentId) {
  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select(`
      id,
      joined_at,
      classes:class_id (${CLASS_SELECT})
    `)
    .eq('user_id', studentId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  if (error) {
    throw new HttpError(400, 'Unable to load joined classes', error.message)
  }

  return data.map((membership) => ({
    membershipId: membership.id,
    joinedAt: membership.joined_at,
    ...normalizeClass(membership.classes),
  }))
}

export async function assertProfessorOwnsClass(classId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('professor_id', professorId)
    .single()

  if (error || !data) {
    throw new HttpError(403, 'You do not have permission to use this class')
  }

  return data
}

export async function createClass(professorId, payload) {
  await assertProfessorOwnsSyllabus(payload.syllabusId, professorId)
  const classCode = await generateUniqueClassCode()
  const subjectCode = payload.subject.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase()

  const { data, error } = await supabaseAdminClient
    .from('classes')
    .insert({
      professor_id: professorId,
      code: subjectCode || classCode,
      title: payload.name,
      description: payload.description,
      subject: payload.subject,
      year_level: payload.yearLevel,
      term: payload.semester,
      semester: payload.semester,
      academic_year: payload.schoolYear,
      school_year: payload.schoolYear,
      section: payload.section,
      join_code: classCode,
      syllabus_id: payload.syllabusId ?? null,
    })
    .select(CLASS_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to create class', error.message)
  }

  await supabaseAdminClient.from('class_members').upsert({
    class_id: data.id,
    user_id: professorId,
    role: 'professor',
    status: 'active',
  }, { onConflict: 'class_id,user_id' })

  await supabaseAdminClient.from('class_chats').upsert({
    class_id: data.id,
    created_by: professorId,
  }, { onConflict: 'class_id' })

  return normalizeClass(data)
}

export async function updateClass(professorId, classId, payload) {
  await assertProfessorOwnsClass(classId, professorId)
  await assertProfessorOwnsSyllabus(payload.syllabusId, professorId)

  const updatePayload = {
    title: payload.name,
    description: payload.description,
    subject: payload.subject,
    year_level: payload.yearLevel,
    term: payload.semester,
    semester: payload.semester,
    academic_year: payload.schoolYear,
    school_year: payload.schoolYear,
    section: payload.section,
    syllabus_id: payload.syllabusId,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  let data = null
  if (Object.keys(updatePayload).length > 0) {
    const { data: updatedClass, error } = await supabaseAdminClient
      .from('classes')
      .update(updatePayload)
      .eq('id', classId)
      .select(CLASS_SELECT)
      .single()

    if (error) {
      throw new HttpError(400, 'Unable to update class', error.message)
    }
    data = updatedClass
  } else {
    const { data: currentClass, error } = await supabaseAdminClient
      .from('classes')
      .select(CLASS_SELECT)
      .eq('id', classId)
      .single()

    if (error || !currentClass) {
      throw new HttpError(400, 'Unable to update class', error?.message)
    }
    data = currentClass
  }

  return normalizeClass(data)
}

export async function archiveClass(professorId, classId) {
  await assertProfessorOwnsClass(classId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('classes')
    .update({ is_archived: true })
    .eq('id', classId)
    .select(CLASS_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to archive class', error.message)
  }

  return normalizeClass(data)
}

export async function joinClass(studentId, classCode) {
  const { data: classItem, error } = await supabaseAdminClient
    .from('classes')
    .select(CLASS_SELECT)
    .eq('join_code', classCode)
    .eq('is_archived', false)
    .single()

  if (error || !classItem) {
    throw new HttpError(404, 'Class code was not found')
  }

  const { error: membershipError } = await supabaseAdminClient
    .from('class_members')
    .upsert({
      class_id: classItem.id,
      user_id: studentId,
      role: 'student',
      status: 'active',
      removed_at: null,
    }, { onConflict: 'class_id,user_id' })

  if (membershipError) {
    throw new HttpError(400, 'Unable to join class', membershipError.message)
  }

  return normalizeClass(classItem)
}

export async function assignClassSyllabus(professorId, classId, syllabusId) {
  await assertProfessorOwnsClass(classId, professorId)
  await assignSyllabusToClass(syllabusId, classId, professorId)
  return getClassDetails(professorId, 'professor', classId)
}

export async function getClassDetails(userId, role, classId) {
  if (role === 'professor') {
    await assertProfessorOwnsClass(classId, userId)
  } else {
    const { data: membership } = await supabaseAdminClient
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      throw new HttpError(403, 'You do not have permission to view this class')
    }
  }

  const { data: classItem, error } = await supabaseAdminClient
    .from('classes')
    .select(CLASS_SELECT)
    .eq('id', classId)
    .single()

  if (error || !classItem) {
    throw new HttpError(404, 'Class not found')
  }

  const [
    { data: announcements },
    { data: members },
    { data: projectReleases },
    { data: syllabi },
    { data: classChat },
  ] = await Promise.all([
    supabaseAdminClient
      .from('announcements')
      .select('id, title, body, is_pinned, published_at, author_id')
      .eq('class_id', classId)
      .order('published_at', { ascending: false }),
    supabaseAdminClient
      .from('class_members')
      .select('id, user_id, role, status, joined_at, users:user_id (email)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true }),
    supabaseAdminClient
      .from('project_class_releases')
      .select(`
        id,
        start_at,
        deadline_at,
        release_at,
        projects:project_id (
          id,
          title,
          status,
          due_at,
          deadline_at,
          start_at,
          visibility_at,
          project_type,
          created_at
        )
      `)
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabaseAdminClient
      .from('syllabi')
      .select('id, title, file_name, version, is_active, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    supabaseAdminClient
      .from('class_chats')
      .select('id, created_at')
      .eq('class_id', classId)
      .maybeSingle(),
  ])

  const userIds = (members ?? []).map((member) => member.user_id)
  const assignedSyllabus = classItem.syllabus_id
    ? await supabaseAdminClient
      .from('syllabi')
      .select('id, title, file_name, version, is_active, created_at')
      .eq('id', classItem.syllabus_id)
      .maybeSingle()
    : { data: null }

  const syllabiList = [...(syllabi ?? [])]
  if (assignedSyllabus?.data && !syllabiList.some((item) => item.id === assignedSyllabus.data.id)) {
    syllabiList.unshift(assignedSyllabus.data)
  }

  const { data: profiles } = userIds.length > 0
    ? await supabaseAdminClient
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)
    : { data: [] }
  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]))
  const visibleProjectReleases = role === 'student'
    ? (projectReleases ?? []).filter((release) => (
      release.projects?.status !== 'archived'
      && new Date(release.release_at) <= new Date()
    ))
    : (projectReleases ?? [])

  return {
    class: normalizeClass(classItem),
    announcements: (announcements ?? []).map(normalizeAnnouncement),
    members: (members ?? []).map((member) => ({
      id: member.id,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
      displayName: profileByUserId.get(member.user_id)?.display_name ?? member.users?.email,
      avatarUrl: profileByUserId.get(member.user_id)?.avatar_url,
      email: member.users?.email,
    })),
    projects: visibleProjectReleases
      .filter((release) => release.projects)
      .map((release) => normalizeProjectSummary({
        ...release.projects,
        release_start_at: release.start_at,
        release_deadline_at: release.deadline_at,
        release_at: release.release_at,
      })),
    syllabi: syllabiList,
    classChat: classChat ?? null,
  }
}
