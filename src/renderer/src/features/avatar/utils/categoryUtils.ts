import { Star, BadgeCheck, User, Shirt, Sparkles, Layers, Box } from 'lucide-react'
import type React from 'react'

export type MainCategory =
  | 'Favorites'
  | 'Currently Wearing'
  | 'Characters'
  | 'Clothing'
  | 'Accessories'
  | 'Body'
  | 'Animation'

export const CATEGORIES: Record<MainCategory, string[]> = {
  Favorites: ['All'],
  'Currently Wearing': ['All'],
  Characters: ['Purchased', 'Creations'],
  Clothing: [
    'Tops',
    'Outerwear',
    'Bottoms',
    'Left Shoe',
    'Right Shoe',
    'Classic Shirts',
    'Classic Pants',
    'Classic T-Shirts'
  ],
  Accessories: ['Hat', 'Hair', 'Face', 'Neck', 'Shoulder', 'Front', 'Back', 'Waist', 'Gear'],
  Body: [
    'Skin',
    'Scale',
    'Hair',
    'Heads',
    'Faces',
    'Torso',
    'Left Arm',
    'Right Arm',
    'Left Leg',
    'Right Leg'
  ],
  Animation: ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Swim', 'Climb']
}

export const CATEGORY_ICONS: Record<MainCategory, React.ElementType> = {
  Favorites: Star,
  'Currently Wearing': BadgeCheck,
  Characters: User,
  Clothing: Shirt,
  Accessories: Sparkles,
  Body: Layers,
  Animation: Box
}

export const SUB_CATEGORY_IDS: Record<string, number> = {
  Tops: 11,
  Outerwear: 67,
  Bottoms: 12,
  'Left Shoe': 70,
  'Right Shoe': 71,
  'Classic Shirts': 11,
  'Classic Pants': 12,
  'Classic T-Shirts': 2,
  Hat: 8,
  Hair: 41,
  Face: 42,
  Neck: 43,
  Shoulder: 44,
  Front: 45,
  Back: 46,
  Waist: 47,
  Gear: 19,
  Heads: 17,
  Faces: 18,
  Torso: 27,
  'Left Arm': 29,
  'Right Arm': 28,
  'Left Leg': 30,
  'Right Leg': 31,
  Idle: 51,
  Walk: 55,
  Run: 53,
  Jump: 52,
  Fall: 50,
  Swim: 54,
  Climb: 48
}

export const getAssetTypeIds = (mainCategory: MainCategory, subCategory: string): number[] => {
  if (
    mainCategory === 'Favorites' ||
    mainCategory === 'Currently Wearing' ||
    mainCategory === 'Characters'
  ) {
    return []
  }
  if (subCategory === 'Heads') {
    return [17, 79]
  }
  const typeId = SUB_CATEGORY_IDS[subCategory]
  return typeId !== undefined ? [typeId] : []
}

export const isInventoryCategory = (mainCategory: MainCategory): boolean => {
  return (
    mainCategory !== 'Favorites' &&
    mainCategory !== 'Currently Wearing' &&
    mainCategory !== 'Characters'
  )
}

export const ASSET_TYPE_NAMES: Record<number, string> = {
  11: 'Classic Shirt',
  12: 'Classic Pants',
  2: 'Classic T-Shirt',
  8: 'Hat',
  41: 'Hair',
  42: 'Face Accessory',
  43: 'Neck Accessory',
  44: 'Shoulder Accessory',
  45: 'Front Accessory',
  46: 'Back Accessory',
  47: 'Waist Accessory',
  19: 'Gear',
  17: 'Head',
  18: 'Face',
  27: 'Torso',
  29: 'Left Arm',
  28: 'Right Arm',
  30: 'Left Leg',
  31: 'Right Leg',
  51: 'Idle Animation',
  55: 'Walk Animation',
  53: 'Run Animation',
  52: 'Jump Animation',
  50: 'Fall Animation',
  54: 'Swim Animation',
  48: 'Climb Animation',
  1: 'Image',
  3: 'Audio',
  4: 'Mesh',
  5: 'Lua',
  10: 'Model',
  13: 'Decal',
  21: 'Badge',
  24: 'Animation',
  32: 'Package',
  34: 'Game Pass',
  38: 'Plugin',
  40: 'MeshPart',
  61: 'Emote Animation',
  62: 'Video',
  67: 'Outerwear',
  70: 'Left Shoe',
  71: 'Right Shoe',
  72: 'Dress Skirt'
}

export const ASSET_TYPES_WITH_MODELS = [
  8, 41, 42, 43, 44, 45, 46, 47, 19, 17, 27, 29, 28, 30, 31, 67, 70, 71, 72, 4, 40, 10
]
