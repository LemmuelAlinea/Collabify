import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

const MESSAGE_SELECT = `
  id,
  scope,
  class_chat_id,
  group_chat_id,
  sender_id,
  body,
  reply_to_message_id,
  edited_at,
  deleted_at,
  deleted_for_everyone_by,
  metadata,
  created_at,
  updated_at
`

const ATTACHMENT_SELECT = `
  id,
  owner_id,
  uploaded_by,
  storage_bucket,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  metadata,
  created_at
`

async function getProfiles(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids)

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function assertClassChatAccess(chatId, userId, role) {
  const { data, error } = await supabaseAdminClient
    .from('class_chats')
    .select('id, class_id, classes:class_id (professor_id)')
    .eq('id', chatId)
    .single()

  if (error || !data) throw new HttpError(404, 'Class chat not found')
  if (role === 'professor' && data.classes?.professor_id === userId) return data

  const { data: member } = await supabaseAdminClient
    .from('class_members')
    .select('id')
    .eq('class_id', data.class_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!member) throw new HttpError(403, 'You do not have permission to use this chat')
  return data
}

async function assertGroupChatAccess(chatId, userId) {
  const { data: chatById, error: chatByIdError } = await supabaseAdminClient
    .from('group_chats')
    .select('id, group_id')
    .eq('id', chatId)
    .maybeSingle()

  if (chatByIdError) throw new HttpError(400, 'Unable to load group chat', chatByIdError.message)

  let chat = chatById

  if (!chat) {
    const { data: group, error: groupError } = await supabaseAdminClient
      .from('groups')
      .select('id, created_by')
      .eq('id', chatId)
      .maybeSingle()

    if (groupError) throw new HttpError(400, 'Unable to load group', groupError.message)
    if (!group) throw new HttpError(404, 'Group chat not found')

    const { data: chatByGroup, error: chatByGroupError } = await supabaseAdminClient
      .from('group_chats')
      .select('id, group_id')
      .eq('group_id', group.id)
      .maybeSingle()

    if (chatByGroupError) throw new HttpError(400, 'Unable to load group chat', chatByGroupError.message)
    chat = chatByGroup

    if (!chat) {
      const { data: createdChat, error: createError } = await supabaseAdminClient
        .from('group_chats')
        .insert({
          group_id: group.id,
          created_by: group.created_by ?? userId,
        })
        .select('id, group_id')
        .single()

      if (createError) throw new HttpError(400, 'Unable to create group chat', createError.message)
      chat = createdChat
    }
  }

  const { data: member } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', chat.group_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!member) throw new HttpError(403, 'Only active group members can use this chat')
  return chat
}

async function assertChatAccess(scope, chatId, userId, role) {
  return scope === 'class'
    ? assertClassChatAccess(chatId, userId, role)
    : assertGroupChatAccess(chatId, userId)
}

async function getMessage(messageId) {
  const { data, error } = await supabaseAdminClient
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('id', messageId)
    .single()

  if (error || !data) throw new HttpError(404, 'Message not found')
  return data
}

async function createSignedUrl(attachment) {
  const { data } = await supabaseAdminClient.storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 60 * 10)

  return data?.signedUrl ?? null
}

async function normalizeMessages(rows, viewerId) {
  const messageIds = rows.map((row) => row.id)
  const profileByUserId = await getProfiles(rows.map((row) => row.sender_id))

  const [{ data: attachments }, { data: pins }, { data: deletions }] = await Promise.all([
    messageIds.length
      ? supabaseAdminClient.from('attachments').select(ATTACHMENT_SELECT).eq('owner_type', 'message').in('owner_id', messageIds)
      : { data: [] },
    messageIds.length
      ? supabaseAdminClient.from('pinned_messages').select('id, message_id, pinned_by, created_at').in('message_id', messageIds)
      : { data: [] },
    messageIds.length
      ? supabaseAdminClient.from('message_deletions').select('message_id').eq('user_id', viewerId).in('message_id', messageIds)
      : { data: [] },
  ])

  const deletedForMe = new Set((deletions ?? []).map((row) => row.message_id))
  const pinByMessageId = new Map((pins ?? []).map((pin) => [pin.message_id, pin]))
  const attachmentsByMessageId = new Map()

  for (const attachment of attachments ?? []) {
    const list = attachmentsByMessageId.get(attachment.owner_id) ?? []
    list.push({
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
    attachmentsByMessageId.set(attachment.owner_id, list)
  }

  return rows
    .filter((row) => !deletedForMe.has(row.id))
    .map((row) => {
      const sender = profileByUserId.get(row.sender_id)
      const deleted = Boolean(row.deleted_at)
      const pin = pinByMessageId.get(row.id)

      return {
        id: row.id,
        scope: row.scope,
        chatId: row.class_chat_id ?? row.group_chat_id,
        classChatId: row.class_chat_id,
        groupChatId: row.group_chat_id,
        senderId: row.sender_id,
        senderName: sender?.display_name ?? 'User',
        senderAvatarUrl: sender?.avatar_url,
        body: deleted ? null : row.body,
        replyToMessageId: row.reply_to_message_id,
        isDeleted: deleted,
        deletedAt: row.deleted_at,
        deletedForEveryoneBy: row.deleted_for_everyone_by,
        isPinned: Boolean(pin),
        pinnedAt: pin?.created_at ?? null,
        pinnedBy: pin?.pinned_by ?? null,
        attachments: deleted ? [] : attachmentsByMessageId.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })
}

export async function listMessages(userId, role, payload) {
  const chat = await assertChatAccess(payload.scope, payload.chatId, userId, role)

  const column = payload.scope === 'class' ? 'class_chat_id' : 'group_chat_id'
  const { data, error } = await supabaseAdminClient
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq(column, chat.id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new HttpError(400, 'Unable to load messages', error.message)
  return normalizeMessages(data ?? [], userId)
}

export async function createMessage(userId, role, payload) {
  const chat = await assertChatAccess(payload.scope, payload.chatId, userId, role)

  const insertPayload = {
    scope: payload.scope,
    class_chat_id: payload.scope === 'class' ? chat.id : null,
    group_chat_id: payload.scope === 'group' ? chat.id : null,
    sender_id: userId,
    body: payload.body,
    reply_to_message_id: payload.replyToMessageId,
  }

  const { data, error } = await supabaseAdminClient
    .from('messages')
    .insert(insertPayload)
    .select(MESSAGE_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to send message', error.message)

  if (payload.attachments.length > 0) {
    const { error: attachmentError } = await supabaseAdminClient
      .from('attachments')
      .insert(payload.attachments.map((attachment) => ({
        owner_type: 'message',
        owner_id: data.id,
        uploaded_by: userId,
        storage_bucket: attachment.storageBucket,
        storage_path: attachment.storagePath,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        file_size_bytes: attachment.fileSizeBytes,
      })))

    if (attachmentError) throw new HttpError(400, 'Unable to attach files', attachmentError.message)
  }

  return (await normalizeMessages([data], userId))[0]
}

export async function deleteMessage(userId, role, messageId, payload) {
  const message = await getMessage(messageId)
  await assertChatAccess(message.scope, message.class_chat_id ?? message.group_chat_id, userId, role)

  if (payload.mode === 'me') {
    const { error } = await supabaseAdminClient
      .from('message_deletions')
      .upsert({ message_id: messageId, user_id: userId }, { onConflict: 'message_id,user_id' })

    if (error) throw new HttpError(400, 'Unable to delete message for you', error.message)
    return { id: messageId, deletedForMe: true }
  }

  if (message.sender_id !== userId && role !== 'professor') {
    throw new HttpError(403, 'Only the sender or professor can delete this message')
  }

  const { data, error } = await supabaseAdminClient
    .from('messages')
    .update({
      body: null,
      deleted_at: new Date().toISOString(),
      deleted_for_everyone_by: userId,
    })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to delete message', error.message)
  return (await normalizeMessages([data], userId))[0]
}

export async function setPinnedMessage(userId, role, messageId, payload) {
  const message = await getMessage(messageId)
  const chat = await assertChatAccess(message.scope, message.class_chat_id ?? message.group_chat_id, userId, role)

  if (payload.isPinned) {
    const { error } = await supabaseAdminClient
      .from('pinned_messages')
      .upsert({
        message_id: messageId,
        pinned_by: userId,
        class_chat_id: message.scope === 'class' ? chat.id : null,
        group_chat_id: message.scope === 'group' ? chat.id : null,
      }, { onConflict: 'message_id' })

    if (error) throw new HttpError(400, 'Unable to pin message', error.message)
  } else {
    const { error } = await supabaseAdminClient
      .from('pinned_messages')
      .delete()
      .eq('message_id', messageId)

    if (error) throw new HttpError(400, 'Unable to unpin message', error.message)
  }

  return (await normalizeMessages([message], userId))[0]
}
