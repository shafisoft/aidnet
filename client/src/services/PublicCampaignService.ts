import type {
  PublicCampaign,
  PublicCampaignFilters,
  PublicCampaignSummary,
  ServiceData,
} from '@/types'
import { PublicCampaignRepository } from '@/repositories/PublicCampaignRepository'

export class PublicCampaignService {
  constructor(
    private publicCampaignRepo: PublicCampaignRepository = new PublicCampaignRepository()
  ) {}

  async getPublicCampaigns(
    filters: PublicCampaignFilters = {}
  ): ServiceData<PublicCampaignSummary[]> {
    return this.publicCampaignRepo.getPublicCampaigns(filters)
  }

  async getPublicCampaignBySlug(slug: string): ServiceData<PublicCampaign> {
    // RETURNS TABLE → PostgREST wraps the row; unwrap to a single campaign.
    const { data, error } =
      await this.publicCampaignRepo.getPublicCampaignBySlug(slug)
    if (error) return { data: null, error }
    return { data: data?.[0] ?? null, error: null }
  }
}

export const publicCampaignService = new PublicCampaignService()
