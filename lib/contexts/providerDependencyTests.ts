/**
 * Provider dependency regression tests (no React render).
 * Run: npm run test:providers
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8')
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

function testCognitiveProviderDoesNotUseFounderInput() {
  const src = read('contexts/CognitiveModelContext.tsx')
  assert(!/import\s*\{[^}]*useFounderInput/.test(src), 'CognitiveModelProvider must not import useFounderInput')
  assert(!/=\s*useFounderInput\s*\(/.test(src), 'CognitiveModelProvider must not call useFounderInput()')
  assert(src.includes('useFounderBaseInput'), 'CognitiveModelProvider must use useFounderBaseInput')
  console.log('PASS: CognitiveModelProvider uses base input only')
}

function testBaseInputHasNoCognitiveDependency() {
  const src = read('components/founder/useFounderBaseInput.ts')
  assert(!/from\s+['"]@\/contexts\/CognitiveModelContext['"]/.test(src), 'useFounderBaseInput must not import CognitiveModelContext')
  assert(!/=\s*useCognitiveModel\s*\(/.test(src), 'useFounderBaseInput must not call useCognitiveModel()')
  console.log('PASS: useFounderBaseInput has no cognitive dependency')
}

function testFounderInputMergesCognitive() {
  const src = read('components/founder/useFounderInput.ts')
  assert(src.includes('useFounderBaseInput'), 'useFounderInput must compose base input')
  assert(src.includes('useCognitiveModel'), 'useFounderInput must merge cognitive model for descendants')
  assert(src.includes('mergeFounderInputWithWorldModel'), 'useFounderInput must use merge helper')
  console.log('PASS: useFounderInput composes base + cognitive')
}

function testLayoutProviderOrder() {
  const src = read('app/(app)/layout.tsx')
  const kernelIdx = src.indexOf('<FounderKernelProvider>')
  const morningIdx = src.indexOf('<MorningExecutionProvider>')
  const cognitiveIdx = src.indexOf('<CognitiveModelProvider>')
  const actionIdx = src.indexOf('<ActionEngineProvider>')
  const conversationIdx = src.indexOf('<ConversationProvider>')
  assert(kernelIdx >= 0 && cognitiveIdx > kernelIdx, 'CognitiveModelProvider must be inside FounderKernelProvider')
  assert(morningIdx >= 0 && morningIdx < cognitiveIdx, 'MorningExecutionProvider must wrap CognitiveModelProvider')
  assert(actionIdx > cognitiveIdx, 'ActionEngineProvider must be inside CognitiveModelProvider')
  assert(conversationIdx > actionIdx, 'ConversationProvider must be inside ActionEngineProvider')
  assert(src.includes('<RealityProvider>'), 'layout must mount RealityProvider')
  const realityIdx = src.indexOf('<RealityProvider>')
  assert(realityIdx > kernelIdx, 'RealityProvider must be inside FounderKernelProvider')
  assert(src.includes('<IntelligencePipelineProvider>'), 'layout must mount IntelligencePipelineProvider')
  const intelIdx = src.indexOf('<IntelligencePipelineProvider>')
  assert(intelIdx > cognitiveIdx, 'IntelligencePipelineProvider must be inside CognitiveModelProvider')
  assert(actionIdx > intelIdx, 'ActionEngineProvider must be inside IntelligencePipelineProvider')
  console.log('PASS: layout provider order is acyclic')
}

function testHookImports(hookName: string, files: string[]) {
  for (const rel of files) {
    const src = read(rel)
    if (!src.includes(`${hookName}(`)) continue
    assert(
      new RegExp(`import\\s*\\{[^}]*\\b${hookName}\\b`).test(src),
      `${rel} calls ${hookName}() but does not import it`,
    )
  }
}

function testCriticalHookImports() {
  testHookImports('useMorningExecution', [
    'contexts/ConversationContext.tsx',
    'contexts/ActionEngineContext.tsx',
    'contexts/CognitiveModelContext.tsx',
    'components/kernel/KernelSubscriberBootstrap.tsx',
  ])
  testHookImports('useObjectEngine', [
    'contexts/ConversationContext.tsx',
    'contexts/ActionEngineContext.tsx',
  ])
  testHookImports('useActionEngine', [
    'components/gym/GymConversationCard.tsx',
  ])
  console.log('PASS: critical custom hooks have matching imports')
}

function testUseCognitiveModelCallSites() {
  const allowed = new Set([
    'components/home/CognitiveInsightCard.tsx',
    'components/founder/useFounderInput.ts',
    'components/gym/useGymInput.ts',
    'contexts/ConversationContext.tsx',
    'contexts/CognitiveModelContext.tsx',
    'contexts/IntelligencePipelineContext.tsx',
    'components/kernel/KernelSubscriberBootstrap.tsx',
    'lib/contexts/providerTreeTests.ts',
  ])

  const { execSync } = require('node:child_process') as typeof import('node:child_process')
  let out: string[] = []
  try {
    out = execSync(
      'rg -l "useCognitiveModel\\(" --glob "*.tsx" --glob "*.ts" .',
      { encoding: 'utf8', cwd: ROOT },
    ).trim().split('\n').filter(Boolean)
  } catch {
    // rg exits 1 when no matches in some versions — treat as empty
    out = []
  }

  for (const raw of out) {
    const file = raw.replace(/^\.\//, '')
    if (file.includes('providerDependencyTests')) continue
    assert(
      allowed.has(file),
      `Unexpected useCognitiveModel() in ${file} — must render under CognitiveModelProvider`,
    )
  }
  console.log(`PASS: all ${out.length} useCognitiveModel() call sites are allowed descendants`)
}

function testGymBaseInputHasNoCognitiveDependency() {
  const src = read('components/gym/useGymBaseInput.ts')
  assert(!/from\s+['"]@\/contexts\/CognitiveModelContext['"]/.test(src), 'useGymBaseInput must not import CognitiveModelContext')
  assert(!/=\s*useCognitiveModel\s*\(/.test(src), 'useGymBaseInput must not call useCognitiveModel()')
  console.log('PASS: useGymBaseInput has no cognitive dependency')
}

function testGymInputMergesCognitive() {
  const src = read('components/gym/useGymInput.ts')
  assert(src.includes('useGymBaseInput'), 'useGymInput must compose base input')
  assert(src.includes('useCognitiveModel'), 'useGymInput must merge cognitive model for descendants')
  assert(src.includes('mergeGymInputWithWorldModel'), 'useGymInput must use merge helper')
  console.log('PASS: useGymInput composes base + cognitive')
}

function testGymLayoutProvider() {
  const src = read('app/(app)/gym/layout.tsx')
  assert(src.includes('GymDataProvider'), 'gym layout must mount GymDataProvider')
  const page = read('components/gym/useGymSnapshot.ts')
  assert(page.includes('useGymData'), 'useGymSnapshot must use GymDataProvider data')
  console.log('PASS: gym layout provider wiring')
}

function run() {
  console.log('Provider dependency audit\n')
  testCognitiveProviderDoesNotUseFounderInput()
  testBaseInputHasNoCognitiveDependency()
  testFounderInputMergesCognitive()
  testGymBaseInputHasNoCognitiveDependency()
  testGymInputMergesCognitive()
  testLayoutProviderOrder()
  testGymLayoutProvider()
  testCriticalHookImports()
  testUseCognitiveModelCallSites()
  console.log('\nAll provider dependency tests passed.')
}

run()
