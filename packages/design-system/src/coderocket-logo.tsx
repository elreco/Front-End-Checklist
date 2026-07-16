import { cn } from '@repo/utils'
import type { SVGProps } from 'react'

export type CodeRocketMarkProps = SVGProps<SVGSVGElement>

/** Abstract rocket-and-flame silhouette, tilted 45 degrees for launch. */
export function CodeRocketMark(props: CodeRocketMarkProps) {
  return (
    <svg
      aria-hidden={props['aria-label'] ? undefined : true}
      fill="none"
      role={props['aria-label'] ? 'img' : undefined}
      viewBox="-7 1 70 70"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M24 4C17 12.5 13 22 12 31l-8 8c-1.2 1.2-1.2 2.4 0 3.7 4.8 5.2 10.2 9.6 16 13.3-3.7-7.2-6-13-6-17 0-1.6.7-3 2-4.2l4-3.8c.5-5.8 1.8-10.8 4-15 2.2 4.2 3.5 9.2 4 15l4 3.8c1.3 1.2 2 2.6 2 4.2 0 4-2.3 9.8-6 17 5.8-3.7 11.2-8.1 16-13.3 1.2-1.3 1.2-2.5 0-3.7l-8-8c-1-9-5-18.5-12-27Z"
        fill="currentColor"
        transform="translate(8 8) rotate(45 24 24)"
      />
    </svg>
  )
}

export interface CodeRocketLogoProps extends CodeRocketMarkProps {
  wordmarkClassName?: string
}

/** CodeRocket wordmark lockup. */
export function CodeRocketLogo({ wordmarkClassName, ...props }: CodeRocketLogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <CodeRocketMark {...props} />
      <span
        className={cn(
          'font-editorial font-normal leading-none tracking-[-0.035em]',
          wordmarkClassName
        )}
      >
        CodeRocket
      </span>
    </span>
  )
}
