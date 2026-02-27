---
phase: 05-frontend-tech-debt
plan: 03
subsystem: frontend
tags: [react, tanstack-table, useCallback, memo, admin-ui, refactor]
dependency_graph:
  requires:
    - 05-02 (DataTable, FilterBar, Pagination, SectionErrorBoundary shared components)
  provides:
    - AdminCasesPage consuming DataTable, FilterBar, Pagination with useCallback handlers
    - AdminStudiesPage consuming DataTable, FilterBar, Pagination with useCallback handlers
  affects:
    - frontend/src/pages/admin/AdminCasesPage.tsx
    - frontend/src/pages/admin/AdminStudiesPage.tsx
    - frontend/src/pages/admin/components/DataTable.tsx
tech_stack:
  added: []
  patterns:
    - "ColumnDef<TData>[] useMemo for table column definitions replacing inline CaseRow/StudyRow components"
    - "useCallback with whole mutation object dependency (not mutation.mutate) to satisfy React Compiler"
    - "React.memo wrapping CaseCard and StudyCard to prevent unnecessary re-renders on parent re-render"
    - "column meta.className pattern for passing hidden lg:table-cell to DataTable header/cell elements"
key_files:
  created: []
  modified:
    - frontend/src/pages/admin/AdminCasesPage.tsx
    - frontend/src/pages/admin/AdminStudiesPage.tsx
    - frontend/src/pages/admin/components/DataTable.tsx
decisions:
  - "Use whole mutation object (activateMutation, closeMutation) not mutation.mutate in useCallback deps — React Compiler's preserve-manual-memoization rule requires it; exhaustive-deps also flags sub-property access"
  - "column meta.className added to DataTable module augmentation so hidden lg:table-cell propagates through DataTable to TableHead and TableCell without wrapper divs"
  - "CaseRow and StudyRow deleted entirely — replaced by ColumnDef arrays closing over memoized handlers; no behavior change"
  - "CaseCard/StudyCard closures () => handleX(item.id) create new function refs per render per row, acceptable for memo-wrapped mobile cards — avoids changing the card interface unnecessarily"
metrics:
  duration: "~283 seconds"
  completed_date: "2026-02-27"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 05 Plan 03: Admin Page Refactor Summary

**One-liner:** Refactored AdminCasesPage and AdminStudiesPage to consume shared DataTable, FilterBar, Pagination components with React.memo on card components and useCallback-memoized action handlers.

## What Was Built

### Task 1: Refactor AdminCasesPage (DEBT-07, DEBT-09)

Rewrote `frontend/src/pages/admin/AdminCasesPage.tsx`:

- Removed inline `Table/TableBody/TableCell/TableHead/TableHeader/TableRow`, `ChevronLeft/ChevronRight`, `Search`, `Input`, `Select/SelectContent/SelectItem/SelectTrigger/SelectValue` imports
- Added `DataTable`, `FilterBar`, `Pagination`, `SectionErrorBoundary` from shared components
- Added `useCallback`, `useMemo`, `memo` from React; `ColumnDef` from `@tanstack/react-table`
- Deleted `CaseRow` function entirely — replaced by `ColumnDef<Case, unknown>[]` defined with `useMemo`
- Column definitions: title (flex/w-999), status (100px), responses (80px, text-center), created (100px, hidden lg:table-cell), deadline (100px, hidden lg:table-cell), actions (50px)
- Wrapped `CaseCard` in `React.memo`
- Memoized 7 action handlers with `useCallback`: handleView, handleEdit, handleDelete, handlePublish, handleClose, handleViewAnalytics, handleViewDivergence
- `statusOptions` computed with `useMemo`
- `formatDate` and `isDeadlinePassed` utilities wrapped in `useCallback`
- `FilterBar` replaces the 26-line filter section
- `SectionErrorBoundary` wraps `DataTable` in the desktop section
- `Pagination` replaces the 34-line pagination section

Also updated `DataTable.tsx` (Rule 3 fix): Added `ColumnMeta` module augmentation for `className?: string` and passed `column.columnDef.meta?.className` to both `TableHead` and `TableCell` — required for `hidden lg:table-cell` columns to work through the generic DataTable.

### Task 2: Refactor AdminStudiesPage (DEBT-08, DEBT-09)

Same pattern applied to `frontend/src/pages/admin/AdminStudiesPage.tsx`:

- Deleted `StudyRow` function — replaced by `ColumnDef<Study, unknown>[]` with `useMemo`
- Column definitions: title (flex), status (100px), cases (80px, text-center), raters (80px, text-center), responses (100px, text-center, hidden lg:table-cell), created (100px, hidden lg:table-cell), actions (50px)
- Wrapped `StudyCard` in `React.memo`
- Memoized 5 action handlers: handleEdit, handleDelete, handleActivate, handleClose, handleViewReliability
- Preserved all status-conditional action logic: draft+case_count>0=activate, active=close, draft=delete; active/closed=reliability
- `studyStatusOptions` computed with `useMemo`
- `FilterBar`, `SectionErrorBoundary + DataTable`, `Pagination` replace the inline markup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DataTable did not forward column meta.className to TableHead/TableCell**
- **Found during:** Task 1
- **Issue:** DataTable rendered `<TableHead>` and `<TableCell>` without any className from column definitions, breaking `hidden lg:table-cell` on created/deadline/responses columns
- **Fix:** Added `@tanstack/react-table` module augmentation for `ColumnMeta<TData, TValue>.className?: string` and passed `column.columnDef.meta?.className` to TableHead and TableCell in DataTable
- **Files modified:** `frontend/src/pages/admin/components/DataTable.tsx`
- **Commit:** fe47bff (included in Task 2 commit)

**2. [Rule 1 - Bug] React Compiler rejected mutation.mutate sub-property in useCallback deps**
- **Found during:** Task 1 and Task 2 lint verification
- **Issue:** `react-hooks/preserve-manual-memoization` errored when using `[publishMutation.mutate]` as deps; React Compiler infers the whole `publishMutation` object
- **Fix:** Changed all mutation useCallback deps from `[mutation.mutate]` to `[mutation]` (whole object) — this satisfies both React Compiler and `react-hooks/exhaustive-deps`
- **Note:** Plan comment about `.mutate` sub-property stability is correct in principle but conflicts with React Compiler's static analysis in this project's ESLint config
- **Files modified:** `frontend/src/pages/admin/AdminCasesPage.tsx`, `frontend/src/pages/admin/AdminStudiesPage.tsx`
- **Commit:** fe47bff

## Verification Results

- `npx tsc --noEmit`: Passes with no errors
- `npm run lint`: 1 warning only (pre-existing `useReactTable` incompatible-library advisory from DataTable, noted in 05-02 SUMMARY)
- DataTable and FilterBar imported 1x in each of AdminCasesPage and AdminStudiesPage
- useCallback count: 10 in AdminCasesPage, 7 in AdminStudiesPage
- memo() count: 1 in each page
- `function CaseRow`: 0 occurrences in AdminCasesPage
- `function StudyRow`: 0 occurrences in AdminStudiesPage

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6902917 | feat(05-03): refactor AdminCasesPage to use DataTable, FilterBar, Pagination with useCallback |
| 2 | fe47bff | feat(05-03): refactor AdminStudiesPage to use DataTable, FilterBar, Pagination with useCallback |

## Self-Check: PASSED
