// Downscale + re-encode a picked/captured photo to a compact JPEG data-URL so a
// before/after set stays light — small enough that a phone upload is fast and
// the gallery isn't heavy to load. EXIF orientation is honored so phone shots
// aren't sideways. Target ~1000px longest edge (plenty for documentation).
export async function fileToCompressedDataUrl(
  file: File,
  { maxEdge = 1000, quality = 0.72 }: { maxEdge?: number; quality?: number } = {},
): Promise<string> {
  // Allow empty MIME (some pickers report '') — let the decoder be the judge.
  if (file.type && !file.type.startsWith('image/')) throw new Error('File harus berupa gambar.')

  let src: ImageBitmap | HTMLImageElement
  try {
    src = await loadImage(file)
  } catch {
    // Most common real cause on iPhone: HEIC/HEIF, which Android browsers can't
    // decode. Tell the user how to fix it instead of failing silently.
    throw new Error('Gambar tidak bisa dibaca. Foto iPhone (HEIC) kadang tak didukung — ubah ke JPG dulu.')
  }

  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height
  const scale = Math.min(1, maxEdge / Math.max(sw, sh || 1))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.')
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h)
  if ('close' in src && typeof src.close === 'function') src.close() // free the decoded bitmap ASAP (mobile memory)

  // Re-encode; if it's still large, drop quality once more so uploads stay light.
  let out = canvas.toDataURL('image/jpeg', quality)
  if (out.length > 700_000) out = canvas.toDataURL('image/jpeg', 0.6)
  return out
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      // Older engines without the orientation option — fall back to <img>.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('decode failed'))
      img.src = url
    })
    return img
  } finally {
    // Safe to revoke after decode — the browser keeps the decoded pixels.
    URL.revokeObjectURL(url)
  }
}
