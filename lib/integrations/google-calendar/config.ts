/**
 * Google Calendar OAuth config — optional. App runs without these set.
 *
 * Future env vars (documented, not required):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */

export interface GoogleOAuthConfig {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  }
}

export function isGoogleOAuthConfigured(): boolean {
  const cfg = getGoogleOAuthConfig()
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.redirectUri)
}

export const GOOGLE_CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
