import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { calcEconomiaLiquida, calcIcmsEnergia, calcPctEconomia } from "@/lib/energyCalc";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Tipos auxiliares
interface ProfileItem {
  id: string;
  full_name?: string | null;
}

interface ImportEnergyCSVProps {
  profiles: ProfileItem[];
  onClose?: () => void;
  onSuccess?: () => void;
}

type RowObj = Record<string, any>;

type Mapping = Record<string, string | undefined>;

const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"] as const;

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normHeader(h: string) {
  return removeAccents(String(h || "").trim().toUpperCase().replace(/\s+/g, " "));
}

// Normaliza números: aceita 12.345,67 ou 12,345.67 e remove R$, espaços etc.
function parseNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  let s = String(value).trim();
  if (!s) return 0;
  s = s.replace(/R\$|\s|\u00A0/g, ""); // remove R$, espaços normais e não separáveis
  // mantém apenas dígitos e separadores , . -
  s = s.replace(/[^0-9,.-]/g, "");
  // Se houver ambos , e ., assume o último como separador decimal e remove os demais
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep >= 0) {
    const integer = s.substring(0, lastSep).replace(/[^0-9-]/g, "");
    const fraction = s.substring(lastSep + 1).replace(/[^0-9]/g, "");
    const sign = integer.startsWith('-') ? '-' : '';
    const intAbs = integer.replace('-', '') || '0';
    return parseFloat(`${sign}${intAbs}.${fraction || '0'}`);
  }
  // Sem separador decimal
  const onlyDigits = s.replace(/[^0-9-]/g, "");
  return parseFloat(onlyDigits || "0");
}

function parsePercent(value: any): number {
  const s = String(value ?? '').trim();
  const num = parseNumber(s);
  if (s.includes('%')) return num / 100;
  // Se valor for maior que 1 (ex.: 20,5) assume percent e divide por 100
  return num > 1.5 ? num / 100 : num;
}

function normalizeRefLabel(input: string): string {
  if (!input) return "";
  let s = input.trim().toLowerCase();
  s = s.replace(/\\/g, '/');
  // Já está no formato mmm/aa?
  if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{2}$/i.test(s)) return s;

  // Formatos com ano completo ou numéricos
  // Ex.: "ago/2024"
  let m: number | null = null;
  let y: number | null = null;

  // Ex.: 2024-08 ou 2024/08
  let match = s.match(/^(\d{4})[-\/]?(\d{1,2})$/);
  if (match) {
    y = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
  }

  // Ex.: 08/2024 ou 8/2024
  if (!m) {
    match = s.match(/^(\d{1,2})[-\/]?(\d{4})$/);
    if (match) {
      m = parseInt(match[1], 10);
      y = parseInt(match[2], 10);
    }
  }

  // Ex.: ago/2024
  if (!m) {
    match = s.match(/^([a-z]{3})[\s\/-]?(\d{4})$/);
    if (match) {
      const idx = meses.indexOf(match[1] as any);
      if (idx >= 0) {
        m = idx + 1;
        y = parseInt(match[2], 10);
      }
    }
  }

  if (m && y) {
    const mmm = meses[m - 1];
    const yy = String(y % 100).padStart(2, '0');
    return `${mmm}/${yy}`;
  }

  return s; // fica como veio se não reconhecido
}

// Lista de campos alvo e labels para UI
const targetFields: { key: string; label: string; type: 'text' | 'number' | 'percent' }[] = [
  { key: 'cod_instal', label: 'Código da Instalação', type: 'text' },
  { key: 'n_relatorio', label: 'Nº Relatório', type: 'text' },
  { key: 'reference_label', label: 'Mês referência (MMM/AA)', type: 'text' },
  { key: 'fatura_geral_rs', label: 'Fatura Geral (R$)', type: 'number' },
  { key: 'bandeiras_rs', label: 'Bandeiras (R$)', type: 'number' },
  { key: 'fatura_livre_rs', label: 'Fatura Livre (R$)', type: 'number' },
  { key: 'proinfa_rs', label: 'PROINFA (R$)', type: 'number' },
  { key: 'mwh_total_gerador', label: 'MWh Total (Gerador)', type: 'number' },
  { key: 'tarifa_energia_rs_mwh', label: 'Tarifa Energia (R$/MWh)', type: 'number' },
  { key: 'compra_energia_rs', label: 'Compra de Energia (R$)', type: 'number' },
  { key: 'encargos_rs', label: 'Encargos (R$)', type: 'number' },
  { key: 'banco_trianon_rs', label: 'Banco Trianon (R$)', type: 'number' },
  { key: 'gestao_cco_rs', label: 'Gestão CCO (R$)', type: 'number' },
  { key: 'gestao_parceiro_rs', label: 'Gestão Parceiro (R$)', type: 'number' },
  { key: 'pis_rate', label: 'PIS (fração)', type: 'percent' },
  { key: 'cofins_rate', label: 'COFINS (fração)', type: 'percent' },
  { key: 'icms_rate', label: 'ICMS (fração)', type: 'percent' },
  { key: 'rdb_rate', label: 'RDB (fração)', type: 'percent' },
  // Períodos (se houver)
  { key: 'energia_kwh_ponta', label: 'Energia kWh Ponta', type: 'number' },
  { key: 'energia_kwh_fora', label: 'Energia kWh Fora', type: 'number' },
  { key: 'energia_kwh_reservado', label: 'Energia kWh Reservado', type: 'number' },
  { key: 'preco_kwh_ponta', label: 'R$/kWh Ponta', type: 'number' },
  { key: 'preco_kwh_fora', label: 'R$/kWh Fora', type: 'number' },
  { key: 'preco_kwh_reservado', label: 'R$/kWh Reservado', type: 'number' },
  { key: 'demanda_contratada_kw_ponta', label: 'Demanda Contratada kW Ponta', type: 'number' },
  { key: 'demanda_contratada_kw_fora', label: 'Demanda Contratada kW Fora', type: 'number' },
  { key: 'demanda_contratada_kw_reservado', label: 'Demanda Contratada kW Reservado', type: 'number' },
  { key: 'demanda_faturada_kw_ponta', label: 'Demanda Faturada kW Ponta', type: 'number' },
  { key: 'demanda_faturada_kw_fora', label: 'Demanda Faturada kW Fora', type: 'number' },
  { key: 'demanda_faturada_kw_reservado', label: 'Demanda Faturada kW Reservado', type: 'number' },
  { key: 'preco_kw_ponta', label: 'R$/kW Ponta', type: 'number' },
  { key: 'preco_kw_fora', label: 'R$/kW Fora', type: 'number' },
  { key: 'preco_kw_reservado', label: 'R$/kW Reservado', type: 'number' },
  { key: 'reativo_kvarh_ponta', label: 'Reativo kvarh Ponta', type: 'number' },
  { key: 'reativo_kvarh_fora', label: 'Reativo kvarh Fora', type: 'number' },
  { key: 'reativo_kvarh_reservado', label: 'Reativo kvarh Reservado', type: 'number' },
  { key: 'preco_kvarh_ponta', label: 'R$/kvarh Ponta', type: 'number' },
  { key: 'preco_kvarh_fora', label: 'R$/kvarh Fora', type: 'number' },
  { key: 'preco_kvarh_reservado', label: 'R$/kvarh Reservado', type: 'number' },
  { key: 'reativo_limite_rate', label: 'Limite Reativo', type: 'number' },
  { key: 'preco_kvarh_excedente', label: 'Preço Reativo (R$/kvarh)', type: 'number' },
  { key: 'reativo_excedente_kvarh', label: 'Excedente Reativo (kvarh)', type: 'number' },
  { key: 'fator_potencia', label: 'Fator de Potência', type: 'number' },
  // Fator de Potência (planilha)
  { key: 'demanda_maxima_kw', label: 'Demanda Máxima (kW)', type: 'number' },
  { key: 'fp_param_min', label: 'FP Param Min', type: 'number' },
  { key: 'fp_param_max', label: 'FP Param Max', type: 'number' },
  { key: 'fp_ponta', label: 'FP Ponta', type: 'number' },
  { key: 'fp_fora', label: 'FP Fora', type: 'number' },
  { key: 'fp_res', label: 'FP Reservado', type: 'number' },
  { key: 'fp_global', label: 'FP Global', type: 'number' },
  { key: 'kvar_corrigir_min', label: 'kVAr Corrigir Min', type: 'number' },
  { key: 'kvar_corrigir_max', label: 'kVAr Corrigir Max', type: 'number' },
];

// Dicionário de cabeçalhos esperados -> campo alvo
const headerToFieldPairs: Array<{ test: (h: string) => boolean; field: string }> = [
  { test: (h) => /\bCOD\s*INSTAL\b/.test(h), field: 'cod_instal' },
  { test: (h) => /\bN\s*RELATORIO\b/.test(h), field: 'n_relatorio' },
  { test: (h) => /\bMES\s*REFERENCIA\b/.test(h), field: 'reference_label' },
  { test: (h) => /FATURA\s+GERAL.*\(R\$\)/.test(h), field: 'fatura_geral_rs' },
  { test: (h) => /^BANDEIRAS\b/.test(h), field: 'bandeiras_rs' },
  { test: (h) => /FATURA.*LIVRE.*\(R\$\)/.test(h), field: 'fatura_livre_rs' },
  { test: (h) => /\bPROINFA\b.*\(R\$\)/.test(h), field: 'proinfa_rs' },
  { test: (h) => /MWH\s+TOTAL.*GERADOR/.test(h), field: 'mwh_total_gerador' },
  { test: (h) => /TARIFA.*ENERGIA.*\(R\$\/MWH\)/.test(h), field: 'tarifa_energia_rs_mwh' },
  { test: (h) => /COMPRA\s+DE\s+ENERGIA.*\(R\$\)/.test(h), field: 'compra_energia_rs' },
  { test: (h) => /\bENCARGOS\b.*\(R\$\)/.test(h), field: 'encargos_rs' },
  { test: (h) => /\bBANCO\s+TRIANON\b/.test(h), field: 'banco_trianon_rs' },
  { test: (h) => /GESTAO\s+CCO.*\(R\$\)/.test(h), field: 'gestao_cco_rs' },
  { test: (h) => /(GESTAO\s+PARCEIRO|GESTAO\s+LUDFOR).*\(R\$\)/.test(h), field: 'gestao_parceiro_rs' },
  { test: (h) => /^PIS\b/.test(h), field: 'pis_rate' },
  { test: (h) => /^COFINS\b/.test(h), field: 'cofins_rate' },
  { test: (h) => /^ICMS\b/.test(h), field: 'icms_rate' },
  { test: (h) => /^RDB\b/.test(h), field: 'rdb_rate' },
  // períodos por palavra-chave
  { test: (h) => /KWH/.test(h) && /PONTA/.test(h) && !/R\$/.test(h), field: 'energia_kwh_ponta' },
  { test: (h) => /KWH/.test(h) && /FORA/.test(h) && !/R\$/.test(h), field: 'energia_kwh_fora' },
  { test: (h) => /KWH/.test(h) && /RESERVADO/.test(h) && !/R\$/.test(h), field: 'energia_kwh_reservado' },
  { test: (h) => /(R\$\/KWH|PRECO\s*KWH|TARIFA\s*KWH)/.test(h) && /PONTA/.test(h), field: 'preco_kwh_ponta' },
  { test: (h) => /(R\$\/KWH|PRECO\s*KWH|TARIFA\s*KWH)/.test(h) && /FORA/.test(h), field: 'preco_kwh_fora' },
  { test: (h) => /(R\$\/KWH|PRECO\s*KWH|TARIFA\s*KWH)/.test(h) && /RESERVADO/.test(h), field: 'preco_kwh_reservado' },
  { test: (h) => /KW/.test(h) && /CONTRATADA|CONTRAT/.test(h) && /PONTA/.test(h) && !/R\$/.test(h), field: 'demanda_contratada_kw_ponta' },
  { test: (h) => /KW/.test(h) && /CONTRATADA|CONTRAT/.test(h) && /FORA/.test(h) && !/R\$/.test(h), field: 'demanda_contratada_kw_fora' },
  { test: (h) => /KW/.test(h) && /CONTRATADA|CONTRAT/.test(h) && /RESERVADO/.test(h) && !/R\$/.test(h), field: 'demanda_contratada_kw_reservado' },
  { test: (h) => /KW/.test(h) && /FATURADA|FATUR/.test(h) && /PONTA/.test(h) && !/R\$/.test(h), field: 'demanda_faturada_kw_ponta' },
  { test: (h) => /KW/.test(h) && /FATURADA|FATUR/.test(h) && /FORA/.test(h) && !/R\$/.test(h), field: 'demanda_faturada_kw_fora' },
  { test: (h) => /KW/.test(h) && /FATURADA|FATUR/.test(h) && /RESERVADO/.test(h) && !/R\$/.test(h), field: 'demanda_faturada_kw_reservado' },
  { test: (h) => /(R\$\/KW|PRECO\s*KW|TARIFA\s*KW)/.test(h) && /PONTA/.test(h), field: 'preco_kw_ponta' },
  { test: (h) => /(R\$\/KW|PRECO\s*KW|TARIFA\s*KW)/.test(h) && /FORA/.test(h), field: 'preco_kw_fora' },
  { test: (h) => /(R\$\/KW|PRECO\s*KW|TARIFA\s*KW)/.test(h) && /RESERVADO/.test(h), field: 'preco_kw_reservado' },
  { test: (h) => /KVARH/.test(h) && /PONTA/.test(h) && !/R\$/.test(h), field: 'reativo_kvarh_ponta' },
  { test: (h) => /KVARH/.test(h) && /FORA/.test(h) && !/R\$/.test(h), field: 'reativo_kvarh_fora' },
  { test: (h) => /KVARH/.test(h) && /RESERVADO/.test(h) && !/R\$/.test(h), field: 'reativo_kvarh_reservado' },
  { test: (h) => /(R\$\/KVARH|PRECO\s*KVARH|TARIFA\s*KVARH)/.test(h) && /PONTA/.test(h), field: 'preco_kvarh_ponta' },
  { test: (h) => /(R\$\/KVARH|PRECO\s*KVARH|TARIFA\s*KVARH)/.test(h) && /FORA/.test(h), field: 'preco_kvarh_fora' },
  { test: (h) => /(R\$\/KVARH|PRECO\s*KVARH|TARIFA\s*KVARH)/.test(h) && /RESERVADO/.test(h), field: 'preco_kvarh_reservado' },
  { test: (h) => /LIMITE\s*REATIVO/.test(h), field: 'reativo_limite_rate' },
  { test: (h) => /PRECO\s*REATIVO/.test(h) || (/PRECO.*EXCEDENTE/.test(h) && /KVARH/.test(h)), field: 'preco_kvarh_excedente' },
  { test: (h) => /EXCEDENTE.*REATIVO/.test(h) || /REATIVO.*EXCEDENTE/.test(h), field: 'reativo_excedente_kvarh' },
  { test: (h) => /FATOR\s*POTENCIA/.test(h), field: 'fator_potencia' },
  // Fator de Potência (planilha)
  { test: (h) => /DEMANDA\s*MAXIMA/.test(h), field: 'demanda_maxima_kw' },
  { test: (h) => /FP\s*PARAM\s*MIN/.test(h), field: 'fp_param_min' },
  { test: (h) => /FP\s*PARAM\s*MAX/.test(h), field: 'fp_param_max' },
  { test: (h) => /FP\s*PONTA/.test(h), field: 'fp_ponta' },
  { test: (h) => /FP\s*FORA/.test(h), field: 'fp_fora' },
  { test: (h) => /FP\s*RES/.test(h), field: 'fp_res' },
  { test: (h) => /FP\s*GLOBAL/.test(h), field: 'fp_global' },
  { test: (h) => /KVAR\s*CORRIGIR\s*MIN/.test(h), field: 'kvar_corrigir_min' },
  { test: (h) => /KVAR\s*CORRIGIR\s*MAX/.test(h), field: 'kvar_corrigir_max' },
];

function autoMap(headers: string[]): Mapping {
  const map: Mapping = {};
  const H = headers.map(normHeader);
  headers.forEach((orig, i) => {
    const h = H[i];
    const pair = headerToFieldPairs.find(p => p.test(h));
    if (pair) map[pair.field] = orig;
  });
  return map;
}

const templateHeaders = [
  'COD INSTAL',
  'N RELATORIO',
  'Mes Referencia',
  'Fatura GERAL COELBA (R$)',
  'Bandeiras',
  'Fatura COELBA-LIVRE (R$)',
  'PROINFA (R$)',
  'MWh Total (Gerador)',
  'Tarifa Energia Faturada (R$/MWh)',
  'Compra de Energia (R$)',
  'ENCARGOS (R$)',
  'BANCO TRIANON',
  'GESTAO CCO (R$)',
  'GESTAO PARCEIRO (R$)',
  'PIS',
  'COFINS',
  'ICMS',
  'RDB',
  'Demanda Contratada Ponta (kW)',
  'Demanda Contratada Fora (kW)', 
  'Demanda Contratada Reservado (kW)',
];

function downloadTemplateCsv() {
  const header = templateHeaders.join(';');
  const example = [
    '12345',
    'RPT-2024-08',
    'ago/24',
    '100000,00',
    '0,00',
    '60000,00',
    '0,00',
    '100,0',
    '350,00',
    '55000,00',
    '500,00',
    '0,00',
    '800,00',
    '1200,00',
    '0,65%',
    '3,00%',
    '20,50%',
    '0,205',
    '120,00', // Demanda Contratada Ponta (kW)
    '100,00', // Demanda Contratada Fora (kW)
    '80,00',  // Demanda Contratada Reservado (kW)
  ].join(';');
  const content = header + '\n' + example + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_energy_metrics.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export const ImportEnergyCSV: React.FC<ImportEnergyCSVProps> = ({ profiles, onClose, onSuccess }) => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RowObj[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [ignored, setIgnored] = useState<{ index: number; reason: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; ignored: number } | null>(null);

  useEffect(() => {
    if (!open) {
      onClose?.();
    }
  }, [open, onClose]);

  const csvColumns = useMemo(() => headers, [headers]);

  function handleFile(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<RowObj>(sheet, { defval: '' });
        setRows(json);
        const hs = json.length ? Object.keys(json[0]) : [];
        setHeaders(hs);
        setMapping(autoMap(hs));
        setStep(2);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse<RowObj>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const data = res.data || [];
          setRows(data);
          const hs = data.length ? Object.keys(data[0]) : [];
          setHeaders(hs);
          setMapping(autoMap(hs));
          setStep(2);
        },
        error: (err) => {
          console.error(err);
          toast({ variant: 'destructive', title: 'Falha ao ler CSV' });
        },
      });
    }
  }

  function mappedValue(field: string, row: RowObj) {
    const col = mapping[field];
    if (!col) return undefined;
    return row[col];
  }

  function buildRecord(row: RowObj) {
    // Campos base
    const refRaw = mappedValue('reference_label', row) ?? '';
    const reference_label = normalizeRefLabel(String(refRaw));

    const rec: any = {
      user_id: selectedUser,
      cod_instal: mappedValue('cod_instal', row) ?? null,
      n_relatorio: mappedValue('n_relatorio', row) ?? null,
      reference_label,
      fatura_geral_rs: parseNumber(mappedValue('fatura_geral_rs', row)),
      bandeiras_rs: parseNumber(mappedValue('bandeiras_rs', row)),
      fatura_livre_rs: parseNumber(mappedValue('fatura_livre_rs', row)),
      proinfa_rs: parseNumber(mappedValue('proinfa_rs', row)),
      mwh_total_gerador: parseNumber(mappedValue('mwh_total_gerador', row)),
      tarifa_energia_rs_mwh: parseNumber(mappedValue('tarifa_energia_rs_mwh', row)),
      compra_energia_rs: parseNumber(mappedValue('compra_energia_rs', row)),
      encargos_rs: parseNumber(mappedValue('encargos_rs', row)),
      banco_trianon_rs: parseNumber(mappedValue('banco_trianon_rs', row)),
      gestao_cco_rs: parseNumber(mappedValue('gestao_cco_rs', row)),
      gestao_parceiro_rs: parseNumber(mappedValue('gestao_parceiro_rs', row)),
      pis_rate: parsePercent(mappedValue('pis_rate', row)),
      cofins_rate: parsePercent(mappedValue('cofins_rate', row)),
      icms_rate: parsePercent(mappedValue('icms_rate', row)),
      rdb_rate: parsePercent(mappedValue('rdb_rate', row)),
      energia_kwh_ponta: parseNumber(mappedValue('energia_kwh_ponta', row)),
      energia_kwh_fora: parseNumber(mappedValue('energia_kwh_fora', row)),
      energia_kwh_reservado: parseNumber(mappedValue('energia_kwh_reservado', row)),
      preco_kwh_ponta: parseNumber(mappedValue('preco_kwh_ponta', row)),
      preco_kwh_fora: parseNumber(mappedValue('preco_kwh_fora', row)),
      preco_kwh_reservado: parseNumber(mappedValue('preco_kwh_reservado', row)),
      demanda_contratada_kw_ponta: parseNumber(mappedValue('demanda_contratada_kw_ponta', row)),
      demanda_contratada_kw_fora: parseNumber(mappedValue('demanda_contratada_kw_fora', row)),
      demanda_contratada_kw_reservado: parseNumber(mappedValue('demanda_contratada_kw_reservado', row)),
      demanda_faturada_kw_ponta: parseNumber(mappedValue('demanda_faturada_kw_ponta', row)),
      demanda_faturada_kw_fora: parseNumber(mappedValue('demanda_faturada_kw_fora', row)),
      demanda_faturada_kw_reservado: parseNumber(mappedValue('demanda_faturada_kw_reservado', row)),
      preco_kw_ponta: parseNumber(mappedValue('preco_kw_ponta', row)),
      preco_kw_fora: parseNumber(mappedValue('preco_kw_fora', row)),
      preco_kw_reservado: parseNumber(mappedValue('preco_kw_reservado', row)),
      reativo_kvarh_ponta: parseNumber(mappedValue('reativo_kvarh_ponta', row)),
      reativo_kvarh_fora: parseNumber(mappedValue('reativo_kvarh_fora', row)),
      reativo_kvarh_reservado: parseNumber(mappedValue('reativo_kvarh_reservado', row)),
      preco_kvarh_ponta: parseNumber(mappedValue('preco_kvarh_ponta', row)),
      preco_kvarh_fora: parseNumber(mappedValue('preco_kvarh_fora', row)),
      preco_kvarh_reservado: parseNumber(mappedValue('preco_kvarh_reservado', row)),
      reativo_limite_rate: parseNumber(mappedValue('reativo_limite_rate', row)) || 0.62,
      preco_kvarh_excedente: parseNumber(mappedValue('preco_kvarh_excedente', row)),
      // Fator de Potência (planilha)
      demanda_maxima_kw: parseNumber(mappedValue('demanda_maxima_kw', row)),
      fp_param_min: parseNumber(mappedValue('fp_param_min', row)) || 0.92,
      fp_param_max: parseNumber(mappedValue('fp_param_max', row)) || 0.94,
      fp_ponta: parseNumber(mappedValue('fp_ponta', row)) || null,
      fp_fora: parseNumber(mappedValue('fp_fora', row)) || null,
      fp_res: parseNumber(mappedValue('fp_res', row)) || null,
      fp_global: parseNumber(mappedValue('fp_global', row)) || null,
      kvar_corrigir_min: parseNumber(mappedValue('kvar_corrigir_min', row)),
      kvar_corrigir_max: parseNumber(mappedValue('kvar_corrigir_max', row)),
    };

    // Completar MWh total a partir de kWh
    if (!rec.mwh_total_gerador) {
      const sumKwh = (rec.energia_kwh_ponta || 0) + (rec.energia_kwh_fora || 0) + (rec.energia_kwh_reservado || 0);
      rec.mwh_total_gerador = sumKwh ? sumKwh / 1000 : 0;
    }

    // Calcular reativo excedente e fator de potência
    const totalEnergia = (rec.energia_kwh_ponta || 0) + (rec.energia_kwh_fora || 0) + (rec.energia_kwh_reservado || 0);
    const totalReativo = (rec.reativo_kvarh_ponta || 0) + (rec.reativo_kvarh_fora || 0) + (rec.reativo_kvarh_reservado || 0);
    const reativoPermitido = totalEnergia * (rec.reativo_limite_rate || 0.62);
    const reativoExcedente = Math.max(0, totalReativo - reativoPermitido);
    
    // Calcular fator de potência: FP = kWh / sqrt(kWh² + kvarh²)
    const aparente = Math.sqrt(totalEnergia * totalEnergia + totalReativo * totalReativo);
    const fatorPotencia = aparente > 0 ? totalEnergia / aparente : 1;
    
    rec.reativo_excedente_kvarh = Math.round(reativoExcedente * 100) / 100; // 2 casas decimais
    rec.fator_potencia = Math.round(fatorPotencia * 10000) / 10000; // 4 casas decimais

    // Calculados
    rec.icms_energia_rs = calcIcmsEnergia(rec.compra_energia_rs || 0, rec.icms_rate || 0, rec.rdb_rate || 0);
    const econ = calcEconomiaLiquida({
      faturaGeral: rec.fatura_geral_rs || 0,
      faturaLivre: rec.fatura_livre_rs || 0,
      compraEnergia: rec.compra_energia_rs || 0,
      icmsEnergia: rec.icms_energia_rs || 0,
      encargos: rec.encargos_rs || 0,
      bancoTrianon: rec.banco_trianon_rs || 0,
      gestaoCco: rec.gestao_cco_rs || 0,
      gestaoParceiro: rec.gestao_parceiro_rs || 0,
    });
    rec.economia_liquida_rs = econ;
    rec.economia_liquida_pct = calcPctEconomia(econ, rec.fatura_geral_rs || 0);

    return rec;
  }

  async function handleImport() {
    try {
      if (!selectedUser) {
        toast({ variant: 'destructive', title: 'Selecione um cliente' });
        return;
      }
      setLoading(true);

      // Monta registros e valida
      const prepared: any[] = [];
      const ignoredRows: { index: number; reason: string }[] = [];
      rows.forEach((r, idx) => {
        const rec = buildRecord(r);
        if (!rec.reference_label) {
          ignoredRows.push({ index: idx + 1, reason: 'reference_label ausente' });
          return;
        }
        prepared.push(rec);
      });

      // Determina inserções vs atualizações
      const labels = Array.from(new Set(prepared.map(r => r.reference_label)));
      const { data: existing, error: selErr } = await (supabase as any)
        .from('energy_monthly_metrics')
        .select('reference_label')
        .eq('user_id', selectedUser)
        .in('reference_label', labels);
      if (selErr) throw selErr;
      const existingSet = new Set((existing || []).map(e => e.reference_label));
      const insertedCount = prepared.filter(r => !existingSet.has(r.reference_label)).length;
      const updatedCount = prepared.length - insertedCount;

      // Upsert
      const { error } = await (supabase as any)
        .from('energy_monthly_metrics')
        .upsert(prepared, { onConflict: 'user_id,reference_label,unit_id' });
      if (error) throw error;

      setIgnored(ignoredRows);
      setResult({ inserted: insertedCount, updated: updatedCount, ignored: ignoredRows.length });
      setStep(4);
      toast({ title: 'Importação concluída' });
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro na importação', description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const preview = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Histórico de Energia</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Cliente</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Arquivo (.csv ou .xlsx)</label>
              <Input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }} />
              <div className="text-xs text-muted-foreground mt-2">
                Suporta separador ; ou , e decimais , ou .
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplateCsv}>Baixar modelo CSV</Button>
            </div>
            <DialogFooter>
              <Button disabled={!selectedUser || !rows.length} onClick={() => setStep(2)}>Próximo</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            <div className="text-sm font-medium">2) Pré-visualização e mapeamento</div>
            <div className="text-xs text-muted-foreground">Detectamos automaticamente os campos pelos títulos. Ajuste se necessário.</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {targetFields.map(tf => (
                <div key={tf.key} className="space-y-1">
                  <div className="text-xs">{tf.label}</div>
                  <Select
                    value={mapping[tf.key] || ''}
                    onValueChange={(v) => setMapping(prev => ({ ...prev, [tf.key]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione coluna (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Não mapear --</SelectItem>
                      {csvColumns.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div>
                <div className="text-sm mt-4 mb-2">Prévia (primeiras 5 linhas)</div>
                <div className="overflow-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {headers.map(h => (<th key={h} className="p-2 text-left border-b">{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="odd:bg-accent/30">
                          {headers.map(h => (<td key={h} className="p-2 border-b">{String(r[h] ?? '')}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex w-full justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedUser || !rows.length}>Continuar</Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">3) Confirmação</div>
            <div className="text-sm">Cliente: <span className="font-semibold">{profiles.find(p => p.id === selectedUser)?.full_name || selectedUser}</span></div>
            <div className="text-sm">Linhas detectadas: <span className="font-semibold">{rows.length}</span></div>
            <div className="text-xs text-muted-foreground">Campos calculados (icms_energia_rs, economia_liquida_rs, economia_liquida_pct) serão gerados automaticamente antes de salvar.</div>
            <DialogFooter>
              <div className="flex w-full justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Importando…' : 'Confirmar e importar'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Relatório da importação</div>
            <ul className="text-sm list-disc pl-5">
              <li>Novos registros: <span className="font-semibold">{result.inserted}</span></li>
              <li>Atualizados: <span className="font-semibold">{result.updated}</span></li>
              <li>Ignorados: <span className="font-semibold">{result.ignored}</span></li>
            </ul>
            {ignored.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Ignorados:
                <ul className="list-disc pl-5">
                  {ignored.slice(0, 10).map((it, idx) => (
                    <li key={idx}>Linha {it.index}: {it.reason}</li>
                  ))}
                  {ignored.length > 10 && <li>e mais {ignored.length - 10}…</li>}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportEnergyCSV;
