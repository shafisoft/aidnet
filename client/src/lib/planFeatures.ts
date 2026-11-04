/**
 * The closed vocabulary of subscription-plan feature keys the admin plan
 * picker offers. Database enforcement (has_feature / can_perform) gates on
 * exactly these keys. can_perform defers to plan features only when some
 * active plan carries the key, so unknown legacy keys already stored on
 * plans stay enforceable — the picker just never offers new free-text keys.
 * The DB column stays jsonb and keeps accepting any string array; this is a
 * UI-level restriction only.
 */
export const PLAN_FEATURES = [
  'members',
  'invites',
  'campaigns',
  'settings',
  'donations',
  'analytics',
] as const

export type PlanFeatureKey = (typeof PLAN_FEATURES)[number]
