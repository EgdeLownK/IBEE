import { forwardRef, type InputHTMLAttributes } from 'react'

type Variant = 'default' | 'subtle'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
  variant?: Variant
}

const baseClasses =
  'block w-full text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus:ring-2'

const variantClasses: Record<Variant, string> = {
  default:
    'rounded-lg border bg-neutral-0 px-4 py-3 border-neutral-200 hover:border-neutral-300 focus:border-accent-soft focus:ring-accent/20',
  subtle:
    'rounded-md bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:bg-neutral-0 focus:ring-accent/15',
}

const errorClasses =
  'rounded-lg border bg-neutral-0 px-4 py-3 border-error hover:border-error focus:border-error focus:ring-error/30'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, variant = 'default', className, ...props }, ref) => {
    const variantClass = error ? errorClasses : variantClasses[variant]
    return (
      <input
        ref={ref}
        className={`${baseClasses} ${variantClass} ${className ?? ''}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
