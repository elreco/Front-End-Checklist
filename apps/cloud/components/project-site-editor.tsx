'use client'

import { AlertTriangle, Globe2, LoaderCircle, Radar, Settings2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/design-system/ui/dialog'
import Link from 'next/link'
import { useId } from 'react'
import { getEnteredPages } from '@/lib/onboarding-pages'
import { getProjectEditorSubmitLabel, type ProjectSiteEditorProps } from '@/lib/project-site-editor'
import { OnboardingPageDiscovery } from './onboarding-page-discovery'
import { ProjectAccessSettings } from './project-access-settings'
import { ProjectEmailAlertSettings } from './project-email-alert-settings'
import { ProjectPageFields } from './project-page-fields'
import { useProjectSiteSettings } from './use-project-site-settings'

/** Edit one monitored site's identity, pages, access, and alert preferences. */
export function ProjectSiteEditor(props: ProjectSiteEditorProps) {
  const fieldId = useId()
  const formId = useId()
  const settings = useProjectSiteSettings(props)
  const triggerLabel = props.triggerLabel ?? 'Site settings'
  const variant = props.variant ?? 'outline'

  return (
    <Dialog onOpenChange={settings.changeOpen} open={settings.open}>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" type="button" variant={variant}>
          <Settings2 aria-hidden /> {triggerLabel}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="shrink-0 border-border border-b p-5 pr-14 sm:p-6 sm:pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <Settings2 aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Monitored website
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">Site settings</DialogTitle>
              <DialogDescription className="mt-2 max-w-xl leading-6">
                Manage what CodeRocket watches, how protected pages are reached, and when this site
                sends an email alert.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6"
          id={formId}
          onSubmit={settings.saveSettings}
        >
          <section aria-labelledby={`${fieldId}-website-details`}>
            <div className="flex items-start gap-3">
              <Globe2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
              <div>
                <h3
                  className="font-heading font-semibold text-lg"
                  id={`${fieldId}-website-details`}
                >
                  Website details
                </h3>
                <p className="mt-1 text-muted text-xs leading-5">
                  The name is for your workspace. The address controls where every monitored path is
                  checked.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block font-semibold text-sm" htmlFor={`${fieldId}-name`}>
                Website name
                <CodeRocketInput
                  id={`${fieldId}-name`}
                  maxLength={120}
                  onChange={event => {
                    settings.setName(event.target.value)
                    settings.setError('')
                  }}
                  required
                  value={settings.name}
                />
              </label>
              <label className="block font-semibold text-sm" htmlFor={`${fieldId}-url`}>
                Website address
                <CodeRocketInput
                  autoComplete="url"
                  disabled={props.checking}
                  id={`${fieldId}-url`}
                  onChange={event => {
                    settings.setUrl(event.target.value)
                    settings.setError('')
                  }}
                  required
                  type="url"
                  value={settings.url}
                />
              </label>
            </div>
          </section>

          {props.checking ? (
            <p className="border border-signal bg-signal/10 p-3 text-muted text-xs leading-5">
              A check is running. You can still update the name and email alerts; pages, address,
              and access will unlock when it finishes.
            </p>
          ) : null}

          {settings.originChanged ? (
            <div className="border border-warning bg-background p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold text-sm">This is a different website address</p>
                  <p className="mt-1 text-muted text-xs leading-5">
                    Existing history stays available, but the next completed check becomes a fresh
                    starting point. Keep unrelated websites in separate entries.
                  </p>
                  <Link
                    className="mt-2 inline-block font-mono text-signal text-xs hover:text-accent"
                    href="/onboarding"
                  >
                    Add it as a new site instead →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <fieldset aria-labelledby={`${fieldId}-pages`} disabled={props.checking}>
            <legend className="sr-only">Pages to watch</legend>
            <div className="flex items-start gap-3">
              <Radar aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
              <div>
                <h3 className="font-heading font-semibold text-lg" id={`${fieldId}-pages`}>
                  Pages to watch
                </h3>
                <p className="mt-1 text-muted text-xs leading-5">
                  Use the same discovery and import tools available when a site is first added, or
                  edit individual paths below.
                </p>
              </div>
            </div>
            <details className="mt-4 border border-border bg-background">
              <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
                Find or import more pages — optional
              </summary>
              <div className="border-border border-t p-4">
                <OnboardingPageDiscovery
                  cloudDiscoveryBlocked={
                    settings.secureRunnerRequired || settings.accessMode === 'private'
                  }
                  onPagesChange={value => settings.replacePages(getEnteredPages(value))}
                  pagesPerProject={props.maxPages}
                  pagesValue={settings.pages.join('\n')}
                  siteUrl={settings.url}
                />
              </div>
            </details>
            <div className="mt-5">
              <ProjectPageFields
                authenticatedPages={settings.authenticatedPages}
                fieldId={fieldId}
                initialPages={props.pages}
                maxPages={props.maxPages}
                onAdd={() => settings.setPages(current => [...current, ''])}
                onAccessToggle={settings.togglePageAccess}
                onRemove={settings.removePage}
                onUpdate={settings.updatePage}
                pages={settings.pages}
                plan={props.plan}
                problemPaths={props.problemPaths ?? []}
                showAccessToggles={settings.accessMode === 'protected'}
              />
            </div>
          </fieldset>

          <fieldset disabled={props.checking}>
            <legend className="sr-only">Page access</legend>
            <ProjectAccessSettings
              accessMode={settings.accessMode}
              onAccessModeChange={settings.changeAccessMode}
              onSecureRunnerRequiredChange={settings.setSecureRunnerRequired}
              secureRunnerRequired={settings.secureRunnerRequired}
            />
          </fieldset>

          <ProjectEmailAlertSettings
            alertEmail={props.alertEmail}
            onChange={settings.changeEmailAlerts}
            settings={settings.emailAlerts}
          />

          {settings.error ? (
            <p className="border border-danger bg-background p-3 text-danger text-sm" role="alert">
              {settings.error}
            </p>
          ) : null}

          <div className="border border-border bg-background p-4 text-muted text-xs leading-5">
            Name and email changes apply immediately. Address, page, or access changes start a fresh
            check when CodeRocket can reach the site. Old reports are never rewritten.
          </div>
        </form>

        <DialogFooter className="shrink-0 border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <DialogClose asChild>
            <CodeRocketButton disabled={settings.saving} size="sm" type="button" variant="ghost">
              Cancel
            </CodeRocketButton>
          </DialogClose>
          <CodeRocketButton
            disabled={settings.saving || !settings.hasChanges}
            form={formId}
            size="sm"
            type="submit"
          >
            {settings.saving ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : (
              <Settings2 aria-hidden />
            )}
            {getProjectEditorSubmitLabel({
              checkAfterSave: settings.checkAfterSave,
              monitoringChanged: settings.monitoringChanged,
              originChanged: settings.originChanged,
              saving: settings.saving
            })}
          </CodeRocketButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
