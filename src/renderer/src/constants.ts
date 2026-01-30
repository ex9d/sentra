import {
  AccountStatus,
  Friend,
  Game,
  CatalogItem,
  RobloxInstallation,
  BinaryType,
  Badge
} from './types'

export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'f1',
    accountId: '1',
    displayName: 'KaiCenat_Fan',
    username: 'kai_fan_01',
    userId: '998877',
    avatarUrl: 'https://picsum.photos/seed/kai/128/128',
    status: AccountStatus.InGame,
    description: 'Stream sniper mostly.',
    gameActivity: {
      name: 'Brookhaven RP',
      placeId: '123456'
    }
  },
  {
    id: 'f2',
    accountId: '1',
    displayName: 'Builderman_Alt',
    username: 'builder_alt_xx',
    userId: '554433',
    avatarUrl: 'https://picsum.photos/seed/build/128/128',
    status: AccountStatus.Online,
    description: 'Developing a new tycoon game, stay tuned!'
  },
  {
    id: 'f3',
    accountId: '1',
    displayName: 'Roblox_Official',
    username: 'roblox',
    userId: '1',
    avatarUrl: 'https://picsum.photos/seed/roblox/128/128',
    status: AccountStatus.Offline,
    description: 'Admin account.'
  },
  {
    id: 'f4',
    accountId: '3',
    displayName: 'ProGamer_XYZ',
    username: 'xyz_gamer',
    userId: '110011',
    avatarUrl: 'https://picsum.photos/seed/xyz/128/128',
    status: AccountStatus.InGame,
    description: 'Ranked match grinding for season 4.',
    gameActivity: {
      name: 'Arsenal',
      placeId: '999888'
    }
  },
  {
    id: 'f5',
    accountId: '3',
    displayName: 'ChillVibes',
    username: 'chill_guy_22',
    userId: '445566',
    avatarUrl: 'https://picsum.photos/seed/chill/128/128',
    status: AccountStatus.Offline,
    description: 'Just chilling.'
  },
  {
    id: 'f6',
    accountId: '2',
    displayName: 'TradeHub_Owner',
    username: 'rich_trader_99',
    userId: '777888',
    avatarUrl: 'https://picsum.photos/seed/rich/128/128',
    status: AccountStatus.Offline,
    description: 'Do not send invalid offers.'
  },
  {
    id: 'f7',
    accountId: '1',
    displayName: 'Ninja_Turtle',
    username: 'leo_fan_88',
    userId: '882211',
    avatarUrl: 'https://picsum.photos/seed/turtle/128/128',
    status: AccountStatus.InGame,
    description: 'Pizza time!',
    gameActivity: {
      name: 'Blox Fruits',
      placeId: '555444'
    }
  },
  {
    id: 'f8',
    accountId: '1',
    displayName: 'AdoptMe_Lover',
    username: 'pets_4_life',
    userId: '334455',
    avatarUrl: 'https://picsum.photos/seed/pets/128/128',
    status: AccountStatus.Online,
    description: 'Trading neon pets only.'
  }
]

export const MOCK_GAMES: Game[] = [
  {
    id: '2753915549',
    name: 'Blox Fruits',
    creatorName: 'Gamer Robot Inc',
    creatorId: '123',
    playing: 542000,
    visits: 24500000000,
    maxPlayers: 12,
    genre: 'RPG',
    description:
      'Welcome to Blox Fruits! Become a master swordsman or a powerful blox fruit user as you train to become the strongest player to ever live. You can choose to fight against tough enemies or have powerful boss battles while sailing across the ocean to find hidden secrets.',
    likes: 4500000,
    dislikes: 250000,
    thumbnailUrl: 'https://picsum.photos/seed/bloxfruits/512/512',
    universeId: '111111',
    placeId: '111111',
    created: '2019-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '189707',
    name: 'Natural Disaster Survival',
    creatorName: 'Stickmasterluke',
    creatorId: '456',
    playing: 25000,
    visits: 2500000000,
    maxPlayers: 30,
    genre: 'Survival',
    description:
      'Quickly run around in circles of terror! Survive different natural disasters on various maps.',
    likes: 1200000,
    dislikes: 150000,
    thumbnailUrl: 'https://picsum.photos/seed/natural/512/512',
    universeId: '222222',
    placeId: '222222',
    created: '2010-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '920587237',
    name: 'Adopt Me!',
    creatorName: 'DreamCraft',
    creatorId: '789',
    playing: 350000,
    visits: 34000000000,
    maxPlayers: 48,
    genre: 'RPG',
    description:
      'Raise and dress cute pets, decorate your house, and play with friends in the magical, family-friendly world of Adopt Me!',
    likes: 6000000,
    dislikes: 900000,
    thumbnailUrl: 'https://picsum.photos/seed/adopt/512/512',
    universeId: '333333',
    placeId: '333333',
    created: '2017-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '537413528',
    name: 'Build A Boat For Treasure',
    creatorName: 'Chillz Studios',
    creatorId: '101',
    playing: 45000,
    visits: 3200000000,
    maxPlayers: 7,
    genre: 'Adventure',
    description: 'Build your ship and set sail for your adventure! Will you find the treasure?',
    likes: 2800000,
    dislikes: 120000,
    thumbnailUrl: 'https://picsum.photos/seed/boat/512/512',
    universeId: '444444',
    placeId: '444444',
    created: '2016-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '395631884',
    name: 'Murder Mystery 2',
    creatorName: 'Nikilis',
    creatorId: '202',
    playing: 110000,
    visits: 9800000000,
    maxPlayers: 12,
    genre: 'Horror',
    description:
      "Can you solve the mystery and survive each round? INNOCENTS: Run and hide from the Murderer. Use your detective skills to expose the Murderer. SHERIFF: Work with Innocents; you are the only one with a weapon who can take down the Murderer. MURDERER: Eliminate everyone. Don't get shot by the sheriff.",
    likes: 5500000,
    dislikes: 650000,
    thumbnailUrl: 'https://picsum.photos/seed/murder/512/512',
    universeId: '555555',
    placeId: '555555',
    created: '2014-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '13772394625',
    name: 'Blade Ball',
    creatorName: 'Wiggity.',
    creatorId: '303',
    playing: 180000,
    visits: 1500000000,
    maxPlayers: 16,
    genre: 'Fighting',
    description:
      "Focus, timing, and strategy are key. A deflectable homing ball hunts players with increasing speed. But there's more than what meets the eye.",
    likes: 950000,
    dislikes: 45000,
    thumbnailUrl: 'https://picsum.photos/seed/blade/512/512',
    universeId: '666666',
    placeId: '666666',
    created: '2023-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: false
  },
  {
    id: '2753915550',
    name: 'Pet Simulator 99',
    creatorName: 'BIG Games',
    creatorId: '404',
    playing: 210000,
    visits: 500000000,
    maxPlayers: 10,
    genre: 'Simulation',
    description:
      'Collect coins to buy eggs! Hatch legendary pets! Enchant and upgrade your pets! Unlock new worlds!',
    likes: 800000,
    dislikes: 30000,
    thumbnailUrl: 'https://picsum.photos/seed/pet/512/512',
    universeId: '777777',
    placeId: '777777',
    created: '2023-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: true
  },
  {
    id: '155615604',
    name: 'Prison Life',
    creatorName: 'Aesthetical',
    creatorId: '505',
    playing: 12000,
    visits: 2000000000,
    maxPlayers: 24,
    genre: 'Town and City',
    description: 'Live the life of a prisoner and escape or become a guard and protect the prison.',
    likes: 500000,
    dislikes: 10000,
    thumbnailUrl: 'https://picsum.photos/seed/prison/512/512',
    universeId: '888888',
    placeId: '888888',
    created: '2014-01-01',
    updated: '2024-01-01',
    creatorHasVerifiedBadge: false
  }
]

export const MOCK_CATALOG_ITEMS: CatalogItem[] = [
  { id: '1', name: 'Red Hat', type: 'Hat', imageUrl: 'https://picsum.photos/seed/redhat/200/200' },
  {
    id: '2',
    name: 'Blue Hair',
    type: 'Hair',
    imageUrl: 'https://picsum.photos/seed/bluehair/200/200'
  },
  {
    id: '3',
    name: 'Cool Shades',
    type: 'Face',
    imageUrl: 'https://picsum.photos/seed/shades/200/200'
  },
  {
    id: '4',
    name: 'Golden Necklace',
    type: 'Neck',
    imageUrl: 'https://picsum.photos/seed/necklace/200/200'
  },
  {
    id: '5',
    name: 'Robot Shoulder',
    type: 'Shoulder',
    imageUrl: 'https://picsum.photos/seed/shoulder/200/200'
  },
  {
    id: '6',
    name: 'Superman Cape',
    type: 'Back',
    imageUrl: 'https://picsum.photos/seed/cape/200/200'
  },
  {
    id: '7',
    name: 'Sword Pack',
    type: 'Back',
    imageUrl: 'https://picsum.photos/seed/sword/200/200'
  },
  {
    id: '8',
    name: 'Ninja Mask',
    type: 'Face',
    imageUrl: 'https://picsum.photos/seed/mask/200/200'
  },
  { id: '9', name: 'Fedora', type: 'Hat', imageUrl: 'https://picsum.photos/seed/fedora/200/200' },
  { id: '10', name: 'Top Hat', type: 'Hat', imageUrl: 'https://picsum.photos/seed/tophat/200/200' }
]

export const MOCK_ROBLOX_BADGES: Badge[] = [
  {
    id: '1',
    name: 'Administrator',
    description: 'Roblox Admin',
    imageUrl: 'https://picsum.photos/seed/admin/64/64'
  },
  {
    id: '2',
    name: 'Veteran',
    description: 'Old account',
    imageUrl: 'https://picsum.photos/seed/veteran/64/64'
  },
  {
    id: '3',
    name: 'Friendship',
    description: 'Made a friend',
    imageUrl: 'https://picsum.photos/seed/friend/64/64'
  },
  {
    id: '4',
    name: 'Homestead',
    description: 'Visited your place',
    imageUrl: 'https://picsum.photos/seed/home/64/64'
  },
  {
    id: '5',
    name: 'Bricksmith',
    description: 'One thousand visits',
    imageUrl: 'https://picsum.photos/seed/brick/64/64'
  },
  {
    id: '6',
    name: 'Inviter',
    description: 'Invited friends',
    imageUrl: 'https://picsum.photos/seed/invite/64/64'
  }
]

export const MOCK_GAME_BADGES: Badge[] = [
  {
    id: '1',
    name: 'Welcome',
    description: 'Played the game',
    imageUrl: 'https://picsum.photos/seed/welcome/64/64'
  },
  {
    id: '2',
    name: 'Winner',
    description: 'Won a match',
    imageUrl: 'https://picsum.photos/seed/winner/64/64'
  },
  {
    id: '3',
    name: 'Secret',
    description: 'Found a secret',
    imageUrl: 'https://picsum.photos/seed/secret/64/64'
  },
  {
    id: '4',
    name: 'Collector',
    description: 'Collected all items',
    imageUrl: 'https://picsum.photos/seed/collect/64/64'
  },
  {
    id: '5',
    name: 'Survivor',
    description: 'Survived 100 days',
    imageUrl: 'https://picsum.photos/seed/survive/64/64'
  },
  {
    id: '6',
    name: 'Speedrun',
    description: 'Finished fast',
    imageUrl: 'https://picsum.photos/seed/speed/64/64'
  }
]

export const MOCK_INSTALLATIONS: RobloxInstallation[] = [
  {
    id: 'inst-1',
    name: 'Player Stable',
    binaryType: BinaryType.WindowsPlayer,
    version: 'version-123456789abcdef',
    channel: 'live',
    path: 'C:\\Users\\Admin\\AppData\\Local\\Roblox\\Versions\\version-123456789abcdef',
    lastUpdated: '2024-11-14',
    status: 'Ready'
  },
  {
    id: 'inst-2',
    name: 'Studio Canary',
    binaryType: BinaryType.WindowsStudio,
    version: 'version-abcdef123456789',
    channel: 'z-canary',
    path: 'C:\\Users\\Admin\\AppData\\Local\\Roblox\\Versions\\version-abcdef123456789',
    lastUpdated: '2024-11-10',
    status: 'Updating'
  },
  {
    id: 'inst-3',
    name: 'QA Player',
    binaryType: BinaryType.WindowsPlayer,
    version: 'version-ff1133557799aa',
    channel: 'qastrike',
    path: 'D:\\RobloxQA\\Versions\\version-ff1133557799aa',
    lastUpdated: '2024-11-01',
    status: 'Error'
  }
]
