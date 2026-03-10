# Cutlass - Production Roadmap

## Must-Have for Producing Real Videos

- [x] **Export to MP4/WebM** - Render timeline to downloadable file via ffmpeg.wasm
- [x] **Audio playback sync** - Multi-track audio mixing during playback (music bed, VO, SFX)
- [x] **Real transcription** - Settings panel for Deepgram API key, persist in localStorage
- [x] **Transitions** - Cross-dissolve and fade-to-black between clips

## High-Value for Ad/Social Production

- [x] **Text overlays / titles** - Text track with positioning, font, color, timing
- [x] **Auto-captions** - Burn-in subtitles from transcript, style presets for TikTok/Reels/Shorts
- [x] **Aspect ratio presets** - 16:9, 9:16, 1:1, 4:5 with one-click switching
- [x] **Snap-to-edit-point** - Timeline snapping for aligning cuts to beats/scene boundaries

## Audio/Video Controls

- [x] **Extract/Unlink audio** - Premiere Pro-style audio extraction from video clips, linked movement, unlink for independent control (U key)
- [x] **Audio fades** - Fade in/out on clips with visual indicators, drag handles, and ffmpeg export support
- [x] **Video transitions UI** - Right-click context menu to configure transitions per-clip
- [x] **Per-clip volume** - Volume slider in context menu + rubber band line on clips
- [x] **Per-track volume** - Master fader per track (click % label to toggle slider)
- [x] **Linked clip behavior** - Video transitions auto-apply matching audio fades to linked audio

## Upcoming

- [ ] **Onboarding / Tutorials** - Interactive walkthrough for new users: import media, arrange on timeline, cut/trim, transcribe, remove fillers, export. Tooltip-based or overlay-based guided tour.
- [ ] **Projects & file management** - Save/load projects, organize media across multiple editing sessions
- [ ] **User accounts** - Auth layer so users can privately manage their own files and projects across devices

## Nice-to-Have Polish (Later)

- [ ] Audio waveform rendering (wavesurfer.js)
- [ ] Drag-and-drop between tracks
- [ ] Source monitor with In/Out points
- [ ] Template system for recurring ad formats
