import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { parseRefLabel, sortByRefLabel } from "@/lib/energyCalc";

interface EnergyRow {
  reference_label: string;
  user_id?: string;
  unit_id?: string | null;
  distribuidora?: string | null;
  fatura_geral_rs?: number | null;
  economia_liquida_rs?: number | null;
  economia_liquida_pct?: number | null;
  mwh_total_gerador?: number | null;
  energia_kwh_ponta?: number | null;
  energia_kwh_fora?: number | null;
  energia_kwh_reservado?: number | null;
  reativo_kvarh_ponta?: number | null;
  reativo_kvarh_fora?: number | null;
  reativo_kvarh_reservado?: number | null;
  reativo_limite_rate?: number | null;
  compra_energia_rs?: number | null;
  icms_energia_rs?: number | null;
  encargos_rs?: number | null;
  banco_trianon_rs?: number | null;
  gestao_cco_rs?: number | null;
  gestao_parceiro_rs?: number | null;
  [k: string]: any;
}

export interface EnergyKpisProps {
  rows: EnergyRow[];
  periodLabel?: string;
  showFilters?: boolean;
}

const EnergyKpis: React.FC<EnergyKpisProps> = ({ rows, periodLabel, showFilters = false }) => {
  // Use rows directly without filtering (already filtered by parent)
  const filtered = useMemo(() => {
    return rows.sort((a, b) => sortByRefLabel(a.reference_label, b.reference_label));
  }, [rows]);

  const chartData = useMemo(() => {
    return filtered.map((r) => {
      const total_kwh =
        Number(r.energia_kwh_ponta ?? 0) +
        Number(r.energia_kwh_fora ?? 0) +
        Number(r.energia_kwh_reservado ?? 0);

      const total_kvarh =
        Number(r.reativo_kvarh_ponta ?? 0) +
        Number(r.reativo_kvarh_fora ?? 0) +
        Number(r.reativo_kvarh_reservado ?? 0);
      
      const reativo_limite_rate = Number(r.reativo_limite_rate ?? 0.620);
      const limite_kvarh = reativo_limite_rate * total_kwh;
      const reativo_excedente_kvarh = Math.max(0, total_kvarh - limite_kvarh);
      const fator_potencia = total_kwh > 0 ? 1 / Math.sqrt(1 + Math.pow(total_kvarh / total_kwh, 2)) : 1;

      return {
        reference_label: r.reference_label,
        // Consumo por período (MWh)
        mwh_ponta: Number(r.energia_kwh_ponta ?? 0) / 1000,
        mwh_fora: Number(r.energia_kwh_fora ?? 0) / 1000,
        mwh_res: Number(r.energia_kwh_reservado ?? 0) / 1000,
        // Demandas por período (kW)
        demanda_faturada_kw_ponta: Number((r as any).demanda_faturada_kw_ponta ?? 0) || 0,
        demanda_faturada_kw_fora: Number((r as any).demanda_faturada_kw_fora ?? 0) || 0,
        demanda_faturada_kw_reservado: Number((r as any).demanda_faturada_kw_reservado ?? 0) || 0,
        // Custos (R$)
        compra_energia_rs: Number(r.compra_energia_rs ?? 0) || 0,
        icms_energia_rs: Number(r.icms_energia_rs ?? 0) || 0,
        encargos_rs: Number(r.encargos_rs ?? 0) || 0,
        banco_trianon_rs: Number(r.banco_trianon_rs ?? 0) || 0,
        gestao_cco_rs: Number(r.gestao_cco_rs ?? 0) || 0,
        gestao_parceiro_rs: Number(r.gestao_parceiro_rs ?? 0) || 0,
        // Reativo
        total_kvarh,
        limite_kvarh,
        reativo_excedente_kvarh,
        fator_potencia,
      };
    });
  }, [filtered]);

  const allDemandsZero = useMemo(() =>
    chartData.length > 0 && chartData.every(d =>
      (d.demanda_faturada_kw_ponta || 0) === 0 &&
      (d.demanda_faturada_kw_fora || 0) === 0 &&
      (d.demanda_faturada_kw_reservado || 0) === 0
    )
  , [chartData]);


  function sum<T>(arr: T[], sel: (x: T) => number) {
    return arr.reduce((acc, x) => acc + (Number(sel(x)) || 0), 0);
  }

  const metrics = useMemo(() => {
    if (!filtered.length) return null;

    const econSum = sum(filtered, r => r.economia_liquida_rs || 0);
    const faturSum = sum(filtered, r => r.fatura_geral_rs || 0);
    const weightedPct = faturSum ? econSum / faturSum : 0;

    const monthPcts = filtered
      .map(r => {
        const fg = Number(r.fatura_geral_rs || 0);
        const el = Number(r.economia_liquida_rs || 0);
        return fg ? el / fg : null;
      })
      .filter((x): x is number => x !== null);
    const simpleAvg = monthPcts.length ? monthPcts.reduce((a, b) => a + b, 0) / monthPcts.length : 0;

    const consumo = sum(filtered, r => {
      const mwh = Number(r.mwh_total_gerador || 0);
      if (mwh) return mwh;
      const kwh = (Number(r.energia_kwh_ponta || 0) + Number(r.energia_kwh_fora || 0) + Number(r.energia_kwh_reservado || 0));
      return kwh ? kwh / 1000 : 0;
    });

    const best = [...filtered].sort((a, b) => (b.economia_liquida_rs || 0) - (a.economia_liquida_rs || 0))[0];
    const worst = [...filtered].sort((a, b) => (a.economia_liquida_rs || 0) - (b.economia_liquida_rs || 0))[0];

    // For now, set variation to 0 since we don't have previous period data
    const variation = 0;

    return { econSum, weightedPct, simpleAvg, consumo, best, worst, variation };
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          KPIs de Energia{periodLabel ? ` (${periodLabel})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1) Economia líquida */}
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Economia líquida (R$)</div>
            <div className="text-2xl font-semibold">{(metrics?.econSum || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              {metrics && metrics.variation >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
              <span className="text-muted-foreground">vs período anterior</span>
              <span className={metrics && metrics.variation >= 0 ? "text-green-700" : "text-red-700"}>
                {metrics ? `${(Math.abs(metrics.variation) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          {/* 2) % Economia média (ponderada) */}
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">% Economia média (ponderada)</div>
            <div className="text-2xl font-semibold">{((metrics?.weightedPct || 0) * 100).toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground mt-1">({((metrics?.simpleAvg || 0) * 100).toFixed(2)}% média simples)</div>
          </div>

          {/* 3) Consumo total (MWh) */}
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Consumo total (MWh)</div>
            <div className="text-2xl font-semibold">{(metrics?.consumo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
          </div>

          {/* 4) Melhor e pior mês */}
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Melhor e pior mês (economia)</div>
            <div className="mt-1 text-sm">
              <div>
                <span className="text-muted-foreground">Melhor: </span>
                <span className="font-medium">{metrics?.best?.reference_label || '—'}</span>
                {metrics?.best && (
                  <span className="ml-1">{Number(metrics.best.economia_liquida_rs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Pior: </span>
                <span className="font-medium">{metrics?.worst?.reference_label || '—'}</span>
                {metrics?.worst && (
                  <span className="ml-1">{Number(metrics.worst.economia_liquida_rs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyKpis;
