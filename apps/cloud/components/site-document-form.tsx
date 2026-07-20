import type { SiteDocument } from '@coderocket/core'

type SiteSection = SiteDocument['sections'][number]

/** Render one captured native form without retaining hidden values or source scripts. */
export function SiteDocumentForm({
  published,
  section
}: {
  published: boolean
  section: SiteSection
}) {
  const form = section.form
  if (!form) return null
  const input = form.controls.find(control => control.kind === 'input')
  const buttons = form.controls.filter(control => control.kind === 'button')
  return (
    <form
      action={published ? form.action : undefined}
      className="grid justify-items-center"
      method={form.method}
      style={{ gap: form.style.gap }}
    >
      {input ? (
        <input
          aria-label={input.label}
          className="max-w-full px-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
          name={input.name}
          placeholder={input.placeholder}
          readOnly={!published}
          style={{
            backgroundColor: form.style.inputBackgroundColor,
            borderColor: form.style.inputBorderColor,
            borderRadius: form.style.inputRadius,
            borderStyle: 'solid',
            borderWidth: 1,
            color: form.style.inputForegroundColor,
            height: form.style.inputHeight,
            width: `clamp(${form.style.mobileInputWidth ?? form.style.inputWidth}px, ${(form.style.inputWidth / 14.4).toFixed(2)}cqw, ${form.style.inputWidth}px)`
          }}
          type={input.type ?? 'text'}
        />
      ) : null}
      {buttons.length > 0 ? (
        <div className="flex flex-wrap justify-center" style={{ gap: form.style.gap }}>
          {buttons.map((button, index) => (
            <button
              className="px-3"
              key={`${button.label}-${index}`}
              name={published ? button.name : undefined}
              style={{
                backgroundColor: form.style.buttonBackgroundColor,
                borderColor: form.style.buttonBorderColor,
                borderRadius: form.style.buttonRadius,
                borderStyle: 'solid',
                borderWidth: 1,
                color: form.style.buttonForegroundColor,
                height: form.style.buttonHeight
              }}
              type={published ? 'submit' : 'button'}
              value={published ? button.value : undefined}
            >
              {button.label}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  )
}
