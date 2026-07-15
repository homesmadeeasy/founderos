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
  const cognitiveIdx = src.indexOf('<CognitiveModelProvider>')
  const conversationIdx = src.indexOf('<ConversationProvider>')
  assert(kernelIdx >= 0 && cognitiveIdx > kernelIdx, 'CognitiveModelProvider must be inside FounderKernelProvider')
  assert(conversationIdx > cognitiveIdx, 'ConversationProvider must be inside CognitiveModelProvider')
  console.log('PASS: layout provider order is acyclic')
}

function testUseCognitiveModelCallSites() {
  const allowed = new Set([
    'components/home/CognitiveInsightCard.tsx',
    'components/founder/useFounderInput.ts',
    'components/gym/useGymInput.ts',
    'contexts/ConversationContext.tsx',
    'contexts/CognitiveModelContext.tsx',
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

function run() {
  console.log('Provider dependency audit\n')
  testCognitiveProviderDoesNotUseFounderInput()
  testBaseInputHasNoCognitiveDependency()
  testFounderInputMergesCognitive()
  testGymBaseInputHasNoCognitiveDependency()
  testGymInputMergesCognitive()
  testLayoutProviderOrder()
  testUseCognitiveModelCallSites()
  console.log('\nAll provider dependency tests passed.')
}

run()
