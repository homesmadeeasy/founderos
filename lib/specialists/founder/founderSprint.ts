import type { FounderSprint, FounderBottleneck, FounderStage } from './founderTypes'
import type { FilteredFounderData } from './founderSignals'

export function buildFounderSprint(
  bottleneck: FounderBottleneck,
  stage: FounderStage,
  data: FilteredFounderData,
  topRecommendation: string,
  ignoreToday: string[],
): FounderSprint {
  switch (bottleneck) {
    case 'Overengineering':
    case 'Validation':
      return {
        title: 'Validation Sprint',
        why: 'Infrastructure is ahead of proof. The next founder move is external signal, not more architecture.',
        tasks: [
          'Show Home to 3 people and ask: "What do you think this does?"',
          'Record 5 real reactions in Memory',
          'Fix the single biggest confusion point they surface',
          'Ship one improvement based on feedback — not a new engine',
        ],
        ignore: ignoreToday.length > 0 ? ignoreToday : [
          'New engines', 'Kernel work', 'More domain evaluators',
        ],
        definitionOfDone: 'At least 3 user conversations logged with one concrete product change shipped.',
      }

    case 'UX clarity':
      return {
        title: 'Clarity Sprint',
        why: 'The product is capable but not instantly legible to a new user.',
        tasks: [
          'Watch one person open Home without explanation',
          'List every point they hesitate',
          'Remove or rewrite the most confusing element',
          'Re-test with one more person',
        ],
        ignore: ['New features', 'Backend refactors'],
        definitionOfDone: 'A new user can explain what FounderOS does after 60 seconds on Home.',
      }

    case 'Product focus':
      return {
        title: 'Ship One Thing Sprint',
        why: 'Too many open threads are diluting founder leverage.',
        tasks: [
          `Complete: ${data.activeTasks[0]?.title ?? 'top morning priority'}`,
          'Defer everything not required for that outcome',
          'Record outcome in Evening Review',
          'Capture lessons in Memory',
        ],
        ignore: ignoreToday,
        definitionOfDone: 'One founder priority marked complete with outcome recorded.',
      }

    case 'Distribution':
      return {
        title: 'First Users Sprint',
        why: 'Product exists — distribution is the missing loop.',
        tasks: [
          'List 10 people who might use FounderOS',
          'Reach out to 3 with a specific ask',
          'Offer a 15-minute walkthrough',
          'Log every response as a signal',
        ],
        ignore: ['New product surfaces', 'Architecture planning'],
        definitionOfDone: '3 outreach attempts logged with at least 1 conversation scheduled or completed.',
      }

    default:
      if (stage === 'mvp' || stage === 'validation') {
        return {
          title: data.activeTasks[0]?.title ?? 'Founder MVP Sprint',
          why: topRecommendation,
          tasks: [
            data.activeTasks[0]?.title ?? 'Ship the current founder priority',
            'Protect one 90-minute deep work block',
            'Capture blockers immediately',
            'Close the loop in Evening Review',
          ],
          ignore: ignoreToday.length > 0 ? ignoreToday : ['Scope creep', 'New engines'],
          definitionOfDone: 'Today\'s founder priority is complete or clearly blocked with a next step.',
        }
      }

      return {
        title: 'Build Sprint',
        why: topRecommendation,
        tasks: [
          'Define today\'s single founder deliverable',
          'Execute one deep work block',
          'Ship something user-visible',
          'Record what you learned',
        ],
        ignore: ignoreToday,
        definitionOfDone: 'One tangible founder artifact shipped and logged.',
      }
  }
}
