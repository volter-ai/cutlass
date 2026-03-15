import type { TimelineState } from '../store/timeline';
import type { AIEditResponse } from './ai-edit-operations';

// --- Context builder ---

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Serialize timeline state into a compact text context for the LLM.
 * Keeps total size under ~3000 tokens so we leave room for the user's message.
 */
export function buildContext(state: TimelineState): string {
  const lines: string[] = [];

  // Tracks
  lines.push('## Tracks');
  for (const track of state.tracks) {
    lines.push(`- ${track.id} (${track.type}) "${track.name}"${track.muted ? ' [muted]' : ''}`);
  }

  // Clips
  lines.push('\n## Clips');
  const clipList = Object.values(state.clips).sort((a, b) => a.startTime - b.startTime);
  for (const clip of clipList) {
    const parts = [
      `id=${clip.id}`,
      `track=${clip.trackId}`,
      `"${clip.name}"`,
      `${formatTime(clip.startTime)}-${formatTime(clip.startTime + clip.duration)}`,
      `dur=${clip.duration.toFixed(1)}s`,
    ];
    if (clip.speed !== 1) parts.push(`speed=${clip.speed}x`);
    if (clip.volume !== 1) parts.push(`vol=${Math.round(clip.volume * 100)}%`);
    if (clip.animation?.preset && clip.animation.preset !== 'none') parts.push(`anim=${clip.animation.preset}`);
    if (clip.transitionIn) parts.push(`transIn=${clip.transitionIn.type}`);
    if (clip.transitionOut) parts.push(`transOut=${clip.transitionOut.type}`);
    lines.push(`- ${parts.join(' | ')}`);
  }

  // Text overlays
  const overlays = Object.values(state.textOverlays);
  if (overlays.length > 0) {
    lines.push('\n## Text Overlays');
    for (const ov of overlays) {
      lines.push(`- id=${ov.id} "${ov.text}" at ${formatTime(ov.startTime)} dur=${ov.duration.toFixed(1)}s`);
    }
  }

  // Transcript — compact text with timecodes
  const transcripts = Object.values(state.transcripts);
  if (transcripts.length > 0) {
    lines.push('\n## Transcript');
    for (const transcript of transcripts) {
      for (const seg of transcript.segments) {
        const text = seg.words
          .filter((w) => !w.isRemoved)
          .map((w) => (w.isFiller ? `[${w.word}]` : w.word))
          .join(' ');
        if (text.trim()) {
          const speaker = seg.speaker != null ? `Speaker ${seg.speaker}: ` : '';
          lines.push(`[${formatTime(seg.start)}-${formatTime(seg.end)}] ${speaker}${text}`);
        }
      }

      // Scenes
      if (transcript.scenes.length > 0) {
        lines.push('\n## Scenes');
        for (const scene of transcript.scenes) {
          lines.push(`- "${scene.name}" ${formatTime(scene.start)}-${formatTime(scene.end)}${scene.description ? ` — ${scene.description}` : ''}`);
        }
      }
    }
  }

  // Project info
  lines.push(`\n## Project`);
  lines.push(`Duration: ${formatTime(state.duration)}`);
  lines.push(`Aspect: ${state.settings.aspectRatio}`);
  lines.push(`Resolution: ${state.settings.resolution.width}x${state.settings.resolution.height}`);

  return lines.join('\n');
}

// --- System prompts ---

const OPERATION_SCHEMA = `You return JSON with this exact shape:
{
  "operations": [ ...array of operations... ],
  "summary": "Brief description of what you did"
}

Available operation types:
- { "type": "remove-clip", "clipId": "<id>", "reason": "..." }
- { "type": "ripple-delete", "clipId": "<id>", "reason": "..." }
  (removes clip and closes the gap — prefer this over remove-clip when user wants to delete content)
- { "type": "split-at-time", "time": <seconds>, "reason": "..." }
- { "type": "trim-clip-start", "clipId": "<id>", "newStartTime": <seconds>, "reason": "..." }
  (moves the clip's start point forward on the timeline, trimming the beginning)
- { "type": "trim-clip-end", "clipId": "<id>", "newEndTime": <seconds>, "reason": "..." }
  (moves the clip's end point, trimming from the end. newEndTime = new startTime + new duration)
- { "type": "move-clip", "clipId": "<id>", "newStartTime": <seconds>, "reason": "..." }
- { "type": "set-speed", "clipId": "<id>", "speed": <0.25-4>, "reason": "..." }
- { "type": "set-volume", "clipId": "<id>", "volume": <0-2>, "reason": "..." }
  (0 = mute, 1 = normal, 2 = 200%)
- { "type": "add-text-overlay", "trackId": "<text-track-id>", "startTime": <seconds>, "duration": <seconds>, "text": "...", "reason": "..." }
- { "type": "remove-text-overlay", "overlayId": "<id>", "reason": "..." }
- { "type": "add-transition", "clipId": "<id>", "edge": "in"|"out", "transitionType": "cross-dissolve"|"fade-to-black"|"fade-from-black", "duration": <seconds>, "reason": "..." }
- { "type": "set-animation", "clipId": "<id>", "preset": "none"|"fade-in"|"fade-out"|"fade-in-out"|"slide-left"|"slide-right"|"slide-up"|"slide-down"|"zoom-in"|"zoom-out"|"ken-burns", "reason": "..." }
- { "type": "message", "text": "..." }
  (use this to explain something to the user without making changes)`;

const CHAT_SYSTEM_PROMPT = `You are an AI video editor assistant. The user gives you natural language editing commands, and you translate them into structured timeline operations.

${OPERATION_SCHEMA}

Rules:
- Only reference clip IDs and overlay IDs that exist in the timeline context below.
- Times must be within valid ranges (0 to total duration).
- Prefer "ripple-delete" over "remove-clip" when the user wants to remove content (it closes gaps).
- When the user says "remove the first X seconds", use trim-clip-start on the affected clips.
- When the user references transcript content (e.g. "remove the part where they talk about X"), find the matching timecodes from the transcript and generate split + ripple-delete operations.
- Filler words are marked with [brackets] in the transcript.
- If you can't fulfill a request, use a "message" operation to explain why.
- Each operation must include a human-readable "reason" field.
- Return operations in the order they should be executed.`;

const DOCUMENT_SYSTEM_PROMPT = `You are an AI video editor assistant. The user provides a requirements document describing how the final video should be structured. You translate it into a sequence of timeline operations.

${OPERATION_SCHEMA}

Rules:
- Only reference clip IDs and overlay IDs that exist in the timeline context below.
- Times must be within valid ranges (0 to total duration).
- Map document sections to transcript segments by matching content or timestamps.
- To restructure the timeline, use combinations of: split-at-time, ripple-delete, move-clip, trim-clip-start, trim-clip-end.
- To reorder sections: split at boundaries, then move clips to their new positions.
- Add text overlays for title cards, lower-thirds, or section markers mentioned in the document.
- Prefer "ripple-delete" over "remove-clip" when removing content.
- If the document references content not found in the transcript, use a "message" operation to flag it.
- Each operation must include a human-readable "reason" field.
- Return operations in the order they should be executed.`;

// --- Types ---

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// --- OpenAI caller ---

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: ConversationTurn[],
): Promise<AIEditResponse> {
  const response = await fetch('/api/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Check your key in Settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited by OpenAI. Please wait a moment and try again.');
    }
    throw new Error(`OpenAI API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  const parsed = JSON.parse(content) as AIEditResponse;
  if (!Array.isArray(parsed.operations)) {
    throw new Error('Invalid response format: missing operations array');
  }

  return parsed;
}

// --- Public API ---

/**
 * Chat mode: send a natural language editing command with conversation history.
 * The history allows follow-up questions to reference prior context.
 * Returns proposed operations for preview before execution.
 */
export async function parseChat(
  state: TimelineState,
  userMessage: string,
  apiKey: string,
  history: ConversationTurn[] = [],
): Promise<AIEditResponse> {
  const context = buildContext(state);
  // Inject the current timeline state into the first user turn so the model
  // always has the latest state regardless of conversation length.
  const contextMessage: ConversationTurn = {
    role: 'user',
    content: `## Current Timeline State\n${context}\n\n## User Command\n${userMessage}`,
  };
  // Prepend history (prior turns) before the current message. Keep the context
  // injection only in the current turn to avoid duplicating it in every message.
  const messages: ConversationTurn[] = [...history, contextMessage];
  return callOpenAI(apiKey, CHAT_SYSTEM_PROMPT, messages);
}

/**
 * Document mode: send a requirements document describing the desired video.
 * Returns proposed operations for preview before execution.
 */
export async function parseDocument(
  state: TimelineState,
  documentText: string,
  apiKey: string,
): Promise<AIEditResponse> {
  const context = buildContext(state);
  const fullMessage = `## Current Timeline State\n${context}\n\n## Requirements Document\n${documentText}`;
  return callOpenAI(apiKey, DOCUMENT_SYSTEM_PROMPT, [{ role: 'user', content: fullMessage }]);
}
