import { useAppStore } from '@/state/store';

/** Navi-style per-tab pastel themes — docs/design/design-handoff.md. */
export const PageThemes = {
  billing: { bg: '#F3F1FC', accent: '#6D28D9', tile: '#ECE7FE', navIdle: '#B0A0DC' },
  khata: { bg: '#FDF1F2', accent: '#E11D48', tile: '#FFE2E7', navIdle: '#E79BAB' },
  stock: { bg: '#FBF6EA', accent: '#C2700A', tile: '#FBEBC8', navIdle: '#D6B074' },
  staff: { bg: '#EBF8F1', accent: '#059669', tile: '#CFF6E2', navIdle: '#84C7AC' },
  analytics: { bg: '#EDF2FD', accent: '#2563EB', tile: '#D9E7FE', navIdle: '#96B7EF' },
} as const;

export type TabName = keyof typeof PageThemes;
export type PageTheme = (typeof PageThemes)[TabName];

/** Theme for the given tab, or the currently active tab when omitted. */
export function usePageTheme(tab?: TabName): PageTheme {
  const current = useAppStore((s) => s.tab);
  return PageThemes[tab ?? current];
}
