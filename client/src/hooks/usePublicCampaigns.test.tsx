import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { usePublicCampaigns } from './usePublicCampaigns'
import { aPublicCampaignSummary } from '@/testing/fixtures'

const mockGetMany = vi.hoisted(() => vi.fn())

vi.mock('@/services/PublicCampaignService', () => ({
  publicCampaignService: {
    getPublicCampaigns: mockGetMany,
  },
}))

function setup(filters?: Parameters<typeof usePublicCampaigns>[0]) {
  return renderHook(() => usePublicCampaigns(filters))
}

describe('usePublicCampaigns', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetMany.mockResolvedValue({ data: [], error: null })
  })

  it('When the zakat filter is off, requests all campaigns without a zakat filter', async () => {
    setup({ zakat: false })

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: null,
      org: null,
      limit: null,
    })
  })

  it('When the zakat filter is on, requests zakat-eligible campaigns only', async () => {
    setup({ zakat: true })

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: true,
      org: null,
      limit: null,
    })
  })

  it('When no filters are given, requests all campaigns', async () => {
    setup()

    await waitFor(() => expect(mockGetMany).toHaveBeenCalled())
    expect(mockGetMany).toHaveBeenCalledWith({
      zakat: null,
      org: null,
      limit: null,
    })
  })

  it('When campaigns load, exposes the rows', async () => {
    const rows = [aPublicCampaignSummary()]
    mockGetMany.mockResolvedValue({ data: rows, error: null })

    const { result } = setup({})

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.campaigns).toEqual(rows)
    expect(result.current.error).toBeNull()
  })

  it('When a full page returns, hasMore is true and loadMore appends the next page', async () => {
    const page1 = [1, 2, 3].map(i => aPublicCampaignSummary({ id: `c${i}` }))
    const page2 = [4, 5].map(i => aPublicCampaignSummary({ id: `c${i}` }))
    mockGetMany
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null })

    const { result } = setup({ limit: 3 })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(true)

    result.current.loadMore()
    await waitFor(() => expect(result.current.loadingMore).toBe(false))

    expect(mockGetMany).toHaveBeenLastCalledWith({
      zakat: null,
      org: null,
      limit: 3,
      offset: 3,
    })
    expect(result.current.campaigns.map(c => c.id)).toEqual([
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
    ])
    // Partial page → no more to fetch.
    expect(result.current.hasMore).toBe(false)
  })

  it('When a partial page returns, hasMore is false and loadMore is a no-op', async () => {
    mockGetMany.mockResolvedValue({
      data: [aPublicCampaignSummary()],
      error: null,
    })

    const { result } = setup({})
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(false)

    result.current.loadMore()
    await waitFor(() => expect(result.current.loadingMore).toBe(false))
    expect(mockGetMany).toHaveBeenCalledTimes(1)
  })

  it('When the RPC fails, surfaces the error and empties the list', async () => {
    mockGetMany.mockResolvedValue({ data: null, error: 'rpc down' })

    const { result } = setup({})

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('rpc down')
    expect(result.current.campaigns).toEqual([])
  })
})
