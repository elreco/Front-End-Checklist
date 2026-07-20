import { OpenAiTranscriptionProvider } from '@coderocket/ai'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const audioMimeTypes = new Set([
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm'
])

/** Turn one short owner recording into editable prompt text without saving the audio. */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Sign in to use voice input.' }, { status: 401 })
  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select('id')
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .in('status', ['ready', 'published'])
    .is('archived_at', null)
    .maybeSingle()
  if (!site) return Response.json({ error: 'Website not found' }, { status: 404 })

  const formData = await request.formData().catch(() => undefined)
  const audio = formData?.get('audio')
  if (!(audio instanceof File))
    return Response.json({ error: 'No recording was received.' }, { status: 400 })
  if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES)
    return Response.json({ error: 'Keep voice notes under 90 seconds.' }, { status: 413 })
  if (!audioMimeTypes.has(audio.type.split(';')[0] ?? ''))
    return Response.json({ error: 'This recording format is not supported.' }, { status: 415 })
  const { data: voiceSlot, error: voiceSlotError } = await supabase.rpc(
    'cr_take_voice_transcription_slot'
  )
  if (voiceSlotError || voiceSlot !== true)
    return Response.json(
      { error: 'You have used several voice notes. Try again in a little while.' },
      { status: 429 }
    )

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey)
    return Response.json({ error: 'Voice input is temporarily unavailable.' }, { status: 503 })
  try {
    const text = await new OpenAiTranscriptionProvider({ apiKey }).transcribe(audio)
    if (!text)
      return Response.json({ error: 'No speech was detected. Try again.' }, { status: 422 })
    return Response.json(
      { text: text.slice(0, 2_000) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return Response.json(
      { error: 'I could not understand that recording. Try again.' },
      { status: 503 }
    )
  }
}
