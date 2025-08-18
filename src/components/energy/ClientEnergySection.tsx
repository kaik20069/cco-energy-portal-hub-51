import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sortByRefLabel } from "@/lib/energyCalc";
import { filterByPeriod, PeriodState } from "@/lib/periodRef";
import { getUniqueDistribuidoras, getUniqueFornecedoras, processEnergyData, generateExportFilename } from "@/lib/energyFilters";
import SharedEnergyCharts from "./SharedEnergyCharts";
import EnergyKpis from "./EnergyKpis";
import EnergyMonthlyTable from "./EnergyMonthlyTable";
import PeriodSelect from "./PeriodSelect";
import UnidadeSelector from "./UnidadeSelector";
import DistribuidoraSelector from "./DistribuidoraSelector";
import FornecedoraSelector from "./FornecedoraSelector";
import UnitsManagement from "./UnitsManagement";
import Papa from "papaparse";

interface EnergyRow {
  reference_label: string;
  user_id: string;
  unit_id?: string | null;
  distribuidora?: string | null;
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
  reativo_excedente_kvarh?: number | null;
  compra_energia_rs?: number | null;
  icms_energia_rs?: number | null;
  encargos_rs?: number | null;
  banco_trianon_rs?: number | null;
  gestao_cco_rs?: number | null;
  gestao_parceiro_rs?: number | null;
  fatura_livre_rs?: number | null;
  fatura_geral_rs?: number | null;
  economia_liquida_rs?: number | null;
  economia_liquida_pct?: number | null;
  mwh_total_gerador?: number | null;
  [k: string]: any;
}

interface Unit {
  id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
}

interface ClientEnergySectionProps {
  // No props needed - component manages its own state
}

const ClientEnergySection: React.FC<ClientEnergySectionProps> = () => {
  const [energyData, setEnergyData] = useState<EnergyRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodState>({ mode: 'LAST12' });
  const [selectedUnitId, setSelectedUnitId] = useState<string>("todas");
  const [selectedDistribuidora, setSelectedDistribuidora] = useState<string>("todas");
  const [selectedFornecedora, setSelectedFornecedora] = useState<string>("todas");
  const [showUnitsManagement, setShowUnitsManagement] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      
      if (!userId) {
        setError("Faça login novamente");
        return;
      }

      setCurrentUserId(userId);

      // Fetch energy data and units in parallel
      const [energyResult, unitsResult] = await Promise.all([
        supabase.from('energy_monthly_metrics').select('*').eq('user_id', userId),
        supabase.from('energy_units').select('*').eq('user_id', userId).order('code')
      ]);

      if (energyResult.error) throw energyResult.error;
      if (unitsResult.error) throw unitsResult.error;

      if (energyResult.data) {
        // Ordenar por mês usando sortByRefLabel
        const sortedData = energyResult.data.sort((a, b) => 
          sortByRefLabel(a.reference_label, b.reference_label)
        );
        setEnergyData(sortedData);
      }

      if (unitsResult.data) {
        setUnits(unitsResult.data);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unit selection changes
  useEffect(() => {
    if (selectedUnitId !== "todas") {
      const selectedUnit = units.find(u => u.id === selectedUnitId);
      if (selectedUnit?.distribuidora) {
        setSelectedDistribuidora(selectedUnit.distribuidora);
      }
      if (selectedUnit?.fornecedora_energia) {
        setSelectedFornecedora(selectedUnit.fornecedora_energia);
      }
    }
  }, [selectedUnitId, units]);

  // Get available distribuidoras and fornecedoras
  const availableDistribuidoras = useMemo(() => {
    if (selectedUnitId === "todas") {
      return getUniqueDistribuidoras(energyData, units);
    }
    return [];
  }, [energyData, units, selectedUnitId]);

  const availableFornecedoras = useMemo(() => {
    if (selectedUnitId === "todas") {
      return getUniqueFornecedoras(units);
    }
    return [];
  }, [units, selectedUnitId]);

  // Filter data by period first
  const periodFiltered = useMemo(() => 
    filterByPeriod(energyData, period), 
    [energyData, period]
  );
  
  // Apply unit and distribuidora filters with aggregation
  const processedData = useMemo(() => {
    const processed = processEnergyData(periodFiltered, selectedUnitId, selectedDistribuidora, selectedFornecedora, units);
    return processed.sort((a, b) => sortByRefLabel(a.reference_label, b.reference_label));
  }, [periodFiltered, selectedUnitId, selectedDistribuidora, selectedFornecedora, units]);

  // Compute if single unit is selected
  const isSingleUnit = selectedUnitId && selectedUnitId !== 'todas';

  const getPeriodLabel = () => {
    switch (period.mode) {
      case "LAST12": return "Últimos 12 meses";
      case "THIS_YEAR": return "Ano atual";
      case "PREV_YEAR": return "Ano anterior";
      case "CUSTOM": return period.startLabel && period.endLabel ? `${period.startLabel} a ${period.endLabel}` : "Personalizado";
      default: return "";
    }
  };

  const exportCsv = () => {
    if (!processedData.length) return;
    const csv = Papa.unparse(processedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = generateExportFilename(selectedUnitId, selectedDistribuidora, selectedFornecedora, period.mode, "cliente", units);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#ADD8E6]" />
            Gráficos de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period filters bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#ADD8E6]" />
            Dados - Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-end">
            {/* Período */}
            <div className="w-full min-w-[220px]">
              <PeriodSelect value={period} onChange={setPeriod} />
            </div>
            
            {/* Unidade (UC) */}
            <div className="w-full min-w-[220px]">
              <UnidadeSelector 
                value={selectedUnitId} 
                onValueChange={setSelectedUnitId} 
                units={units}
              />
            </div>
            
            {/* Distribuidora */}
            <div className="w-full min-w-[220px]">
              <DistribuidoraSelector 
                value={selectedDistribuidora} 
                onValueChange={setSelectedDistribuidora}
                disabled={selectedUnitId !== "todas"}
                distribuidoras={availableDistribuidoras}
              />
            </div>
            
            {/* Fornecedora */}
            <div className="w-full min-w-[220px]">
              <FornecedoraSelector
                value={selectedFornecedora}
                onValueChange={setSelectedFornecedora}
                fornecedoras={availableFornecedoras}
                selectedUnitId={selectedUnitId}
                units={units}
                disabled={selectedUnitId !== "todas"}
              />
            </div>
            
            {/* Botões de ação */}
            <div className="col-span-full flex flex-wrap items-end justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUnitsManagement(true)}
                disabled={!currentUserId}
              >
                Gerenciar Unidades
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!processedData.length}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </CardContent>
        </Card>
      ) : !processedData.length ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Sem dados no período/filtros selecionados</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EnergyKpis rows={processedData} periodLabel={getPeriodLabel()} showFilters={false} />
          <SharedEnergyCharts data={processedData} isSingleUnit={isSingleUnit} />
          <EnergyMonthlyTable 
            data={processedData} 
            showActions={false}
            showUnitColumn={selectedUnitId === "todas"}
            showDistribuidoraColumn={selectedUnitId === "todas"}
            showFornecedoraColumn={selectedUnitId === "todas"}
            units={units}
          />
        </>
      )}
      
      <UnitsManagement
        userId={currentUserId}
        open={showUnitsManagement}
        onOpenChange={setShowUnitsManagement}
        onUnitChanged={fetchData}
      />
    </div>
  );
};

export default ClientEnergySection;