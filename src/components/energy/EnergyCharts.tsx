import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts";
import { parseRefLabel, sortByRefLabel } from "@/lib/energyCalc";
import DemandChart from "./DemandChart";

interface EnergyRow {
  reference_label: string;
  user_id: string;
  energia_kwh_ponta?: number | null;
  energia_kwh_fora?: number | null;
  energia_kwh_reservado?: number | null;
  demanda_faturada_kw_ponta?: number | null;
  demanda_faturada_kw_fora?: number | null;
  demanda_faturada_kw_reservado?: number | null;
  reativo_kvarh_ponta?: number | null;
  reativo_kvarh_fora?: number | null;
  reativo_kvarh_reservado?: number | null;
  reativo_limite_rate?: number | null;
  compra_energia_rs?: number | null;
  icms_energia_rs?: number | null;
  encargos_rs?: number | null;
  gestao_cco_rs?: number | null;
  gestao_parceiro_rs?: number | null;
  fatura_livre_rs?: number | null;
  [k: string]: any;
}

interface EnergyChartsProps {
  data: EnergyRow[];
}

// Paleta de cores fixa e consistente
const COLORS = {
  // Consumo/Demanda
  ponta: "#2563EB",
  fora: "#10B981", 
  reservado: "#F59E0B",
  // Reativo excedente
  reativo: "#EF4444",
  // Custos
  compra: "#1D4ED8",
  icms: "#0891B2",
  encargos: "#9333EA",
  banco: "#0EA5E9",
  gestao_cco: "#6B7280",
  gestao_parceiro: "#EF4444"
};

const EnergyCharts: React.FC<EnergyChartsProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => sortByRefLabel(a.reference_label, b.reference_label))
      .map((r) => {
        const total_kwh =
          Number(r.energia_kwh_ponta || 0) +
          Number(r.energia_kwh_fora || 0) +
          Number(r.energia_kwh_reservado || 0);

        const total_kvarh =
          Number(r.reativo_kvarh_ponta || 0) +
          Number(r.reativo_kvarh_fora || 0) +
          Number(r.reativo_kvarh_reservado || 0);
        
        const reativo_limite_rate = Number(r.reativo_limite_rate || 0.620);
        const limite_kvarh = reativo_limite_rate * total_kwh;
        const reativo_excedente_kvarh = Math.max(0, total_kvarh - limite_kvarh);
        const fator_potencia = total_kwh > 0 ? 1 / Math.sqrt(1 + Math.pow(total_kvarh / total_kwh, 2)) : 1;

        return {
          reference_label: r.reference_label,
          // Consumo por período (MWh)
          mwh_ponta: Number(r.energia_kwh_ponta || 0) / 1000,
          mwh_fora: Number(r.energia_kwh_fora || 0) / 1000,
          mwh_res: Number(r.energia_kwh_reservado || 0) / 1000,
          // Demandas por período (kW)
          demanda_faturada_kw_ponta: Number(r.demanda_faturada_kw_ponta || 0),
          demanda_faturada_kw_fora: Number(r.demanda_faturada_kw_fora || 0),
          demanda_faturada_kw_reservado: Number(r.demanda_faturada_kw_reservado || 0),
          // Custos (R$)
          compra_energia_rs: Number(r.compra_energia_rs || 0),
          icms_energia_rs: Number(r.icms_energia_rs || 0),
          encargos_rs: Number(r.encargos_rs || 0),
          gestao_cco_rs: Number(r.gestao_cco_rs || 0),
          gestao_parceiro_rs: Number(r.gestao_parceiro_rs || 0),
          fatura_livre_rs: Number(r.fatura_livre_rs || 0),
          // Reativo
          total_kvarh,
          limite_kvarh,
          reativo_excedente_kvarh,
          fator_potencia,
        };
      });
  }, [data]);

  const hasLowPowerFactor = useMemo(() => 
    chartData.some(d => d.fator_potencia < 0.92), [chartData]
  );

  if (!data.length) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        Pesquise um cliente para começar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Consumo por período (MWh) - Barras agrupadas */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Consumo por período (MWh)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.every(d => (d.mwh_ponta + d.mwh_fora + d.mwh_res) === 0) ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados de consumo por período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="reference_label" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const total = payload.reduce((sum, item) => sum + Number(item.value || 0), 0);
                      return (
                        <div className="bg-background border rounded-md p-2 shadow-sm">
                          <p className="font-medium">{`Mês: ${label}`}</p>
                          {payload.map((item, index) => (
                            <p key={index} style={{ color: item.color }}>
                              {`${item.name}: ${Number(item.value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh`}
                            </p>
                          ))}
                          <p className="font-medium border-t pt-1 mt-1">
                            {`Total: ${total.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="mwh_ponta" name="Ponta" fill={COLORS.ponta} radius={[6, 6, 0, 0]} />
                <Bar dataKey="mwh_fora" name="Fora Ponta" fill={COLORS.fora} radius={[6, 6, 0, 0]} />
                <Bar dataKey="mwh_res" name="Reservado" fill={COLORS.reservado} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2. Demandas por período (kW) - ComposedChart com barras empilhadas e linha */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Demandas por período (kW)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <DemandChart rows={data} />
        </CardContent>
      </Card>

      {/* 3. Reativo excedente (kvarh) - Barra única */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Reativo excedente (kvarh)
            {hasLowPowerFactor && (
              <Badge variant="destructive" className="text-xs">
                Fator de potência baixo
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.every(d => d.reativo_excedente_kvarh === 0) ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem excedente de reativo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="reference_label" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-background border rounded-md p-2 shadow-sm">
                          <p className="font-medium">{`Mês: ${label}`}</p>
                          <p>{`Excedente: ${Number(data?.reativo_excedente_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kvarh`}</p>
                          <p>{`Total kvarh: ${Number(data?.total_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}</p>
                          <p>{`Limite kvarh: ${Number(data?.limite_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}</p>
                          <p>{`Fator potência: ${Number(data?.fator_potencia || 0).toFixed(3)}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="reativo_excedente_kvarh" name="Excedente" fill={COLORS.reativo} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. Custos (R$) - Barras agrupadas */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Custos (R$)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {(() => {
            // Check which series have data
            const hasCompra = chartData.some(d => d.compra_energia_rs > 0);
            const hasIcms = chartData.some(d => d.icms_energia_rs > 0);
            const hasEncargos = chartData.some(d => d.encargos_rs > 0);
            const hasGestaoCco = chartData.some(d => d.gestao_cco_rs > 0);
            const hasGestaoParceiro = chartData.some(d => d.gestao_parceiro_rs > 0);
            const hasFaturaLivre = chartData.some(d => d.fatura_livre_rs > 0);

            const hasAnyCost = hasCompra || hasIcms || hasEncargos || hasGestaoCco || hasGestaoParceiro || hasFaturaLivre;

            if (!hasAnyCost) {
              return (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados de custos
                </div>
              );
            }

            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData}
                  barCategoryGap="30%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="reference_label" 
                    type="category" 
                    scale="band"
                    fontSize={12} 
                  />
                  <YAxis fontSize={12} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const validPayload = payload.filter(item => Number(item.value || 0) > 0);
                        if (validPayload.length === 0) return null;
                        
                        const total = validPayload.reduce((sum, item) => sum + Number(item.value || 0), 0);
                        return (
                          <div className="bg-background border rounded-md p-2 shadow-sm">
                            <p className="font-medium">{`Mês: ${label}`}</p>
                            {validPayload.map((item, index) => (
                              <p key={index} style={{ color: item.color }}>
                                {`${item.name}: ${Number(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                              </p>
                            ))}
                            <p className="font-medium border-t pt-1 mt-1">
                              {`Total do mês: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {hasCompra && (
                    <Bar dataKey="compra_energia_rs" name="Compra Energia" fill={COLORS.compra} radius={[6, 6, 0, 0]} />
                  )}
                  {hasIcms && (
                    <Bar dataKey="icms_energia_rs" name="ICMS" fill={COLORS.icms} radius={[6, 6, 0, 0]} />
                  )}
                  {hasEncargos && (
                    <Bar dataKey="encargos_rs" name="Encargos" fill={COLORS.encargos} radius={[6, 6, 0, 0]} />
                  )}
                  {hasGestaoCco && (
                    <Bar dataKey="gestao_cco_rs" name="Gestão CCO" fill={COLORS.gestao_cco} radius={[6, 6, 0, 0]} />
                  )}
                  {hasGestaoParceiro && (
                    <Bar dataKey="gestao_parceiro_rs" name="Gestão Parceiro" fill={COLORS.gestao_parceiro} radius={[6, 6, 0, 0]} />
                  )}
                  {hasFaturaLivre && (
                    <Bar dataKey="fatura_livre_rs" name="Fatura Livre" fill="#065F46" radius={[6, 6, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyCharts;