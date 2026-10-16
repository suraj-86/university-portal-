import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MIN_CHARS = 2;

const GlobalSearch = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const requestId = useRef(0);

  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = text.trim();
  const flat = result ? result.groups.flatMap((g) => g.items) : [];

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return undefined;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setFailed(false);
      api.get('/admin/search', { params: { q: trimmed } })
        .then((res) => {
          if (id !== requestId.current) return;
          setResult(res.data);
          setActive(0);
        })
        .catch(() => { if (id === requestId.current) { setFailed(true); setResult(null); } })
        .finally(() => { if (id === requestId.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [trimmed]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setMobileOpen(true);
        setOpen(true);
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    setOpen(true);
    if (v.trim().length < MIN_CHARS) { setResult(null); setFailed(false); setLoading(false); requestId.current++; }
  };

  const go = (item) => {
    setOpen(false);
    setMobileOpen(false);
    setText('');
    setResult(null);
    navigate(item.path);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setMobileOpen(false); inputRef.current && inputRef.current.blur(); return; }
    if (!flat.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[active]); }
  };

  const showPanel = open && trimmed.length >= MIN_CHARS;
  let index = -1;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="Search"
        onClick={() => { setMobileOpen(true); setOpen(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); }}
        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <Search size={18} />
      </button>

      <div className={`${mobileOpen ? 'fixed left-0 right-0 top-16 z-50 bg-white dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800 shadow-lg' : 'hidden'} md:block md:static md:p-0 md:border-0 md:shadow-none md:bg-transparent md:w-72 lg:w-96`}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="global-search-results"
            aria-label="Search students, teachers, parents, courses, subjects and notices"
            value={text}
            onChange={onChange}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            maxLength={50}
            placeholder="Search students, teachers, courses…  ( / )"
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-9 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {loading ? (
            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
          ) : text ? (
            <button type="button" aria-label="Clear search" onClick={() => { setText(''); setResult(null); inputRef.current && inputRef.current.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          ) : null}
        </div>

        {showPanel && (
          <div id="global-search-results" role="listbox"
            className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 mx-3 md:mx-0">
            {failed && <p className="p-4 text-sm font-medium text-rose-600">Search failed. Please try again.</p>}
            {!failed && result && result.total === 0 && !loading && (
              <p className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400">No matches for “{result.query}”.</p>
            )}
            {!failed && !result && loading && <p className="p-4 text-sm font-medium text-slate-400">Searching…</p>}
            {!failed && result && result.groups.map((g) => (
              <div key={g.key} className="py-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{g.label}</p>
                {g.items.map((item) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      key={`${g.key}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 ${i === active ? 'bg-blue-50 dark:bg-blue-950/50' : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                        <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.subtitle}</span>
                      </span>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
