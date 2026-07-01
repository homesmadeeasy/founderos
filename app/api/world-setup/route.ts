import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { parseJsonBody, requireId } from '@/lib/api/validate'
import { getOpenAIApiKey, envErrorResponse } from '@/lib/env'
import { runJsonCompletion, mapOpenAIError } from '@/lib/ai/server'
import {
  createTask, createRisk, createDecision, createRoadmapItem, createNote,
} from '@/lib/db'
import {
  WORLD_SETUP_SYSTEM_PROMPT, renderWorldSetupContext, normalizeWorldSetup,
  mapSetupPriorityToTask, mapSeverityToRisk,
  type WorldSetupRequestBody,
} from '@/lib/world-setup'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    getOpenAIApiKey()
  } catch (err) {
    return envErrorResponse(err)
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const parsed = await parseJsonBody<WorldSetupRequestBody>(req)
  if (!parsed.ok) return parsed.response

  const projectIdCheck = requireId(parsed.body.project_id, 'project_id')
  if (!projectIdCheck.ok) return projectIdCheck.response

  const supabase = await createClient()
  const projectId = projectIdCheck.value

  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()
  if (projectError) throw projectError
  if (!projectRow) {
    return NextResponse.json({ error: 'World not found.' }, { status: 404 })
  }

  const context = {
    title: parsed.body.title ?? projectRow.title ?? '',
    description: parsed.body.description ?? projectRow.description ?? '',
    worldType: parsed.body.world_type ?? projectRow.world_type ?? 'Custom',
    worldPurpose: parsed.body.world_purpose ?? projectRow.world_purpose ?? '',
    goal: parsed.body.goal ?? projectRow.goal ?? '',
    lifeArea: parsed.body.life_area ?? projectRow.life_area ?? '',
  }

  let setup
  try {
    setup = await runJsonCompletion(
      {
        system: WORLD_SETUP_SYSTEM_PROMPT,
        user: renderWorldSetupContext(context),
        temperature: 0.4,
        maxTokens: 1600,
      },
      normalizeWorldSetup,
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes('object')) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    const { status, message } = mapOpenAIError(err)
    return NextResponse.json({ error: message }, { status })
  }

  const created = { tasks: 0, risks: 0, decisions: 0, roadmapItems: 0, notes: 0 }

  try {
    if (setup.worldSummary || setup.successCriteria) {
      await createNote(supabase, auth.user.id, {
        projectId,
        title: 'World overview',
        content: [
          setup.worldSummary && `Summary: ${setup.worldSummary}`,
          setup.successCriteria && `Success criteria: ${setup.successCriteria}`,
          setup.reviewRhythm && `Review rhythm: ${setup.reviewRhythm}`,
          setup.nextBestStep && `Next best step: ${setup.nextBestStep}`,
        ].filter(Boolean).join('\n\n'),
      })
      created.notes++
    }

    for (const action of setup.firstActions) {
      await createTask(supabase, auth.user.id, {
        projectId,
        title: action.title,
        description: action.description,
        priority: mapSetupPriorityToTask(action.priority),
        status: 'todo',
      })
      created.tasks++
    }

    for (const risk of setup.initialRisks) {
      await createRisk(supabase, auth.user.id, {
        projectId,
        title: risk.title,
        description: risk.description,
        severity: mapSeverityToRisk(risk.severity),
        mitigation: risk.mitigation,
        status: 'open',
      })
      created.risks++
    }

    for (const decision of setup.decisionsToClarify) {
      await createDecision(supabase, auth.user.id, {
        projectId,
        decision: decision.decision,
        reasoning: decision.reasoning,
      })
      created.decisions++
    }

    for (let i = 0; i < setup.pathItems.length; i++) {
      const item = setup.pathItems[i]
      await createRoadmapItem(supabase, auth.user.id, {
        projectId,
        title: item.title,
        description: item.description,
        stage: item.stage,
        status: 'planned',
        sortOrder: i,
      })
      created.roadmapItems++
    }
  } catch (err) {
    console.error('[api/world-setup] failed to save setup entities:', err)
    return NextResponse.json({
      setup,
      created,
      error: 'AI setup was generated but some items could not be saved.',
    }, { status: 500 })
  }

  return NextResponse.json({ setup, created })
}
