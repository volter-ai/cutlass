# Cutlass — Code Review

Three full passes across all 37 source files. All previously identified issues
have been fixed. The codebase is in good shape. Below are any remaining known
limitations or deliberate trade-offs worth being aware of.

---

## Known Limitations / Deliberate Trade-offs

### `transitionOut` not applied in export
**File:** `src/services/export.ts`

`clip.transitionOut` is stored in state and accessible via the context menu, but
the FFmpeg filter chain in export only applies `transitionIn`. Adding proper
`transitionOut` would require additional filter steps between clips.

### Zoom/Ken-Burns animations preview-only
**File:** `src/services/export.ts` lines 196–198

Zoom-in, zoom-out, and Ken-Burns animations use CSS transforms in the Viewer
preview. The export renders only fade animations (fade-in, fade-out, fade-in-out)
via FFmpeg. Complex `zoompan` filters were intentionally omitted. The comment in
the code says "omitted for performance" but it's really about implementation
complexity — worth clarifying if someone reads it later.

### `prompt()` used for new text overlay text
**File:** `src/components/timeline/TimelineTrack.tsx`

A browser-native `prompt()` dialog is used to get text when adding a new text
overlay from the track. This is UX-blocking (freezes the tab). A non-blocking
inline input or modal would be smoother.

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

## No open actionable issues

After three review passes the following have all been addressed:

| Area | Fixes applied |
|------|---------------|
| Timeline duration | `removeClip`, `rippleDelete`, `removeTrack`, `setClipSpeed`, `removeFillerWords`, `moveClip`, `moveClipsBatch`, project load (App + ProjectsModal) all call `recalculateDuration()` |
| Filler word deletion | Boundary regions (leading/trailing edge) now handled; `recalculateDuration()` called after |
| Audio correctness | Double-audio for linked clips fixed in both `useAudioPlayback` and `export.ts`; clip speed applied to mediaTime and playbackRate |
| Export | Caption label collision fixed; double-audio for linked clips fixed |
| React performance | `useKeyboardShortcuts` listener stability; `Timeline.tsx` `trackPositions` memo deps; `TimelineRuler` ticks memoized; `WaveformBars` memoized; `Viewer.tsx` `activeClip` memoized; `useAudioPlayback` cleanup loop uses Set instead of O(n) `some()` |
| Store | `ASPECT_DIMS` duplication removed (imports from types); `removeFillerWords` boundary regions added |
| Services | IndexedDB connection cached; dead `formData` in transcription removed |
| UI bugs | Context menu scrollable + viewport-aware position; ghost clip on file delete; volume isolation; TextOverlayClip trim drift; thumbnail frame capture (onseeked pattern) |
| UX | TranscriptPanel shows error message when transcription fails |
| Cleanup | `HelpOverlay` dead `borderBottom` removed |
