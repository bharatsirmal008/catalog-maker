export const SELECTION_KEY = "catalog-selection-v1";
export const MAX_SELECTION = 48;
export type SelectionKind = "wishlist" | "enquiry";
export type Selection = { version: 1; wishlist: string[]; enquiry: string[] };
export const emptySelection = (): Selection => ({ version: 1, wishlist: [], enquiry: [] });
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseSelection(raw: string | null): Selection {
  try {
    if (!raw || raw.length > 20000) return emptySelection();
    const value = JSON.parse(raw);
    if (value?.version !== 1) return emptySelection();
    const ids = (input: unknown): string[] => Array.isArray(input)
      ? [...new Set(input.filter((id): id is string => typeof id === "string" && idPattern.test(id)).map((id) => id.toLowerCase()))].slice(0, MAX_SELECTION) : [];
    return { version: 1, wishlist: ids(value.wishlist), enquiry: ids(value.enquiry) };
  } catch { return emptySelection(); }
}
export function toggleSelection(state: Selection, kind: SelectionKind, id: string): Selection {
  if (!idPattern.test(id)) return state;
  const normalized = id.toLowerCase();
  const ids = state[kind];
  if (!ids.includes(normalized) && ids.length >= MAX_SELECTION) throw new Error(`You can select up to ${MAX_SELECTION} products. Remove one before adding another.`);
  return { ...state, [kind]: ids.includes(normalized) ? ids.filter((item) => item !== normalized) : [...ids, normalized] };
}
