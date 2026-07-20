'use client'

import { ArrowRight } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { normalizeWebsiteDraft } from '@/lib/website-draft'

interface WebsiteRecreationFormProps {
  buttonLabel?: string
  className?: string
  helpText?: string
  idPrefix: string
}

/** Start a website recreation with the only detail every owner already knows: its URL. */
export function WebsiteRecreationForm({
  buttonLabel = 'Clone this website',
  className,
  helpText = 'Private preview first. Nothing is published without you.',
  idPrefix
}: WebsiteRecreationFormProps) {
  const router = useRouter()
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')
  const inputId = `${idPrefix}-url`
  const errorId = `${idPrefix}-error`
  const helpId = `${idPrefix}-help`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeWebsiteDraft(website)
    if (!normalized) {
      setError('Enter a valid website address, such as https://example.com.')
      return
    }
    setError('')
    router.push(`/create?url=${encodeURIComponent(normalized)}`)
  }

  return (
    <form className={`max-w-3xl ${className ?? ''}`} onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1 text-left" htmlFor={inputId}>
          <span className="sr-only">Website address to clone</span>
          <CodeRocketInput
            aria-describedby={error ? errorId : helpId}
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            autoComplete="url"
            className="mt-0 h-14 bg-background px-5 text-base"
            id={inputId}
            inputMode="url"
            onChange={event => {
              setWebsite(event.target.value)
              if (error) setError('')
            }}
            placeholder="Paste a website address"
            required
            spellCheck={false}
            type="text"
            value={website}
          />
        </label>
        <CodeRocketButton className="shrink-0" size="lg" type="submit">
          {buttonLabel} <ArrowRight aria-hidden />
        </CodeRocketButton>
      </div>
      <div className="mt-3 min-h-5 text-left text-xs sm:px-1">
        {error ? (
          <p className="text-danger" id={errorId} role="alert">
            {error}
          </p>
        ) : (
          <p className="text-muted" id={helpId}>
            {helpText}
          </p>
        )}
      </div>
    </form>
  )
}
