import OpenAI from 'openai'

export const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'

export interface OpenAiTranscriptionProviderOptions {
  apiKey: string
  client?: OpenAI
  model?: string
}

/** Transcribe one short recording without retaining it in CodeRocket project storage. */
export class OpenAiTranscriptionProvider {
  readonly #client: OpenAI
  readonly #model: string

  constructor(options: OpenAiTranscriptionProviderOptions) {
    this.#client = options.client ?? new OpenAI({ apiKey: options.apiKey })
    this.#model = options.model ?? DEFAULT_TRANSCRIPTION_MODEL
  }

  async transcribe(file: File): Promise<string> {
    const transcription = await this.#client.audio.transcriptions.create({
      file,
      model: this.#model,
      prompt:
        'The speaker is describing a change to a website in CodeRocket. Preserve product names, page names, prices, and URLs accurately.',
      response_format: 'json'
    })
    return transcription.text.trim()
  }
}
