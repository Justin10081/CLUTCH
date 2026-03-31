/**
 * CLUTCH — File text extraction utility
 * Supports: .pdf (via pdf.js), .txt, .md (via FileReader)
 * Binary formats (.pptx, .docx): throws BINARY_FORMAT error
 */

export async function extractFileText(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    return extractPDFText(file)
  } else if (ext === 'txt' || ext === 'md') {
    return readAsText(file)
  } else {
    // .pptx, .docx, .xlsx etc — binary, can't parse client-side
    throw new Error(`BINARY_FORMAT:${ext}`)
  }
}

async function extractPDFText(file) {
  // Dynamic import so it doesn't bloat initial bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Set worker — Vite handles the ?url import
  try {
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
  } catch {
    // Fallback: use CDN worker if local import fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .filter(item => item.str?.trim())
      .map(item => item.str)
      .join(' ')
    if (pageText.trim()) {
      fullText += `[Page ${pageNum}]\n${pageText}\n\n`
    }
  }

  return fullText.trim() || '[PDF contained no extractable text — may be scanned/image-based]'
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result || '')
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function formatFileSize(bytes) {
  if (!bytes) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const icons = {
    pdf: '📄', txt: '📝', md: '📝',
    pptx: '📊', ppt: '📊',
    docx: '📃', doc: '📃',
    xlsx: '📊', csv: '📊',
    mp4: '🎬', mov: '🎬', mp3: '🎵',
  }
  return icons[ext] || '📎'
}

export function isSupportedFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return ['pdf', 'txt', 'md'].includes(ext)
}

export function isBinaryFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'].includes(ext)
}
