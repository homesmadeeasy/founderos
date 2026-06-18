/**
 * Structured extraction config and helpers.
 *
 * Safe for the client — contains NO secrets. The OpenAI key is only read
 * server-side in app/api/extract-object/route.ts.
 *
 * A single SCHEMAS definition drives BOTH:
 *   - the JSON shape we ask the model to return (buildSchemaInstruction)
 *   - the validation/normalisation of the model's output (normalizeExtraction)
 * This avoids duplicating field/enum logic across the prompt and the parser.
 */

export type ExtractionType = 'task' | 'note' | 'decision' | 'risk' | 'roadmap'

// ─── Typed extraction results ───────────────────────────────────────────────────

export interface TaskExtraction     { title: string; description: string; priority: 'low' | 'medium' | 'high'; status: 'todo' | 'in_progress' }
export interface NoteExtraction     { title: string; content: string }
export interface DecisionExtraction { decision: string; reasoning: string }
export interface RiskExtraction     { title: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; mitigation: string; status: 'open' | 'mitigated' | 'closed' }
export interface RoadmapExtraction  { title: string; description: string; stage: string; status: 'planned' | 'in_progress' | 'done' }

export type ExtractionResult =
  | TaskExtraction | NoteExtraction | DecisionExtraction | RiskExtraction | RoadmapExtraction

// ─── Field schema ───────────────────────────────────────────────────────────────

interface FieldSpec {
  desc: string
  /** Allowed values (for enum fields). First entry is the default. */
  options?: string[]
  /** Default value for free-text fields. */
  default?: string
}

const SCHEMAS: Record<ExtractionType, Record<string, FieldSpec>> = {
  task: {
    title:       { desc: 'A short, clear, action-oriented task title (max ~80 chars). Start with a verb.', default: '' },
    description: { desc: 'One to three concise sentences describing what to do. No markdown.', default: '' },
    priority:    { desc: 'How important/urgent the task is.', options: ['medium', 'low', 'high'] },
    status:      { desc: 'Initial status of the task.', options: ['todo', 'in_progress'] },
  },
  note: {
    title:   { desc: 'A short title summarising the note (max ~60 chars).', default: '' },
    content: { desc: 'The useful insight or information, written clearly and concisely. No markdown.', default: '' },
  },
  decision: {
    decision:  { desc: 'The decision itself, stated clearly in one sentence.', default: '' },
    reasoning: { desc: 'Why this decision makes sense. One to three sentences.', default: '' },
  },
  risk: {
    title:       { desc: 'A short title naming the risk (max ~80 chars).', default: '' },
    description: { desc: 'What the risk is and why it matters. One to two sentences.', default: '' },
    severity:    { desc: 'How serious the risk is.', options: ['medium', 'low', 'high', 'critical'] },
    mitigation:  { desc: 'A concrete way to reduce or address the risk. Empty string if none is implied.', default: '' },
    status:      { desc: 'Current status of the risk.', options: ['open', 'mitigated', 'closed'] },
  },
  roadmap: {
    title:       { desc: 'A short milestone title (max ~80 chars).', default: '' },
    description: { desc: 'What this milestone involves. One to two sentences.', default: '' },
    stage:       { desc: 'The phase or stage label, e.g. "Phase 1", "Launch". Empty string if unclear.', default: '' },
    status:      { desc: 'Current status of this roadmap item.', options: ['planned', 'in_progress', 'done'] },
  },
}

// ─── Prompt builder (server-side) ───────────────────────────────────────────────

const TYPE_INTENT: Record<ExtractionType, string> = {
  task:     'Extract a single, concrete TASK that the user could act on.',
  note:     'Extract a single useful NOTE capturing the key insight.',
  decision: 'Extract a single DECISION and the reasoning behind it.',
  risk:     'Extract a single RISK, including how serious it is and how to mitigate it.',
  roadmap:  'Extract a single ROADMAP milestone.',
}

export function buildSchemaInstruction(type: ExtractionType): string {
  const fields = SCHEMAS[type]
  const lines = Object.entries(fields).map(([key, spec]) => {
    const constraint = spec.options
      ? `one of ${spec.options.map(o => `"${o}"`).join(' | ')}`
      : 'string'
    return `  "${key}": ${constraint}  // ${spec.desc}`
  })
  return `${TYPE_INTENT[type]}

Return ONLY a valid JSON object with EXACTLY these keys (no extra keys, no markdown, no commentary):
{
${lines.join('\n')}
}`
}

// ─── Normalisation (shared) ─────────────────────────────────────────────────────

/**
 * Coerce arbitrary model output into a safe Record<string,string> matching the
 * modal's form fields. Enums are clamped to allowed values; missing fields use
 * their defaults. Throws if `raw` is not a usable object.
 */
export function normalizeExtraction(type: ExtractionType, raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Extraction did not return an object')
  }
  const input = raw as Record<string, unknown>
  const spec = SCHEMAS[type]
  const out: Record<string, string> = {}

  for (const [key, field] of Object.entries(spec)) {
    const value = input[key]
    const str = typeof value === 'string' ? value.trim() : ''

    if (field.options) {
      // Enum: use the model's value if valid, otherwise the default (first option)
      out[key] = field.options.includes(str) ? str : field.options[0]
    } else {
      out[key] = str || (field.default ?? '')
    }
  }

  return out
}

export const EXTRACTION_TYPES: ExtractionType[] = ['task', 'note', 'decision', 'risk', 'roadmap']

// ─── API payload types ───────────────────────────────────────────────────────────

export interface ExtractRequestBody {
  type: ExtractionType
  content: string
}

export interface ExtractResponseBody {
  fields: Record<string, string>
}
