/**
 * Detect when command palette input should run Universal Capture.
 */
import { parseAskMemoryCommand, parseCreateCommand } from '@/lib/command'

export function parseCaptureIntent(input: string): { text: string } | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length < 3) return null
  if (parseAskMemoryCommand(trimmed)) return null
  if (parseCreateCommand(trimmed, true)) return null
  if (parseCreateCommand(trimmed, false)) return null
  if (/^(go to|open|navigate)\s+/i.test(trimmed)) return null
  return { text: trimmed }
}
