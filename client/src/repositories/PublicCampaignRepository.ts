import { BaseRepository } from './BaseRepository'
import type {
  PublicCampaign,
  PublicCampaignFilters,
  PublicCampaignSummary,
  ServiceData,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class PublicCampaignRepository extends BaseRepository {
  async getPublicCampaigns(
    filters: PublicCampaignFilters = {}
  ): ServiceData<PublicCampaignSummary[]> {
    // p_offset is sent only when pagination is requested: PostgREST resolves
    // the function overload by argument names, so always sending it would
    // break against a not-yet-migrated project hosting the 3-arg function.
    return this.callRpc<PublicCampaignSummary[]>(Rpc.PublicCampaign.GetMany, {
      zakat_filter: filters.zakat ?? null,
      org_filter: filters.org ?? null,
      result_limit: filters.limit ?? null,
      ...(filters.offset ? { p_offset: filters.offset } : {}),
    })
  }

  async getPublicCampaignBySlug(slug: string): ServiceData<PublicCampaign[]> {
    return this.callRpc<PublicCampaign[]>(Rpc.PublicCampaign.GetBySlug, {
      p_slug: slug,
    })
  }
}
