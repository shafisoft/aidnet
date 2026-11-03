export interface Organization {
  id: string
  slug: string
  status: 'active' | 'suspended'
  created_by: string
  created_at: string
  updated_at: string
}

// 'personal' orgs are lazy per-user tenancy containers for individual
// fundraisers (see ensure_my_personal_org); regular orgs are 'organization'.
export type OrgKind = 'organization' | 'personal'

export interface OrganizationView extends Organization {
  user_id: string
  user_role: string
  membership_status: string
  joined_at: string
  kind: OrgKind
  // Combined with org_meta data for display
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  social_links: Record<string, unknown>
  settings: Record<string, unknown>
}

export interface OrganizationDetailView extends Organization {
  member_count: number
  // 'personal' workspaces publish campaigns directly (no review queue);
  // present on get_organization since the personal-fundraisers migration.
  kind: OrgKind
  // Combined with org_meta data for display
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  social_links: Record<string, unknown>
  settings: Record<string, unknown>
}

// Note: Organization creation is now done via org_request, not direct creation
// CreateOrganizationDto is kept for backward compatibility but should use CreateOrgRequestDto
export interface CreateOrganizationDto {
  slug: string
  settings?: Record<string, unknown>
}

// Note: Organization updates are now handled via org_meta
// UpdateOrganizationDto is kept for backward compatibility
export interface UpdateOrganizationDto {
  status?: 'active' | 'suspended'
}

/** Workspace landing summary (get_org_overview) — what needs attention. */
export interface OrgOverview {
  pending_donation_reports: number
  confirmed_donations: number
  raised_total: number
  live_campaigns: number
  pending_review_campaigns: number
  draft_campaigns: number
}
