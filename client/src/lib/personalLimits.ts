// Caps for personal fundraisers — the client-side mirror of the fraud
// budget enforced in publish_campaign (supabase/migrations/
// 20261103090000_personal_fundraisers.sql). Shown as form validation
// before publish ever runs; the DB stays the real boundary. A settings
// table as a single source is deliberately out of scope for now.

export const PERSONAL_GOAL_CAP = 100_000
export const PERSONAL_MAX_DURATION_DAYS = 90
