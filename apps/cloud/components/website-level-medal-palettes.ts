import type { WebsiteLevel } from '@coderocket/core/website-level'

export type MedalWebsiteLevel = Exclude<WebsiteLevel, 'unverified'>

export interface MedalPalette {
  backdropBottom: string
  backdropTop: string
  centerBottom: string
  centerTop: string
  edge: string
  highlight: string
  label: string
  logo: string
  ribbonLeft: string
  ribbonLeftStripe: string
  ribbonRight: string
  ribbonRightStripe: string
  shadow: string
  shellBottom: string
  shellTop: string
  sparkle: string
}

export const MEDAL_PALETTES: Record<MedalWebsiteLevel, MedalPalette> = {
  needs_attention: {
    label: 'Needs attention',
    backdropTop: '#9e3b32',
    backdropBottom: '#3f0f0c',
    shellTop: '#ff9b89',
    shellBottom: '#a92f28',
    edge: '#ff7566',
    highlight: '#ffe2dc',
    centerTop: '#ffe0da',
    centerBottom: '#d76558',
    logo: '#3a0d0a',
    shadow: '#3d0d0a',
    ribbonLeft: '#8d2520',
    ribbonLeftStripe: '#ffb14a',
    ribbonRight: '#de4f43',
    ribbonRightStripe: '#ffd1c9',
    sparkle: '#fff1ed'
  },
  bronze: {
    label: 'Bronze',
    backdropTop: '#915b3a',
    backdropBottom: '#321b10',
    shellTop: '#ffd0aa',
    shellBottom: '#a85e35',
    edge: '#e6945d',
    highlight: '#fff0df',
    centerTop: '#f7cfad',
    centerBottom: '#bd7448',
    logo: '#32180d',
    shadow: '#4e2818',
    ribbonLeft: '#6742c7',
    ribbonLeftStripe: '#9f86ff',
    ribbonRight: '#b84f3f',
    ribbonRightStripe: '#ff8f7d',
    sparkle: '#fff0df'
  },
  silver: {
    label: 'Silver',
    backdropTop: '#667386',
    backdropBottom: '#1c222b',
    shellTop: '#ffffff',
    shellBottom: '#929ba8',
    edge: '#dce3eb',
    highlight: '#ffffff',
    centerTop: '#f4f7fa',
    centerBottom: '#aeb7c4',
    logo: '#20252c',
    shadow: '#3b424c',
    ribbonLeft: '#287a9f',
    ribbonLeftStripe: '#71d9ee',
    ribbonRight: '#606a79',
    ribbonRightStripe: '#dce3eb',
    sparkle: '#ffffff'
  },
  gold: {
    label: 'Gold',
    backdropTop: '#4c91eb',
    backdropBottom: '#174d9b',
    shellTop: '#fff27a',
    shellBottom: '#e89b05',
    edge: '#ffc51c',
    highlight: '#fffbd2',
    centerTop: '#fff582',
    centerBottom: '#f3b51e',
    logo: '#3a2600',
    shadow: '#805400',
    ribbonLeft: '#16a964',
    ribbonLeftStripe: '#ffffff',
    ribbonRight: '#20bd73',
    ribbonRightStripe: '#ffffff',
    sparkle: '#ffffff'
  },
  platinum: {
    label: 'Platinum',
    backdropTop: '#4dcbe3',
    backdropBottom: '#11596b',
    shellTop: '#e9fdff',
    shellBottom: '#47bfd7',
    edge: '#8cecff',
    highlight: '#ffffff',
    centerTop: '#eaffff',
    centerBottom: '#74d8e9',
    logo: '#062c36',
    shadow: '#0b5363',
    ribbonLeft: '#6246df',
    ribbonLeftStripe: '#a999ff',
    ribbonRight: '#159bb7',
    ribbonRightStripe: '#d9fbff',
    sparkle: '#eaffff'
  }
}
