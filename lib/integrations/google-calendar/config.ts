/**
 * Google Calendar OAuth config — optional. App runs without these set.
 */

import {
  getGoogleIntegrationEnv,
  isGoogleOAuthConfigured,
  type GoogleIntegrationEnv,
} from '@/lib/env'

export type { GoogleIntegrationEnv as GoogleOAuthConfig }

export function getGoogleOAuthConfig(): GoogleIntegrationEnv {
  return getGoogleIntegrationEnv()
}

export { isGoogleOAuthConfigured }

export const GOOGLE_CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
