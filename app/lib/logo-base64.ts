import fs from 'fs'
import path from 'path'

/**
 * Read the logo base64 data URI from disk at runtime.
 * Returns the full data URI (e.g. "data:image/png;base64,...") or null if unavailable.
 */
export const logoBase64: string | null = (() => {
  try {
    const p = path.join(process.cwd(), 'logo-base64.txt')
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8')
    }
    return null
  } catch (err) {
    // If anything goes wrong, return null and callers should fall back to text
    return null
  }
})()
