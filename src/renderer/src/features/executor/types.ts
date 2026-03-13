import voltIcon from '../../../../../assets/icons/volt.png'
import bunnyIcon from '../../../../../assets/icons/bunny.png'
import matchaIcon from '../../../../../assets/icons/matcha.png'
import waveIcon from '../../../../../assets/icons/wave.png'
import potassiumIcon from '../../../../../assets/icons/potassium.png'
import seliwareIcon from '../../../../../assets/icons/seliware.png'
import serotoninIcon from '../../../../../assets/icons/serotonin.png'
import macsploitIcon from '../../../../../assets/icons/macsploit.png'
import severeIcon from '../../../../../assets/icons/severe.png'
import roninIcon from '../../../../../assets/icons/ronin.png'

export interface ExecutorPlan {
  id: string
  name: string
  price: number
}

export interface Seller {
  id: string
  name: string
  url: string
  discount?: string
  executors: string[] // Array of executor IDs this seller offers
}

export const SELLERS: Seller[] = [
  {
    id: 'bloxproducts',
    name: 'BloxProducts',
    url: 'https://bloxproducts.com/?affiliate_key=experimentid',
    discount: '10% off',
    executors: ['volt', 'wave', 'matcha', 'serotonin', 'potassium', 'macsploit', 'severe', 'ronin']
  },
  {
    id: 'robloxcheatz',
    name: 'RobloxCheatz',
    url: 'https://robloxcheatz.com/?ref=experimentid',
    discount: '5% off everything',
    executors: ['volt', 'bunni', 'matcha', 'wave', 'potassium', 'seliware', 'serotonin', 'ronin']
  },
  {
    id: 'angxlzz',
    name: 'Angxlzz',
    url: 'https://angxlzz.store/?ref=experimentid',
    discount: undefined,
    executors: ['volt', 'matcha', 'wave']
  },
  {
    id: 'wyv',
    name: 'Wyvern',
    url: 'https://wyv.gg/experimentid/ref/pbkhr/',
    discount: undefined,
    executors: ['volt', 'wave']
  }
]

export interface Executor {
  id: string
  name: string
  icon: any // Imported image module
  plans: ExecutorPlan[]
}

export const EXECUTORS: Executor[] = [
  {
    id: 'volt',
    name: 'Volt',
    icon: voltIcon,
    plans: [
      { id: 'volt-week', name: 'Week', price: 5.99 },
      { id: 'volt-month', name: 'Month', price: 19.99 },
      { id: 'volt-quarterly', name: 'Quarterly', price: 49.99 }
    ]
  },
  {
    id: 'bunni',
    name: 'Bunni',
    icon: bunnyIcon,
    plans: [
      { id: 'bunni-2days', name: '2 Days', price: 0.99 },
      { id: 'bunni-7days', name: 'Week', price: 2.99 },
      { id: 'bunni-30days', name: 'Month', price: 9.99 },
      { id: 'bunni-lifetime', name: 'Lifetime', price: 34.99 }
    ]
  },
  {
    id: 'matcha',
    name: 'Matcha',
    icon: matchaIcon,
    plans: [
      { id: 'matcha-lifetime', name: 'Lifetime', price: 11.99 }
    ]
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: waveIcon,
    plans: [
      { id: 'wave-1day', name: '1 Day', price: 2.49 },
      { id: 'wave-7day', name: 'Week', price: 5.99 },
      { id: 'wave-30day', name: 'Month', price: 18.99 },
      { id: 'wave-90day', name: 'Quarterly', price: 39.99 },
      { id: 'wave-365day', name: 'Year', price: 74.99 }
    ]
  },
  {
    id: 'potassium',
    name: 'Potassium',
    icon: potassiumIcon,
    plans: [
      { id: 'potassium-lifetime', name: 'Lifetime', price: 22.99 }
    ]
  },
  {
    id: 'seliware',
    name: 'Seliware',
    icon: seliwareIcon,
    plans: [
      { id: 'seliware-week', name: 'Week', price: 3.99 },
      { id: 'seliware-30day', name: 'Month', price: 9.99 }
    ]
  },
  {
    id: 'serotonin',
    name: 'Serotonin',
    icon: serotoninIcon,
    plans: [
      { id: 'serotonin-30day', name: 'Month', price: 9.99 },
      { id: 'serotonin-90day', name: 'Quarterly', price: 24.99 },
      { id: 'serotonin-365day', name: 'Year', price: 49.99 }
    ]
  },
  {
    id: 'macsploit',
    name: 'MacSploit',
    icon: macsploitIcon,
    plans: [
      { id: 'macsploit-lifetime', name: 'Lifetime', price: 9.99 }
    ]
  },
  {
    id: 'severe',
    name: 'Severe',
    icon: severeIcon,
    plans: [
      { id: 'severe-lifetime', name: 'Lifetime', price: 19.99 }
    ]
  },
  {
    id: 'ronin',
    name: 'Ronin',
    icon: roninIcon,
    plans: [
      { id: 'ronin-7days', name: 'Week', price: 2.99 },
      { id: 'ronin-30days', name: 'Month', price: 5.99 },
      { id: 'ronin-lifetime', name: 'Lifetime', price: 9.99 }
    ]
  }
]