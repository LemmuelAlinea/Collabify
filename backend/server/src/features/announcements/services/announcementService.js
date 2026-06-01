import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import { env } from '../../../config/env.js'

const ANNOUNCEMENT_SELECT = `
  id,
  class_id,
  author_id,
  title,
  body,
  is_pinned,
  published_at,
  created_at,
  updated_at
`

async function createSignedUrl(attachment) {
  const { data } = await supabaseAdminClient.storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 60 * 10)

  return data?.signedUrl ?? null
}

async function getAnnouncementAttachments(announcementIds = []) {
  if (announcementIds.length === 0) return new Map()

  const { data, error } = await supabaseAdminClient
    .from('attachments')
    .select('id, owner_id, uploaded_by, storage_bucket, storage_path, file_name, mime_type, file_size_bytes, created_at')
    .eq('owner_type', 'announcement')
    .in('owner_id', announcementIds)
    .order('created_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load announcement attachments', error.message)

  const byAnnouncementId = new Map()
  for (const attachment of data ?? []) {
    const rows = byAnnouncementId.get(attachment.owner_id) ?? []
    rows.push({
      id: attachment.id,
      uploadedBy: attachment.uploaded_by,
      storageBucket: attachment.storage_bucket,
      storagePath: attachment.storage_path,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      fileSizeBytes: attachment.file_size_bytes,
      url: await createSignedUrl(attachment),
      createdAt: attachment.created_at,
    })
    byAnnouncementId.set(attachment.owner_id, rows)
  }

  return byAnnouncementId
}

function normalizeAnnouncement(announcement, attachmentsByAnnouncementId = new Map()) {
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
    attachments: attachmentsByAnnouncementId.get(announcement.id) ?? [],
  }
}

async function assertCanViewClass(userId, role, classId) {
  if (role === 'professor') {
    await assertProfessorOwnsClass(classId, userId)
    return
  }

  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('id')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) {
    throw new HttpError(403, 'You do not have permission to view this class')
  }
}

async function getOwnedAnnouncement(announcementId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('announcements')
    .select(`
      ${ANNOUNCEMENT_SELECT},
      classes:class_id (professor_id)
    `)
    .eq('id', announcementId)
    .single()

  if (error || !data) {
    throw new HttpError(404, 'Announcement not found')
  }

  if (data.classes?.professor_id !== professorId) {
    throw new HttpError(403, 'You do not have permission to manage this announcement')
  }

  return data
}

export async function listClassAnnouncements(userId, role, classId) {
  await assertCanViewClass(userId, role, classId)

  const { data, error } = await supabaseAdminClient
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('class_id', classId)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })

  if (error) {
    throw new HttpError(400, 'Unable to load announcements', error.message)
  }

  const attachmentsByAnnouncementId = await getAnnouncementAttachments((data ?? []).map((row) => row.id))
  return (data ?? []).map((row) => normalizeAnnouncement(row, attachmentsByAnnouncementId))
}

export async function createAnnouncement(professorId, payload) {
  await assertProfessorOwnsClass(payload.classId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('announcements')
    .insert({
      class_id: payload.classId,
      author_id: professorId,
      title: payload.title,
      body: payload.body,
      is_pinned: payload.isPinned,
      published_at: new Date().toISOString(),
    })
    .select(ANNOUNCEMENT_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to create announcement', error.message)
  }

  if (payload.attachments?.length) {
    const { error: attachmentError } = await supabaseAdminClient
      .from('attachments')
      .insert(payload.attachments.map((attachment) => ({
        owner_type: 'announcement',
        owner_id: data.id,
        uploaded_by: professorId,
        storage_bucket: attachment.storageBucket ?? env.announcementAttachmentsBucket,
        storage_path: attachment.storagePath,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        file_size_bytes: attachment.fileSizeBytes,
      })))

    if (attachmentError) throw new HttpError(400, 'Unable to attach announcement photos', attachmentError.message)
  }

  const attachmentsByAnnouncementId = await getAnnouncementAttachments([data.id])
  return normalizeAnnouncement(data, attachmentsByAnnouncementId)
}

export async function updateAnnouncement(professorId, announcementId, payload) {
  await getOwnedAnnouncement(announcementId, professorId)

  const updatePayload = {
    title: payload.title,
    body: payload.body,
    is_pinned: payload.isPinned,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { data, error } = await supabaseAdminClient
    .from('announcements')
    .update(updatePayload)
    .eq('id', announcementId)
    .select(ANNOUNCEMENT_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to update announcement', error.message)
  }

  if (payload.removeAttachmentIds?.length) {
    const { error: removeError } = await supabaseAdminClient
      .from('attachments')
      .delete()
      .eq('owner_type', 'announcement')
      .eq('owner_id', announcementId)
      .in('id', payload.removeAttachmentIds)

    if (removeError) throw new HttpError(400, 'Unable to remove announcement photo', removeError.message)
  }

  if (payload.attachments?.length) {
    const { error: attachmentError } = await supabaseAdminClient
      .from('attachments')
      .insert(payload.attachments.map((attachment) => ({
        owner_type: 'announcement',
        owner_id: announcementId,
        uploaded_by: professorId,
        storage_bucket: attachment.storageBucket ?? env.announcementAttachmentsBucket,
        storage_path: attachment.storagePath,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        file_size_bytes: attachment.fileSizeBytes,
      })))

    if (attachmentError) throw new HttpError(400, 'Unable to attach announcement photos', attachmentError.message)
  }

  const attachmentsByAnnouncementId = await getAnnouncementAttachments([announcementId])
  return normalizeAnnouncement(data, attachmentsByAnnouncementId)
}

export async function deleteAnnouncement(professorId, announcementId) {
  await getOwnedAnnouncement(announcementId, professorId)

  const { data: attachments } = await supabaseAdminClient
    .from('attachments')
    .select('id, storage_bucket, storage_path')
    .eq('owner_type', 'announcement')
    .eq('owner_id', announcementId)

  for (const attachment of attachments ?? []) {
    await supabaseAdminClient.storage.from(attachment.storage_bucket).remove([attachment.storage_path])
  }

  if ((attachments ?? []).length > 0) {
    await supabaseAdminClient
      .from('attachments')
      .delete()
      .eq('owner_type', 'announcement')
      .eq('owner_id', announcementId)
  }

  const { error } = await supabaseAdminClient
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    throw new HttpError(400, 'Unable to delete announcement', error.message)
  }

  return { id: announcementId }
}
