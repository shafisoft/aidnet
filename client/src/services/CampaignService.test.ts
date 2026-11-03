import { describe, expect, it, vi } from 'vitest'
import { CampaignService } from './CampaignService'
import { CampaignRepository } from '@/repositories/CampaignRepository'
import { aCampaign, aCampaignTag } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })
const dto = { orgId: 'org-1', title: 'T', slug: 't' }

describe('CampaignService', () => {
  it('createCampaign delegates the DTO and unwraps the SETOF row', async () => {
    const campaign = aCampaign()
    const createCampaign = vi.fn().mockResolvedValue(ok([campaign]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ createCampaign })
    )

    const res = await svc.createCampaign(dto)

    expect(createCampaign).toHaveBeenCalledWith(dto)
    expect(res).toEqual(ok(campaign))
  })

  it('createCampaign returns null when the function yields no rows', async () => {
    const createCampaign = vi.fn().mockResolvedValue(ok([]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ createCampaign })
    )

    expect(await svc.createCampaign(dto)).toEqual({ data: null, error: null })
  })

  it('getCampaign unwraps single row and composes tags', async () => {
    const campaign = aCampaign({ slug: 'build-a-school' })
    const getCampaign = vi.fn().mockResolvedValue(ok([campaign]))
    const getCampaignTagIds = vi.fn().mockResolvedValue(ok(['tag-x']))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getCampaign, getCampaignTagIds })
    )

    const res = await svc.getCampaign('camp-1')

    expect(getCampaign).toHaveBeenCalledWith('camp-1')
    expect(getCampaignTagIds).toHaveBeenCalledWith('camp-1')
    expect(res.data?.slug).toBe('build-a-school')
    expect(res.data?.tags).toEqual(['tag-x'])
  })

  it('getCampaignBySlug unwraps and returns null for empty rows', async () => {
    const getCampaignBySlug = vi
      .fn()
      .mockResolvedValueOnce(ok([aCampaign()]))
      .mockResolvedValueOnce(ok([]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getCampaignBySlug })
    )

    const found = await svc.getCampaignBySlug('build-a-school')
    const missing = await svc.getCampaignBySlug('nope')

    expect(found.data?.slug).toBe('build-a-school')
    expect(missing).toEqual({ data: null, error: null })
  })

  it('unwrap methods propagate errors untouched', async () => {
    const error = { data: null as unknown as unknown[], error: 'denied' }
    const getCampaign = vi.fn().mockResolvedValue(error)
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getCampaign })
    )

    const res = await svc.getCampaign('camp-1')

    expect(res).toEqual({ data: null, error: 'denied' })
  })

  it('update, delete and submit delegate ids', async () => {
    const updateCampaign = vi
      .fn()
      .mockResolvedValue(ok([aCampaign({ status: 'live' })]))
    const deleteCampaign = vi.fn().mockResolvedValue(ok(true))
    const submitForReview = vi
      .fn()
      .mockResolvedValue(ok([aCampaign({ status: 'pending_review' })]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({
        updateCampaign,
        deleteCampaign,
        submitForReview,
      })
    )

    await svc.updateCampaign('camp-1', { title: 'New' })
    const del = await svc.deleteCampaign('camp-1')
    const sub = await svc.submitForReview('camp-1')

    expect(updateCampaign).toHaveBeenCalledWith('camp-1', { title: 'New' })
    expect(del).toEqual(ok(true))
    expect(sub.data?.status).toBe('pending_review')
  })

  it('publish delegates and unwraps the SETOF row', async () => {
    const publish = vi
      .fn()
      .mockResolvedValue(ok([aCampaign({ status: 'live' })]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ publish })
    )

    const pub = await svc.publish('camp-1')

    expect(publish).toHaveBeenCalledWith('camp-1')
    expect(pub.data?.status).toBe('live')
  })

  it('tags delegate through', async () => {
    const tags = [aCampaignTag()]
    const getCampaignTags = vi.fn().mockResolvedValue(ok(tags))
    const setCampaignTags = vi.fn().mockResolvedValue(ok(true))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getCampaignTags, setCampaignTags })
    )

    const got = await svc.getCampaignTags()
    const set = await svc.setCampaignTags('camp-1', ['tag-1'])

    expect(got).toEqual(ok(tags))
    expect(setCampaignTags).toHaveBeenCalledWith('camp-1', ['tag-1'])
    expect(set).toEqual(ok(true))
  })

  it('getCampaignTagIds delegates the id untouched', async () => {
    const getCampaignTagIds = vi.fn().mockResolvedValue(ok(['tag-2']))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getCampaignTagIds })
    )

    const res = await svc.getCampaignTagIds('camp-9')

    expect(getCampaignTagIds).toHaveBeenCalledWith('camp-9')
    expect(res).toEqual(ok(['tag-2']))
  })

  it('getPaymentMethods unwraps the single row, or null when none saved', async () => {
    const methods = {
      campaign_id: 'camp-1',
      bkash_number: '01712345678',
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
      is_preferred: false,
    }
    const getPaymentMethods = vi
      .fn()
      .mockResolvedValueOnce(ok([methods]))
      .mockResolvedValueOnce(ok([]))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ getPaymentMethods })
    )

    const found = await svc.getPaymentMethods('camp-1')
    const missing = await svc.getPaymentMethods('camp-1')

    expect(getPaymentMethods).toHaveBeenCalledWith('camp-1')
    expect(found).toEqual(ok(methods))
    expect(missing).toEqual({ data: null, error: null })
  })

  it('setPaymentMethods delegates the campaign id and DTO', async () => {
    const setPaymentMethods = vi.fn().mockResolvedValue(ok(null))
    const svc = new CampaignService(
      mockRepository<CampaignRepository>({ setPaymentMethods })
    )

    const res = await svc.setPaymentMethods('camp-1', {
      bkashNumber: '01712345678',
    })

    expect(setPaymentMethods).toHaveBeenCalledWith('camp-1', {
      bkashNumber: '01712345678',
    })
    expect(res).toEqual(ok(null))
  })
})
