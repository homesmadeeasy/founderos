import type { FounderBottleneck, FounderStage } from './founderTypes'
import type { FilteredFounderData } from './founderSignals'
import type { FounderScores } from './founderScoring'

export function buildTopRecommendation(
  bottleneck: FounderBottleneck,
  scores: FounderScores,
  stage: FounderStage,
  data: FilteredFounderData,
): string {
  switch (bottleneck) {
    case 'Overengineering':
      return 'Stop expanding architecture. Ship one complete user-facing experience and test it with real people this week.'
    case 'Validation':
      return 'Show Home or one specialist flow to 3 people and ask what they understand — record every reaction.'
    case 'UX clarity':
      return 'Clarify positioning on the first screen — test onboarding copy and collect detailed reactions from the next 3 viewers.'
    case 'Distribution':
      return 'Find one channel where your first users already are — do not build more product until you have a distribution hypothesis.'
    case 'Product focus':
      return `Close the loop on ${data.activeTasks[0]?.title ?? 'one open founder task'} before starting anything new.`
    case 'User trust':
      return 'Walk one new user through onboarding and fix the first moment they look confused.'
    case 'Execution':
      return data.activeTasks[0]?.title
        ?? 'Complete one morning plan priority and record the outcome tonight.'
    default:
      if (stage === 'growth') return 'Double down on what validated — improve retention before adding scope.'
      if (stage === 'mvp') return 'Turn the strongest surface into a repeatable demo and get 5 reactions.'
      return data.activeTasks[0]?.title
        ?? 'Define the next shippable founder milestone and protect a deep work block for it.'
  }
}

export function buildMainInsight(
  bottleneck: FounderBottleneck,
  scores: FounderScores,
): string {
  switch (bottleneck) {
    case 'Overengineering':
      return 'You are making strong product progress, but validation is now the bottleneck.'
    case 'Validation':
      return 'The product is ahead of proof — users need to enter the loop now.'
    case 'UX clarity':
      return 'FounderOS is powerful internally, but clarity for new users is the constraint.'
    case 'Distribution':
      return 'Building is not the blocker — finding first users is.'
    case 'Product focus':
      return 'Momentum exists, but focus is spreading across too many open threads.'
    case 'User trust':
      return 'The system is capable, but first-time trust and understanding need work.'
    case 'Execution':
      return 'The strategy is clear — execution consistency is what is missing.'
    default:
      if (scores.momentumScore >= 70) {
        return 'Founder momentum is strong — protect focus and convert progress into user proof.'
      }
      return 'FounderOS is forming — pick one high-leverage move and ship it completely.'
  }
}

export function buildRoadmap(
  stage: FounderStage,
  bottleneck: FounderBottleneck,
): string[] {
  const base: Record<FounderStage, string[]> = {
    idea: ['Define the wedge', 'Ship one usable screen', 'Get 3 reactions'],
    prototype: ['Complete Home experience', 'Add one specialist deeply', 'Test with real users'],
    mvp: ['Validate core loop', 'Fix onboarding friction', 'Record outcomes nightly'],
    validation: ['Improve retention', 'Sharpen positioning', 'Reduce scope'],
    growth: ['Scale what works', 'Hire/automate bottlenecks', 'Expand second domain'],
  }

  const items = [...base[stage]]
  if (bottleneck === 'Validation') items.unshift('Run 5 user conversations this week')
  if (bottleneck === 'Overengineering') items.unshift('Freeze new engines for 2 weeks')
  return items.slice(0, 4)
}
