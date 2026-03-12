# Cutlass — Code Review

Three full passes across all 37 source files. All previously identified issues
have been fixed. The codebase is in good shape. Below are any remaining known
limitations or deliberate trade-offs worth being aware of.

---

## Known Limitations / Deliberate Trade-offs

### slide-* animations preview-only
**File:** `src/services/export.ts`

Slide-left, slide-right, slide-up, and slide-down animations use CSS transforms
in the Viewer preview. The export applies zoom-in, zoom-out, ken-burns (via
`zoompan`), and all fade variants — but slides would require animated overlay
x/y expressions and are intentionally omitted.

### Audio elements kept alive between clip activations
**File:** `src/hooks/useAudioPlayback.ts`

Out-of-range audio clips keep their `<audio>` elements in the ref map so they can
resume instantly when the playhead re-enters. They are only fully removed when the
clip is deleted. This is intentional for low-latency resume, but on a large project
with many audio clips it accumulates elements.

### Fire-and-forget media recovery on project load
**Files:** `src/App.tsx`, `src/components/projects/ProjectsModal.tsx`

IndexedDB media recovery uses `.then()` without awaiting. In theory: if the user
loads a second project before the first batch of IndexedDB lookups completes, the
`addMediaFile` calls from the first project will still land. In practice harmless
because `addMediaFile` is idempotent (`state.mediaFiles[id] = file`).

---

## Bahar tester feedback — fixes (2026-03-11)

| Issue | Fix |
|-------|-----|
| Video fade in/out had no effect | `Viewer.tsx`: multiply video opacity by `computeVideoFadeMultiplier`; `export.ts`: add `fade=t=in/out` FFmpeg filters for video clips |
| Transcript → captions required manual copy-paste | New `addTranscriptCaptionsToTimeline` store action; "Add Captions" button in Transcript panel creates timed `TextOverlay` objects visible in preview |
| No background option for vertical/square aspect ratios | `backgroundColor` added to `ProjectSettings`; color picker in Settings panel; applied in viewer and FFmpeg export canvas |
| Undo/redo too granular (one entry per drag pixel) | `temporal.pause()` at drag start, `temporal.resume()` at drag end in `TimelineClip` and `TextOverlayClip` |

Open GitHub issues filed for remaining UX items: #8 (effect discoverability), #9 (animation/transition badges on clips).

---

## Bahar tester feedback — fixes (2026-03-11, round 2)

| Issue | Fix |
|-------|-----|
| Demo transcript looks like a real transcript | `TranscriptPanel.tsx`: warning shown before Transcribe button when no API key; amber DEMO banner shown above transcript content when key is absent |
| New project keeps previous timeline content | `ProjectsModal.tsx`: `handleNew` now calls `storeApi.setState` with `DEFAULT_TRACKS`/empty clips/overlays/transcripts to reset the canvas; `DEFAULT_TRACKS` exported from `store/timeline.ts` |
| Caption style presets don't apply to existing overlays | `store/timeline.ts`: `setCaptionStyle` now iterates all `textOverlays` and syncs fontSize, color, backgroundColor, fontFamily, y-position whenever any of those fields are included in the style update |
| Captions not editable / editing not discoverable | `TextOverlayClip.tsx`: native tooltip `title` now reads "Double-click to edit text • Click to style in Settings"; a small ✎ pencil hint appears on hover |

GitHub issues: #10, #11, #12, #13

---

## Valentin tester feedback — fixes (2026-03-11)

| Issue | Fix / Status |
|-------|-------------|
| Image overlays | `TimelineClip.type` extended to `'video'\|'audio'\|'image'`; `addClipToTrack` sets type `'image'` and defaults to 5s duration; `Viewer.tsx` renders active image clips as `<img>` overlays with full animation/fade/transform support |
| Text entry/exit animations | `TextOverlay` gains `fadeIn?` and `fadeOut?` fields; Viewer computes per-overlay opacity fade; Settings panel shows Fade In / Fade Out sliders when a text overlay is selected |
| Text fonts/styles | Already fully implemented — font, size, weight, color, background, outline, position, align in Settings panel when overlay selected |
| Sound effects library | Filed as #16 — significant new feature |
| Performance optimization | Filed as #17 — needs profiling |
| Slide transitions in export | Already exist as clip animation presets in the Viewer; FFmpeg export not yet supported (REVIEW.md known limitation), filed as #17 |

GitHub issues: #14, #15, #16, #17

---

## No open actionable issues

After three review passes the following have all been addressed:

| Area | Fixes applied |
|------|---------------|
| Timeline duration | `removeClip`, `rippleDelete`, `removeTrack`, `setClipSpeed`, `removeFillerWords`, `moveClip`, `moveClipsBatch`, project load (App + ProjectsModal) all call `recalculateDuration()` |
| Filler word deletion | Boundary regions (leading/trailing edge) now handled; `recalculateDuration()` called after |
| Audio correctness | Double-audio for linked clips fixed in both `useAudioPlayback` and `export.ts`; clip speed applied to mediaTime and playbackRate |
| Export | Caption label collision fixed; double-audio for linked clips fixed; `transitionOut` applied; zoom-in/zoom-out/ken-burns via `zoompan` |
| React performance | `useKeyboardShortcuts` listener stability; `Timeline.tsx` `trackPositions` memo deps; `TimelineRuler` ticks memoized; `WaveformBars` memoized; `Viewer.tsx` `activeClip` memoized; `useAudioPlayback` cleanup loop uses Set instead of O(n) `some()` |
| Store | `ASPECT_DIMS` duplication removed (imports from types); `removeFillerWords` boundary regions added |
| Services | IndexedDB connection cached; dead `formData` in transcription removed |
| UI bugs | Context menu scrollable + viewport-aware position; ghost clip on file delete; volume isolation; TextOverlayClip trim drift; thumbnail frame capture (onseeked pattern) |
| UX | TranscriptPanel shows error message when transcription fails |
| Cleanup | `HelpOverlay` dead `borderBottom` removed |
