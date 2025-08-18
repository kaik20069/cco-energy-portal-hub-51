import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";

const refRegex = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{2}$/i;

const FormSchema = z.object({
  user_id: z.string().uuid({ message: "Selecione um cliente" }),
  cod_instal: z.string().optional(),
  n_relatorio: z.string().optional(),
  reference_label: z
    .string()
    .regex(refRegex, "Formato MMM/AA, ex: ago/24"),
  distribuidora: z.string().optional(),

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

  // Demanda faturada kW e preços
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

export default function AdminEnergyHistory() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [openClientSelect, setOpenClientSelect] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      cod_instal: "",
      n_relatorio: "",
      reference_label: "",
      distribuidora: "",
      // numbers default via zod
    } as any,
  });

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

  // Atualiza o contexto do cliente mostrado ao lado
  useEffect(() => {
    const id = form.watch("user_id");
    const p = profiles.find((x) => x.id === id) || null;
    setSelectedProfile(p);
  }, [form.watch("user_id"), profiles]);

  const handleRefChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) => {
    const v = e.target.value.toLowerCase();
    // Mantém apenas letras e números e a barra
    const cleaned = v.replace(/[^a-zA-Z/0-9]/g, "");
    onChange(cleaned);
  };

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      const payload = { ...values } as any;
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
    <AuthGuard requireAdmin>
      <DashboardLayout>
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
                            <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                  {field.value ? (
                                    (() => {
                                      const p = profiles.find((x) => x.id === field.value);
                                      const label = p?.full_name || p?.email || p?.id;
                                      const desc = p?.email && p?.email !== label ? ` — ${p.email}` : "";
                                      return `${label}${desc}`;
                                    })()
                                  ) : (
                                    "Selecione um cliente"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar cliente..." />
                                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {profiles.map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={`${p.full_name || p.email || p.id} ${p.email || ""}`}
                                          onSelect={() => {
                                            field.onChange(p.id);
                                            setOpenClientSelect(false);
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-medium">{p.full_name || p.email || p.id}</span>
                                            {p.email && <span className="text-sm text-muted-foreground">{p.email}</span>}
                                          </div>
                                          {field.value === p.id ? <Check className="ml-auto h-4 w-4" /> : null}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="hidden md:block">{profileContext}</div>

                    <FormField
                      control={form.control}
                      name="cod_instal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código da Instalação</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                          <FormLabel>Mês de referência (MMM/AA)</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="distribuidora"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distribuidora</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: CEMIG" {...field} />
                          </FormControl>
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

                {/* Demanda */}
                <section>
                  <h2 className="text-lg font-semibold mb-2">3) Demanda (kW)</h2>
                  
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
                      <FormField control={form.control} name="demanda_faturada_kw_fora" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Demanda Faturada Fora (kW)</FormLabel>
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
                  <h2 className="text-lg font-semibold mb-2">4) Reativo</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DashboardLayout>
    </AuthGuard>
  );
}
