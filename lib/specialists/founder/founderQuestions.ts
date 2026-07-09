import type { FounderSnapshot, FounderQuestionId } from './founderTypes'

export const FOUNDER_QUESTION_CHIPS: { id: FounderQuestionId; label: string; prompt: string }[] = [
  { id: 'build_next', label: 'What should I build next?', prompt: 'What should I build next?' },
  { id: 'overengineering', label: 'Am I overengineering?', prompt: 'Am I overengineering?' },
  { id: 'first_users', label: 'How do I get first users?', prompt: 'How do I get users?' },
  { id: 'ignore', label: 'What should I ignore?', prompt: 'What should I ignore?' },
  { id: 'biggest_risk', label: 'What is the biggest risk?', prompt: 'What is the biggest risk?' },
  { id: 'more_useful', label: 'What would make this more useful?', prompt: 'What would make this more useful?' },
  { id: 'validate_week', label: 'What should I validate this week?', prompt: 'What should I validate this week?' },
]

export function answerFounderQuestion(
  snapshot: FounderSnapshot,
  prompt: string,
): string {
  const normalized = prompt.trim().toLowerCase()

  if (normalized.includes('overengineering') || normalized.includes('over-engineering')) {
    if (snapshot.architectureScore > 65 && snapshot.validationScore < 45) {
      return [
        '**Yes — overengineering risk is high.**',
        `Architecture ${snapshot.architectureScore} vs validation ${snapshot.validationScore}.`,
        snapshot.risks.find(r => r.id === 'overengineering')?.description ?? '',
        `**Do instead:** ${snapshot.topRecommendation}`,
        `**Ignore:** ${snapshot.ignoreToday.join(' · ')}`,
      ].filter(Boolean).join('\n\n')
    }
    return [
      '**Not critically — but stay vigilant.**',
      `Architecture ${snapshot.architectureScore}, validation ${snapshot.validationScore}.`,
      'Keep shipping user-visible outcomes, not internal capability.',
    ].join('\n\n')
  }

  if (normalized.includes('build next') || normalized.includes('what should i build')) {
    return [
      `**Build next:** ${snapshot.topRecommendation}`,
      `**Sprint:** ${snapshot.suggestedSprint.title}`,
      snapshot.suggestedSprint.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      `**Done when:** ${snapshot.suggestedSprint.definitionOfDone}`,
    ].join('\n\n')
  }

  if (normalized.includes('get user') || normalized.includes('first user')) {
    return [
      '**First users come from specificity, not more product.**',
      '1. List 10 people who already struggle with what FounderOS solves.',
      '2. Reach out to 3 with a concrete 15-minute walkthrough ask.',
      '3. Show Home — not the architecture.',
      '4. Log every reaction in Memory.',
      snapshot.validationScore < 40
        ? '**Honest read:** You have almost no validation signal yet. Talking to users is more important than building.'
        : 'You have some signal — follow up with the people who reacted positively.',
    ].filter(Boolean).join('\n\n')
  }

  if (normalized.includes('ignore') || normalized.includes('should i ignore')) {
    const items = snapshot.ignoreToday.length > 0
      ? snapshot.ignoreToday
      : snapshot.suggestedSprint.ignore
    return [
      '**Ignore today:**',
      items.map(i => `• ${i}`).join('\n'),
      `**Why:** ${snapshot.mainInsight}`,
    ].join('\n\n')
  }

  if (normalized.includes('biggest risk') || normalized.includes('risk')) {
    const top = snapshot.risks[0]
    if (!top) return 'No major founder risks detected right now. Stay focused on validation.'
    return [
      `**Biggest risk: ${top.title}** (${top.severity})`,
      top.description,
      snapshot.risks.length > 1
        ? `**Also watch:** ${snapshot.risks.slice(1, 3).map(r => r.title).join(', ')}`
        : '',
    ].filter(Boolean).join('\n\n')
  }

  if (normalized.includes('more useful') || normalized.includes('make this useful')) {
    return [
      `**Bottleneck:** ${snapshot.mainBottleneck}`,
      snapshot.mainBottleneck === 'Validation' || snapshot.mainBottleneck === 'Overengineering'
        ? 'FounderOS becomes more useful when one person completes one real day with it — not when you add another engine.'
        : `Focus on ${snapshot.mainBottleneck.toLowerCase()} before expanding scope.`,
      `**Next move:** ${snapshot.topRecommendation}`,
    ].join('\n\n')
  }

  if (normalized.includes('validate') || normalized.includes('validation')) {
    return [
      '**Validate this week:**',
      '1. Can a new user understand Home in 60 seconds?',
      '2. Would someone leave Home open all day?',
      '3. Does the morning → decision → evening loop feel worth repeating?',
      '4. What is the one feature they actually use vs ignore?',
      `**Sprint:** ${snapshot.suggestedSprint.title} — ${snapshot.suggestedSprint.definitionOfDone}`,
    ].join('\n\n')
  }

  if (normalized.includes('bottleneck') || normalized.includes('founder bottleneck')) {
    return [
      `**Founder bottleneck: ${snapshot.mainBottleneck}**`,
      snapshot.mainInsight,
      `**Recommendation:** ${snapshot.topRecommendation}`,
    ].join('\n\n')
  }

  if (normalized.includes('sprint') || normalized.includes('next sprint')) {
    const s = snapshot.suggestedSprint
    return [
      `**${s.title}**`,
      s.why,
      '**Tasks:**',
      s.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      `**Ignore:** ${s.ignore.join(' · ')}`,
      `**Done when:** ${s.definitionOfDone}`,
    ].join('\n\n')
  }

  if (normalized.includes('ask founder') || normalized.includes('founder ai')) {
    return [
      '**Founder AI briefing**',
      snapshot.mainInsight,
      `**Recommendation:** ${snapshot.topRecommendation}`,
      `**Stage:** ${snapshot.currentStage} · **Bottleneck:** ${snapshot.mainBottleneck}`,
    ].join('\n\n')
  }

  return [
    snapshot.mainInsight,
    snapshot.narrative,
    `**Top move:** ${snapshot.topRecommendation}`,
  ].join('\n\n')
}

export function matchFounderQuestion(prompt: string): boolean {
  const normalized = prompt.trim().toLowerCase()
  const triggers = [
    'ask founder', 'founder ai', 'founder bottleneck', 'overengineering', 'over-engineering',
    'what should i build', 'build next', 'get user', 'first user', 'founder risk',
    'biggest risk', 'what should i ignore', 'more useful', 'validate this week',
    'next sprint', 'founder sprint', 'what is blocking', 'product-market fit', 'pmf',
  ]
  return triggers.some(t => normalized.includes(t))
}
