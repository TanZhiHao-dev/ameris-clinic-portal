import { queryOptions } from '@tanstack/react-query'
import { getTreatment, listPromos, listTreatments } from './treatments'
import { redeemTiers } from './loyalty'

// Shared query options so route loaders (SSR prefetch) and the components that
// render them read the EXACT same cache entry. The loader warms the cache during
// SSR, so the treatment menu / promos / tiers ship inside the initial HTML
// instead of arriving via a client round-trip after hydration (the old lag).
export const treatmentsQuery = queryOptions({
  queryKey: ['treatments'],
  queryFn: () => listTreatments(),
})

export const promosQuery = queryOptions({
  queryKey: ['promos'],
  queryFn: () => listPromos(),
})

export const redeemTiersQuery = queryOptions({
  queryKey: ['redeem-tiers'],
  queryFn: () => redeemTiers(),
})

export const treatmentQuery = (id: string) =>
  queryOptions({
    queryKey: ['treatment', id],
    queryFn: () => getTreatment({ data: { id } }),
  })
