import { Slot } from '@radix-ui/react-slot'
import { cn } from '@repo/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

const codeRocketButtonVariants = cva(
  'inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap border font-mono font-semibold transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'border-accent bg-accent text-white hover:border-[#8b70ff] hover:bg-[#8b70ff]',
        secondary:
          'border-surface-raised bg-surface-raised text-foreground hover:border-border hover:bg-surface',
        outline:
          'border-border bg-transparent text-foreground hover:border-signal hover:bg-surface-raised',
        ghost:
          'border-transparent bg-transparent text-muted hover:bg-surface-raised hover:text-foreground',
        danger: 'border-danger bg-danger text-background hover:bg-[#ff9485]',
        link: 'h-auto border-transparent bg-transparent p-0 text-accent hover:text-signal'
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-sm',
        icon: 'h-11 w-11 p-0'
      },
      fullWidth: {
        true: 'w-full',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
)

export interface CodeRocketButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof codeRocketButtonVariants> {
  asChild?: boolean
}

/** Renders a consistent CodeRocket action using shared product variants. */
export function CodeRocketButton({
  asChild = false,
  className,
  fullWidth,
  size,
  variant,
  ...props
}: CodeRocketButtonProps) {
  const Component = asChild ? Slot : 'button'
  const resolvedSize = variant === 'link' && size === undefined ? null : size
  return (
    <Component
      className={cn(
        codeRocketButtonVariants({ className, fullWidth, size: resolvedSize, variant })
      )}
      data-slot="coderocket-button"
      {...props}
    />
  )
}

export { codeRocketButtonVariants }
