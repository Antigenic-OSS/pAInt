'use client'

import { useState, useCallback } from 'react'
import { useEditorStore } from '@/store'
import { BREAKPOINT_LABELS } from '@/types/changelog'
import type { Breakpoint } from '@/types/changelog'
import { ProjectRootSelector } from './ProjectRootSelector'

interface ApplyConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ApplyConfirmModal({
  onConfirm,
  onCancel,
}: ApplyConfirmModalProps) {
  const targetUrl = useEditorStore((s) => s.targetUrl)
  const portRoots = useEditorStore((s) => s.portRoots)
  const projectRoot = targetUrl ? (portRoots[targetUrl] ?? null) : null
  const styleChanges = useEditorStore((s) => s.styleChanges)
  const parsedDiffs = useEditorStore((s) => s.parsedDiffs)
  const elementSnapshots = useEditorStore((s) => s.elementSnapshots)

  const [folderConfirmed, setFolderConfirmed] = useState(false)
  const [changingFolder, setChangingFolder] = useState(false)

  const handleFolderSaved = useCallback(() => {
    setChangingFolder(false)
    setFolderConfirmed(false)
  }, [])

  // Derive unique pages from element snapshots
  const pages = Array.from(
    new Set(
      Object.values(elementSnapshots)
        .map((snap) => snap.pagePath)
        .filter(Boolean),
    ),
  )

  // Derive unique breakpoints from style changes
  const breakpoints = Array.from(
    new Set(styleChanges.map((c) => c.breakpoint)),
  ) as Breakpoint[]

  // Files that will be modified
  const files = parsedDiffs.map((d) => d.filePath)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onCancel}
    >
      <div
        className="w-[380px] max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--warning)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Confirm Apply All
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-4 py-3">
          {/* Project folder — must be confirmed */}
          <div
            className="flex flex-col gap-2 px-3 py-2.5 rounded"
            style={{
              background: folderConfirmed
                ? 'rgba(78, 201, 176, 0.06)'
                : 'rgba(251, 191, 36, 0.06)',
              border: `1px solid ${folderConfirmed ? 'var(--success)' : 'var(--warning)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-medium uppercase tracking-wide"
                style={{
                  color: folderConfirmed ? 'var(--success)' : 'var(--warning)',
                }}
              >
                Target Project Folder
              </span>
              {projectRoot && !changingFolder && (
                <button
                  onClick={() => {
                    setChangingFolder(true)
                    setFolderConfirmed(false)
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--accent)' }}
                >
                  Change
                </button>
              )}
            </div>

            {changingFolder && targetUrl ? (
              <ProjectRootSelector
                targetUrl={targetUrl}
                onSaved={handleFolderSaved}
              />
            ) : projectRoot ? (
              <>
                <div
                  className="px-2.5 py-1.5 rounded text-xs font-mono truncate"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                  title={projectRoot}
                >
                  {projectRoot}
                </div>
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={folderConfirmed}
                    onChange={(e) => setFolderConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span
                    className="text-[11px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    I confirm this is the correct project folder for{' '}
                    <span
                      className="font-mono"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {(() => {
                        try {
                          return new URL(targetUrl!).host
                        } catch {
                          return targetUrl
                        }
                      })()}
                    </span>
                  </span>
                </label>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[11px]" style={{ color: 'var(--error)' }}>
                  No project folder set. Select one before applying.
                </span>
                {targetUrl && (
                  <ProjectRootSelector
                    targetUrl={targetUrl}
                    onSaved={handleFolderSaved}
                  />
                )}
              </div>
            )}
          </div>

          {/* Pages affected */}
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Pages Affected
            </span>
            <div className="flex flex-col gap-1">
              {pages.length > 0 ? (
                pages.map((page) => (
                  <div
                    key={page}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--accent)', fontSize: 10 }}>
                      &#9679;
                    </span>
                    {page}
                  </div>
                ))
              ) : (
                <div
                  className="px-2.5 py-1.5 rounded text-xs"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Current page
                </div>
              )}
            </div>
          </div>

          {/* Items count */}
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Changes to Apply
            </span>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <span
                  style={{ color: 'var(--accent)' }}
                  className="font-semibold"
                >
                  {styleChanges.length}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  style change{styleChanges.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <span
                  style={{ color: 'var(--accent)' }}
                  className="font-semibold"
                >
                  {files.length}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  file{files.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Devices */}
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Devices
            </span>
            <div className="flex items-center gap-2">
              {breakpoints.map((bp) => (
                <div
                  key={bp}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {bp === 'mobile' && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  )}
                  {bp === 'tablet' && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  )}
                  {bp === 'desktop' && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                  {BREAKPOINT_LABELS[bp]}
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div
            className="flex gap-2 px-3 py-2.5 rounded text-[11px] leading-relaxed"
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              color: 'var(--warning)',
            }}
          >
            <span className="flex-shrink-0 mt-0.5">Tip:</span>
            <span>
              For best results, apply changes one at a time and test each before
              proceeding. This makes it easier to catch issues and revert if
              needed.
            </span>
          </div>
        </div>

        {/* Footer buttons */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!folderConfirmed || !projectRoot}
            className="px-4 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Apply All Changes
          </button>
        </div>
      </div>
    </div>
  )
}
