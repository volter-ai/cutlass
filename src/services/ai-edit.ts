import type { TimelineState } from '../store/timeline';
import type { AIEditResponse } from './ai-edit-operations';
import type { AIModel } from '../types';

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
      const src = ov.source === 'caption' ? ' [caption]' : '';
      lines.push(`- id=${ov.id} "${ov.text}" at ${formatTime(ov.startTime)} dur=${ov.duration.toFixed(1)}s${src}`);
    }
  }

  // Drawing overlays
  const drawings = Object.values(state.drawingOverlays);
  if (drawings.length > 0) {
    lines.push('\n## Drawing Overlays');
    for (const dov of drawings) {
      const tools = [...new Set(dov.strokes.map((s) => s.tool))].join(', ') || 'none';
      lines.push(`- id=${dov.id} track=${dov.trackId} at ${formatTime(dov.startTime)} dur=${dov.duration.toFixed(1)}s strokes=${dov.strokes.length} tools=[${tools}]`);
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

export interface ChapterMarker {
  name: string;
  start: number; // seconds
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

// --- Anthropic caller ---

const ANTHROPIC_MODEL_IDS: Record<Exclude<AIModel, 'gpt-4o'>, string> = {
  'claude-sonnet': 'claude-sonnet-4-6',
  'claude-opus': 'claude-opus-4-6',
};

async function callAnthropic(
  apiKey: string,
  model: Exclude<AIModel, 'gpt-4o'>,
  systemPrompt: string,
  messages: ConversationTurn[],
): Promise<AIEditResponse> {
  const modelId = ANTHROPIC_MODEL_IDS[model];
  // Claude doesn't have a response_format param — instruct it to return raw JSON.
  const systemWithJsonInstruction =
    systemPrompt + '\n\nIMPORTANT: Respond with raw JSON only. No markdown fences, no explanation text. Just the JSON object.';

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      system: systemWithJsonInstruction,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid Anthropic API key. Check your key in Settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited by Anthropic. Please wait a moment and try again.');
    }
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text as string | undefined;
  if (!content) {
    throw new Error('Empty response from Anthropic');
  }

  // Strip any accidental markdown fences Claude might still emit
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: AIEditResponse;
  try {
    parsed = JSON.parse(cleaned) as AIEditResponse;
  } catch {
    throw new Error('Failed to parse Anthropic response as JSON');
  }

  if (!Array.isArray(parsed.operations)) {
    throw new Error('Invalid response format: missing operations array');
  }

  return parsed;
}

// --- Dispatcher ---

function callModel(
  model: AIModel,
  openaiApiKey: string,
  anthropicApiKey: string,
  systemPrompt: string,
  messages: ConversationTurn[],
): Promise<AIEditResponse> {
  if (model === 'gpt-4o') {
    if (!openaiApiKey) throw new Error('OpenAI API key not set. Add it in Settings.');
    return callOpenAI(openaiApiKey, systemPrompt, messages);
  }
  if (!anthropicApiKey) throw new Error('Anthropic API key not set. Add it in Settings.');
  return callAnthropic(anthropicApiKey, model, systemPrompt, messages);
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
  history: ConversationTurn[] = [],
): Promise<AIEditResponse> {
  const { aiModel = 'gpt-4o', openaiApiKey, anthropicApiKey } = state.settings;
  const context = buildContext(state);
  // Inject the current timeline state into the first user turn so the model
  // always has the latest state regardless of conversation length.
  const contextMessage: ConversationTurn = {
    role: 'user',
    content: `## Current Timeline State\n${context}\n\n## User Command\n${userMessage}`,
  };
  // Prepend history (prior turns) before the current message.
  const messages: ConversationTurn[] = [...history, contextMessage];
  return callModel(aiModel, openaiApiKey, anthropicApiKey, CHAT_SYSTEM_PROMPT, messages);
}

/**
 * Document mode: send a requirements document describing the desired video.
 * Returns proposed operations for preview before execution.
 */
export async function parseDocument(
  state: TimelineState,
  documentText: string,
): Promise<AIEditResponse> {
  const { aiModel = 'gpt-4o', openaiApiKey, anthropicApiKey } = state.settings;
  const context = buildContext(state);
  const fullMessage = `## Current Timeline State\n${context}\n\n## Requirements Document\n${documentText}`;
  return callModel(aiModel, openaiApiKey, anthropicApiKey, DOCUMENT_SYSTEM_PROMPT, [{ role: 'user', content: fullMessage }]);
}

// --- Chapter generation ---

const CHAPTER_SYSTEM_PROMPT = `You are a video chapter analyzer. Given a video transcript with timestamps, identify natural chapter breaks.

Return JSON with this exact shape:
{
  "chapters": [
    {"name": "Introduction", "start": 0},
    {"name": "Chapter Name", "start": <seconds>}
  ]
}

Rules:
- Include 3-10 chapters (more for longer videos)
- Chapter names should be concise (2-5 words, title case)
- The first chapter MUST start at 0
- start values are numbers in seconds
- Only output the JSON — no explanation text`;

/**
 * Sends the transcript from state to the configured AI model and returns
 * a list of chapter markers (name + start time in seconds).
 */
export async function generateChapters(state: TimelineState): Promise<ChapterMarker[]> {
  const { aiModel = 'gpt-4o', openaiApiKey, anthropicApiKey } = state.settings;

  const transcripts = Object.values(state.transcripts);
  if (transcripts.length === 0) {
    throw new Error('No transcript available. Transcribe your video first.');
  }

  const transcript = transcripts[0];
  const transcriptText = transcript.segments
    .map((seg) => {
      const text = seg.words
        .filter((w) => !w.isRemoved)
        .map((w) => w.word)
        .join(' ')
        .trim();
      return text ? `[${formatTime(seg.start)}] ${text}` : null;
    })
    .filter(Boolean)
    .join('\n');

  if (!transcriptText) {
    throw new Error('Transcript has no content to analyze.');
  }

  const userMessage = `Please generate chapter markers for this video transcript:\n\n${transcriptText}`;

  // Reuse callModel but with a specialized prompt — response_format json_object for OpenAI,
  // raw JSON instruction for Anthropic. We parse the operations shape manually below.
  let rawText: string;

  if (aiModel === 'gpt-4o') {
    if (!openaiApiKey) throw new Error('OpenAI API key not set. Add it in Settings.');
    const response = await fetch('/api/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: CHAPTER_SYSTEM_PROMPT }, { role: 'user', content: userMessage }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) throw new Error('Invalid OpenAI API key. Check your key in Settings.');
      if (response.status === 429) throw new Error('Rate limited by OpenAI. Please wait a moment and try again.');
      throw new Error(`OpenAI API error (${response.status}): ${body}`);
    }
    const data = await response.json();
    rawText = data.choices?.[0]?.message?.content ?? '';
  } else {
    if (!anthropicApiKey) throw new Error('Anthropic API key not set. Add it in Settings.');
    const modelId = ANTHROPIC_MODEL_IDS[aiModel as Exclude<AIModel, 'gpt-4o'>];
    const response = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicApiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 2048,
        system: CHAPTER_SYSTEM_PROMPT + '\n\nIMPORTANT: Respond with raw JSON only. No markdown fences.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) throw new Error('Invalid Anthropic API key. Check your key in Settings.');
      if (response.status === 429) throw new Error('Rate limited by Anthropic. Please wait a moment and try again.');
      throw new Error(`Anthropic API error (${response.status}): ${body}`);
    }
    const data = await response.json();
    rawText = ((data.content?.[0]?.text as string | undefined) ?? '')
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
  }

  if (!rawText) throw new Error('Empty response from AI model.');

  let parsed: { chapters: ChapterMarker[] };
  try {
    parsed = JSON.parse(rawText) as { chapters: ChapterMarker[] };
  } catch {
    throw new Error('Failed to parse chapter response as JSON.');
  }

  if (!Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
    throw new Error('AI returned no chapters.');
  }

  return parsed.chapters;
}
