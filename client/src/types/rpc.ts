import type { Database } from './database'

/**
 * RPC Function Names
 * Manually maintained, validated against database.ts at compile time.
 *
 * Each value must exist in Database['donate']['Functions'] — the donate
 * schema is the product's only API surface (see AGENTS.md schema layout).
 * TypeScript errors if you add a name that doesn't exist in the generated types.
 */
type DbFunction = keyof Database['donate']['Functions']
export type { DbFunction }

/** The exact return type of a DB function — use it to type test fixtures. */
export type RpcReturn<F extends DbFunction> =
  Database['donate']['Functions'][F]['Returns']

export const Rpc = {
  DonationReport: {
    Propose: 'propose_donation' satisfies DbFunction,
    List: 'list_donation_reports' satisfies DbFunction,
    ListForOrg: 'list_org_donation_reports' satisfies DbFunction,
    PublicForCampaign: 'get_public_donation_reports' satisfies DbFunction,
    Confirm: 'confirm_donation_report' satisfies DbFunction,
    Reject: 'reject_donation_report' satisfies DbFunction,
  },
  Profile: {
    GetMyProfile: 'get_my_profile' satisfies DbFunction,
    GetUserProfile: 'get_user_profile' satisfies DbFunction,
    UpdateMyProfile: 'update_my_profile' satisfies DbFunction,
  },
  Org: {
    Create: 'create_organization' satisfies DbFunction,
    EnsurePersonalOrg: 'ensure_my_personal_org' satisfies DbFunction,
    GetMy: 'get_my_organizations' satisfies DbFunction,
    Get: 'get_organization' satisfies DbFunction,
    Overview: 'get_org_overview' satisfies DbFunction,
    Update: 'update_organization' satisfies DbFunction,
    Delete: 'delete_organization' satisfies DbFunction,
  },
  Member: {
    Add: 'add_organization_member' satisfies DbFunction,
    Remove: 'remove_organization_member' satisfies DbFunction,
    GetMany: 'get_organization_members' satisfies DbFunction,
    UpdateRole: 'update_member_role' satisfies DbFunction,
    GetMembership: 'get_membership' satisfies DbFunction,
  },
  OrgRequest: {
    Submit: 'submit_org_request' satisfies DbFunction,
    GetMy: 'get_my_org_requests' satisfies DbFunction,
    GetAll: 'get_all_org_requests' satisfies DbFunction,
  },
  OrgMeta: {
    Get: 'get_org_meta' satisfies DbFunction,
    Update: 'update_org_meta' satisfies DbFunction,
  },
  Invite: {
    Create: 'create_invite' satisfies DbFunction,
    GetMany: 'get_invites' satisfies DbFunction,
    Validate: 'validate_invite' satisfies DbFunction,
    Accept: 'accept_invite' satisfies DbFunction,
    Revoke: 'revoke_invite' satisfies DbFunction,
  },
  SystemAdmin: {
    GetStats: 'get_system_stats' satisfies DbFunction,
    GetAllOrgs: 'get_all_organizations' satisfies DbFunction,
    IsSystemAdmin: 'is_system_admin' satisfies DbFunction,
    ApproveOrgRequest: 'approve_org_request' satisfies DbFunction,
    RejectOrgRequest: 'reject_org_request' satisfies DbFunction,
    SetOrgStatus: 'set_org_status' satisfies DbFunction,
  },
  Subscription: {
    // Org-facing reads & actions (pricing page, billing tab)
    GetPlans: 'get_subscription_plans' satisfies DbFunction,
    GetHistory: 'get_subscription_history' satisfies DbFunction,
    Subscribe: 'subscribe_to_plan' satisfies DbFunction,
    ChangePlan: 'change_plan' satisfies DbFunction,
    Cancel: 'cancel_subscription' satisfies DbFunction,
    GetMy: 'get_my_subscription' satisfies DbFunction,
    HasFeature: 'has_feature' satisfies DbFunction,
  },
  SystemAdminSubscription: {
    // System-admin-only plan & org-subscription management
    CreatePlan: 'create_subscription_plan' satisfies DbFunction,
    UpdatePlan: 'update_subscription_plan' satisfies DbFunction,
    GetOrgSubscriptions: 'get_organization_subscriptions' satisfies DbFunction,
    Pause: 'pause_subscription' satisfies DbFunction,
    Unpause: 'unpause_subscription' satisfies DbFunction,
  },
  Public: {
    GetOrgBySlug: 'get_public_org_by_slug' satisfies DbFunction,
    GetMany: 'get_public_orgs' satisfies DbFunction,
    ReportCampaign: 'report_campaign' satisfies DbFunction,
  },
  Campaign: {
    Create: 'create_campaign' satisfies DbFunction,
    GetMany: 'get_campaigns' satisfies DbFunction,
    Get: 'get_campaign' satisfies DbFunction,
    GetBySlug: 'get_campaign_by_slug' satisfies DbFunction,
    Update: 'update_campaign' satisfies DbFunction,
    Delete: 'delete_campaign' satisfies DbFunction,
    Submit: 'submit_campaign_for_review' satisfies DbFunction,
    Publish: 'publish_campaign' satisfies DbFunction,
    GetTagIds: 'get_campaign_tag_ids' satisfies DbFunction,
    SetBeneficiary: 'set_campaign_beneficiary' satisfies DbFunction,
    GetBeneficiary: 'get_campaign_beneficiary' satisfies DbFunction,
    GetPaymentMethods: 'get_campaign_payment_methods' satisfies DbFunction,
    SetPaymentMethods: 'set_campaign_payment_methods' satisfies DbFunction,
  },
  SystemAdminCampaign: {
    Verify: 'verify_campaign' satisfies DbFunction,
    Reject: 'reject_campaign' satisfies DbFunction,
    GetPending: 'get_pending_campaigns' satisfies DbFunction,
    GetPersonal: 'get_personal_campaigns' satisfies DbFunction,
    ListAbuseReports: 'list_campaign_abuse_reports' satisfies DbFunction,
    ResolveAbuseReport: 'resolve_campaign_abuse_report' satisfies DbFunction,
  },
  DonationMethod: {
    GetMany: 'get_donation_methods' satisfies DbFunction,
    Upsert: 'upsert_donation_methods' satisfies DbFunction,
  },
  CampaignTag: {
    GetMany: 'get_campaign_tags' satisfies DbFunction,
    Set: 'set_campaign_tags' satisfies DbFunction,
  },
  PublicCampaign: {
    GetMany: 'get_public_campaigns' satisfies DbFunction,
    GetBySlug: 'get_public_campaign_by_slug' satisfies DbFunction,
  },
} as const

export type RpcFunction =
  | (typeof Rpc.Profile)[keyof typeof Rpc.Profile]
  | (typeof Rpc.Org)[keyof typeof Rpc.Org]
  | (typeof Rpc.Member)[keyof typeof Rpc.Member]
  | (typeof Rpc.OrgRequest)[keyof typeof Rpc.OrgRequest]
  | (typeof Rpc.OrgMeta)[keyof typeof Rpc.OrgMeta]
  | (typeof Rpc.Invite)[keyof typeof Rpc.Invite]
  | (typeof Rpc.SystemAdmin)[keyof typeof Rpc.SystemAdmin]
  | (typeof Rpc.Subscription)[keyof typeof Rpc.Subscription]
  | (typeof Rpc.SystemAdminSubscription)[keyof typeof Rpc.SystemAdminSubscription]
  | (typeof Rpc.Public)[keyof typeof Rpc.Public]
  | (typeof Rpc.Campaign)[keyof typeof Rpc.Campaign]
  | (typeof Rpc.SystemAdminCampaign)[keyof typeof Rpc.SystemAdminCampaign]
  | (typeof Rpc.DonationMethod)[keyof typeof Rpc.DonationMethod]
  | (typeof Rpc.DonationReport)[keyof typeof Rpc.DonationReport]
  | (typeof Rpc.CampaignTag)[keyof typeof Rpc.CampaignTag]
  | (typeof Rpc.PublicCampaign)[keyof typeof Rpc.PublicCampaign]
