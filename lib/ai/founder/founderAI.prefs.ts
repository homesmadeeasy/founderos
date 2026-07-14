const PREFS_KEY = 'founderos-founder-ai-prefs-v1'

export interface FounderAIPrefs {
  llmEnabled: boolean
}

const DEFAULT_PREFS: FounderAIPrefs = { llmEnabled: true }

export function loadFounderAIPrefs(): FounderAIPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<FounderAIPrefs>
    return { llmEnabled: parsed.llmEnabled !== false }
  } catch {
    return DEFAULT_PREFS
  }
}

export function saveFounderAIPrefs(prefs: FounderAIPrefs): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function isFounderAILlmEnabled(): boolean {
  return loadFounderAIPrefs().llmEnabled
}
