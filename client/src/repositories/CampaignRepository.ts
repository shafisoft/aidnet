import { BaseRepository } from './BaseRepository'
import type {
  Campaign,
  CampaignBeneficiary,
  CampaignPaymentMethods,
  CampaignTag,
  CampaignBeneficiaryDto,
  CreateCampaignDto,
  DonationMethodDto,
  ServiceData,
  UpdateCampaignDto,
} from '@/types'
import { Rpc } from '@/types/rpc'

/**
 * Org-facing campaign reads never return the `tags` column (the campaigns table
 * has none — tags live in a separate relation). This honest row type keeps the
 * service layer from lying that `tags` is present on list/single reads; the
 * single-read service composes tags from the dedicated tag RPC before returning
 * a full Campaign.
 */
export type CampaignRow = Omit<Campaign, 'tags'>

export class CampaignRepository extends BaseRepository {
  async createCampaign(dto: CreateCampaignDto): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.Create, {
      p_org_id: dto.orgId,
      p_title: dto.title,
      p_slug: dto.slug,
      p_description: dto.description ?? null,
      p_cover_image_url: dto.coverImageUrl ?? null,
      p_goal_amount: dto.goalAmount ?? null,
      p_currency: dto.currency ?? 'BDT',
      p_start_date: dto.startDate ?? null,
      p_end_date: dto.endDate ?? null,
      p_is_zakat_eligible: dto.isZakatEligible ?? false,
      p_address: dto.address ?? null,
    })
  }

  async setBeneficiary(
    campaignId: string,
    dto: CampaignBeneficiaryDto
  ): ServiceData<null> {
    return this.callRpc<null>(Rpc.Campaign.SetBeneficiary, {
      p_campaign_id: campaignId,
      p_full_name: dto.fullName,
      p_relationship: dto.relationship ?? null,
      p_phone: dto.phone ?? null,
      p_national_id: dto.nationalId ?? null,
      p_document_url: dto.documentUrl ?? null,
      p_notes: dto.notes ?? null,
    })
  }

  async getBeneficiary(campaignId: string): ServiceData<CampaignBeneficiary[]> {
    return this.callRpc<CampaignBeneficiary[]>(Rpc.Campaign.GetBeneficiary, {
      p_campaign_id: campaignId,
    })
  }

  async getPaymentMethods(
    campaignId: string
  ): ServiceData<CampaignPaymentMethods[]> {
    return this.callRpc<CampaignPaymentMethods[]>(
      Rpc.Campaign.GetPaymentMethods,
      { p_campaign_id: campaignId }
    )
  }

  // The form collects the seven channels donors actually use; the RPC
  // accepts the full column set, so untouched fields go out as null.
  async setPaymentMethods(
    campaignId: string,
    dto: DonationMethodDto
  ): ServiceData<null> {
    return this.callRpc<null>(Rpc.Campaign.SetPaymentMethods, {
      p_campaign_id: campaignId,
      p_bkash_number: dto.bkashNumber ?? null,
      p_bkash_account_name: dto.bkashAccountName ?? null,
      p_nagad_number: dto.nagadNumber ?? null,
      p_nagad_account_name: dto.nagadAccountName ?? null,
      p_rocket_number: dto.rocketNumber ?? null,
      p_rocket_account_name: dto.rocketAccountName ?? null,
      p_bank_name: dto.bankName ?? null,
      p_bank_account_number: dto.bankAccountNumber ?? null,
      p_bank_account_name: dto.bankAccountName ?? null,
      p_bank_routing_number: dto.bankRoutingNumber ?? null,
      p_bank_branch: dto.bankBranch ?? null,
      p_donation_url: dto.donationUrl ?? null,
      p_qr_image_url: dto.qrImageUrl ?? null,
      p_instructions: dto.instructions ?? null,
      p_is_preferred: dto.isPreferred ?? false,
    })
  }

  async getCampaigns(orgId: string): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.GetMany, {
      p_org_id: orgId,
    })
  }

  async getCampaign(campaignId: string): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.Get, {
      p_campaign_id: campaignId,
    })
  }

  async getCampaignBySlug(slug: string): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.GetBySlug, {
      p_slug: slug,
    })
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateCampaignDto
  ): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.Update, {
      p_campaign_id: campaignId,
      p_title: dto.title,
      p_slug: dto.slug,
      p_description: dto.description ?? null,
      p_cover_image_url: dto.coverImageUrl ?? null,
      p_goal_amount: dto.goalAmount ?? null,
      p_currency: dto.currency,
      p_start_date: dto.startDate ?? null,
      p_end_date: dto.endDate ?? null,
      p_is_zakat_eligible: dto.isZakatEligible,
      p_status: dto.status,
    })
  }

  async deleteCampaign(campaignId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Campaign.Delete, {
      p_campaign_id: campaignId,
    })
  }

  async submitForReview(campaignId: string): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.Submit, {
      p_campaign_id: campaignId,
    })
  }

  async publish(campaignId: string): ServiceData<CampaignRow[]> {
    return this.callRpc<CampaignRow[]>(Rpc.Campaign.Publish, {
      p_campaign_id: campaignId,
    })
  }

  async getCampaignTags(): ServiceData<CampaignTag[]> {
    return this.callRpc<CampaignTag[]>(Rpc.CampaignTag.GetMany)
  }

  async getCampaignTagIds(campaignId: string): ServiceData<string[]> {
    return this.callRpc<string[]>(Rpc.Campaign.GetTagIds, {
      p_campaign_id: campaignId,
    })
  }

  async setCampaignTags(
    campaignId: string,
    tagIds: string[]
  ): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.CampaignTag.Set, {
      p_campaign_id: campaignId,
      p_tag_ids: tagIds,
    })
  }
}
