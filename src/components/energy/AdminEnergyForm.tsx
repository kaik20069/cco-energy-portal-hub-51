import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useEnergyFormCalculations } from "@/hooks/useEnergyFormCalculations";
import { parseRefLabel } from "@/lib/energyCalc";
import { toast } from "@/hooks/use-toast";
import ImportEnergyCSV from "@/components/energy/ImportEnergyCSV";
import ClientSearch from "@/components/energy/ClientSearch";
import UnitSelector from "@/components/energy/UnitSelector";
import UnitsManagement from "@/components/energy/UnitsManagement";

const refRegex = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{2}$/i;

const FormSchema = z.object({
  user_id: z.string().uuid({ message: "Selecione um cliente" }),
  unit_id: z.string().uuid({ message: "Selecione uma unidade" }),
  n_relatorio: z.string().optional(),
  reference_label: z
    .string()
    .regex(refRegex, "Formato MMM/AA, ex: ago/24"),

  // Energia ativa kWh e preços
  energia_kwh_ponta: z.coerce.number().default(0),
  energia_kwh_fora: z.coerce.number().default(0),
  energia_kwh_reservado: z.coerce.number().default(0),
  preco_kwh_ponta: z.coerce.number().default(0),
  preco_kwh_fora: z.coerce.number().default(0),
  preco_kwh_reservado: z.coerce.number().default(0),

  // Demanda contratada kW (do mês)
  demanda_contratada_kw_ponta: z.coerce.number().default(0),
  demanda_contratada_kw_fora: z.coerce.number().default(0),
  demanda_contratada_kw_reservado: z.coerce.number().default(0),

  // Demanda kW faturadas e preços
  demanda_faturada_kw_ponta: z.coerce.number().default(0),
  demanda_faturada_kw_fora: z.coerce.number().default(0),
  demanda_faturada_kw_reservado: z.coerce.number().default(0),
  preco_kw_ponta: z.coerce.number().default(0),
  preco_kw_fora: z.coerce.number().default(0),
  preco_kw_reservado: z.coerce.number().default(0),

  // Reativo kvarh e preços
  reativo_kvarh_ponta: z.coerce.number().default(0),
  reativo_kvarh_fora: z.coerce.number().default(0),
  reativo_kvarh_reservado: z.coerce.number().default(0),
  preco_kvarh_ponta: z.coerce.number().default(0),
  preco_kvarh_fora: z.coerce.number().default(0),
  preco_kvarh_reservado: z.coerce.number().default(0),
  
  // Reativo excedente e limite
  reativo_excedente_kvarh: z.coerce.number().default(0),
  preco_kvarh_excedente: z.coerce.number().default(0),
  reativo_limite_rate: z.coerce.number().default(0.62),
  fator_potencia: z.coerce.number().default(0),

  // Financeiro
  fatura_geral_rs: z.coerce.number().default(0),
  fatura_livre_rs: z.coerce.number().default(0),
  compra_energia_rs: z.coerce.number().default(0),
  icms_energia_rs: z.coerce.number().default(0),
  encargos_rs: z.coerce.number().default(0),
  banco_trianon_rs: z.coerce.number().default(0),
  gestao_cco_rs: z.coerce.number().default(0),
  gestao_parceiro_rs: z.coerce.number().default(0),
  bandeiras_rs: z.coerce.number().default(0),
  proinfa_rs: z.coerce.number().default(0),

  // Alíquotas
  pis_rate: z.coerce.number().default(0),
  cofins_rate: z.coerce.number().default(0),
  icms_rate: z.coerce.number().default(0),
  rdb_rate: z.coerce.number().default(0),

  // Totais calculados
  economia_liquida_rs: z.coerce.number().default(0),
  economia_liquida_pct: z.coerce.number().default(0),
  mwh_total_gerador: z.coerce.number().default(0),

  // Fator de Potência (planilha)
  demanda_maxima_kw: z.coerce.number().default(0),
  fp_param_min: z.coerce.number().default(0.92),
  fp_param_max: z.coerce.number().default(0.94),
  fp_ponta: z.coerce.number().nullable().default(null),
  fp_fora: z.coerce.number().nullable().default(null),
  fp_res: z.coerce.number().nullable().default(null),
  fp_global: z.coerce.number().nullable().default(null),
  kvar_corrigir_min: z.coerce.number().default(0),
  kvar_corrigir_max: z.coerce.number().default(0),
});

interface AdminEnergyFormProps {
  initialUserId?: string;
  onUserChange?: (userId: string) => void;
}

export default function AdminEnergyForm({ initialUserId, onUserChange }: AdminEnergyFormProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [showUnitsManagement, setShowUnitsManagement] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      user_id: initialUserId || undefined,
      unit_id: undefined,
      n_relatorio: "",
      reference_label: "",
      // numbers default via zod
    } as any,
  });

  // Update user_id if initialUserId changes
  useEffect(() => {
    if (initialUserId) {
      form.setValue("user_id", initialUserId as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  useEnergyFormCalculations(form);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, type, comercializadora, gestora_parceira, concessionaria")
        .eq("type", "client")
        .order("full_name", { ascending: true });
      if (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Erro ao carregar clientes" });
        return;
      }
      setProfiles(data || []);
    };
    fetchProfiles();
  }, []);

  // Atualiza o contexto do cliente mostrado ao lado e carrega unidades
  const watchedUserId = form.watch("user_id");
  useEffect(() => {
    const p = profiles.find((x) => x.id === watchedUserId) || null;
    setSelectedProfile(p);
    if (watchedUserId && onUserChange) onUserChange(watchedUserId);

    // Carregar unidades do usuário selecionado
    if (watchedUserId) {
      const fetchUnits = async () => {
        try {
          const { data, error } = await (supabase as any)
            .from("energy_units")
            .select("*")
            .eq("user_id", watchedUserId)
            .order("code");
          
          if (!error) {
            setUnits(data || []);
          }
        } catch (error) {
          console.error("Error fetching units:", error);
          setUnits([]);
        }
      };
      fetchUnits();
    } else {
      setUnits([]);
      form.setValue("unit_id", undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedUserId, profiles]);

  const handleRefChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) => {
    const v = e.target.value.toLowerCase();
    // Mantém apenas letras e números e a barra
    const cleaned = v.replace(/[^a-zA-Z/0-9]/g, "");
    onChange(cleaned);
  };

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      const payload = { ...values } as any;
      
      // Remove cod_instal and distribuidora from payload - they come from unit
      delete payload.cod_instal;
      delete payload.distribuidora;
      
      const { error } = await (supabase as any)
        .from("energy_monthly_metrics")
        .upsert(payload, { onConflict: 'user_id,reference_label,unit_id' });
      if (error) throw error;
      toast({ title: "Registro salvo" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
    }
  };

  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const incRefLabel = (label: string) => {
    if (!refRegex.test(label)) return label;
    const { month, year } = parseRefLabel(label);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const mmm = months[nextMonth - 1];
    const yy = String(nextYear % 100).padStart(2, "0");
    return `${mmm}/${yy}`;
  };

  const onSubmitAndNext = async (values: z.infer<typeof FormSchema>) => {
    await onSubmit(values);
    const next = { ...values } as any;
    next.reference_label = incRefLabel(values.reference_label);
    form.reset(next);
  };

  const duplicateFromLastMonth = async () => {
    const currentUserId = form.getValues("user_id");
    const currentUnitId = form.getValues("unit_id");
    
    if (!currentUserId || !currentUnitId) {
      toast({ variant: "destructive", title: "Selecione cliente e unidade primeiro" });
      return;
    }

    try {
      // Buscar o último registro deste usuário/unidade
      const { data, error } = await (supabase as any)
        .from("energy_monthly_metrics")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("unit_id", currentUnitId)
        .order("reference_label", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({ variant: "destructive", title: "Nenhum histórico encontrado para duplicar" });
        return;
      }

      const lastRecord = data[0];
      
      // Campos que devem ser copiados (especialmente demanda_maxima_kw e fp_param_*)
      const fieldsToKeep = {
        demanda_maxima_kw: lastRecord.demanda_maxima_kw,
        fp_param_min: lastRecord.fp_param_min || 0.92,
        fp_param_max: lastRecord.fp_param_max || 0.94,
        demanda_contratada_kw_ponta: lastRecord.demanda_contratada_kw_ponta,
        demanda_contratada_kw_fora: lastRecord.demanda_contratada_kw_fora,
        demanda_contratada_kw_reservado: lastRecord.demanda_contratada_kw_reservado,
        // Outros campos que podem ser úteis manter
        icms_rate: lastRecord.icms_rate,
        rdb_rate: lastRecord.rdb_rate,
        pis_rate: lastRecord.pis_rate,
        cofins_rate: lastRecord.cofins_rate,
        reativo_limite_rate: lastRecord.reativo_limite_rate || 0.62,
      };

      // Aplicar os valores mantendo a seleção atual de usuário/unidade
      Object.entries(fieldsToKeep).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          form.setValue(key as any, value as any);
        }
      });

      toast({ title: "Dados do último mês copiados com sucesso" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao duplicar dados", description: err.message });
    }
  };

  // Handle unit selection
  const handleUnitSelection = (unitId: string) => {
    form.setValue("unit_id", unitId);
    const unit = units.find(u => u.id === unitId);
    setSelectedUnit(unit || null);
  };

  // Callback quando uma nova unidade é criada
  const handleUnitCreated = (unit: any) => {
    // Atualizar lista local de unidades
    setUnits(prev => [...prev, unit]);
    setSelectedUnit(unit);
  };

  const profileContext = useMemo(() => {
    if (!selectedProfile) return null;
    const { comercializadora, gestora_parceira, concessionaria } = selectedProfile;
    const have = comercializadora || gestora_parceira || concessionaria;
    if (!have) return null;
    return (
      <div className="text-sm text-gray-600 space-y-1">
        {comercializadora && <div>Comercializadora: <span className="font-medium">{comercializadora}</span></div>}
        {gestora_parceira && <div>Gestora Parceira: <span className="font-medium">{gestora_parceira}</span></div>}
        {concessionaria && <div>Concessionária: <span className="font-medium">{concessionaria}</span></div>}
      </div>
    );
  }, [selectedProfile]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Histórico de Energia - Cadastro</CardTitle>
          <ImportEnergyCSV profiles={profiles} />
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Identificação */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1) Identificação</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <FormControl>
                        <ClientSearch
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Buscar cliente..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="hidden md:block">{profileContext}</div>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade (UC) *</FormLabel>
                        <FormControl>
                        <UnitSelector
                          userId={watchedUserId || ""}
                          value={field.value}
                          onValueChange={handleUnitSelection}
                        />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnitsManagement(true)}
                    disabled={!watchedUserId}
                  >
                    Gerenciar Unidades
                  </Button>
                </div>

                {selectedUnit && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <div><strong>Código da Unidade:</strong> {selectedUnit.code}</div>
                      {selectedUnit.nickname && <div><strong>Apelido:</strong> {selectedUnit.nickname}</div>}
                      {selectedUnit.distribuidora && <div><strong>Distribuidora:</strong> {selectedUnit.distribuidora}</div>}
                      {selectedUnit.fornecedora_energia && <div><strong>Fornecedora de Energia:</strong> {selectedUnit.fornecedora_energia}</div>}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="n_relatorio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Relatório</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: RPT-2024-08" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference_label"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Mês de referência (MMM/AA) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ago/24"
                          value={field.value || ""}
                          onChange={(e) => handleRefChange(e, field.onChange)}
                          onBlur={(e) => field.onChange((e.target.value || "").toLowerCase())}
                          pattern={refRegex.source}
                        />
                      </FormControl>
                      <FormDescription>Ex.: jan/24, fev/24</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator />

            {/* Energia ativa */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2) Energia ativa</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* kWh por período */}
                <FormField control={form.control} name="energia_kwh_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kWh Ponta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="energia_kwh_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kWh Fora</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="energia_kwh_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kWh Reservado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* R$/kWh por período */}
                <FormField control={form.control} name="preco_kwh_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kWh Ponta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kwh_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kWh Fora</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kwh_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kWh Reservado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* MWh total calculado */}
                <FormField control={form.control} name="mwh_total_gerador" render={({ field }) => (
                  <FormItem>
                    <FormLabel>MWh total (auto)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} readOnly />
                    </FormControl>
                    <FormDescription>Somatório de kWh / 1000</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <Separator />

            {/* Reativo */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3) Reativo</h2>
              
              {/* kvarh por período */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Energia reativa (kvarh)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="reativo_kvarh_ponta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kvarh Ponta</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reativo_kvarh_fora" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kvarh Fora</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reativo_kvarh_reservado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kvarh Reservado</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* R$/kvarh por período */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Preços da energia reativa (R$/kvarh)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="preco_kvarh_ponta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>R$/kvarh Ponta</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preco_kvarh_fora" render={({ field }) => (
                    <FormItem>
                      <FormLabel>R$/kvarh Fora</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preco_kvarh_reservado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>R$/kvarh Reservado</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Configurações do reativo */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Configurações do reativo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="reativo_limite_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite reativo (kvarh/kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" {...field} />
                      </FormControl>
                      <FormDescription>Padrão: 0,620 (62%)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preco_kvarh_excedente" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço do excedente (R$/kvarh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Campos calculados */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Valores calculados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="reativo_excedente_kvarh" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excedente reativo (kvarh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Calculado automaticamente</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fator_potencia" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fator de potência</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.0001" {...field} readOnly className="bg-muted flex-1" />
                          {parseFloat(String(field.value || "0")) < 0.92 && (
                            <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium border border-yellow-200">
                              Baixo FP
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Calculado automaticamente {parseFloat(String(field.value || "0")) < 0.92 && "- Atenção: FP < 0,92"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </section>

            <Separator />

            {/* Demanda */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4) Demanda (kW)</h2>
              
              {/* Demanda contratada */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Demanda contratada (kW)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="demanda_contratada_kw_ponta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponta (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="demanda_contratada_kw_fora" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fora ponta (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="demanda_contratada_kw_reservado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reservado (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Demanda faturada e preços */}
              <div>
                <h3 className="text-md font-medium mb-3">Faturados + Preços</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="demanda_faturada_kw_ponta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demanda Faturada Ponta (kW)</FormLabel>
                      <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kw_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Ponta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="demanda_faturada_kw_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demanda Faturada Fora (kW)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kw_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Fora</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="demanda_faturada_kw_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demanda Faturada Reservado (kW)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kw_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Reservado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
              </div>
            </section>

            <Separator />

            {/* Financeiro */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5) Financeiro</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="fatura_geral_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fatura Geral (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fatura_livre_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fatura Livre (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="compra_energia_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compra de Energia (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="icms_energia_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICMS Energia (auto)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="encargos_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encargos (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bandeiras_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeiras (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="proinfa_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PROINFA (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="banco_trianon_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco Trianon (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gestao_cco_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gestão CCO (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gestao_parceiro_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gestão Parceiro (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <Separator />

            {/* Alíquotas */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6) Alíquotas</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="pis_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00001" {...field} />
                    </FormControl>
                    <FormDescription>Ex.: 0,018</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cofins_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>COFINS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00001" {...field} />
                    </FormControl>
                    <FormDescription>Ex.: 0,085</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="icms_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICMS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00001" {...field} />
                    </FormControl>
                    <FormDescription>Ex.: 0,25 = 25%</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rdb_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RDB (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00001" {...field} />
                    </FormControl>
                    <FormDescription>Redutor de base</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <Separator />

            {/* Fator de Potência (planilha) */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6.5) Fator de Potência (planilha)</h2>
              
              {/* Parâmetros de entrada */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Parâmetros</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="demanda_maxima_kw" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demanda Máxima (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Para cálculo de correção</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fp_param_min" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Meta Min</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" {...field} />
                      </FormControl>
                      <FormDescription>Padrão: 0,920</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fp_param_max" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Meta Max</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" {...field} />
                      </FormControl>
                      <FormDescription>Padrão: 0,940</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Fatores de Potência calculados */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Fatores de Potência (calculados automaticamente)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="fp_ponta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Ponta</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Auto (4 casas)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fp_fora" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Fora</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Auto (4 casas)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fp_res" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Reservado</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Auto (4 casas)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fp_global" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FP Global</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.0001" {...field} readOnly className="bg-muted flex-1" />
                          {(() => {
                            const fpValue = parseFloat(String(field.value || "0"));
                            if (fpValue >= 0.92) {
                              return <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium border border-green-200">✓</div>;
                            } else if (fpValue >= 0.90) {
                              return <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium border border-yellow-200">!</div>;
                            } else {
                              return <div className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium border border-red-200">×</div>;
                            }
                          })()}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Auto (4 casas) - {(() => {
                          const fpValue = parseFloat(String(field.value || "0"));
                          if (fpValue >= 0.92) return "Adequado (≥0,92)";
                          if (fpValue >= 0.90) return "Atenção (0,90-0,9199)";
                          return "Baixo (<0,90)";
                        })()}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* kVAr de correção */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">kVAr de Correção por Demanda (calculados automaticamente)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="kvar_corrigir_min" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kVAr Corrigir (Meta Min)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Auto (2 casas) - Meta 0,92</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="kvar_corrigir_max" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kVAr Corrigir (Meta Max)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>Auto (2 casas) - Meta 0,94</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </section>

            <Separator />

            {/* Totais calculados */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7) Totais calculados</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="icms_energia_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICMS Energia (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="economia_liquida_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Economia Líquida (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="economia_liquida_pct" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Economia Líquida (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00001" {...field} readOnly />
                    </FormControl>
                    <FormDescription>Fração (ex.: 0,105 = 10,5%)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <div className="flex gap-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="outline" onClick={form.handleSubmit(onSubmitAndNext)}>
                Salvar e criar próximo mês
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={duplicateFromLastMonth}
                disabled={!watchedUserId || !form.getValues("unit_id")}
              >
                Duplicar do último mês
              </Button>
            </div>
          </form>
        </Form>
        
        <UnitsManagement
          userId={watchedUserId || ""}
          open={showUnitsManagement}
          onOpenChange={setShowUnitsManagement}
          onUnitChanged={() => {
            // Refresh units list
            if (watchedUserId) {
              setUnits([]);
              setTimeout(() => {
                const fetchUnits = async () => {
                  const { data } = await (supabase as any)
                    .from("energy_units")
                    .select("*")
                    .eq("user_id", watchedUserId)
                    .order("code");
                  setUnits(data || []);
                };
                fetchUnits();
              }, 100);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
