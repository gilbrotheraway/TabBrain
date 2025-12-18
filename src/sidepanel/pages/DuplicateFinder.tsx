import { useState, useMemo } from 'react'
import type { DuplicateGroup } from '@/types/domain'
import { useDuplicateTabs } from '../hooks'
import { ConfirmDialog } from '../components'

interface DuplicateFinderProps {
  onBack: () => void
}

export function DuplicateFinder({ onBack }: DuplicateFinderProps) {
  const { duplicates, loading, error, scan, closeDuplicates } = useDuplicateTabs()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [closing, setClosing] = useState(false)

  // Flatten all duplicate tabs for selection
  const allDuplicateTabs = useMemo(() => {
    return duplicates.flatMap((group) => group.tabs.slice(1)) // Skip first (keep)
  }, [duplicates])

  const totalDuplicates = allDuplicateTabs.length

  const handleScan = async () => {
    setSelectedIds(new Set())
    await scan()
  }

  const handleSelectAllDuplicates = () => {
    setSelectedIds(new Set(allDuplicateTabs.map((t) => t.id)))
  }

  const handleCloseDuplicates = async () => {
    if (selectedIds.size === 0) return

    setClosing(true)
    await closeDuplicates(Array.from(selectedIds))
    setSelectedIds(new Set())
    setClosing(false)
    setShowConfirm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <BackIcon />
        </button>
        <h2 className="text-lg font-medium">Find Duplicates</h2>
      </div>

      {!duplicates.length && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Scan your browser for duplicate tabs
          </p>
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan for Duplicates'}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Scanning tabs...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {duplicates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Found {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} in {duplicates.length} group{duplicates.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleScan}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Rescan
              </button>
              <button
                onClick={handleSelectAllDuplicates}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Select All Duplicates
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {duplicates.map((group, idx) => (
              <DuplicateGroupCard
                key={idx}
                group={group}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 -mx-4">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={closing}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Close {selectedIds.size} Tab{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Close Duplicate Tabs"
        message={`Are you sure you want to close ${selectedIds.size} duplicate tab${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Close Tabs"
        variant="danger"
        onConfirm={handleCloseDuplicates}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
}

function DuplicateGroupCard({
  group,
  selectedIds,
  onSelectionChange,
}: DuplicateGroupCardProps) {
  const keepTab = group.tabs[0]
  const duplicateTabs = group.tabs.slice(1)

  const toggleTab = (id: number) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange(newSelection)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium truncate" title={group.normalizedUrl}>
          {group.normalizedUrl}
        </p>
        <p className="text-xs text-gray-500">
          {group.tabs.length} tabs
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {keepTab && (
          <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded">
                Keep
              </span>
              <span className="text-sm truncate">{keepTab.title}</span>
            </div>
          </div>
        )}

        {duplicateTabs.map((tab) => (
          <div key={tab.id} className="px-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(tab.id)}
                onChange={() => toggleTab(tab.id)}
                className="rounded"
              />
              <span className="text-sm truncate">{tab.title}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                W{tab.windowId}
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
