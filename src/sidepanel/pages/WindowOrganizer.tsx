import { useState, useEffect } from 'react'
import type { WindowInfo } from '@/types/domain'
import { useWindows, useWindowTopic, useCategorizeTabs, useTabGroups, useLLMConfig } from '../hooks'
import { TabList, ProgressOverlay } from '../components'

interface WindowOrganizerProps {
  onBack: () => void
}

export function WindowOrganizer({ onBack }: WindowOrganizerProps) {
  const { windows, loading, refresh } = useWindows()
  const { isConfigured } = useLLMConfig()
  const [selectedWindow, setSelectedWindow] = useState<WindowInfo | null>(null)

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            AI provider not configured. Please set up your API in settings.
          </p>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Open Settings
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    )
  }

  if (selectedWindow) {
    return (
      <WindowDetail
        window={selectedWindow}
        onBack={() => {
          setSelectedWindow(null)
          refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Header onBack={onBack} />

      <p className="text-sm text-gray-500">
        {windows.length} window{windows.length !== 1 ? 's' : ''} open
      </p>

      <div className="space-y-2">
        {windows.map((window) => (
          <WindowCard
            key={window.id}
            window={window}
            onClick={() => setSelectedWindow(window)}
          />
        ))}
      </div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBack}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <BackIcon />
      </button>
      <h2 className="text-lg font-medium">Organize Windows</h2>
    </div>
  )
}

interface WindowCardProps {
  window: WindowInfo
  onClick: () => void
}

function WindowCard({ window, onClick }: WindowCardProps) {
  const tabCount = window.tabs.length
  const domains = [...new Set(window.tabs.map((t) => getDomain(t.url)))].slice(0, 3)

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {window.topic ?? `Window ${window.id}`}
          </p>
          <p className="text-sm text-gray-500">
            {tabCount} tab{tabCount !== 1 ? 's' : ''}
          </p>
        </div>
        {window.focused && (
          <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
            Current
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1 truncate">
        {domains.join(', ')}
      </p>
    </button>
  )
}

interface WindowDetailProps {
  window: WindowInfo
  onBack: () => void
}

function WindowDetail({ window, onBack }: WindowDetailProps) {
  const { detectTopic, loading: detectingTopic } = useWindowTopic()
  const { categorize, loading: categorizing, results } = useCategorizeTabs()
  const { createGroups, sortByDomain, loading: grouping } = useTabGroups()
  const [topic, setTopic] = useState(window.topic ?? '')
  const [editingTopic, setEditingTopic] = useState(false)

  const handleDetectTopic = async () => {
    const result = await detectTopic(window.id)
    if (result) {
      setTopic(result.topic)
    }
  }

  const handleCategorize = async () => {
    await categorize(window.id)
  }

  const handleCreateGroups = async () => {
    if (results.length === 0) return
    await createGroups(results, window.id)
  }

  const handleSortByDomain = async () => {
    await sortByDomain(window.id)
  }

  const categories = new Map(results.map((r) => [r.tab.id, r.category]))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <BackIcon />
        </button>
        <div className="flex-1">
          {editingTopic ? (
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onBlur={() => setEditingTopic(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTopic(false)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
              autoFocus
            />
          ) : (
            <h2
              className="text-lg font-medium cursor-pointer hover:text-primary-600"
              onClick={() => setEditingTopic(true)}
            >
              {topic || `Window ${window.id}`}
            </h2>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDetectTopic}
          disabled={detectingTopic}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {detectingTopic ? 'Detecting...' : 'Detect Topic'}
        </button>
        <button
          onClick={handleCategorize}
          disabled={categorizing}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {categorizing ? 'Categorizing...' : 'Categorize Tabs'}
        </button>
        <button
          onClick={handleSortByDomain}
          disabled={grouping}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Sort by Domain
        </button>
      </div>

      {results.length > 0 && (
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm mb-2">Tabs categorized! Ready to create groups.</p>
          <button
            onClick={handleCreateGroups}
            disabled={grouping}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Create Tab Groups
          </button>
        </div>
      )}

      <TabList
        tabs={window.tabs}
        showCategory={results.length > 0}
        categories={categories}
      />

      {(categorizing || grouping) && (
        <ProgressOverlay
          progress={{ current: 0, total: 1, status: 'Processing...' }}
        />
      )}
    </div>
  )
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
