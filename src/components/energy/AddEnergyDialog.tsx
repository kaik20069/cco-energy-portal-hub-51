import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import UnitSelector from "@/components/energy/UnitSelector";

const refRegex = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{2}$/i;

const FormSchema = z.object({
  user_id: z.string().uuid({ message: "Selecione um cliente" }),
  unit_id: z.string().uuid({ message: "Selecione uma unidade" }),
  n_relatorio: z.string().default(""),
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
});

// Default clean values
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
};

interface AddEnergyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserId?: string;
  editingRecord?: any;
  onSuccess?: () => void;
}

export default function AddEnergyDialog({ 
  open, 
  onOpenChange, 
  selectedUserId, 
  editingRecord,
  onSuccess 
}: AddEnergyDialogProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [duplicateFromLast, setDuplicateFromLast] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { ...FORM_DEFAULTS, user_id: selectedUserId || undefined } as any,
  });

  useEnergyFormCalculations(form);

  // Load profiles on mount
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
    fetchProfiles();
  }, []);

  // Load units when user changes
  useEffect(() => {
    if (selectedUserId) {
      const fetchUnits = async () => {
        try {
          const { data, error } = await supabase
            .from("energy_units")
            .select("*")
            .eq("user_id", selectedUserId)
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
    }
  }, [selectedUserId]);

  // Reset form to clean state when dialog opens or user changes
  useEffect(() => {
    if (!open) return;

    const profile = profiles.find(p => p.id === selectedUserId);
    if (profile) {
      setSelectedProfile(profile);
    }

    // Handle editing mode
    if (editingRecord) {
      const formData = { ...editingRecord };
      formData.user_id = selectedUserId;
      delete formData.id;
      delete formData.created_at;
      delete formData.cod_instal; // Remove from form data
      delete formData.distribuidora; // Remove from form data
      
      form.reset(formData as any);
      setDuplicateFromLast(false);
      
      // Set selected unit for editing
      if (editingRecord.unit_id) {
        const unit = units.find(u => u.id === editingRecord.unit_id);
        setSelectedUnit(unit || null);
      }
    } else {
      // Always start clean for new records
      form.reset({ ...FORM_DEFAULTS, user_id: selectedUserId || undefined } as any);
      setDuplicateFromLast(false);
      setSelectedUnit(null);
    }
  }, [open, selectedUserId, profiles, form, editingRecord, units]);

  // Handle dialog close - reset to clean state
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset(FORM_DEFAULTS as any);
      setDuplicateFromLast(false);
      setSelectedProfile(null);
    }
    onOpenChange(newOpen);
  };

  // Handle duplicate toggle
  const handleDuplicateToggle = async (checked: boolean) => {
    setDuplicateFromLast(checked);
    
    if (!checked) {
      // Reset to clean defaults
      form.reset({ ...FORM_DEFAULTS, user_id: selectedUserId || undefined } as any);
      setSelectedUnit(null);
      return;
    }

    if (!selectedUserId) return;

    try {
      // Get current unit_id from form
      const currentUnitId = form.getValues("unit_id");
      
      // Find the latest record for this client and unit (if unit selected)
      let query = supabase
        .from("energy_monthly_metrics")
        .select("*")
        .eq("user_id", selectedUserId);
      
      if (currentUnitId) {
        query = query.eq("unit_id", currentUnitId);
      }
        
      const { data, error } = await query.order("reference_label", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Sort by reference label to get the truly latest month
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

        // Fill form with last record data but update reference_label
        const formData = { ...FORM_DEFAULTS, ...lastRecord };
        formData.reference_label = nextRef;
        formData.user_id = selectedUserId;
        formData.unit_id = currentUnitId || lastRecord.unit_id; // Respect current unit selection
        delete formData.id;
        delete formData.created_at;
        delete formData.cod_instal; // Don't copy these fields
        delete formData.distribuidora;
        
        form.reset(formData as any);
      } else {
        // No previous record, just set current month
        const now = new Date();
        const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
        const mmm = months[now.getMonth()];
        const yy = String(now.getFullYear() % 100).padStart(2, "0");
        
        form.reset({
          ...FORM_DEFAULTS,
          user_id: selectedUserId,
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

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
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
      
      // Remove cod_instal and distribuidora from payload - they come from unit
      delete payload.cod_instal;
      delete payload.distribuidora;
      
      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("energy_monthly_metrics")
          .update(payload)
          .eq("id", editingRecord.id);
        if (error) throw error;
        toast({ title: "Registro atualizado" });
      } else {
        // Insert new record
        const { error } = await (supabase as any)
          .from("energy_monthly_metrics")
          .upsert(payload, { onConflict: 'user_id,reference_label,unit_id' });
        if (error) throw error;
        toast({ title: "Registro salvo" });
      }
      
      onSuccess?.();
      handleOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRecord ? "Editar Mês de Energia" : "Adicionar Mês de Energia"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Duplicar toggle */}
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

            {/* Identificação */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProfile && (
                  <div className="md:col-span-2">
                    <div className="text-sm">
                      <strong>Cliente:</strong> {selectedProfile.full_name || selectedProfile.email}
                    </div>
                    {profileContext}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="reference_label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês de referência (MMM/AA)</FormLabel>
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

                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade (UC) *</FormLabel>
                      <FormControl>
                        <UnitSelector
                          userId={selectedUserId || ""}
                          value={field.value}
                          onValueChange={handleUnitChange}
                          showAddButton={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedUnit && (
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <div><strong>Código da Unidade:</strong> {selectedUnit.code}</div>
                      {selectedUnit.nickname && <div><strong>Apelido:</strong> {selectedUnit.nickname}</div>}
                      {selectedUnit.distribuidora && <div><strong>Distribuidora:</strong> {selectedUnit.distribuidora}</div>}
                      {selectedUnit.fornecedora_energia && <div><strong>Fornecedora de Energia:</strong> {selectedUnit.fornecedora_energia}</div>}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Energia ativa */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Energia ativa</h3>
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

            {/* Demanda */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Demanda (kW)</h3>
              
              {/* Demanda contratada */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3 text-muted-foreground">Demanda contratada (kW)</h4>
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

              {/* Faturados + Preços */}
              <div>
                <h4 className="text-md font-medium mb-3 text-muted-foreground">Faturados + Preços</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="demanda_faturada_kw_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kW Ponta (faturado)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="demanda_faturada_kw_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kW Fora (faturado)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="demanda_faturada_kw_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kW Reservado (faturado)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="preco_kw_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Ponta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kw_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Fora</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kw_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kW Reservado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
              </div>
            </section>

            <Separator />

            {/* Reativo */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Reativo (kvarh)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 mb-2">
                  <h4 className="text-md font-medium text-muted-foreground">Medidos</h4>
                </div>
                <FormField control={form.control} name="reativo_kvarh_ponta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kvarh Ponta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reativo_kvarh_fora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kvarh Fora</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reativo_kvarh_reservado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>kvarh Reservado</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="md:col-span-3 mb-2 mt-4">
                  <h4 className="text-md font-medium text-muted-foreground">Excedente + Limite</h4>
                </div>
                <FormField control={form.control} name="reativo_limite_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite Reativo (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormDescription>Ex: 0.62 para 62%</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reativo_excedente_kvarh" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excedente kvarh (auto)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} readOnly />
                    </FormControl>
                    <FormDescription>Calculado automaticamente</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="preco_kvarh_excedente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/kvarh Excedente</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="fator_potencia" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fator de Potência (auto)</FormLabel>
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

            {/* Financeiro */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Financeiro</h3>
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

                <FormField control={form.control} name="encargos_rs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encargos (R$)</FormLabel>
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
              <h3 className="text-lg font-semibold mb-3">Alíquotas</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="icms_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICMS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                    <FormDescription>Ex: 0.205 para 20,5%</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rdb_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RDB (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pis_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cofins_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>COFINS (fração)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <Separator />

            {/* Totais calculados */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Totais calculados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </form>
        </Form>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)}>
            Salvar
          </Button>
          <Button type="button" variant="secondary" onClick={form.handleSubmit(onSubmitAndNext)}>
            Salvar e criar próximo mês
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}