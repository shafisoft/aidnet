import type {
  Campaign,
  CampaignPaymentInfo,
  PublicCampaign,
  CampaignTag,
  DonationMethod,
  DonationReport,
  OrgDonationReport,
  OrgOverview,
  Invite,
  MemberView,
  Membership,
  UserProfile,
  OrganizationView,
  OrganizationDetailView,
  SubscriptionPlan,
  CurrentSubscription,
  OrganizationSubscription,
  OrganizationSubscriptionView,
  SubscriptionHistoryView,
  SystemStats,
} from '@/types'
import type { PublicOrg } from '@/repositories/PublicOrgRepository'

const TS = '2026-01-01T00:00:00Z'

export const aCampaignTag = (over: Partial<CampaignTag> = {}): CampaignTag => ({
  id: 'tag-1',
  slug: 'education',
  label: 'Education',
  label_bn: null,
  ...over,
})

export const aDonationMethod = (
  over: Partial<DonationMethod> = {}
): DonationMethod => ({
  id: 'dm-1',
  organization_id: 'org-1',
  bkash_number: null,
  bkash_account_name: null,
  nagad_number: null,
  nagad_account_name: null,
  rocket_number: null,
  rocket_account_name: null,
  bank_name: null,
  bank_account_number: null,
  bank_account_name: null,
  bank_routing_number: null,
  bank_branch: null,
  donation_url: null,
  qr_image_url: null,
  instructions: null,
  is_preferred: null,
  created_at: TS,
  updated_at: TS,
  ...over,
})

export const aCampaign = (over: Partial<Campaign> = {}): Campaign => ({
  address: null,
  id: 'camp-1',
  org_id: 'org-1',
  title: 'Build a school',
  slug: 'build-a-school',
  description: 'Help us build',
  cover_image_url: null,
  goal_amount: 100000,
  raised_amount: 0,
  currency: 'BDT',
  start_date: null,
  end_date: null,
  is_zakat_eligible: false,
  status: 'draft',
  created_by: 'user-1',
  verified_by: null,
  verified_at: null,
  verification_notes: null,
  is_active: true,
  created_at: TS,
  updated_at: TS,
  tags: [],
  ...over,
})

export const aPublicCampaign = (
  over: Partial<PublicCampaign> = {}
): PublicCampaign => ({
  address: null,
  id: 'camp-1',
  org_id: 'org-1',
  org_name: 'Demo Org',
  org_slug: 'demo-org',
  org_logo_url: null,
  org_description: null,
  title: 'Build a school',
  slug: 'build-a-school',
  description: null,
  cover_image_url: null,
  goal_amount: 100000,
  raised_amount: 0,
  pending_amount: 0,
  currency: 'BDT',
  start_date: null,
  end_date: null,
  is_zakat_eligible: false,
  created_at: TS,
  updated_at: TS,
  donation_methods: null,
  tags: [],
  ...over,
})

/** Populated grouped payment info, matching the
 * get_public_campaign_by_slug payload shape. */
export const aPaymentInfo = (
  over: Partial<CampaignPaymentInfo> = {}
): CampaignPaymentInfo => ({
  mobile: [
    { provider: 'bkash', number: '01700000000', account_name: 'Demo Org' },
  ],
  bank: {
    bank_name: 'Dummy Bank',
    account_number: '1234567890',
    account_name: 'Demo Org',
    routing_number: '012345678',
    branch: 'Dhanmondi',
  },
  donation_url: null,
  qr_image_url: null,
  instructions: null,
  is_preferred: false,
  ...over,
})

export const anInvite = (over: Partial<Invite> = {}): Invite => ({
  id: 'inv-1',
  organization_id: 'org-1',
  email: 'new@example.com',
  token: 'tok-123',
  role: 'member',
  invited_by: 'user-1',
  expires_at: '2026-12-31T00:00:00Z',
  accepted_at: null,
  created_at: TS,
  ...over,
})

export const aDonationReport = (
  over: Partial<DonationReport> = {}
): DonationReport => ({
  id: 'report-1',
  amount: 750,
  currency: 'BDT',
  method: 'bkash',
  reference: 'TRX-123',
  donor_name: 'E2E Donor',
  message: null,
  status: 'pending',
  created_at: TS,
  ...over,
})

export const anOrgDonationReport = (
  over: Partial<OrgDonationReport> = {}
): OrgDonationReport => ({
  ...aDonationReport(),
  campaign_id: 'camp-1',
  campaign_title: 'Demo Campaign 1',
  ...over,
})

export const anOrgOverview = (
  over: Partial<OrgOverview> = {}
): OrgOverview => ({
  pending_donation_reports: 1,
  confirmed_donations: 4,
  raised_total: 12500,
  live_campaigns: 2,
  pending_review_campaigns: 1,
  draft_campaigns: 1,
  ...over,
})

export const aMemberView = (over: Partial<MemberView> = {}): MemberView => ({
  id: 'mem-1',
  organization_id: 'org-1',
  user_id: 'user-2',
  role: 'member',
  status: 'active',
  invited_by: null,
  joined_at: TS,
  created_at: TS,
  updated_at: TS,
  email: 'member@example.com',
  full_name: 'Member One',
  avatar_url: null,
  ...over,
})

export const aMembership = (over: Partial<Membership> = {}): Membership => ({
  role: 'owner',
  permissions: [],
  is_active: true,
  is_owner: true,
  ...over,
})

export const aUserProfile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  email: 'owner@donate.app',
  full_name: 'Owner One',
  avatar_url: null,
  metadata: {},
  is_system_admin: false,
  created_at: TS,
  updated_at: TS,
  ...over,
})

export const anOrganizationView = (
  over: Partial<OrganizationView> = {}
): OrganizationView => ({
  id: 'org-1',
  name: 'Demo Org',
  slug: 'demo-org',
  status: 'active',
  kind: 'organization',
  created_by: 'user-1',
  logo_url: null,
  description: null,
  website_url: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  social_links: {},
  settings: {},
  created_at: TS,
  updated_at: TS,
  user_id: 'user-1',
  user_role: 'owner',
  membership_status: 'active',
  joined_at: TS,
  ...over,
})

export const anOrgDetail = (
  over: Partial<OrganizationDetailView> = {}
): OrganizationDetailView => ({
  ...anOrganizationView(),
  member_count: 3,
  ...over,
})

export const aSubscriptionPlan = (
  over: Partial<SubscriptionPlan> = {}
): SubscriptionPlan => ({
  id: 'plan-pro',
  name: 'Pro',
  description: 'Pro plan',
  price_monthly: 1000,
  price_yearly: 10000,
  features: ['feature-a'],
  is_active: true,
  created_at: TS,
  updated_at: TS,
  ...over,
})

export const aCurrentSubscription = (
  over: Partial<CurrentSubscription> = {}
): CurrentSubscription => ({
  id: 'sub-1',
  plan_id: 'plan-pro',
  plan_name: 'Pro',
  description: null,
  price_monthly: 1000,
  price_yearly: 10000,
  features: ['feature-a'],
  status: 'active',
  billing_period: 'monthly',
  current_period_start: TS,
  current_period_end: '2026-02-01T00:00:00Z',
  ...over,
})

export const anOrgSubscription = (
  over: Partial<OrganizationSubscription> = {}
): OrganizationSubscription => ({
  id: 'sub-1',
  organization_id: 'org-1',
  plan_id: 'plan-pro',
  status: 'active',
  billing_period: 'monthly',
  current_period_start: TS,
  current_period_end: '2026-02-01T00:00:00Z',
  created_at: TS,
  updated_at: TS,
  ...over,
})

export const anOrgSubscriptionView = (
  over: Partial<OrganizationSubscriptionView> = {}
): OrganizationSubscriptionView => ({
  ...anOrgSubscription(),
  org_name: 'Demo Org',
  plan_name: 'Pro',
  price_monthly: 1000,
  price_yearly: 10000,
  ...over,
})

export const aSubscriptionHistoryView = (
  over: Partial<SubscriptionHistoryView> = {}
): SubscriptionHistoryView => ({
  id: 'hist-1',
  organization_id: 'org-1',
  plan_id: 'plan-pro',
  action: 'subscribed',
  amount: 1000,
  payment_status: 'paid',
  invoice_number: null,
  notes: null,
  created_at: TS,
  org_name: 'Demo Org',
  plan_name: 'Pro',
  ...over,
})

export const systemStats = (over: Partial<SystemStats> = {}): SystemStats => ({
  total_orgs: 2,
  total_users: 10,
  total_members: 5,
  recent_signups: 1,
  ...over,
})

export const aPublicOrg = (over: Partial<PublicOrg> = {}): PublicOrg => ({
  id: 'org-1',
  name: 'Demo Org',
  slug: 'demo-org',
  description: null,
  created_at: TS,
  logo_url: null,
  ...over,
})
