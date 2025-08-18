import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { parseRefLabel, sortByRefLabel } from "@/lib/energyCalc";
import { filterByPeriod, periodOptionToPeriodState } from "@/lib/periodRef";
import { getUniqueDistribuidoras, getUniqueFornecedoras, processEnergyData, generateExportFilename } from "@/lib/energyFilters";
import { Download, Plus, FileUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminEnergyForm from "@/components/energy/AdminEnergyForm";
import { useSearchParams } from "react-router-dom";
import ClientSearch from "@/components/energy/ClientSearch";
import AddEnergyDialog from "@/components/energy/AddEnergyDialog";
import ImportEnergyCSV from "@/components/energy/ImportEnergyCSV";
import EnergyKpis from "@/components/energy/EnergyKpis";
import EnergyMonthlyTable from "@/components/energy/EnergyMonthlyTable";
import SharedEnergyCharts from "@/components/energy/SharedEnergyCharts";
import UnidadeSelector from "@/components/energy/UnidadeSelector";
import DistribuidoraSelector from "@/components/energy/DistribuidoraSelector";
import FornecedoraSelector from "@/components/energy/FornecedoraSelector";
import UnitsManagement from "@/components/energy/UnitsManagement";

const refRegex = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{2}$/i;

function toIndex(y: number, m: number) { return y * 12 + m; }
function formatRef(y: number, m: number) {
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"] as const;
  const mmm = meses[m - 1];
  const yy = String(y % 100).padStart(2, "0");
  return `${mmm}/${yy}`;
}
function shiftIndex(y: number, m: number, deltaMonths: number) {
  const idx = toIndex(y, m) + deltaMonths;
  const newY = Math.floor((idx - 1) / 12);
  const newM = idx - newY * 12;
  return { y: newY, m: newM };
}

type PeriodOption = "ultimos12" | "anoAtual" | "anoAnterior" | "custom";

interface EnergyRow {
  id: string;
  reference_label: string;
  user_id: string;
  unit_id?: string | null;
  distribuidora?: string | null;
  mwh_total_gerador?: number | null;
  energia_kwh_ponta?: number | null;
  energia_kwh_fora?: number | null;
  energia_kwh_reservado?: number | null;
  demanda_contratada_kw_ponta?: number | null;
  demanda_contratada_kw_fora?: number | null;
  demanda_contratada_kw_reservado?: number | null;
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
  banco_trianon_rs?: number | null;
  gestao_cco_rs?: number | null;
  gestao_parceiro_rs?: number | null;
  economia_liquida_rs?: number | null;
  economia_liquida_pct?: number | null;
}

interface Unit {
  id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
}

export default function AdminEnergy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<PeriodOption>((searchParams.get("period") as PeriodOption) || "ultimos12");
  const [customStart, setCustomStart] = useState(searchParams.get("start") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("end") || "");
  const [profiles, setProfiles] = useState<{ id: string; full_name?: string | null; email?: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(searchParams.get("user") || "");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(searchParams.get("unit") || "todas");
  const [selectedDistribuidora, setSelectedDistribuidora] = useState<string>(searchParams.get("distribuidora") || "todas");
  const [selectedFornecedora, setSelectedFornecedora] = useState<string>(searchParams.get("fornecedora") || "todas");
  const [rows, setRows] = useState<EnergyRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string>(searchParams.get("tab") || "visao");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [showUnitsManagement, setShowUnitsManagement] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("type", "client")
        .order("full_name", { ascending: true });
      if (!error && data) {
        setProfiles(data);
      }
    })();
  }, []);

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

  useEffect(() => {
    // Sync state to URL
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    params.set("period", period);
    if (period === "custom") {
      if (customStart) params.set("start", customStart); else params.delete("start");
      if (customEnd) params.set("end", customEnd); else params.delete("end");
    } else {
      params.delete("start");
      params.delete("end");
    }
    if (selectedUser) {
      params.set("user", selectedUser);
    } else {
      params.delete("user");
    }
    if (selectedUnitId !== "todas") {
      params.set("unit", selectedUnitId);
    } else {
      params.delete("unit");
    }
    if (selectedDistribuidora !== "todas") {
      params.set("distribuidora", selectedDistribuidora);
    } else {
      params.delete("distribuidora");
    }
    if (selectedFornecedora !== "todas") {
      params.set("fornecedora", selectedFornecedora);
    } else {
      params.delete("fornecedora");
    }
    setSearchParams(params, { replace: true });
  }, [tab, period, customStart, customEnd, selectedUser, selectedUnitId, selectedDistribuidora, selectedFornecedora]);

  const loadData = async () => {
    if (!selectedUser) {
      setRows([]);
      setUnits([]);
      return;
    }
    setLoading(true);
    
    // Load energy data and units in parallel
    const [energyResult, unitsResult] = await Promise.all([
      supabase.from("energy_monthly_metrics").select("*").eq("user_id", selectedUser),
      supabase.from("energy_units").select("*").eq("user_id", selectedUser).order("code")
    ]);
    
    if (!energyResult.error) setRows((energyResult.data as EnergyRow[]) || []);
    if (!unitsResult.error) setUnits((unitsResult.data as Unit[]) || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Reset filters when user changes
    setSelectedUnitId("todas");
    setSelectedDistribuidora("todas");
    setSelectedFornecedora("todas");
  }, [selectedUser]);

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const currentIdx = toIndex(cy, cm);

  function getRangeIndices(): { startIdx: number; endIdx: number } | null {
    if (period === "ultimos12") return { startIdx: currentIdx - 11, endIdx: currentIdx };
    if (period === "anoAtual") return { startIdx: toIndex(cy, 1), endIdx: toIndex(cy, 12) };
    if (period === "anoAnterior") return { startIdx: toIndex(cy - 1, 1), endIdx: toIndex(cy - 1, 12) };
    if (period === "custom") {
      if (!refRegex.test(customStart) || !refRegex.test(customEnd)) return null;
      const s = parseRefLabel(customStart);
      const e = parseRefLabel(customEnd);
      const si = toIndex(s.year, s.month);
      const ei = toIndex(e.year, e.month);
      return { startIdx: Math.min(si, ei), endIdx: Math.max(si, ei) };
    }
    return null;
  }

  // Get available distribuidoras and fornecedoras
  const availableDistribuidoras = useMemo(() => {
    if (selectedUnitId === "todas") {
      return getUniqueDistribuidoras(rows, units);
    }
    return [];
  }, [rows, units, selectedUnitId]);

  const availableFornecedoras = useMemo(() => {
    if (selectedUnitId === "todas") {
      return getUniqueFornecedoras(units);
    }
    return [];
  }, [units, selectedUnitId]);

  // Use new period filter system
  const periodState = useMemo(() => 
    periodOptionToPeriodState(period, customStart, customEnd), 
    [period, customStart, customEnd]
  );
  
  // Apply period filter first
  const periodFiltered = useMemo(() => 
    filterByPeriod(rows, periodState), 
    [rows, periodState]
  );
  
  // Apply unit and distribuidora filters with aggregation
  const processedData = useMemo(() => {
    const processed = processEnergyData(periodFiltered, selectedUnitId, selectedDistribuidora, selectedFornecedora, units);
    return processed.sort((a, b) => sortByRefLabel(a.reference_label, b.reference_label));
  }, [periodFiltered, selectedUnitId, selectedDistribuidora, selectedFornecedora, units]);

  // Compute if single unit is selected
  const isSingleUnit = selectedUnitId && selectedUnitId !== 'todas';

// Remove chartData and allDemandsZero as they're now handled in components

  function exportCsv() {
    if (!processedData.length) return;
    const csv = Papa.unparse(processedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    const clientName = profiles.find(p => p.id === selectedUser)?.full_name || "admin";
    const filename = generateExportFilename(selectedUnitId, selectedDistribuidora, selectedFornecedora, period, clientName, units);
    
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setAddDialogOpen(true);
  };

  const content = (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
        {/* Período */}
        <div className="w-full min-w-[220px]">
          <label className="block text-sm mb-1">Período</label>
          <Select value={period} onValueChange={(v: PeriodOption) => setPeriod(v)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultimos12">Últimos 12 meses</SelectItem>
              <SelectItem value="anoAtual">Ano atual</SelectItem>
              <SelectItem value="anoAnterior">Ano anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Período custom - ocupar duas colunas quando ativo */}
        {period === "custom" && (
          <div className="sm:col-span-2 flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1">Início (MMM/AA)</label>
              <Input 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value.toLowerCase())} 
                placeholder="ago/23"
                className="w-full h-10"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">Fim (MMM/AA)</label>
              <Input 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value.toLowerCase())} 
                placeholder="jul/24"
                className="w-full h-10"
              />
            </div>
          </div>
        )}

        {/* Cliente */}
        <div className="w-full min-w-[220px]">
          <label className="block text-sm mb-1">Cliente</label>
          <ClientSearch
            value={selectedUser}
            onValueChange={setSelectedUser}
            placeholder="Cliente"
            className="w-full h-10"
          />
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
        {tab === "visao" && (
          <div className="col-span-full flex flex-wrap items-end justify-end gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!selectedUser || !processedData.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} disabled={!selectedUser}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar mês
            </Button>
            <Button variant="secondary" onClick={() => setImportDialogOpen(true)} disabled={!selectedUser}>
              <FileUp className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button variant="outline" onClick={() => setShowUnitsManagement(true)} disabled={!selectedUser}>
              Gerenciar Unidades
            </Button>
          </div>
        )}
      </div>

      {/* Gráficos - apenas na aba Visão */}
      {tab === "visao" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !processedData.length ? (
            <Card>
              <CardContent className="p-6 text-center">
                {!selectedUser ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Pesquise um cliente para começar</h3>
                    <p className="text-sm text-muted-foreground">
                      Use a busca acima para selecionar um cliente e visualizar seus dados de energia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sem dados no período selecionado</h3>
                    <p className="text-sm text-muted-foreground">
                      Nenhum registro de energia foi encontrado para este cliente no período selecionado.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar mês
                      </Button>
                      <Button variant="secondary" onClick={() => setImportDialogOpen(true)}>
                        <FileUp className="w-4 h-4 mr-2" />
                        Importar CSV
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <EnergyKpis rows={processedData} showFilters={false} />
              <SharedEnergyCharts data={processedData} isSingleUnit={isSingleUnit} />
              <EnergyMonthlyTable 
                data={processedData} 
                onEdit={handleEditRecord}
                onRefresh={loadData}
                showActions={true}
                showUnitColumn={selectedUnitId === "todas"}
                showDistribuidoraColumn={selectedUnitId === "todas"}
                showFornecedoraColumn={selectedUnitId === "todas"}
                units={units}
              />
            </div>
          )}

        </>
      )}
    </div>
  );

  return (
    <AuthGuard requireAdmin>
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs para Visão e Cadastro */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="visao">Visão</TabsTrigger>
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              </TabsList>
              <TabsContent value="visao" className="space-y-4">
                {content}
              </TabsContent>
              <TabsContent value="cadastro">
                <AdminEnergyForm initialUserId={selectedUser} onUserChange={setSelectedUser} />
              </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <AddEnergyDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              selectedUserId={selectedUser}
              editingRecord={editingRecord}
              onSuccess={() => {
                loadData();
                setAddDialogOpen(false);
                setEditingRecord(null);
              }}
            />

            {importDialogOpen && (
              <ImportEnergyCSV
                profiles={profiles}
                onClose={() => setImportDialogOpen(false)}
                onSuccess={() => {
                  setImportDialogOpen(false);
                  loadData();
                }}
              />
            )}

            <UnitsManagement
              userId={selectedUser}
              open={showUnitsManagement}
              onOpenChange={setShowUnitsManagement}
              onUnitChanged={loadData}
            />
          </CardContent>
        </Card>
      </DashboardLayout>
    </AuthGuard>
  );
}
