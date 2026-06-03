import mammoth from 'mammoth'

import { supabaseAdminClient } from '../../integrations/supabase/client.js'

const MAX_ATTACHMENT_TEXT_LENGTH = 20000

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ATTACHMENT_TEXT_LENGTH)
}

function isPdf({ mimeType, fileName }) {
  return String(mimeType ?? '').includes('pdf') || String(fileName ?? '').toLowerCase().endsWith('.pdf')
}

function isDocx({ mimeType, fileName }) {
  const lower = String(fileName ?? '').toLowerCase()
  return String(mimeType ?? '').includes('wordprocessingml') || lower.endsWith('.docx')
}

function ensurePdfPolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {}
  }

  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {}
  }

  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {}
  }
}

async function loadPdfParser() {
  ensurePdfPolyfills()
  const mod = await import('pdf-parse')
  return mod.PDFParse ?? mod.default?.PDFParse ?? mod.default ?? mod
}

async function readBytesFromStorage(bucket, storagePath) {
  const { data, error } = await supabaseAdminClient.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 5)

  if (error || !data?.signedUrl) return null

  const response = await fetch(data.signedUrl)
  if (!response.ok) return null

  return Buffer.from(await response.arrayBuffer())
}

async function extractPdfText(buffer) {
  const PDFParse = await loadPdfParser()
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return normalizeText(result?.text)
  } finally {
    await parser.destroy().catch(() => null)
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer })
  return normalizeText(result?.value)
}

export async function extractAttachmentText({ bucket, storagePath, mimeType, fileName }) {
  if (!bucket || !storagePath) return null

  try {
    const bytes = await readBytesFromStorage(bucket, storagePath)
    if (!bytes?.length) return null

    if (isPdf({ mimeType, fileName })) return await extractPdfText(bytes)
    if (isDocx({ mimeType, fileName })) return await extractDocxText(bytes)

    return null
  } catch (error) {
    return null
  }
}
