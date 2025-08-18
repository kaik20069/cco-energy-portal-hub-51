import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { parseRefLabel, sortByRefLabel } from "@/lib/energyCalc";
import { toast } from "@/hooks/use-toast";
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
    .min(1, "Campo obrigatório")
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

const FORM_DEFAULTS: Partial<z.infer<typeof FormSchema>> = {
  unit_id: undefined,
  n_relatorio: "",
  reference_label: "",
  energia_kwh_ponta: 0,
  energia_kwh_fora: 0,
  energia_kwh_reservado: 0,
  preco_kwh_ponta: 0,
  preco_kwh_fora: 0,
  preco_kwh_reservado: 0,
  demanda_contratada_kw_ponta: 0,
  demanda_contratada_kw_fora: 0,
  demanda_contratada_kw_reservado: 0,
  demanda_faturada_kw_ponta: 0,
  demanda_faturada_kw_fora: 0,
  demanda_faturada_kw_reservado: 0,
  preco_kw_ponta: 0,
  preco_kw_fora: 0,
  preco_kw_reservado: 0,
  reativo_kvarh_ponta: 0,
  reativo_kvarh_fora: 0,
  reativo_kvarh_reservado: 0,
  preco_kvarh_ponta: 0,
  preco_kvarh_fora: 0,
  preco_kvarh_reservado: 0,
  reativo_excedente_kvarh: 0,
  preco_kvarh_excedente: 0,
  reativo_limite_rate: 0.62,
  fator_potencia: 0,
  fatura_geral_rs: 0,
  fatura_livre_rs: 0,
  compra_energia_rs: 0,
  icms_energia_rs: 0,
  encargos_rs: 0,
  banco_trianon_rs: 0,
  gestao_cco_rs: 0,
  gestao_parceiro_rs: 0,
  bandeiras_rs: 0,
  proinfa_rs: 0,
  pis_rate: 0,
  cofins_rate: 0,
  icms_rate: 0,
  rdb_rate: 0,
  economia_liquida_rs: 0,
  economia_liquida_pct: 0,
  mwh_total_gerador: 0,
  demanda_maxima_kw: 0,
  fp_param_min: 0.92,
  fp_param_max: 0.94,
  fp_ponta: null,
  fp_fora: null,
  fp_res: null,
  fp_global: null,
  kvar_corrigir_min: 0,
  kvar_corrigir_max: 0,
};

interface EnergyMonthFormProps {
  initialUserId?: string;
  editingRecord?: any;
  onSuccess?: () => void;
  onUserChange?: (userId: string) => void;
  showDuplicateToggle?: boolean;
  showClientSearch?: boolean;
  showUnitsManagement?: boolean;
  showImportCSV?: boolean;
  title?: string;
}

export default function EnergyMonthForm({
  initialUserId,
  editingRecord,
  onSuccess,
  onUserChange,
  showDuplicateToggle = false,
  showClientSearch = true,
  showUnitsManagement = true,
  showImportCSV = false,
  title = "Formulário de Energia"
}: EnergyMonthFormProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [duplicateFromLast, setDuplicateFromLast] = useState(false);
  const [showUnitsManagementDialog, setShowUnitsManagementDialog] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { ...FORM_DEFAULTS, user_id: initialUserId || undefined } as any,
  });

  useEnergyFormCalculations(form);

  // Update user_id if initialUserId changes
  useEffect(() => {
    if (initialUserId) {
      form.setValue("user_id", initialUserId as any);
    }
  }, [initialUserId, form]);

  // Load profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, type, comercializadora, gestora_parceira, concessionaria")
        .eq("type", "client")
        .order("full_name", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      setProfiles(data || []);
    };
    if (showClientSearch) {
      fetchProfiles();
    }
  }, [showClientSearch]);

  // Watch user_id and load units
  const watchedUserId = form.watch("user_id");
  useEffect(() => {
    const profile = profiles.find((p) => p.id === watchedUserId) || null;
    setSelectedProfile(profile);
    if (watchedUserId && onUserChange) onUserChange(watchedUserId);

    // Load units for user
    if (watchedUserId) {
      const fetchUnits = async () => {
        try {
          const { data, error } = await supabase
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
  }, [watchedUserId, profiles, form, onUserChange]);

  // Handle editing mode
  useEffect(() => {
    if (editingRecord) {
      const formData = { ...editingRecord };
      formData.user_id = initialUserId || editingRecord.user_id;
      delete formData.id;
      delete formData.created_at;
      delete formData.cod_instal;
      delete formData.distribuidora;
      
      form.reset(formData as any);
      setDuplicateFromLast(false);
      
      // Set selected unit for editing
      if (editingRecord.unit_id) {
        const unit = units.find(u => u.id === editingRecord.unit_id);
        setSelectedUnit(unit || null);
      }
    }
  }, [editingRecord, initialUserId, form, units]);

  // Handle duplicate toggle
  const handleDuplicateToggle = async (checked: boolean) => {
    setDuplicateFromLast(checked);
    
    if (!checked) {
      form.reset({ ...FORM_DEFAULTS, user_id: watchedUserId || undefined } as any);
      setSelectedUnit(null);
      return;
    }

    if (!watchedUserId) return;

    try {
      const currentUnitId = form.getValues("unit_id");
      
      let query = supabase
        .from("energy_monthly_metrics")
        .select("*")
        .eq("user_id", watchedUserId);
      
      if (currentUnitId) {
        query = query.eq("unit_id", currentUnitId);
      }
        
      const { data, error } = await query.order("reference_label", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const sortedData = data.sort((a, b) => sortByRefLabel(b.reference_label, a.reference_label));
        const lastRecord = sortedData[0];
        
        // Generate next month reference
        const currentRef = lastRecord.reference_label;
        let nextRef = currentRef;
        if (currentRef && refRegex.test(currentRef)) {
          const { month, year } = parseRefLabel(currentRef);
          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
          const mmm = months[nextMonth - 1];
          const yy = String(nextYear % 100).padStart(2, "0");
          nextRef = `${mmm}/${yy}`;
        }

        const formData = { ...FORM_DEFAULTS, ...lastRecord };
        formData.reference_label = nextRef;
        formData.user_id = watchedUserId;
        formData.unit_id = currentUnitId || lastRecord.unit_id;
        delete formData.id;
        delete formData.created_at;
        delete formData.cod_instal;
        delete formData.distribuidora;
        
        form.reset(formData as any);
      } else {
        const now = new Date();
        const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
        const mmm = months[now.getMonth()];
        const yy = String(now.getFullYear() % 100).padStart(2, "0");
        
        form.reset({
          ...FORM_DEFAULTS,
          user_id: watchedUserId,
          unit_id: currentUnitId,
          reference_label: `${mmm}/${yy}`,
        } as any);
      }
    } catch (error) {
      console.error("Error loading last record:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Não foi possível carregar o último registro" 
      });
    }
  };

  const handleUnitSelection = (unitId: string) => {
    form.setValue("unit_id", unitId);
    const unit = units.find(u => u.id === unitId);
    setSelectedUnit(unit || null);
  };

  const handleRefChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) => {
    const v = e.target.value.toLowerCase();
    const cleaned = v.replace(/[^a-zA-Z/0-9]/g, "");
    onChange(cleaned);
  };

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      const payload = { ...values } as any;
      
      delete payload.cod_instal;
      delete payload.distribuidora;
      
      if (editingRecord) {
        const { error } = await supabase
          .from("energy_monthly_metrics")
          .update(payload)
          .eq("id", editingRecord.id);
        if (error) throw error;
        toast({ title: "Registro atualizado" });
      } else {
        const { error } = await (supabase as any)
          .from("energy_monthly_metrics")
          .upsert(payload, { onConflict: 'user_id,reference_label,unit_id' });
        if (error) throw error;
        toast({ title: "Registro salvo" });
      }
      
      onSuccess?.();
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

  const profileContext = useMemo(() => {
    if (!selectedProfile) return null;
    const { comercializadora, gestora_parceira, concessionaria } = selectedProfile;
    const have = comercializadora || gestora_parceira || concessionaria;
    if (!have) return null;
    return (
      <div className="text-sm text-muted-foreground space-y-1">
        {comercializadora && <div>Comercializadora: <span className="font-medium">{comercializadora}</span></div>}
        {gestora_parceira && <div>Gestora Parceira: <span className="font-medium">{gestora_parceira}</span></div>}
        {concessionaria && <div>Concessionária: <span className="font-medium">{concessionaria}</span></div>}
      </div>
    );
  }, [selectedProfile]);

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Duplicate toggle (only in dialog mode) */}
          {showDuplicateToggle && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="duplicate-last"
                  checked={duplicateFromLast}
                  onCheckedChange={handleDuplicateToggle}
                />
                <label
                  htmlFor="duplicate-last"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Duplicar do último mês
                </label>
              </div>
              <Separator />
            </>
          )}

          {/* Identificação */}
          <section>
            <h3 className="text-lg font-semibold mb-3">1) Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {showClientSearch && (
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
              )}

              {selectedProfile && <div className="hidden md:block">{profileContext}</div>}

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
                          showAddButton={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showUnitsManagement && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnitsManagementDialog(true)}
                    disabled={!watchedUserId}
                  >
                    Gerenciar Unidades
                  </Button>
                )}
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
                  <FormItem>
                    <FormLabel>Mês de referência (MMM/AA) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ago/24"
                        value={field.value || ""}
                        onChange={(e) => handleRefChange(e, field.onChange)}
                        onBlur={(e) => field.onChange((e.target.value || "").toLowerCase())}
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
            <h3 className="text-lg font-semibold mb-3">2) Energia ativa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              
              <FormField control={form.control} name="preco_kwh_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kWh Ponta (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kwh_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kWh Fora (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kwh_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kWh Reservado (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Demanda contratada */}
          <section>
            <h3 className="text-lg font-semibold mb-3">3) Demanda contratada</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="demanda_contratada_kw_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Contratada kW Ponta</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="demanda_contratada_kw_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Contratada kW Fora</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="demanda_contratada_kw_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Contratada kW Reservado</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Demanda faturada */}
          <section>
            <h3 className="text-lg font-semibold mb-3">4) Demanda faturada</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="demanda_faturada_kw_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Faturada kW Ponta</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="demanda_faturada_kw_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Faturada kW Fora</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="demanda_faturada_kw_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Faturada kW Reservado</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="preco_kw_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kW Ponta (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kw_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kW Fora (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kw_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kW Reservado (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Energia reativa */}
          <section>
            <h3 className="text-lg font-semibold mb-3">5) Energia reativa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="reativo_kvarh_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reativo kvarh Ponta</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reativo_kvarh_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reativo kvarh Fora</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reativo_kvarh_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reativo kvarh Reservado</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="preco_kvarh_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kvarh Ponta (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kvarh_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kvarh Fora (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kvarh_reservado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kvarh Reservado (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="reativo_excedente_kvarh" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reativo Excedente (kvarh)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preco_kvarh_excedente" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço kvarh Excedente (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reativo_limite_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Reativo (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormDescription>Padrão: 0.62 (62%)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fator_potencia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fator de Potência</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Valores financeiros */}
          <section>
            <h3 className="text-lg font-semibold mb-3">6) Valores financeiros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormLabel>Compra Energia (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="icms_energia_rs" render={({ field }) => (
                <FormItem>
                  <FormLabel>ICMS Energia (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
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
                  <FormLabel>Proinfa (R$)</FormLabel>
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
            <h3 className="text-lg font-semibold mb-3">7) Alíquotas</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="pis_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>PIS (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cofins_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>COFINS (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="icms_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>ICMS (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rdb_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>RDB (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Fator de Potência (planilha) */}
          <section>
            <h3 className="text-lg font-semibold mb-3">8) Fator de Potência</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="demanda_maxima_kw" render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda Máxima (kW)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fp_param_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Parâmetro Mín</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormDescription>Padrão: 0.92</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fp_param_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Parâmetro Máx</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormDescription>Padrão: 0.94</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="fp_ponta" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Ponta</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" value={field.value || ""} onChange={field.onChange} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fp_fora" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Fora</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" value={field.value || ""} onChange={field.onChange} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fp_res" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Reservado</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" value={field.value || ""} onChange={field.onChange} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fp_global" render={({ field }) => (
                <FormItem>
                  <FormLabel>FP Global</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" value={field.value || ""} onChange={field.onChange} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kvar_corrigir_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>kVAr Corrigir Mín</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kvar_corrigir_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>kVAr Corrigir Máx</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator />

          {/* Totais calculados */}
          <section>
            <h3 className="text-lg font-semibold mb-3">9) Totais calculados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="mwh_total_gerador" render={({ field }) => (
                <FormItem>
                  <FormLabel>MWh Total Gerador</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="economia_liquida_rs" render={({ field }) => (
                <FormItem>
                  <FormLabel>Economia Líquida (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="economia_liquida_pct" render={({ field }) => (
                <FormItem>
                  <FormLabel>Economia Líquida (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.00001" {...field} readOnly />
                  </FormControl>
                  <FormDescription>Calculado automaticamente</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Button type="submit">Salvar</Button>
            <Button type="button" onClick={form.handleSubmit(onSubmitAndNext)}>
              Salvar e Próximo
            </Button>
          </div>
        </form>
      </Form>

      {showUnitsManagement && (
        <UnitsManagement
          userId={watchedUserId}
          open={showUnitsManagementDialog}
          onOpenChange={setShowUnitsManagementDialog}
          onUnitChanged={() => {
            // Reload units when changed
            if (watchedUserId) {
              const fetchUnits = async () => {
                try {
                  const { data, error } = await supabase
                    .from("energy_units")
                    .select("*")
                    .eq("user_id", watchedUserId)
                    .order("code");
                
                  if (!error) {
                    setUnits(data || []);
                  }
                } catch (error) {
                  console.error("Error fetching units:", error);
                }
              };
              fetchUnits();
            }
          }}
        />
      )}
    </div>
  );
}
