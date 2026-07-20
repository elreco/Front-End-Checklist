'use client'

import { LoaderCircle, Mic, Square } from '@repo/design-system/icons'
import { useEffect, useRef, useState } from 'react'

type VoiceState = 'idle' | 'recording' | 'transcribing'

/** Record a short voice note, transcribe it, then return only editable prompt text. */
export function StudioVoiceInput({
  disabled,
  onBusyChange,
  onTranscript,
  siteId
}: {
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  onTranscript: (text: string) => void
  siteId: string
}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | undefined>(undefined)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      stopStream(streamRef.current)
    },
    []
  )
  useEffect(() => {
    onBusyChange(state !== 'idle')
  }, [onBusyChange, state])

  /** Request microphone access only after the owner presses the voice button. */
  async function startRecording() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice input is not available in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = preferredMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        stopStream(stream)
        const recording = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        chunksRef.current = []
        void transcribeRecording(recording)
      }
      recorder.start(500)
      setSeconds(0)
      setState('recording')
      timerRef.current = setInterval(() => {
        setSeconds(current => {
          if (current >= 89) {
            if (recorder.state === 'recording') recorder.stop()
            return 90
          }
          return current + 1
        })
      }, 1000)
    } catch {
      setError('Allow microphone access to describe your change by voice.')
      stopStream(streamRef.current)
      setState('idle')
    }
  }

  /** End the active recording and let its on-stop handler begin transcription. */
  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  /** Send transient audio to the protected transcription route and keep only its text. */
  async function transcribeRecording(recording: Blob) {
    setState('transcribing')
    const extension = recording.type.includes('mp4') ? 'm4a' : 'webm'
    const body = new FormData()
    body.set('audio', new File([recording], `voice-note.${extension}`, { type: recording.type }))
    try {
      const response = await fetch(`/api/studio/${encodeURIComponent(siteId)}/transcribe`, {
        body,
        method: 'POST'
      })
      const result: { error?: string; text?: string } = await response.json()
      if (!response.ok || !result.text)
        throw new Error(result.error ?? 'The recording could not be understood.')
      onTranscript(result.text)
    } catch (transcriptionError) {
      setError(
        transcriptionError instanceof Error
          ? transcriptionError.message
          : 'The recording could not be understood.'
      )
    } finally {
      setState('idle')
      setSeconds(0)
    }
  }

  const label =
    state === 'recording'
      ? `Stop voice note, ${formatDuration(seconds)}`
      : state === 'transcribing'
        ? 'Turning voice note into text'
        : 'Describe your change by voice'

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        aria-label={label}
        aria-pressed={state === 'recording'}
        className={`grid h-8 w-8 shrink-0 place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          state === 'recording'
            ? 'border-danger bg-danger text-background'
            : 'border-transparent text-muted hover:bg-surface-raised hover:text-foreground'
        }`}
        disabled={disabled || state === 'transcribing'}
        onClick={state === 'recording' ? stopRecording : startRecording}
        title="Voice note"
        type="button"
      >
        {state === 'transcribing' ? (
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        ) : state === 'recording' ? (
          <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic aria-hidden className="h-4 w-4" />
        )}
      </button>
      {state !== 'idle' ? (
        <span className="truncate font-mono text-[11px] text-muted">
          {state === 'recording'
            ? `${formatDuration(seconds)} · tap to stop`
            : 'Turning your voice into text…'}
        </span>
      ) : null}
      {error ? (
        <span className="max-w-48 truncate text-[11px] text-danger" role="alert" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** Pick the first browser-supported compressed recording format accepted by the server. */
function preferredMimeType(): string | undefined {
  for (const type of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'])
    if (MediaRecorder.isTypeSupported(type)) return type
  return undefined
}

/** Release every microphone track as soon as recording is complete or interrupted. */
function stopStream(stream?: MediaStream) {
  for (const track of stream?.getTracks() ?? []) track.stop()
}

/** Format the bounded recorder duration as minutes and seconds. */
function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
