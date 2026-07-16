// Downscale + re-encode a picked/captured photo to a compact JPEG data-URL so a
// 3-angle before/after set stays DB-friendly (~200-400 KB/photo) without the
// clinic having to compress anything manually. EXIF orientation is honored so
// phone shots aren't sideways.
export async function fileToCompressedDataUrl(
  file: File,
  { maxEdge = 1280, quality = 0.82 }: { maxEdge?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.')

  const src = await loadImage(file)
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
  if ('close' in src && typeof src.close === 'function') src.close()

  return canvas.toDataURL('image/jpeg', quality)
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
      img.onerror = () => reject(new Error('Gagal memuat gambar.'))
      img.src = url
    })
    return img
  } finally {
    // Safe to revoke after decode — the browser keeps the decoded pixels.
    URL.revokeObjectURL(url)
  }
}
