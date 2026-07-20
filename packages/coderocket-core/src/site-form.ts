import { z } from 'zod'

export interface SourceFormControl {
  kind: 'button' | 'input'
  label: string
  name?: string
  placeholder?: string
  type?: 'email' | 'search' | 'tel' | 'text' | 'url'
  value?: string
}

export interface SourceFormStyle {
  buttonBackgroundColor: string
  buttonBorderColor: string
  buttonForegroundColor: string
  buttonHeight: number
  buttonRadius: number
  gap: number
  inputBackgroundColor: string
  inputBorderColor: string
  inputForegroundColor: string
  inputHeight: number
  inputRadius: number
  inputWidth: number
  mobileInputWidth?: number
}

export interface SourceFormBlueprint {
  action?: string
  controls: SourceFormControl[]
  method: 'get' | 'post'
  style: SourceFormStyle
}

const httpsUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'))

export const siteFormSchema = z.object({
  action: httpsUrlSchema.optional(),
  controls: z
    .array(
      z.object({
        kind: z.enum(['button', 'input']),
        label: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(80).optional(),
        placeholder: z.string().trim().max(160).optional(),
        type: z.enum(['email', 'search', 'tel', 'text', 'url']).optional(),
        value: z.string().trim().max(160).optional()
      })
    )
    .min(1)
    .max(8),
  method: z.enum(['get', 'post']),
  style: z.object({
    buttonBackgroundColor: z.string().max(80),
    buttonBorderColor: z.string().max(80),
    buttonForegroundColor: z.string().max(80),
    buttonHeight: z.number().int().min(24).max(80),
    buttonRadius: z.number().int().min(0).max(60),
    gap: z.number().int().min(0).max(48),
    inputBackgroundColor: z.string().max(80),
    inputBorderColor: z.string().max(80),
    inputForegroundColor: z.string().max(80),
    inputHeight: z.number().int().min(24).max(96),
    inputRadius: z.number().int().min(0).max(60),
    inputWidth: z.number().int().min(160).max(1200),
    mobileInputWidth: z.number().int().min(160).max(1200).optional()
  })
})

/** Keep one captured form useful without retaining hidden values or executable behavior. */
export function normalizeSourceForm(
  form: SourceFormBlueprint,
  sourceOrigin: string
): SourceFormBlueprint | undefined {
  const parsed = siteFormSchema.safeParse({
    action: form.action ? safeFormAction(form.action, sourceOrigin) : undefined,
    controls: form.controls,
    method: form.method,
    style: {
      ...form.style,
      buttonBackgroundColor: transparentColor(form.style.buttonBackgroundColor)
        ? '#f1f3f4'
        : safeColor(form.style.buttonBackgroundColor, '#f1f3f4'),
      buttonBorderColor: safeColor(form.style.buttonBorderColor, '#dadce0'),
      buttonForegroundColor: safeColor(form.style.buttonForegroundColor, '#202124'),
      inputBackgroundColor: safeColor(form.style.inputBackgroundColor, '#ffffff'),
      inputBorderColor: safeColor(form.style.inputBorderColor, '#9aa0a6'),
      inputForegroundColor: safeColor(form.style.inputForegroundColor, '#202124')
    }
  })
  return parsed.success ? parsed.data : undefined
}

/** Treat transparent native controls as the browser's normal light button surface. */
function transparentColor(value: string): boolean {
  return value === 'transparent' || value.replaceAll(' ', '') === 'rgba(0,0,0,0)'
}

/** Resolve only secure form destinations against the captured website. */
function safeFormAction(value: string, sourceOrigin: string): string | undefined {
  try {
    const url = new URL(value, sourceOrigin)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Keep common computed CSS colours and replace browser keywords with stable form defaults. */
function safeColor(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase()
  return /^#[0-9a-f]{3,8}$/.test(normalized) || /^rgba?\([\d\s.,%/]+\)$/.test(normalized)
    ? normalized
    : fallback
}
