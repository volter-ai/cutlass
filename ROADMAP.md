# Cutlass AI Roadmap

## Shipped

### Core Editor
- Multi-track video/audio/text timeline
- Snap, transitions, animations, zoom/ken-burns export
- Deepgram transcription with word-level timecodes
- Filler word removal (4 modes)
- Scene detection from transcript
- FFmpeg WASM in-browser export (MP4/WebM)
- Project save/load (localStorage + Supabase)
- Resizable panels, cross-track drag, keyboard shortcuts

---

## In Progress

### AI Edit by Talking (Chat Mode)
Type natural language commands to edit the timeline:
- "Remove all the ums and pauses"
- "Make the intro 15 seconds"
- "Add a title card saying 'Q3 Review' at the beginning"
- "Speed up the middle section by 1.5x"

Uses OpenAI gpt-4o with structured JSON output. AI receives transcript + timeline state, returns edit operations that map to store actions. Preview before apply, single-undo-step.

### AI Document-to-Edit
Paste a requirements document (from Google Docs, etc.) describing the desired video:
- "Start with pricing discussion (5:30), then demo (12:00), skip Q&A"
- "Keep only Speaker 1 segments. Add lower-thirds for each topic."

Same AI backend, but optimized for longer input and restructuring.

---

## Planned (Near-term)

### Auto-Rough-Cut
Drop a long recording, AI identifies the strongest segments based on content density and assembles a rough cut. User refines from there.

### Smart Scene Detection (Audio-based)
Use Web Audio API to detect scene boundaries from audio energy, silence gaps, music vs. speech, applause/laughter. More accurate than pause-based detection.

### Auto-Captions with Style Transfer
"Make captions look like MrBeast / TikTok / CNN" - AI picks font, color, timing, word-by-word highlight animation using existing word-level timecodes.

---

## Planned (Medium-term)

### B-Roll Suggestions
Parse transcript, extract key topics, suggest stock footage or AI-generated images to fill visual gaps during narration.

### Audio Cleanup
Client-side noise reduction, volume normalization, echo removal via Web Audio API or ONNX model. No server needed.

### Multi-language Subtitles
Translate existing transcript to other languages using AI, burn as subtitles in export.

### Sentiment Analysis for Emotional Cuts
Detect emotional peaks in transcript (excitement, humor, tension) and suggest edit points or highlight reels.

---

## Planned (Long-term)

### Real-time Collaboration
WebSocket-based multi-user editing with conflict resolution.

### User Persistence (Supabase)
Save projects against user email, cross-device sync.

### Voice Commands (Live)
Speak editing commands instead of typing. Uses browser Speech Recognition API + same AI pipeline.

### AI Color Grading
Automatic brightness/contrast/color correction via FFmpeg filters, with AI-suggested LUT presets.
