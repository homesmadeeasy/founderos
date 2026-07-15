import { registerFounderActionHandlers } from './founderActionHandlers'
import { registerGymActionHandlers } from '@/lib/specialists/gym/gymActionHandlers'

let registered = false

export function ensureActionHandlersRegistered(): void {
  if (registered) return
  registerFounderActionHandlers()
  registerGymActionHandlers()
  registered = true
}

export function resetActionHandlersForTests(): void {
  registered = false
}
