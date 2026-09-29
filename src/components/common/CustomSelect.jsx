import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CustomSelect — fully styled dropdown that works in all browsers.
 *
 * Props:
 *  value       – current selected value
 *  onChange    – (value) => void
 *  options     – [{ value, label }]
 *  placeholder – string shown when nothing selected
 *  required    – bool
 *  disabled    – bool
 *  className   – extra wrapper classes
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const displayLabel = selected ? selected.label : null;

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden native input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value ?? ''}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
          aria-hidden="true"
        />
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`
          w-full flex items-center justify-between
          bg-slate-950/90 border rounded-xl px-3 py-2 text-xs
          transition-all focus:outline-none
          ${open ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700/80'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-600'}
          ${displayLabel ? 'text-slate-200' : 'text-slate-500'}
        `}
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-2 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <li
                key={opt.value}
                onMouseDown={() => handleSelect(opt.value)}
                className={`
                  px-3 py-2 text-xs cursor-pointer select-none
                  ${String(opt.value) === String(value)
                    ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                    : 'text-slate-200 hover:bg-slate-800'}
                `}
              >
                {opt.label}
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500 italic">No options available</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
