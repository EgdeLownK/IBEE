import { forwardRef, type TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean
}

const baseClasses =
  'block w-full resize-y rounded-lg border bg-neutral-0 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus:ring-2'

const defaultClasses =
  'border-neutral-200 hover:border-neutral-300 focus:border-accent-soft focus:ring-accent/20'

const errorClasses =
  'border-error hover:border-error focus:border-error focus:ring-error/30'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`${baseClasses} ${error ? errorClasses : defaultClasses} ${className ?? ''}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
