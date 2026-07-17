'use client'

import { ArrowRight } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { normalizeWebsiteDraft } from '@/lib/website-draft'

const FIELD_ERROR_ID = 'homepage-website-error'
const FIELD_HELP_ID = 'homepage-website-help'

/** Start the website setup journey from one concrete URL while preserving it through sign-in. */
export function HomepageSiteForm() {
  const router = useRouter()
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeWebsiteDraft(website)
    if (!normalized) {
      setError('Enter a valid HTTPS website address.')
      return
    }
    setError('')
    router.push(`/onboarding?url=${encodeURIComponent(normalized)}`)
  }

  return (
    <div className="mx-auto mt-9 max-w-3xl">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label className="min-w-0 flex-1 text-left" htmlFor="homepage-website">
          <span className="sr-only">Website URL</span>
          <CodeRocketInput
            aria-describedby={error ? FIELD_ERROR_ID : FIELD_HELP_ID}
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            autoComplete="url"
            className="mt-0 h-13 bg-surface text-base"
            id="homepage-website"
            inputMode="url"
            name="url"
            onChange={event => {
              setWebsite(event.target.value)
              if (error) setError('')
            }}
            placeholder="https://www.example.com"
            required
            spellCheck={false}
            type="text"
            value={website}
          />
        </label>
        <CodeRocketButton className="shrink-0" size="lg" type="submit">
          Check my website free <ArrowRight aria-hidden />
        </CodeRocketButton>
      </form>
      <div className="mt-3 min-h-5 text-left text-xs sm:px-1">
        {error ? (
          <p className="text-danger" id={FIELD_ERROR_ID} role="alert">
            {error}
          </p>
        ) : (
          <p className="text-muted" id={FIELD_HELP_ID}>
            No credit card. Sign in only to save and run your check.
          </p>
        )}
      </div>
      <CodeRocketButton asChild className="mt-3" size="lg" variant="outline">
        <Link href="#live-example">See what gets checked</Link>
      </CodeRocketButton>
    </div>
  )
}
