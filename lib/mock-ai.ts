/**
 * Mock AI response generator.
 *
 * Produces contextually relevant fake responses based on keyword matching.
 * The responses are deliberately structured (numbered lists, bold headings)
 * so the conversion buttons (Create Task, Save Note, etc.) have something
 * useful to pre-fill with.
 *
 * Replace this entirely when the OpenAI API is connected.
 */

import type { Project } from './types'

export function generateMockAiResponse(userMessage: string, project: Project): string {
  const msg = userMessage.toLowerCase()

  // Tasks / sprint planning
  if (msg.match(/task|sprint|todo|build|implement|create|develop|ship/)) {
    return `Based on your goal — "${project.goal}" — here are the tasks I'd prioritise next:

**1. Define the scope clearly**
List exactly what's in and out of this sprint. Ambiguity kills momentum.

**2. Build the core feature first**
Resist adding extras. The one thing that proves the concept is all you need right now.

**3. Test with one real user**
Get feedback before you add more. One user's confusion is worth a thousand lines of code.

**4. Document decisions as you go**
You'll forget your reasoning in two weeks. Write it down now.

Want me to create any of these as formal tasks, or break them down further?`
  }

  // Risks
  if (msg.match(/risk|concern|worry|problem|danger|fail|issue/)) {
    return `Here are the key risks I'd flag for "${project.title}":

**Risk 1: Scope creep** — Severity: High
Adding features before the core is validated is the #1 reason projects stall.
Mitigation: Hard scope freeze. Everything new goes to a V2 list.

**Risk 2: Low Day-7 retention** — Severity: High
If users don't return after the first session, nothing else matters.
Mitigation: Design for a "first win" in under 2 minutes. Track retention from day one.

**Risk 3: Over-engineering early** — Severity: Medium
Building for scale before you have users wastes time and creates drag.
Mitigation: Choose boring technology. Optimise only when you have evidence.

Shall I add any of these to the risk register?`
  }

  // Roadmap / planning
  if (msg.match(/roadmap|phase|milestone|plan|timeline|launch|release/)) {
    return `Here's a suggested roadmap for "${project.title}":

**Phase 1 — Foundation**
Core infrastructure, auth, basic CRUD. Get something running end-to-end, even if it's rough.

**Phase 2 — Core Value**
The single feature that makes users say "I need this." Build it. Nothing else.

**Phase 3 — Feedback Loop**
Ship to 5 real users. Collect feedback. Iterate hard. Don't add features yet.

**Phase 4 — Polish & Launch**
Onboarding, empty states, error handling. Make it feel solid. Launch publicly.

**Phase 5 — Growth**
Retention features, referrals, monetisation. Only after Phase 4 is proven.

Want me to add these as roadmap milestones?`
  }

  // Decisions
  if (msg.match(/decision|choose|should i|which|option|versus|vs|pick|select/)) {
    return `Let me help you think through this.

**Option A — Move fast, validate first**
Lower quality, faster feedback, easier to change direction.
Best if: you're not sure the idea will work yet.

**Option B — Build it properly from the start**
Takes longer, more robust, harder to change later.
Best if: you've already validated demand and need scale.

**My recommendation:** Go with Option A for "${project.title}" right now. Speed of learning beats quality of execution at this stage. You can always rebuild once you've validated the core assumption.

**The deciding principle:** Would a paying user notice the difference in the next 30 days? If not, do the faster thing.

Want to log this as a decision?`
  }

  // Notes / ideas / insights
  if (msg.match(/note|idea|insight|thought|realised|realized|remember|capture|write down/)) {
    return `Good insight — worth capturing clearly. Here's a structured version:

**Insight:** ${userMessage}

**Why this matters:** This directly affects the core user experience. Left unaddressed, it becomes harder and more expensive to fix as the product grows.

**Implication:** Treat this as a design constraint, not a backlog item. Let it shape decisions now rather than being retrofitted later.

**Suggested action:** Document this in your project notes and reference it when you reach the relevant phase of the roadmap.

Shall I save this as a note?`
  }

  // Progress / status check
  if (msg.match(/progress|status|update|where are we|how far|done/)) {
    return `Here's an honest assessment of where "${project.title}" stands:

**What's working**
The foundation and direction are clear. You have a defined goal and a core loop to build toward.

**What needs attention**
Execution speed. The biggest risk for solo projects isn't the idea — it's the gap between planning and shipping.

**The most important thing right now**
Get something in front of a real user as fast as possible. Even a rough version. Feedback from reality beats planning every time.

**My recommendation**
Pick the single most important task, do only that today, and mark it done. Momentum compounds.

Want me to help you identify what that single task should be?`
  }

  // Default — catch-all response
  return `Good question. Here's my thinking on "${project.title}":

The most important thing right now is staying focused on your V1 goal:

"${project.goal}"

**Three questions to pressure-test your next move:**
1. Does this directly serve the goal above?
2. Would you regret not having done it in 3 months?
3. Can someone else do this, or only you?

If the answer to all three is "yes" — do it now. If not, put it in a backlog and stay focused.

Is there a specific part of this you'd like to think through?`
}
