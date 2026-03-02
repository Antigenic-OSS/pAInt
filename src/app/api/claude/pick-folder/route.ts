import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Opens a native OS folder picker dialog and returns the selected path.
 * macOS: uses osascript (AppleScript)
 * Linux: uses zenity
 */
export async function GET(): Promise<NextResponse> {
  const platform = process.platform

  try {
    let folderPath: string | null = null

    if (platform === 'darwin') {
      const { stdout } = await execFileAsync(
        'osascript',
        [
          '-e',
          'set theFolder to POSIX path of (choose folder with prompt "Select your project root folder")',
          '-e',
          'return theFolder',
        ],
        { timeout: 60_000 },
      )
      folderPath = stdout.trim().replace(/\/$/, '') // strip trailing slash
    } else if (platform === 'linux') {
      const { stdout } = await execFileAsync(
        'zenity',
        [
          '--file-selection',
          '--directory',
          '--title=Select your project root folder',
        ],
        { timeout: 60_000 },
      )
      folderPath = stdout.trim()
    } else {
      return NextResponse.json(
        { error: 'Folder picker not supported on this platform' },
        { status: 501 },
      )
    }

    if (!folderPath) {
      return NextResponse.json({ cancelled: true })
    }

    return NextResponse.json({ path: folderPath })
  } catch (err) {
    // User cancelled the dialog (osascript exits with code 1, zenity with 1)
    const code = (err as { code?: number }).code
    if (code === 1) {
      return NextResponse.json({ cancelled: true })
    }
    return NextResponse.json(
      { error: 'Failed to open folder picker' },
      { status: 500 },
    )
  }
}
