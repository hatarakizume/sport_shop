import { useEffect, useMemo, useRef, useState } from 'react';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500';

export default function CityField({ value, onChange, id = 'city' }) {
  const [cities, setCities] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('../data/ru-cities.json').then((mod) => {
      if (!cancelled) setCities(mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!cities || query.length < 1) return [];
    return cities.filter((c) => c.name.toLowerCase().startsWith(query)).slice(0, 8);
  }, [cities, value]);

  function selectCity(name) {
    onChange(name);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && matches[highlighted]) {
      e.preventDefault();
      selectCity(matches[highlighted].name);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        name="city"
        placeholder="Город"
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        required
        className={inputClass}
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
      />

      {open && matches.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-xl"
        >
          {matches.map((c, i) => (
            <li
              key={`${c.name}-${c.region}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCity(c.name);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? 'bg-neutral-800' : ''
              }`}
            >
              <span className="text-neutral-100">{c.name}</span>
              <span className="ml-2 text-xs text-neutral-500">{c.region}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}