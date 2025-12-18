import type { BookmarkNode } from '@/types/domain'

export async function getBookmarkTree(): Promise<BookmarkNode[]> {
  const tree = await chrome.bookmarks.getTree()
  return tree.map(mapBookmark)
}

export async function getBookmarkById(id: string): Promise<BookmarkNode | null> {
  try {
    const [bookmark] = await chrome.bookmarks.get(id)
    return bookmark ? mapBookmark(bookmark) : null
  } catch {
    return null
  }
}

export async function getBookmarkChildren(id: string): Promise<BookmarkNode[]> {
  try {
    const children = await chrome.bookmarks.getChildren(id)
    return children.map(mapBookmark)
  } catch {
    return []
  }
}

export async function searchBookmarks(query: string): Promise<BookmarkNode[]> {
  const results = await chrome.bookmarks.search(query)
  return results.map(mapBookmark)
}

export async function createBookmark(
  parentId: string,
  title: string,
  url?: string,
  index?: number
): Promise<BookmarkNode> {
  const bookmark = await chrome.bookmarks.create({
    parentId,
    title,
    url,
    index,
  })
  return mapBookmark(bookmark)
}

export async function createFolder(
  parentId: string,
  title: string,
  index?: number
): Promise<BookmarkNode> {
  return createBookmark(parentId, title, undefined, index)
}

export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string }
): Promise<BookmarkNode> {
  const bookmark = await chrome.bookmarks.update(id, changes)
  return mapBookmark(bookmark)
}

export async function renameBookmark(id: string, title: string): Promise<BookmarkNode> {
  return updateBookmark(id, { title })
}

export async function moveBookmark(
  id: string,
  destination: { parentId?: string; index?: number }
): Promise<BookmarkNode> {
  const bookmark = await chrome.bookmarks.move(id, destination)
  return mapBookmark(bookmark)
}

export async function removeBookmark(id: string): Promise<void> {
  await chrome.bookmarks.remove(id)
}

export async function removeBookmarkTree(id: string): Promise<void> {
  await chrome.bookmarks.removeTree(id)
}

export function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = []

  function traverse(node: BookmarkNode): void {
    result.push(node)
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  for (const node of nodes) {
    traverse(node)
  }

  return result
}

export function getAllBookmarkUrls(nodes: BookmarkNode[]): BookmarkNode[] {
  return flattenBookmarks(nodes).filter((node) => node.url !== undefined)
}

export function getAllFolders(nodes: BookmarkNode[]): BookmarkNode[] {
  return flattenBookmarks(nodes).filter((node) => node.url === undefined)
}

export function isFolder(node: BookmarkNode): boolean {
  return node.url === undefined
}

export function isGenericFolderName(name: string): boolean {
  const genericNames = [
    'new folder',
    'untitled',
    'folder',
    'bookmarks',
    'new',
  ]
  const normalized = name.toLowerCase().trim()
  if (genericNames.includes(normalized)) return true
  if (/^folder\s*\(\d+\)$/i.test(name)) return true
  if (/^new folder\s*\(\d+\)$/i.test(name)) return true
  if (/^untitled\s*\(\d+\)$/i.test(name)) return true
  return false
}

function mapBookmark(bookmark: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: bookmark.id,
    parentId: bookmark.parentId,
    index: bookmark.index,
    title: bookmark.title,
    url: bookmark.url,
    dateAdded: bookmark.dateAdded,
    children: bookmark.children?.map(mapBookmark),
  }
}
