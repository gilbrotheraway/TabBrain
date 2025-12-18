import type { LLMConfig } from '@/types/domain'

export interface StorageSchema {
  llmConfig?: LLMConfig
  windowTopics?: Record<number, string>
  lastScanResults?: {
    duplicates?: number
    timestamp?: number
  }
  settings?: {
    autoGroupTabs?: boolean
    showNotifications?: boolean
    darkMode?: 'auto' | 'light' | 'dark'
  }
}

type StorageKey = keyof StorageSchema

export async function getStorage<K extends StorageKey>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as StorageSchema[K] | undefined
}

export async function getStorageMultiple<K extends StorageKey>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  const result = await chrome.storage.local.get(keys)
  return result as Pick<StorageSchema, K>
}

export async function setStorage<K extends StorageKey>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function setStorageMultiple(
  items: Partial<StorageSchema>
): Promise<void> {
  await chrome.storage.local.set(items)
}

export async function removeStorage(keys: StorageKey | StorageKey[]): Promise<void> {
  await chrome.storage.local.remove(keys)
}

export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear()
}

export function onStorageChange(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local') {
      callback(changes)
    }
  }

  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// Session storage for temporary state
export async function getSessionStorage<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.session.get(key)
  return result[key] as T | undefined
}

export async function setSessionStorage<T>(key: string, value: T): Promise<void> {
  await chrome.storage.session.set({ [key]: value })
}

export async function clearSessionStorage(): Promise<void> {
  await chrome.storage.session.clear()
}

// LLM Config helpers
export async function getLLMConfig(): Promise<LLMConfig | undefined> {
  return getStorage('llmConfig')
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  await setStorage('llmConfig', config)
}

// Window topics helpers
export async function getWindowTopic(windowId: number): Promise<string | undefined> {
  const topics = await getStorage('windowTopics')
  return topics?.[windowId]
}

export async function saveWindowTopic(windowId: number, topic: string): Promise<void> {
  const topics = (await getStorage('windowTopics')) ?? {}
  topics[windowId] = topic
  await setStorage('windowTopics', topics)
}

export async function removeWindowTopic(windowId: number): Promise<void> {
  const topics = (await getStorage('windowTopics')) ?? {}
  delete topics[windowId]
  await setStorage('windowTopics', topics)
}
