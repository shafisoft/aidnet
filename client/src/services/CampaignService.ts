import type {
  CampaignBeneficiary,
  CampaignBeneficiaryDto,
  CampaignPaymentMethods,
  Campaign,
  CampaignTag,
  CreateCampaignDto,
  DonationMethodDto,
  ServiceData,
  UpdateCampaignDto,
} from '@/types'
import {
  CampaignRepository,
  type CampaignRow,
} from '@/repositories/CampaignRepository'

export class CampaignService {
  constructor(
    private campaignRepo: CampaignRepository = new CampaignRepository()
  ) {}

  async createCampaign(dto: CreateCampaignDto): ServiceData<CampaignRow> {
    // create_campaign RETURNS SETOF campaigns → PostgREST wraps the row in
    // an array; unwrap so callers see the created campaign (or null). Rows do
    // not carry tags (that lives in a separate relation).
    const { data, error } = await this.campaignRepo.createCampaign(dto)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async setBeneficiary(
    campaignId: string,
    dto: CampaignBeneficiaryDto
  ): ServiceData<null> {
    return this.campaignRepo.setBeneficiary(campaignId, dto)
  }

  async getBeneficiary(campaignId: string): ServiceData<CampaignBeneficiary[]> {
    return this.campaignRepo.getBeneficiary(campaignId)
  }

  async getPaymentMethods(
    campaignId: string
  ): ServiceData<CampaignPaymentMethods | null> {
    // RETURNS TABLE → PostgREST wraps rows; a campaign without saved
    // payment details yields an empty array.
    const { data, error } =
      await this.campaignRepo.getPaymentMethods(campaignId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async setPaymentMethods(
    campaignId: string,
    dto: DonationMethodDto
  ): ServiceData<null> {
    return this.campaignRepo.setPaymentMethods(campaignId, dto)
  }

  async getCampaigns(orgId: string): ServiceData<CampaignRow[]> {
    return this.campaignRepo.getCampaigns(orgId)
  }

  async getCampaign(campaignId: string): ServiceData<Campaign> {
    // Single read composes tags from the dedicated tag RPC so the returned
    // object is a complete Campaign (list reads intentionally omit tags).
    const { data, error } = await this.campaignRepo.getCampaign(campaignId)
    if (error || !data || data.length === 0) {
      return { data: null, error }
    }
    const { data: tagIds, error: tagError } =
      await this.campaignRepo.getCampaignTagIds(campaignId)
    if (tagError) return { data: null, error: tagError }
    return { data: { ...data[0], tags: tagIds ?? [] }, error: null }
  }

  async getCampaignBySlug(slug: string): ServiceData<CampaignRow> {
    const { data, error } = await this.campaignRepo.getCampaignBySlug(slug)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateCampaignDto
  ): ServiceData<CampaignRow> {
    // update_campaign RETURNS SETOF campaigns → PostgREST wraps the row; unwrap.
    const { data, error } = await this.campaignRepo.updateCampaign(
      campaignId,
      dto
    )
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async deleteCampaign(campaignId: string): ServiceData<boolean> {
    return this.campaignRepo.deleteCampaign(campaignId)
  }

  async submitForReview(campaignId: string): ServiceData<CampaignRow> {
    // submit_for_review RETURNS SETOF campaigns → PostgREST wraps the row; unwrap.
    const { data, error } = await this.campaignRepo.submitForReview(campaignId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async publish(campaignId: string): ServiceData<CampaignRow> {
    // publish_campaign RETURNS SETOF campaigns → PostgREST wraps the row;
    // unwrap. Same shape as submitForReview, but only personal orgs may
    // call it (enforced in the function, not here).
    const { data, error } = await this.campaignRepo.publish(campaignId)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }

  async getCampaignTags(): ServiceData<CampaignTag[]> {
    return this.campaignRepo.getCampaignTags()
  }

  async getCampaignTagIds(campaignId: string): ServiceData<string[]> {
    return this.campaignRepo.getCampaignTagIds(campaignId)
  }

  async setCampaignTags(
    campaignId: string,
    tagIds: string[]
  ): ServiceData<boolean> {
    return this.campaignRepo.setCampaignTags(campaignId, tagIds)
  }
}

export const campaignService = new CampaignService()
