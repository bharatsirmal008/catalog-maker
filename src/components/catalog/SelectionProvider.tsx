"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { emptySelection, parseSelection, SELECTION_KEY, toggleSelection, type Selection, type SelectionKind } from "@/lib/catalog/selection-storage";
type Context = { selection: Selection; ready: boolean; toggle: (kind: SelectionKind, id: string) => void; clear: (kind: SelectionKind) => void };
const SelectionContext = createContext<Context | null>(null);
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  const current = useRef<Selection>(emptySelection());
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!active) return;
      try { current.current = parseSelection(localStorage.getItem(SELECTION_KEY)); setSelection(current.current); }
      catch { setWarning("Browser storage is unavailable. Your selections will last only for this visit."); }
      setReady(true);
    };
    // Initialize browser-only state after hydration; never overwrite saved data on mount.
    queueMicrotask(load);
    const sync = (event: StorageEvent) => { if (event.key === SELECTION_KEY || event.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("storage", sync); };
  }, []);
  function save(next: Selection) {
    current.current = next; setSelection(next);
    try { localStorage.setItem(SELECTION_KEY, JSON.stringify(next)); setWarning(""); }
    catch { setWarning("Could not save to this browser. Your selections still work for this visit."); }
  }
  function toggle(kind: SelectionKind, id: string) {
    if (!ready) return;
    try { save(toggleSelection(current.current, kind, id)); }
    catch (error) { setWarning(error instanceof Error ? error.message : "Could not update selection."); }
  }
  return <SelectionContext.Provider value={{ selection, ready, toggle, clear: (kind) => { if (ready) save({ ...current.current, [kind]: [] }); } }}>
    {warning && <p className="selection-warning shell" role="status">{warning}</p>}{children}
  </SelectionContext.Provider>;
}
export function useSelection() { const context = useContext(SelectionContext); if (!context) throw new Error("SelectionProvider is required"); return context; }
