import { parseRefLabel } from "./energyCalc";

export type PeriodMode = 'LAST12' | 'THIS_YEAR' | 'PREV_YEAR' | 'CUSTOM';

export interface PeriodState {
  mode: PeriodMode;
  startLabel?: string;
  endLabel?: string;
}

const refKey = (label: string): number => {
  const { year, month } = parseRefLabel(label);
  return year * 100 + month;
};

export function resolveRange(p: PeriodState, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  
  if (p.mode === 'THIS_YEAR') {
    return { startKey: y * 100 + 1, endKey: y * 100 + 12 };
  }
  
  if (p.mode === 'PREV_YEAR') {
    return { startKey: (y - 1) * 100 + 1, endKey: (y - 1) * 100 + 12 };
  }
  
  if (p.mode === 'CUSTOM') {
    const s = p.startLabel ? refKey(p.startLabel) : 0;
    const e = p.endLabel ? refKey(p.endLabel) : 999999;
    return { startKey: Math.min(s, e), endKey: Math.max(s, e) };
  }
  
  // LAST12 (padrão): dos últimos 12 meses até agora
  const endKey = y * 100 + m;
  const startY = m > 12 ? y : y - 1;
  const startM = ((m + 12 - 11 - 1) % 12) + 1; // 12 meses atrás
  const startKey = startY * 100 + startM;
  
  return { startKey, endKey };
}

export function filterByPeriod(rows: any[], p: PeriodState) {
  const { startKey, endKey } = resolveRange(p);
  return rows.filter(r => {
    if (!r.reference_label) return false;
    const k = refKey(r.reference_label);
    return k >= startKey && k <= endKey;
  });
}

// Legacy compatibility - convert old format to new
export function periodOptionToPeriodState(
  period: "ultimos12" | "anoAtual" | "anoAnterior" | "custom",
  customStart?: string,
  customEnd?: string
): PeriodState {
  switch (period) {
    case "ultimos12":
      return { mode: 'LAST12' };
    case "anoAtual":
      return { mode: 'THIS_YEAR' };
    case "anoAnterior":
      return { mode: 'PREV_YEAR' };
    case "custom":
      return { mode: 'CUSTOM', startLabel: customStart, endLabel: customEnd };
    default:
      return { mode: 'LAST12' };
  }
}