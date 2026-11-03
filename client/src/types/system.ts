export interface SystemStats {
  total_orgs: number
  total_users: number
  total_members: number
  recent_signups: number
}

// Row of get_personal_campaigns — every personal fundraiser, for the
// admin's post-publish review surface (live first).
export interface PersonalCampaign {
  id: string
  title: string
  slug: string
  status: string
  goal_amount: number | null
  currency: string | null
  created_at: string
  org_id: string
  org_name: string
}

// Row of list_campaign_abuse_reports — the public's fraud flags.
export interface AbuseReport {
  id: string
  campaign_id: string
  campaign_title: string
  campaign_slug: string
  reason: 'fraud' | 'misleading' | 'completed' | 'other'
  details: string | null
  contact: string | null
  created_at: string
  resolved_at: string | null
}
