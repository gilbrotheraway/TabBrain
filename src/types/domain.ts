export interface TabInfo {
  id: number
  windowId: number
  index: number
  url: string
  title: string
  favIconUrl?: string
  pinned: boolean
  groupId: number
  active: boolean
  discarded: boolean
}

export interface WindowInfo {
  id: number
  tabs: TabInfo[]
  focused: boolean
  type: string
  state: string
  topic?: string
}

export interface BookmarkNode {
  id: string
  parentId?: string
  index?: number
  title: string
  url?: string
  dateAdded?: number
  children?: BookmarkNode[]
}

export interface DuplicateGroup {
  normalizedUrl: string
  tabs: TabInfo[]
}

export interface BookmarkDuplicateGroup {
  normalizedUrl: string
  bookmarks: BookmarkNode[]
}

export interface TabCategory {
  name: string
  color: chrome.tabGroups.ColorEnum
  tabs: TabInfo[]
}

export interface WindowMergeSuggestion {
  source: WindowInfo
  target: WindowInfo
  overlap: number
  reason: string
}

export interface FolderSuggestion {
  folder: BookmarkNode
  suggestedName: string
  confidence: number
}

export type OperationProgress = {
  current: number
  total: number
  status: string
}

export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey?: string
  baseUrl: string
  model: string
  maxContextTokens: number
  temperature: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface CategoryResult {
  index: number
  category: string
}

export interface TopicResult {
  topic: string
  confidence: number
}

export interface FolderNameResult {
  name: string
}
