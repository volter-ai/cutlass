# Cutlass - AI-Assisted Video Editor

A web-based video editing suite that combines a Premiere Pro-style timeline with AI-powered transcription, scene detection, and filler word removal. Think Descript meets Premiere Pro in the browser.

## Features

### Core Editing
- **Multi-track timeline** with video tracks (stacked above) and audio tracks (below) - Premiere Pro layout
- **Media bin** with drag-and-drop import and thumbnail previews
- **Program monitor** with synchronized video playback
- **Clip operations**: move, trim (drag edges), split at playhead (Cmd+K), delete, ripple delete
- **Razor tool** for click-to-split editing
- **Track controls**: mute/solo, lock, per-track visibility
- **Undo/redo** with full history (Cmd+Z / Cmd+Shift+Z)

### AI-Powered Features
- **Transcription** with word-level timecodes (Deepgram Nova-3 or demo mode)
- **Timecoded transcript panel** - click any word to seek to that moment
- **Filler word detection** - automatically identifies "um", "uh", "like", "you know", etc.
- **4-mode filler removal** (inspired by Descript):
  - **Delete**: Remove from audio and timeline
  - **Replace with gap**: Insert silence to preserve pacing
  - **Ignore**: Visual marker only, audio untouched
  - **Transcript only**: Remove from text, keep audio
- **Scene detection** from transcript analysis (pauses and speaker changes)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `V` | Select tool |
| `C` | Razor tool |
| `Cmd+K` | Split all clips at playhead |
| `Delete` | Delete selected clips |
| `Shift+Delete` | Ripple delete (close gap) |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Left/Right` | Step 1 frame |
| `Shift+Left/Right` | Step 5 frames |
| `Cmd++/-` | Zoom in/out |

## Tech Stack

- **React 19** + TypeScript + Vite
- **Zustand** + Zundo for state management with undo/redo
- **Tailwind CSS** for styling
- **Deepgram Nova-3** for speech-to-text (optional - works in demo mode without API key)
- **Lucide React** for icons

## Getting Started

```bash
npm install
npm run dev
```

### With Transcription API

To enable real transcription (instead of demo mode), set your Deepgram API key:

```bash
# Create a .env.local file
echo "VITE_DEEPGRAM_API_KEY=your_key_here" > .env.local
npm run dev
```

## Architecture

```
src/
  components/
    toolbar/        # Top toolbar with tools, transport, zoom
    media-bin/      # Left panel: imported media files
    transcript/     # Left panel: AI transcription with filler detection
    viewer/         # Program monitor: video preview
    timeline/       # Multi-track timeline with clips
  hooks/
    useKeyboardShortcuts.ts   # Global keyboard bindings
    usePlayback.ts            # requestAnimationFrame playback loop
  services/
    transcription.ts          # Deepgram API + demo mode fallback
  store/
    timeline.ts               # Zustand store with all editor state
  types/
    index.ts                  # TypeScript interfaces
  utils/
    time.ts                   # Timecode formatting
    media.ts                  # File import, thumbnails, metadata
```

## Design Influences

- **Adobe Premiere Pro**: 4-panel layout (bin, program monitor, timeline), track structure (V1/V2 above, A1/A2 below), keyboard shortcuts (Space, Cmd+K, V/C tool switching), linked audio+video clips
- **Descript**: Text-based editing panel with clickable timecoded words, filler word detection with 4 removal modes, scene boundaries derived from transcript
- **CapCut**: AI features accessible as simple actions (one-click transcribe, right-click scene detection)

## Roadmap

- [ ] Audio waveform rendering (wavesurfer.js)
- [ ] WebCodecs-based video processing (Mediabunny)
- [ ] Export to MP4/WebM
- [ ] Drag reordering between tracks
- [ ] Snap-to-edit-point
- [ ] Source monitor with In/Out points
- [ ] Effects and transitions
- [ ] Multi-speaker diarization display
- [ ] AI-powered scene descriptions
