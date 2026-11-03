// Campaign domain types (mirrors generated database.ts row shapes)

export type CampaignStatus =
  'draft' | 'pending_review' | 'live' | 'rejected' | 'closed'

/** A donor's claim that they sent money outside the platform. */
export type DonationReport = {
  id: string
  amount: number
  currency: string
  method: string
  reference: string | null
  donor_name: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
}

/** Public (confirmed-only) projection — no reference or review data. */
export type PublicDonationReport = {
  id: string
  amount: number
  currency: string
  method: string
  donor_name: string | null
  created_at: string
}

/** Org-scoped projection: a report plus which of the org's campaigns it is for. */
export type OrgDonationReport = DonationReport & {
  campaign_id: string
  campaign_title: string
}

export type Campaign = {
  id: string
  org_id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  goal_amount: number | null
  raised_amount: number
  currency: string | null
  start_date: string | null
  end_date: string | null
  is_zakat_eligible: boolean | null
  address: string | null
  status: CampaignStatus | null
  created_by: string | null
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  // Populated only by single-read paths (campaignService.getCampaign), which
  // compose tags from the dedicated tag RPC. List reads omit this field via
  // CampaignRow to stay honest about what the database returns.
  tags: string[]
}

export type DonationMethod = {
  id: string
  organization_id: string
  bkash_number: string | null
  bkash_account_name: string | null
  nagad_number: string | null
  nagad_account_name: string | null
  rocket_number: string | null
  rocket_account_name: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  bank_routing_number: string | null
  bank_branch: string | null
  donation_url: string | null
  qr_image_url: string | null
  instructions: string | null
  is_preferred: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type CampaignTag = {
  id: string
  slug: string
  label: string
  label_bn: string | null
}

export type PublicCampaign = {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  org_logo_url: string | null
  org_description: string | null
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  goal_amount: number | null
  raised_amount: number
  /** Donor-reported transfers awaiting the org's confirmation — shown on
   * progress bars but never part of raised_amount until confirmed. */
  pending_amount: number
  currency: string | null
  start_date: string | null
  end_date: string | null
  is_zakat_eligible: boolean | null
  address: string | null
  created_at: string | null
  updated_at: string | null
  donation_methods: DonationMethod[]
  tags: CampaignTag[]
}

/**
 * Person-beneficiary verification data for a campaign (1:1). PII: never
 * part of public reads — reachable only via get_campaign_beneficiary,
 * gated to the owning org and system admins.
 */
export type CampaignBeneficiary = {
  full_name: string
  relationship: string | null
  phone: string | null
  national_id: string | null
  document_url: string | null
  notes: string | null
}

export type CampaignBeneficiaryDto = {
  fullName: string
  relationship?: string | null
  phone?: string | null
  nationalId?: string | null
  documentUrl?: string | null
  notes?: string | null
}

/**
 * Per-campaign payment channels (1:1). Donors pay whatever account this
 * campaign declares — org campaigns and personal fundraisers alike.
 * Public reads embed it via get_public_campaign_by_slug; direct access goes
 * through get/set_campaign_payment_methods, gated to the owning org.
 */
export type CampaignPaymentMethods = {
  campaign_id: string
  bkash_number: string | null
  bkash_account_name: string | null
  nagad_number: string | null
  nagad_account_name: string | null
  rocket_number: string | null
  rocket_account_name: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  bank_routing_number: string | null
  bank_branch: string | null
  donation_url: string | null
  qr_image_url: string | null
  instructions: string | null
  is_preferred: boolean | null
}

// DTOs used by services

export type CreateCampaignDto = {
  orgId: string
  title: string
  slug: string
  description?: string | null
  coverImageUrl?: string | null
  goalAmount?: number | null
  currency?: string
  startDate?: string | null
  endDate?: string | null
  isZakatEligible?: boolean
  address?: string | null
}

export type UpdateCampaignDto = {
  title?: string
  slug?: string
  description?: string | null
  coverImageUrl?: string | null
  goalAmount?: number | null
  currency?: string
  startDate?: string | null
  endDate?: string | null
  isZakatEligible?: boolean
  status?: CampaignStatus
  address?: string | null
}

export type DonationMethodDto = {
  bkashNumber?: string | null
  bkashAccountName?: string | null
  nagadNumber?: string | null
  nagadAccountName?: string | null
  rocketNumber?: string | null
  rocketAccountName?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
  bankRoutingNumber?: string | null
  bankBranch?: string | null
  donationUrl?: string | null
  qrImageUrl?: string | null
  instructions?: string | null
  isPreferred?: boolean
}

export type PublicCampaignFilters = {
  zakat?: boolean | null
  org?: string | null
  limit?: number | null
}
