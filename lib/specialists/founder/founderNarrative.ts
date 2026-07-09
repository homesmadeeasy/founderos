import type { FounderSnapshot } from './founderTypes'
import type { FilteredFounderData } from './founderSignals'

export function generateFounderNarrative(
  snapshot: Pick<FounderSnapshot, 'currentStage' | 'mainBottleneck' | 'architectureScore' | 'validationScore' | 'productScore' | 'momentumScore' | 'topRecommendation' | 'risks'>,
  data: FilteredFounderData,
): string {
  const paragraphs: string[] = []

  if (snapshot.architectureScore > 60 && snapshot.validationScore < 45) {
    paragraphs.push(
      'You have shipped a lot of infrastructure quickly. That is valuable, but the risk is now continuing to improve the system before proving that users care.',
    )
  } else if (snapshot.momentumScore >= 65) {
    paragraphs.push(
      'Founder momentum is real — recent build activity and execution signals are strong.',
    )
  } else {
    paragraphs.push(
      'FounderOS is still forming its product loop. Progress is happening, but the wedge is not fully proven yet.',
    )
  }

  if (snapshot.validationScore < 40) {
    paragraphs.push(
      'Validation is weak. There is little evidence of external users, interviews, or real reactions in your recent history.',
    )
  } else if (snapshot.validationScore >= 55) {
    paragraphs.push(
      'Some validation signal exists — build on what people actually responded to, not what you assume they want.',
    )
  }

  if (data.codingSignals.length > 0 && snapshot.mainBottleneck === 'Overengineering') {
    paragraphs.push(
      'Coding momentum is high, which makes overengineering tempting. Resist adding capability until you have proof of value.',
    )
  }

  const topRisk = snapshot.risks[0]
  if (topRisk) {
    paragraphs.push(`${topRisk.title}: ${topRisk.description}`)
  }

  paragraphs.push(`The next founder move is to ${snapshot.topRecommendation.charAt(0).toLowerCase()}${snapshot.topRecommendation.slice(1)}`)

  return paragraphs.join('\n\n')
}
