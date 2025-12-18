import type { TabInfo } from '@/types/domain'

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({})
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      tab.id !== undefined && tab.url !== undefined
    )
    .map(mapTab)
}

export async function getTabsInWindow(windowId: number): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ windowId })
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      tab.id !== undefined && tab.url !== undefined
    )
    .map(mapTab)
}

export async function getActiveTab(): Promise<TabInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) return null
  return mapTab(tab as chrome.tabs.Tab & { id: number; url: string })
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return
  await chrome.tabs.remove(tabIds)
}

export async function moveTabs(
  tabIds: number[],
  windowId: number,
  index = -1
): Promise<void> {
  if (tabIds.length === 0) return
  await chrome.tabs.move(tabIds, { windowId, index })
}

export async function moveTabsToIndex(
  tabIds: number[],
  index: number
): Promise<void> {
  if (tabIds.length === 0) return
  for (let i = 0; i < tabIds.length; i++) {
    const tabId = tabIds[i]
    if (tabId !== undefined) {
      await chrome.tabs.move(tabId, { index: index + i })
    }
  }
}

export async function sortTabsByDomain(windowId: number): Promise<void> {
  const tabs = await getTabsInWindow(windowId)
  const pinnedTabs = tabs.filter((t) => t.pinned)
  const unpinnedTabs = tabs.filter((t) => !t.pinned)

  unpinnedTabs.sort((a, b) => {
    const domainA = getDomain(a.url)
    const domainB = getDomain(b.url)
    return domainA.localeCompare(domainB)
  })

  const startIndex = pinnedTabs.length
  for (let i = 0; i < unpinnedTabs.length; i++) {
    const tab = unpinnedTabs[i]
    if (tab) {
      await chrome.tabs.move(tab.id, { index: startIndex + i })
    }
  }
}

export async function groupTabs(
  tabIds: number[],
  options: { title?: string; color?: chrome.tabGroups.ColorEnum; windowId?: number }
): Promise<number> {
  if (tabIds.length === 0) return -1

  const groupId = await chrome.tabs.group({
    tabIds,
    createProperties: options.windowId ? { windowId: options.windowId } : undefined,
  })

  if (options.title || options.color) {
    await chrome.tabGroups.update(groupId, {
      title: options.title,
      color: options.color,
    })
  }

  return groupId
}

export async function ungroupTabs(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return
  await chrome.tabs.ungroup(tabIds)
}

function mapTab(tab: chrome.tabs.Tab & { id: number; url: string }): TabInfo {
  return {
    id: tab.id,
    windowId: tab.windowId ?? -1,
    index: tab.index,
    url: tab.url,
    title: tab.title ?? tab.url,
    favIconUrl: tab.favIconUrl,
    pinned: tab.pinned ?? false,
    groupId: tab.groupId ?? -1,
    active: tab.active ?? false,
    discarded: tab.discarded ?? false,
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
