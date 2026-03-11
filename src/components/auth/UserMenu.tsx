import { useState, useRef, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { isSupabaseConfigured } from '../../services/supabase';
import { AuthModal } from './AuthModal';
import { useLanguage } from '../../context/LanguageProvider';

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  if (!isSupabaseConfigured()) return null;
  if (loading) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <User size={14} />
          {t.auth.signIn}
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <User size={14} />
        <span className="max-w-20 truncate">{user.email}</span>
      </button>

      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 rounded shadow-lg z-50 py-1 min-w-36"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="px-3 py-1.5 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {user.email}
          </div>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--border)' }} />
          <button
            onClick={() => { signOut(); setShowMenu(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:opacity-80 text-left"
            style={{ color: 'var(--text-primary)' }}
          >
            <LogOut size={12} />
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
