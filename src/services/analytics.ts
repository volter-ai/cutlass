/**
 * Lightweight, fire-and-forget analytics client.
 *
 * Events are stored in the `analytics_events` Supabase table.
 * All data is anonymous — session_id is a random UUID per browser tab.
 * Silently no-ops when Supabase is not configured.
 *
 * Usage:
 *   import { track } from '../services/analytics';
 *   track('feature.used', { feature: 'split' });
 */

import { v4 as uuid } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabase';

const SESSION_KEY = 'cutlass-session-id';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!isSupabaseConfigured()) return;

  const session_id = getSessionId();

  // Fire-and-forget — never block the UI, never throw
  supabase
    .from('analytics_events')
    .insert({ session_id, event, props })
    .then(({ error }) => {
      if (error) console.warn('[Analytics]', event, error.message);
    });
}
