import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, FileText, Loader2, Check, X, AlertCircle, MessageSquare } from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import { parseChat, parseDocument } from '../../services/ai-edit';
import { describeOperation, executeOperations } from '../../services/ai-edit-operations';
import type { AIEditOperation } from '../../services/ai-edit-operations';

type Tab = 'chat' | 'document';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'operations' | 'error';
  text: string;
  operations?: AIEditOperation[];
  summary?: string;
  applied?: boolean;
}

export function AIEditPanel() {
  const settings = useTimelineStore((s) => s.settings);
  const setLeftPanelTab = useTimelineStore((s) => s.setLeftPanelTab);
  const storeApi = useTimelineStoreApi();
  const { t } = useLanguage();

  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [docText, setDocText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasApiKey = !!settings.openaiApiKey;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }, []);

  // --- Chat mode ---

  const handleChatSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    addMessage({ role: 'user', text: trimmed });
    setIsLoading(true);

    try {
      const state = storeApi.getState();
      const result = await parseChat(state, trimmed, settings.openaiApiKey);

      if (result.operations.length === 0) {
        addMessage({ role: 'assistant', text: result.summary || 'No changes needed.' });
      } else {
        addMessage({
          role: 'operations',
          text: result.summary,
          operations: result.operations,
          summary: result.summary,
        });
      }
    } catch (err) {
      addMessage({
        role: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, settings.openaiApiKey, storeApi, addMessage]);

  // --- Document mode ---

  const handleDocAnalyze = useCallback(async () => {
    const trimmed = docText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);

    try {
      const state = storeApi.getState();
      const result = await parseDocument(state, trimmed, settings.openaiApiKey);

      if (result.operations.length === 0) {
        addMessage({ role: 'assistant', text: result.summary || 'No changes needed.' });
      } else {
        addMessage({
          role: 'operations',
          text: result.summary,
          operations: result.operations,
          summary: result.summary,
        });
      }
      setTab('chat'); // Switch to chat to see results
    } catch (err) {
      addMessage({
        role: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      });
      setTab('chat');
    } finally {
      setIsLoading(false);
    }
  }, [docText, isLoading, settings.openaiApiKey, storeApi, addMessage]);

  // --- Apply operations ---

  const handleApply = useCallback(
    (messageId: string, operations: AIEditOperation[]) => {
      const result = executeOperations(storeApi, operations);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, applied: true } : msg,
        ),
      );

      if (result.errors.length > 0) {
        addMessage({
          role: 'error',
          text: `Applied ${result.applied} operations. Errors: ${result.errors.join('; ')}`,
        });
      } else {
        addMessage({
          role: 'assistant',
          text: `Applied ${result.applied} operation${result.applied !== 1 ? 's' : ''}. Undo with Cmd+Z.`,
        });
      }
    },
    [storeApi, addMessage],
  );

  const handleDismiss = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, applied: true } : msg,
      ),
    );
  }, []);

  // --- No API key state ---

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t.ai?.title ?? 'AI Edit'}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Sparkles size={32} style={{ color: 'var(--text-secondary)' }} className="mx-auto mb-3 opacity-50" />
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t.ai?.noKey ?? 'Add your OpenAI API key in Settings to enable AI editing.'}
            </p>
            <button
              onClick={() => setLeftPanelTab('settings')}
              className="text-xs px-3 py-1.5 rounded font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {t.ai?.goToSettings ?? 'Go to Settings'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main panel ---

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t.ai?.title ?? 'AI Edit'}
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {(['chat', 'document'] as Tab[]).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t2 ? 'var(--bg-surface)' : 'transparent',
              color: tab === t2 ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: tab === t2 ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {t2 === 'chat' ? <MessageSquare size={12} /> : <FileText size={12} />}
            {t2 === 'chat' ? (t.ai?.chatTab ?? 'Chat') : (t.ai?.docTab ?? 'Document')}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={24} style={{ color: 'var(--text-secondary)' }} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t.ai?.chatHint ?? 'Tell me how to edit your video.'}
                </p>
                <div className="mt-3 space-y-1.5">
                  {[
                    t.ai?.example1 ?? '"Remove all the ums and pauses"',
                    t.ai?.example2 ?? '"Make the intro 15 seconds"',
                    t.ai?.example3 ?? '"Add a title card saying Q3 Review"',
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(ex.replace(/^"|"$/g, ''))}
                      className="block w-full text-left text-xs px-2.5 py-1.5 rounded transition-colors"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                state={storeApi.getState()}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 px-2">
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t.ai?.thinking ?? 'Thinking...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder={t.ai?.chatPlaceholder ?? 'Describe your edit...'}
                rows={2}
                className="flex-1 text-xs px-2.5 py-1.5 rounded border resize-none"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                disabled={isLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={isLoading || !input.trim()}
                className="self-end p-2 rounded transition-colors"
                style={{
                  background: input.trim() ? 'var(--accent)' : 'var(--bg-surface)',
                  color: input.trim() ? 'white' : 'var(--text-secondary)',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Document tab */
        <div className="flex-1 flex flex-col p-3">
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t.ai?.docHint ?? 'Paste your requirements document describing how the final video should be structured.'}
          </p>
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            placeholder={t.ai?.docPlaceholder ?? 'Paste requirements document here...\n\nExample:\n- Start with the pricing discussion (5:30)\n- Then show the demo (12:00-18:00)\n- Skip the Q&A section\n- Add a title card "Q3 Review" at the beginning'}
            className="flex-1 text-xs px-2.5 py-2 rounded border resize-none min-h-[200px]"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleDocAnalyze}
            disabled={isLoading || !docText.trim()}
            className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-semibold transition-colors"
            style={{
              background: docText.trim() ? 'var(--accent)' : 'var(--bg-surface)',
              color: docText.trim() ? 'white' : 'var(--text-secondary)',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {t.ai?.analyze ?? 'Analyze & Generate Edits'}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Message Bubble Component ---

function MessageBubble({
  message,
  state,
  onApply,
  onDismiss,
}: {
  message: ChatMessage;
  state: import('../../store/timeline').TimelineState;
  onApply: (id: string, ops: AIEditOperation[]) => void;
  onDismiss: (id: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === 'error') {
    return (
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--playhead)' }} />
        <div className="text-xs" style={{ color: 'var(--playhead)' }}>
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === 'operations' && message.operations) {
    return (
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        {/* Summary */}
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {message.summary}
          </p>
        </div>

        {/* Operation list */}
        <div className="px-3 py-2 space-y-1">
          {message.operations.map((op, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex-shrink-0 font-mono opacity-50">{i + 1}.</span>
              <span>{describeOperation(op, state)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!message.applied && (
          <div className="flex gap-2 px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => onApply(message.id, message.operations!)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Check size={12} />
              Apply
            </button>
            <button
              onClick={() => onDismiss(message.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
            >
              <X size={12} />
              Dismiss
            </button>
          </div>
        )}
        {message.applied && (
          <div className="px-3 py-1.5 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Applied
          </div>
        )}
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-2">
      <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
      <div className="text-xs" style={{ color: 'var(--text-primary)' }}>
        {message.text}
      </div>
    </div>
  );
}
