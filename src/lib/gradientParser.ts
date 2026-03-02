import type { GradientData, GradientStop } from '@/types/gradient'

/**
 * Split a CSS function argument string by commas, respecting nested parentheses.
 */
function splitArgs(str: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Parse a single gradient stop string like "red 50%" or "rgba(0,0,0,0.5) 25%"
 */
function parseStop(stopStr: string): GradientStop | null {
  const trimmed = stopStr.trim()
  // Try to match a position percentage at the end
  const posMatch = trimmed.match(/\s+(\d+(?:\.\d+)?%?)$/)
  let color: string
  let position = 0

  if (posMatch) {
    color = trimmed.slice(0, trimmed.length - posMatch[0].length).trim()
    const posVal = posMatch[1]
    position = parseFloat(posVal)
  } else {
    color = trimmed
  }

  if (!color) return null

  return { color, position, opacity: 1 }
}

/**
 * Parse a CSS gradient string into a GradientData object.
 * Supports both regular and repeating variants.
 */
export function parseGradient(css: string): GradientData | null {
  if (!css) return null
  const trimmed = css.trim()

  let type: 'linear' | 'radial' | 'conic'
  let inner: string
  let repeat = false

  if (trimmed.startsWith('repeating-linear-gradient(')) {
    type = 'linear'
    repeat = true
    inner = trimmed.slice('repeating-linear-gradient('.length, -1)
  } else if (trimmed.startsWith('repeating-radial-gradient(')) {
    type = 'radial'
    repeat = true
    inner = trimmed.slice('repeating-radial-gradient('.length, -1)
  } else if (trimmed.startsWith('repeating-conic-gradient(')) {
    type = 'conic'
    repeat = true
    inner = trimmed.slice('repeating-conic-gradient('.length, -1)
  } else if (trimmed.startsWith('linear-gradient(')) {
    type = 'linear'
    inner = trimmed.slice('linear-gradient('.length, -1)
  } else if (trimmed.startsWith('radial-gradient(')) {
    type = 'radial'
    inner = trimmed.slice('radial-gradient('.length, -1)
  } else if (trimmed.startsWith('conic-gradient(')) {
    type = 'conic'
    inner = trimmed.slice('conic-gradient('.length, -1)
  } else {
    return null
  }

  const args = splitArgs(inner)
  if (args.length < 2) return null

  let angle = 180
  let stopStartIndex = 0

  // Check if first arg is an angle
  const firstArg = args[0].trim()
  const angleMatch = firstArg.match(/^(\d+(?:\.\d+)?)deg$/)
  if (angleMatch) {
    angle = parseFloat(angleMatch[1])
    stopStartIndex = 1
  } else if (firstArg.startsWith('from ')) {
    const fromMatch = firstArg.match(/^from\s+(\d+(?:\.\d+)?)deg$/)
    if (fromMatch) {
      angle = parseFloat(fromMatch[1])
      stopStartIndex = 1
    }
  } else if (firstArg === 'to top') {
    angle = 0
    stopStartIndex = 1
  } else if (firstArg === 'to right') {
    angle = 90
    stopStartIndex = 1
  } else if (firstArg === 'to bottom') {
    angle = 180
    stopStartIndex = 1
  } else if (firstArg === 'to left') {
    angle = 270
    stopStartIndex = 1
  } else if (firstArg.startsWith('to ')) {
    stopStartIndex = 1
  }

  const stops: GradientStop[] = []
  const stopArgs = args.slice(stopStartIndex)

  for (let i = 0; i < stopArgs.length; i++) {
    const stop = parseStop(stopArgs[i])
    if (stop) {
      // Auto-distribute positions if not specified
      if (stop.position === 0 && i > 0) {
        stop.position = Math.round((i / (stopArgs.length - 1)) * 100)
      }
      if (i === 0 && stop.position === 0) {
        stop.position = 0
      }
      if (i === stopArgs.length - 1 && stop.position === 0) {
        stop.position = 100
      }
      stops.push(stop)
    }
  }

  if (stops.length < 2) return null

  return { type, angle, stops, repeat }
}

/**
 * Serialize a GradientData object back to a valid CSS gradient string.
 * Supports repeating variants when data.repeat is true.
 */
export function serializeGradient(data: GradientData): string {
  const stopStrs = data.stops.map((s) => `${s.color} ${s.position}%`)
  const prefix = data.repeat ? 'repeating-' : ''

  switch (data.type) {
    case 'linear':
      return `${prefix}linear-gradient(${data.angle}deg, ${stopStrs.join(', ')})`
    case 'radial':
      return `${prefix}radial-gradient(${stopStrs.join(', ')})`
    case 'conic':
      return `${prefix}conic-gradient(from ${data.angle}deg, ${stopStrs.join(', ')})`
  }
}
