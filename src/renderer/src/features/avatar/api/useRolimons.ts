import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { RolimonsItemPageData } from '@renderer/ipc/windowApi'
import {
  rolimonsItemDetailsSchema,
  rolimonsPlayerSchema,
  rolimonsItemPageSchema
} from '@shared/ipc-schemas/rolimons'

// ============================================================================
// Types
// ============================================================================

// Rolimons item data structure (array format from API)
// Array indices: [Name, Acronym, RAP, Value, DefaultValue, Demand, Trend, Projected, Hyped, Rare]
export type RolimonsItemData = [
  string, // 0: Name
  string, // 1: Acronym
  number, // 2: RAP (Recent Average Price)
  number, // 3: Value (-1 means none set)
  number, // 4: Default Value
  number, // 5: Demand (-1 to 4)
  number, // 6: Trend (-1 to 4)
  number, // 7: Projected (-1 or 1)
  number, // 8: Hyped (-1 or 1)
  number // 9: Rare (-1 or 1)
]

// Parsed item info for easy access
export interface RolimonsItem {
  id: number
  name: string
  acronym: string
  rap: number
  value: number | null // null if -1
  defaultValue: number
  demand: number
  demandLabel: string
  trend: number
  trendLabel: string
  isProjected: boolean
  isHyped: boolean
  isRare: boolean
}

// Rolimons API response type
interface RolimonsApiResponse {
  success: boolean
  item_count: number
  items: Record<string, RolimonsItemData>
}

// Rolimons Player API response type
export interface RolimonsPlayerData {
  name?: string
  value?: number | null
  rap?: number | null
  rank?: number | null
  premium?: boolean
  privacy_enabled?: boolean
  terminated?: boolean
  stats_updated?: number | null
  last_online?: number | null
  last_location?: string
  rolibadges?: Record<string, number>
}

// ============================================================================
// Constants
// ============================================================================

// Demand labels
export const DEMAND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Terrible',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Amazing'
}

// Trend labels
export const TREND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Lowering',
  1: 'Unstable',
  2: 'Stable',
  3: 'Raising',
  4: 'Fluctuating'
}

// Demand colors for UI
export const DEMAND_COLORS: Record<number, string> = {
  [-1]: 'text-neutral-500',
  0: 'text-red-500',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-emerald-500',
  4: 'text-cyan-400'
}

// Trend colors for UI
export const TREND_COLORS: Record<number, string> = {
  [-1]: 'text-neutral-500',
  0: 'text-red-500',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-emerald-500',
  4: 'text-purple-500'
}

// Rolimons badge metadata
export const ROLIMONS_BADGES: Record<
  string,
  { label: string; description: string; color: string; bgColor: string; borderColor: string }
> = {
  // Community Badges
  contributor: {
    label: 'Contributor',
    description:
      "Contribute something substantial to Rolimon's such as content, artwork, or code used by the site or Discord server",
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  sword_fighting_champion: {
    label: 'Sword Fighting Champion',
    description: "Win a Rolimon's sword fighting tournament hosted in our Discord server",
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  roli_award_winner: {
    label: 'Roli Award Winner',
    description:
      'Win a Roli Award during our annual Roli Award ceremony hosted in our Discord server',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },
  roli_award_nominee: {
    label: 'Roli Award Nominee',
    description:
      'Get nominated for a Roli Award during our annual Roli Award ceremony hosted in our Discord server',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },
  event_winner: {
    label: 'Event Winner',
    description:
      'Win an event hosted in our Discord server, such as an outfit competition or art competition',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  game_night_winner: {
    label: 'Game Night Winner',
    description: 'Win a game night event hosted in our Discord server',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  booster: {
    label: 'Booster',
    description:
      "Use your Discord Nitro Boost on the Rolimon's Discord Server then request the badge in our Support Server",
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20'
  },
  roligang: {
    label: 'Roligang',
    description: "Join the official Rolimon's Group on Roblox",
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },

  // Website Badges
  verified: {
    label: 'Verified',
    description: 'Verify your account on Rolimons',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  create_10_trade_ads: {
    label: 'Trade Advertiser',
    description: 'Create 10 trade ads',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20'
  },
  create_100_trade_ads: {
    label: 'Frequent Trader',
    description: 'Create 100 trade ads',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20'
  },
  create_1000_trade_ads: {
    label: 'Active Trader',
    description: 'Create 1,000 trade ads',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20'
  },
  create_10000_trade_ads: {
    label: 'Boundless Trader',
    description: 'Create 10,000 trade ads',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20'
  },

  // Trading Badges - Value
  value_100k: {
    label: '100K+',
    description: 'Own an inventory of limiteds worth at least one hundred thousand total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_500k: {
    label: '500K+',
    description: 'Own an inventory of limiteds worth at least five hundred thousand total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_1m: {
    label: '1M+',
    description: 'Own an inventory of limiteds worth at least one million total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_5m: {
    label: '5M+',
    description: 'Own an inventory of limiteds worth at least five million total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_10m: {
    label: '10M+',
    description: 'Own an inventory of limiteds worth at least ten million total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_20m: {
    label: '20M+',
    description: 'Own an inventory of limiteds worth at least twenty million total value',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  value_100m: {
    label: '100M+ Value',
    description: 'Own an inventory of limiteds worth at least one hundred million total value',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  value_1b: {
    label: '1B+ Value',
    description: 'Own an inventory of limiteds worth at least one billion total value',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },

  // Trading Badges - Special Items
  own_lucky_cat_uaid: {
    label: 'Lucky Cat',
    description: 'Own the Lucky Cat item',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20'
  },
  own_1_serial_1: {
    label: 'Serial #1',
    description: 'Own a serial #1 limited',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  own_1_serial_1337: {
    label: 'L337',
    description: 'Own a serial #1337 limited',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  own_1_sequential_serial: {
    label: 'Sequential Serial',
    description: 'Own a limited with serial #123, #1234 or #12345',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  own_1_serial_1_to_9: {
    label: 'Low Serial',
    description: 'Own a limited with a serial less than #10',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  own_1_dominus: {
    label: 'Dominator',
    description: 'Own any limited dominus',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  own_1_big_dominus: {
    label: 'Big Dominator',
    description:
      'Own one of the bigger limited domini (Emp, Frig, Astra, Inf, Pittacium, Aur, Messor or Rex)',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  own_1_stf: {
    label: 'Sparkly',
    description: 'Own a limited sparkle time fedora',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20'
  },
  own_1_valued_federation_item: {
    label: 'Federated',
    description: 'Own a valued federation item',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  own_1_immortal_sword: {
    label: 'Enduring',
    description: 'Own a limited immortal sword',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20'
  },
  own_epic_katana_set: {
    label: 'Epic Blade Collector',
    description: 'Own the epic katana set (Blue, Crimson, Golden, Iris, Jade, Ocherous)',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  katana_poses_when: {
    label: 'Katana poses when',
    description: 'Own the epic katana set (Blue, Crimson, Golden, Iris, Jade, Ocherous)',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  own_1_kotn_item: {
    label: 'Evening Royalty',
    description: 'Own a limited king of the night item',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },

  // Trading Badges - Collection
  own_10_items: {
    label: 'Collector',
    description: 'Own at least 10 limiteds',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  own_100_items: {
    label: 'Devout Collector',
    description: 'Own at least 100 limiteds',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  own_1000_items: {
    label: 'Incurable Collector',
    description: 'Own at least 1000 limiteds',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  own_1_rare: {
    label: 'Rare Owner',
    description: 'Own a rare limited',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20'
  },
  own_3_rares: {
    label: 'Rare Enthusiast',
    description: 'Own 3 rare limiteds',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20'
  },
  own_10_rares: {
    label: 'Rare Supremist',
    description: 'Own 10 rare limiteds',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20'
  },
  own_5_noob: {
    label: 'Noob',
    description: "Own 5 noob items (Noob Attacks, Noob Assists, Pocket Pals, Bag O' Noobs)",
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  own_15_noob: {
    label: 'Noobie',
    description: "Own 15 noob items (Noob Attacks, Noob Assists, Pocket Pals, Bag O' Noobs)",
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  own_10_of_1_item: {
    label: 'Mini Hoarder',
    description: 'Own 10 of one item',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20'
  },
  own_50_of_1_item: {
    label: 'Hoarder',
    description: 'Own 50 of one item',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20'
  },
  own_100_of_1_item: {
    label: 'Mega Hoarder',
    description: 'Own 100 of one item',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20'
  },
  own_10_pct_of_1_item: {
    label: 'Modest Enthusiasm',
    description: "Own 10% of an item's available copies (item must have 2+ available copies)",
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20'
  },
  own_25_pct_of_1_item: {
    label: 'Unhealthy Obsession',
    description: "Own 25% of an item's available copies (item must have 2+ available copies)",
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20'
  },
  own_50_pct_of_1_item: {
    label: 'Uncontrollable Addiction',
    description: "Own 50% of an item's available copies (item must have 2+ available copies)",
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20'
  },
  own_all_asset_types: {
    label: 'Accessorized',
    description: 'Own a limited from each asset type (Hat, Face, Gear, Hair Accessory, etc.)',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

// Parse raw item data into a more usable format
function parseItemData(id: number, data: RolimonsItemData): RolimonsItem {
  return {
    id,
    name: data[0],
    acronym: data[1],
    rap: data[2],
    value: data[3] === -1 ? null : data[3],
    defaultValue: data[4],
    demand: data[5],
    demandLabel: DEMAND_LABELS[data[5]] || 'Unknown',
    trend: data[6],
    trendLabel: TREND_LABELS[data[6]] || 'Unknown',
    isProjected: data[7] === 1,
    isHyped: data[8] === 1,
    isRare: data[9] === 1
  }
}

// Fetch all limited item data from Rolimons API via IPC (to avoid CORS issues)
async function fetchRolimonsItemDetails(): Promise<RolimonsApiResponse> {
  const data = (await window.api.getRolimonsItemDetails()) as RolimonsApiResponse

  // Validate with Zod schema
  const parsed = rolimonsItemDetailsSchema.safeParse(data)
  if (!parsed.success) {
    console.warn('[fetchRolimonsItemDetails] Validation warning:', parsed.error.issues)
  }

  return data
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch and cache all Rolimons limited item data.
 * Data is cached for 5 minutes.
 */
export function useRolimonsData() {
  return useQuery({
    queryKey: queryKeys.rolimons.itemDetails(),
    queryFn: fetchRolimonsItemDetails,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000 // Wait 5 seconds before retry (respect rate limits)
  })
}

/**
 * Hook to get a specific limited item's Rolimons data.
 * Reads from the React Query cache populated by useRolimonsData().
 */
export function useRolimonsItem(assetId: number | null): RolimonsItem | null {
  const { data } = useRolimonsData()

  if (!assetId || !data?.items) return null

  const itemData = data.items[String(assetId)]
  if (!itemData) return null

  return parseItemData(assetId, itemData)
}

/**
 * Hook to check if an asset is a limited tracked by Rolimons.
 */
export function useIsRolimonsLimited(assetId: number | null): boolean {
  const { data } = useRolimonsData()

  if (!assetId || !data?.items) return false
  return String(assetId) in data.items
}

/**
 * Get Rolimons item data directly from the cache (non-reactive).
 * Use this in event handlers or callbacks where you need synchronous access.
 */
export function getRolimonsItem(
  assetId: number,
  queryClient: ReturnType<typeof useQueryClient>
): RolimonsItem | null {
  const data = queryClient.getQueryData<RolimonsApiResponse>(queryKeys.rolimons.itemDetails())
  if (!data?.items) return null

  const itemData = data.items[String(assetId)]
  if (!itemData) return null

  return parseItemData(assetId, itemData)
}

/**
 * Hook that provides getRolimonsItem bound to the current query client.
 * Useful for callbacks that need synchronous cache access.
 */
export function useGetRolimonsItem() {
  const queryClient = useQueryClient()
  return (assetId: number) => getRolimonsItem(assetId, queryClient)
}

/**
 * Hook to fetch Rolimons player data (value, rap, badges, etc.)
 * Data is cached for 5 minutes.
 */
export function useRolimonsPlayer(userId: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.rolimons.player(userId ?? 0),
    queryFn: async (): Promise<RolimonsPlayerData | null> => {
      if (!userId) return null
      try {
        const data = await window.api.getRolimonsPlayer(userId)

        // Validate with Zod schema
        const parsed = rolimonsPlayerSchema.safeParse(data)
        if (!parsed.success) {
          console.warn('[useRolimonsPlayer] Validation warning:', parsed.error.issues)
        }

        return data
      } catch (error) {
        console.error('Failed to fetch Rolimons player data:', error)
        return null
      }
    },
    enabled: enabled && userId !== null && userId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000
  })
}

/**
 * Hook to get loading state for Rolimons data
 */
export function useRolimonsLoading(): boolean {
  const { isLoading, isFetching } = useRolimonsData()
  return isLoading || isFetching
}

/**
 * Hook to get error state for Rolimons data
 */
export function useRolimonsError(): string | null {
  const { error } = useRolimonsData()
  return error ? (error as Error).message : null
}

/**
 * Hook to fetch detailed Rolimons item page data (value history, ownership, sales, etc.)
 * This fetches from the actual item page on rolimons.com
 */
export function useRolimonsItemPage(itemId: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.rolimons.itemPage(itemId ?? 0),
    queryFn: async (): Promise<RolimonsItemPageData | null> => {
      if (!itemId) return null
      try {
        const data = await window.api.getRolimonsItemPage(itemId)

        // Validate with Zod schema
        const parsed = rolimonsItemPageSchema.safeParse(data)
        if (!parsed.success) {
          console.warn('[useRolimonsItemPage] Validation warning:', parsed.error.issues)
        }

        return data
      } catch (error) {
        console.error('Failed to fetch Rolimons item page data:', error)
        return null
      }
    },
    enabled: enabled && itemId !== null && itemId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000
  })
}
