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
    backdropTop: '#8f332c',
    backdropBottom: '#2e0c09',
    shellTop: '#ff9e8f',
    shellBottom: '#b5342c',
    edge: '#ff7567',
    highlight: '#ffe6e1',
    centerTop: '#ffc1b7',
    centerBottom: '#dc584b',
    logo: '#3b0d09',
    shadow: '#48100c',
    ribbonLeft: '#7f211c',
    ribbonLeftStripe: '#f7a097',
    ribbonRight: '#c83e34',
    ribbonRightStripe: '#ffd0c9',
    sparkle: '#fff3f0'
  },
  bronze: {
    label: 'Bronze',
    backdropTop: '#825337',
    backdropBottom: '#2b160b',
    shellTop: '#ffd1aa',
    shellBottom: '#a9572c',
    edge: '#ec9660',
    highlight: '#fff0e1',
    centerTop: '#f7c79f',
    centerBottom: '#b9693c',
    logo: '#35170a',
    shadow: '#4c2513',
    ribbonLeft: '#71351d',
    ribbonLeftStripe: '#eeb389',
    ribbonRight: '#ad5830',
    ribbonRightStripe: '#ffd2b0',
    sparkle: '#fff2e5'
  },
  silver: {
    label: 'Silver',
    backdropTop: '#687588',
    backdropBottom: '#1a2028',
    shellTop: '#ffffff',
    shellBottom: '#8f99a8',
    edge: '#dce4ed',
    highlight: '#ffffff',
    centerTop: '#f7f9fb',
    centerBottom: '#adb6c3',
    logo: '#20252d',
    shadow: '#39414c',
    ribbonLeft: '#465466',
    ribbonLeftStripe: '#d7dee8',
    ribbonRight: '#778394',
    ribbonRightStripe: '#f3f6f9',
    sparkle: '#ffffff'
  },
  gold: {
    label: 'Gold',
    backdropTop: '#4a8fe7',
    backdropBottom: '#164a92',
    shellTop: '#fff36f',
    shellBottom: '#e99d04',
    edge: '#ffc61c',
    highlight: '#fffbd2',
    centerTop: '#fff681',
    centerBottom: '#f2b619',
    logo: '#3d2800',
    shadow: '#7d5200',
    ribbonLeft: '#169b5d',
    ribbonLeftStripe: '#ffffff',
    ribbonRight: '#22b96f',
    ribbonRightStripe: '#ffffff',
    sparkle: '#ffffff'
  },
  platinum: {
    label: 'Platinum',
    backdropTop: '#4bc7df',
    backdropBottom: '#0e5263',
    shellTop: '#edfeff',
    shellBottom: '#43b9d1',
    edge: '#8cecff',
    highlight: '#ffffff',
    centerTop: '#efffff',
    centerBottom: '#71d5e7',
    logo: '#062c36',
    shadow: '#0a4d5c',
    ribbonLeft: '#236e85',
    ribbonLeftStripe: '#b4eef7',
    ribbonRight: '#1699b4',
    ribbonRightStripe: '#e0fbff',
    sparkle: '#eaffff'
  }
}
