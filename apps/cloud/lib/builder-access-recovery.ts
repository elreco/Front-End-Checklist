export type BuilderAccessObstacle =
  | 'browser_rejected'
  | 'page_unavailable'
  | 'security_check'
  | 'session_ended'
  | 'sign_in'
  | 'unknown'

export interface BuilderAccessRecovery {
  description: string
  eyebrow: string
  obstacle: BuilderAccessObstacle
  title: string
}

/** Turn a technical import failure into one calm, outcome-focused recovery message. */
export function getBuilderAccessRecovery(error?: string): BuilderAccessRecovery {
  const value = error?.toLowerCase() ?? ''
  if (/guided browser.*(?:closed|expired)|temporary.*browser.*expired|session_ended/.test(value))
    return {
      description:
        'Nothing was lost or published. Open a new guided browser when you are ready and CodeRocket will start again from that page.',
      eyebrow: 'Ready when you are',
      obstacle: 'session_ended',
      title: 'The temporary browser has closed'
    }
  if (
    /cloud browser|headless|automation|browser was refused|browser_rejected|access denied/.test(
      value
    )
  )
    return {
      description:
        'This website refused the temporary browser. You can still try the guided browser once, or use a different public page from the same website.',
      eyebrow: 'A different route may work',
      obstacle: 'browser_rejected',
      title: 'This website is being extra protective'
    }
  if (
    /cloudflare|captcha|challenge|security verification|checking your browser|vercel deployment protection|security_check/.test(
      value
    )
  )
    return {
      description:
        'The website asked for a real person. Complete the check once and CodeRocket will continue from the same browser.',
      eyebrow: 'One quick check',
      obstacle: 'security_check',
      title: 'Help CodeRocket open this website'
    }
  if (/sign[ -]?in|log[ -]?in|login|password|unauthori[sz]ed|http 401|sign_in/.test(value))
    return {
      description:
        'Sign in inside a temporary private browser, then CodeRocket will continue without asking you to copy cookies or technical information.',
      eyebrow: 'Sign in once',
      obstacle: 'sign_in',
      title: 'Open the page you want CodeRocket to recreate'
    }
  if (
    /timed? out|timeout|dns|enotfound|http 404|http 5\d\d|did not return|not html|unavailable/.test(
      value
    )
  )
    return {
      description:
        'The page may be temporary, moved, or different from the useful page you had in mind. Try opening the right page before CodeRocket continues.',
      eyebrow: 'Choose the useful page',
      obstacle: 'page_unavailable',
      title: 'CodeRocket could not read this page yet'
    }
  return {
    description:
      'Open the website with CodeRocket, handle anything that appears, and stop on the page you want to use as the starting model.',
    eyebrow: 'Continue together',
    obstacle: 'unknown',
    title: 'CodeRocket needs a little help with this website'
  }
}
