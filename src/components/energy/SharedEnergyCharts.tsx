import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ReferenceLine } from "recharts";
import { sortByRefLabel } from "@/lib/energyCalc";
import DemandChart from "./DemandChart";

interface EnergyRow {
  reference_label: string;
  user_id?: string;
  energia_kwh_ponta?: number | null;
  energia_kwh_fora?: number | null;
  energia_kwh_reservado?: number | null;
  demanda_faturada_kw_ponta?: number | null;
  demanda_faturada_kw_fora?: number | null;
  demanda_faturada_kw_reservado?: number | null;
  demanda_contratada_kw_ponta?: number | null;
  demanda_contratada_kw_fora?: number | null;
  demanda_contratada_kw_reservado?: number | null;
  reativo_kvarh_ponta?: number | null;
  reativo_kvarh_fora?: number | null;
  reativo_kvarh_reservado?: number | null;
  reativo_limite_rate?: number | null;
  reativo_excedente_kvarh?: number | null;
  compra_energia_rs?: number | null;
  icms_energia_rs?: number | null;
  encargos_rs?: number | null;
  banco_trianon_rs?: number | null;
  gestao_cco_rs?: number | null;
  gestao_parceiro_rs?: number | null;
  fatura_livre_rs?: number | null;
  // Campos de Fator de Potência
  demanda_maxima_kw?: number | null;
  fp_ponta?: number | null;
  fp_fora?: number | null;
  fp_res?: number | null;
  fp_global?: number | null;
  kvar_corrigir_min?: number | null;
  kvar_corrigir_max?: number | null;
  [k: string]: any;
}

interface SharedEnergyChartsProps {
  data: EnergyRow[];
  isSingleUnit?: boolean;
}

// Paleta de cores fixa (usar exatamente)
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
  gestao_parceiro: "#EF4444",
  fatura_livre: "#3B82F6",
  // Fator de Potência
  fp_global: "#059669", // Verde para FP global
  fp_low: "#EF4444",     // Vermelho para FP baixo
  fp_good: "#10B981"     // Verde claro para FP bom
};

const SharedEnergyCharts: React.FC<SharedEnergyChartsProps> = ({ data, isSingleUnit = false }) => {
  const chartData = useMemo(() => {
    // Acumuladores para step values (carry forward)
    let lastContratadaP = 0;
    let lastContratadaF = 0;
    let lastContratadaR = 0;
    
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
        const reativo_excedente_calc = Math.max(0, total_kvarh - limite_kvarh);
        const fator_potencia = total_kwh > 0 ? 1 / Math.sqrt(1 + Math.pow(total_kvarh / total_kwh, 2)) : 1;

        // Demandas faturadas
        const p = Number(r.demanda_faturada_kw_ponta || 0);
        const f = Number(r.demanda_faturada_kw_fora || 0);
        const res = Number(r.demanda_faturada_kw_reservado || 0);

        // Carry forward para contratada (step)
        const contratadaP = Number(r.demanda_contratada_kw_ponta || 0);
        const contratadaF = Number(r.demanda_contratada_kw_fora || 0);
        const contratadaR = Number(r.demanda_contratada_kw_reservado || 0);
        
        if (contratadaP > 0) lastContratadaP = contratadaP;
        if (contratadaF > 0) lastContratadaF = contratadaF;
        if (contratadaR > 0) lastContratadaR = contratadaR;

        // Limite 105%
        const limiteP = lastContratadaP * 1.05;
        const limiteF = lastContratadaF * 1.05;
        const limiteR = lastContratadaR * 1.05;

        // Excedente (> 5%)
        const p_ex = Math.max(0, p - limiteP);
        const f_ex = Math.max(0, f - limiteF);
        const r_ex = Math.max(0, res - limiteR);

        // Base até o limite
        const p_base = p - p_ex;
        const f_base = f - f_ex;
        const r_base = res - r_ex;

        return {
          reference_label: r.reference_label,
          // Consumo por período (MWh)
          mwh_ponta: Number(r.energia_kwh_ponta || 0) / 1000,
          mwh_fora: Number(r.energia_kwh_fora || 0) / 1000,
          mwh_reservado: Number(r.energia_kwh_reservado || 0) / 1000,
          // Demandas por período (kW) - com split base/excedente
          demanda_faturada_kw_ponta: p,
          demanda_faturada_kw_fora: f,
          demanda_faturada_kw_reservado: res,
          p_base,
          f_base,
          r_base,
          p_ex,
          f_ex,
          r_ex,
          // Step values
          contratada_p_step: lastContratadaP,
          contratada_f_step: lastContratadaF,
          contratada_r_step: lastContratadaR,
          limite_p_step: limiteP,
          limite_f_step: limiteF,
          limite_r_step: limiteR,
          // Custos (R$)
          compra_energia_rs: Number(r.compra_energia_rs || 0),
          icms_energia_rs: Number(r.icms_energia_rs || 0),
          encargos_rs: Number(r.encargos_rs || 0),
          banco_trianon_rs: Number(r.banco_trianon_rs || 0),
          gestao_cco_rs: Number(r.gestao_cco_rs || 0),
          gestao_parceiro_rs: Number(r.gestao_parceiro_rs || 0),
          fatura_livre_rs: Number(r.fatura_livre_rs || 0),
          // Reativo
          total_kwh,
          total_kvarh,
          limite_kvarh,
          reativo_excedente_kvarh: Number(r.reativo_excedente_kvarh) || reativo_excedente_calc,
          fator_potencia: Number(r.fator_potencia) || fator_potencia,
          // Fator de Potência (planilha) - usar valores calculados ou do banco
          demanda_maxima_kw: Number(r.demanda_maxima_kw || 0),
          fp_ponta: r.fp_ponta !== null ? Number(r.fp_ponta) : null,
          fp_fora: r.fp_fora !== null ? Number(r.fp_fora) : null, 
          fp_res: r.fp_res !== null ? Number(r.fp_res) : null,
          fp_global: r.fp_global !== null ? Number(r.fp_global) : fator_potencia,
          kvar_corrigir_min: Number(r.kvar_corrigir_min || 0),
          kvar_corrigir_max: Number(r.kvar_corrigir_max || 0),
        };
      });
  }, [data]);

  // Calculate weighted average power factor for the period
  const fpMedio = useMemo(() => {
    const totalKwhSum = chartData.reduce((sum, d) => sum + d.total_kwh, 0);
    if (totalKwhSum === 0) return 1;
    
    const weightedSum = chartData.reduce((sum, d) => sum + (d.total_kwh * d.fp_global), 0);
    return weightedSum / totalKwhSum;
  }, [chartData]);

  const hasLowPowerFactor = useMemo(() => 
    chartData.some(d => d.fp_global < 0.92), [chartData]
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
          {chartData.every(d => (d.mwh_ponta + d.mwh_fora + d.mwh_reservado) === 0) ? (
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
                <Bar dataKey="mwh_ponta" name="Ponta" fill={COLORS.ponta} radius={6} />
                <Bar dataKey="mwh_fora" name="Fora Ponta" fill={COLORS.fora} radius={6} />
                <Bar dataKey="mwh_reservado" name="Reservado" fill={COLORS.reservado} radius={6} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Conditional charts - only for single unit */}
      {isSingleUnit ? (
        <>
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
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Reativo excedente (kvarh)
                <Badge 
                  variant={fpMedio < 0.92 ? "destructive" : "secondary"} 
                  className="text-xs"
                >
                  FP médio: {fpMedio.toFixed(4)}
                </Badge>
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
                  Sem excedente reativo no período
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
                              <p>{`Total kvarh: ${Number(data?.total_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}</p>
                              <p>{`Limite kvarh: ${Number(data?.limite_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}</p>
                              <p>{`Excedente: ${Number(data?.reativo_excedente_kvarh || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kvarh`}</p>
                              <p>{`Fator potência: ${Number(data?.fator_potencia || 0).toFixed(4)}`}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="reativo_excedente_kvarh" name="Excedente" fill={COLORS.reativo} radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 4. Desempenho do Fator de Potência - LineChart */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Desempenho do Fator de Potência
                <Badge 
                  variant={fpMedio >= 0.92 ? "default" : fpMedio >= 0.90 ? "secondary" : "destructive"} 
                  className="text-xs"
                >
                  FP médio: {fpMedio.toFixed(4)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.every(d => d.fp_global === null || d.fp_global === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados de fator de potência
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="reference_label" fontSize={12} />
                    <YAxis 
                      fontSize={12} 
                      domain={[0.80, 1.00]}
                      tickFormatter={(value) => value.toFixed(3)}
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]?.payload;
                          return (
                            <div className="bg-background border rounded-md p-3 shadow-sm max-w-sm">
                              <p className="font-medium mb-2">{`Mês: ${label}`}</p>
                              
                              <div className="space-y-1">
                                <p className="font-semibold text-green-600">
                                  {`FP Global: ${Number(data?.fp_global || 0).toFixed(4)}`}
                                </p>
                                
                                {data?.fp_ponta !== null && (
                                  <p>{`FP Ponta: ${Number(data?.fp_ponta || 0).toFixed(4)}`}</p>
                                )}
                                {data?.fp_fora !== null && (
                                  <p>{`FP Fora: ${Number(data?.fp_fora || 0).toFixed(4)}`}</p>
                                )}
                                {data?.fp_res !== null && (
                                  <p>{`FP Reservado: ${Number(data?.fp_res || 0).toFixed(4)}`}</p>
                                )}
                                
                                {data?.demanda_maxima_kw > 0 && (
                                  <div className="border-t pt-2 mt-2">
                                    <p>{`Demanda Máx: ${Number(data?.demanda_maxima_kw || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kW`}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {`kVAr corrigir p/ 0,92: ${Number(data?.kvar_corrigir_min || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {`kVAr corrigir p/ 0,94: ${Number(data?.kvar_corrigir_max || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Reference Lines */}
                    <ReferenceLine y={0.92} stroke="#10B981" strokeDasharray="5 5" strokeWidth={2} />
                    <ReferenceLine y={0.94} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} />
                    
                    {/* Line Chart */}
                    <Line 
                      type="monotone" 
                      dataKey="fp_global" 
                      stroke={COLORS.fp_global}
                      strokeWidth={3}
                      dot={{ fill: COLORS.fp_global, strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: COLORS.fp_global, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        // Empty state when showing all units
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Selecione uma unidade para visualizar Demanda, Reativo e Fator de Potência.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 5. Custos (R$) - Barras agrupadas */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Custos (R$)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.every(d => 
            (d.compra_energia_rs + d.icms_energia_rs + d.encargos_rs + 
             d.banco_trianon_rs + d.gestao_cco_rs + d.gestao_parceiro_rs + d.fatura_livre_rs) === 0
          ) ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados de custos
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
                <Bar dataKey="compra_energia_rs" name="Compra Energia" fill={COLORS.compra} radius={6} />
                <Bar dataKey="icms_energia_rs" name="ICMS" fill={COLORS.icms} radius={6} />
                <Bar dataKey="encargos_rs" name="Encargos" fill={COLORS.encargos} radius={6} />
                <Bar dataKey="banco_trianon_rs" name="Banco Trianon" fill={COLORS.banco} radius={6} />
                <Bar dataKey="gestao_cco_rs" name="Gestão CCO" fill={COLORS.gestao_cco} radius={6} />
                <Bar dataKey="gestao_parceiro_rs" name="Gestão Parceiro" fill={COLORS.gestao_parceiro} radius={6} />
                <Bar dataKey="fatura_livre_rs" name="Fatura Livre" fill={COLORS.fatura_livre} radius={6} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedEnergyCharts;