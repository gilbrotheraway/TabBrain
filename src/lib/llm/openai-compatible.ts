import { BaseLLMProvider } from './provider'
import type { LLMRequestOptions, LLMResponse, LLMMessage } from './types'
import { LLMError } from './types'
import { logger } from '@/lib/utils/logger'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  // Note: tools field is intentionally excluded to prevent duplicate tool name errors
  // Some API providers (like Open WebUI) may add tools automatically
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAICompatibleProvider extends BaseLLMProvider {
  readonly name = 'openai-compatible'

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.model)
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const url = this.getCompletionUrl()

    const body: OpenAIRequest = {
      model: this.config.model,
      messages: options.messages.map(this.mapMessage),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? 1000,
      stream: false,
      // Explicitly exclude tools to prevent API errors from duplicate tool names
    }

    logger.debug('OpenAI request', { url, model: body.model, messageCount: body.messages.length })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('OpenAI error response', { status: response.status, body: errorText })
        
        // Check for duplicate tool names error
        if (errorText.includes('tools') && errorText.includes('unique')) {
          throw new LLMError(
            'Duplicate tool names detected. This may be caused by the API provider automatically adding tools. Check your API provider configuration.',
            'INVALID_CONFIG'
          )
        }
        
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const data = await response.json() as OpenAIResponse

      const choice = data.choices[0]
      if (!choice) {
        throw new LLMError('No response from model', 'INVALID_RESPONSE')
      }

      logger.debug('OpenAI response', {
        contentLength: choice.message.content.length,
        usage: data.usage,
      })

      return {
        content: choice.message.content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async listModels(): Promise<string[]> {
    const url = this.getModelsUrl()

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()

      // Handle Ollama's response format (uses 'models' array with 'name' field)
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((m: { name: string }) => m.name)
      }

      // Handle OpenAI-compatible format (uses 'data' array with 'id' field)
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: { id: string }) => m.id)
      }

      return []
    } catch {
      return []
    }
  }

  private getCompletionUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '')
    // Handle different API endpoint patterns
    if (base.endsWith('/v1')) {
      return `${base}/chat/completions`
    }
    if (base.endsWith('/api')) {
      return `${base}/chat/completions`
    }
    return `${base}/v1/chat/completions`
  }

  private getModelsUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '')

    // Ollama uses /api/tags endpoint instead of /models
    if (base.includes('11434') || base.includes('ollama')) {
      if (base.endsWith('/api')) {
        return `${base}/tags`
      }
      return `${base}/api/tags`
    }

    if (base.endsWith('/v1')) {
      return `${base}/models`
    }
    if (base.endsWith('/api')) {
      return `${base}/models`
    }
    return `${base}/v1/models`
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    return headers
  }

  private mapMessage(message: LLMMessage): OpenAIMessage {
    return {
      role: message.role,
      content: message.content,
    }
  }
}
