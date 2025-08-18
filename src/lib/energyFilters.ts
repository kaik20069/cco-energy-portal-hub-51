// Utilities for energy data filtering and aggregation

interface EnergyRow {
  reference_label: string;
  unit_id?: string | null;
  distribuidora?: string | null;
  [key: string]: any;
}

interface Unit {
  id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
}

// Get unique distribuidoras from data and units
export function getUniqueDistribuidoras(
  energyData: EnergyRow[], 
  units: Unit[]
): string[] {
  const distributorasSet = new Set<string>();
  
  // From units first (preferred source)
  units.forEach(unit => {
    if (unit.distribuidora && unit.distribuidora.trim()) {
      distributorasSet.add(unit.distribuidora.trim());
    }
  });
  
  // From energy data as fallback
  energyData.forEach(row => {
    if (row.distribuidora && row.distribuidora.trim()) {
      distributorasSet.add(row.distribuidora.trim());
    }
  });
  
  return Array.from(distributorasSet).sort();
}

// Get unique fornecedoras from units
export function getUniqueFornecedoras(units: Unit[]): string[] {
  const fornecedorasSet = new Set<string>();
  
  units.forEach(unit => {
    if (unit.fornecedora_energia && unit.fornecedora_energia.trim()) {
      fornecedorasSet.add(unit.fornecedora_energia.trim());
    }
  });
  
  return Array.from(fornecedorasSet).sort();
}

// Apply unit filter
export function filterByUnit(data: EnergyRow[], selectedUnitId: string): EnergyRow[] {
  if (selectedUnitId === "todas") return data;
  return data.filter(row => row.unit_id === selectedUnitId);
}

// Apply distribuidora filter (only when unit = "todas")
export function filterByDistribuidora(
  data: EnergyRow[], 
  selectedDistribuidora: string,
  unitsById: Record<string, Unit>
): EnergyRow[] {
  if (selectedDistribuidora === "todas") return data;
  
  return data.filter(row => {
    const distribuidora = row.distribuidora || unitsById[row.unit_id || ""]?.distribuidora;
    return distribuidora === selectedDistribuidora;
  });
}

// Apply fornecedora filter (only when unit = "todas")
export function filterByFornecedora(
  data: EnergyRow[], 
  selectedFornecedora: string,
  unitsById: Record<string, Unit>
): EnergyRow[] {
  if (selectedFornecedora === "todas") return data;
  
  return data.filter(row => {
    const fornecedora = unitsById[row.unit_id || ""]?.fornecedora_energia;
    return fornecedora === selectedFornecedora;
  });
}

// Aggregate data by reference_label (month) when showing all units
export function aggregateByMonth(data: EnergyRow[]): EnergyRow[] {
  const grouped = data.reduce((acc, row) => {
    const key = row.reference_label;
    if (!acc[key]) {
      acc[key] = { ...row };
    } else {
      // Sum all numeric fields
      const numericFields = [
        'fatura_geral_rs', 'fatura_livre_rs', 'economia_liquida_rs', 'economia_liquida_pct',
        'mwh_total_gerador', 'compra_energia_rs', 'icms_energia_rs', 'encargos_rs',
        'banco_trianon_rs', 'gestao_cco_rs', 'gestao_parceiro_rs',
        'energia_kwh_ponta', 'energia_kwh_fora', 'energia_kwh_reservado',
        'demanda_contratada_kw_ponta', 'demanda_contratada_kw_fora', 'demanda_contratada_kw_reservado',
        'demanda_faturada_kw_ponta', 'demanda_faturada_kw_fora', 'demanda_faturada_kw_reservado',
        'reativo_kvarh_ponta', 'reativo_kvarh_fora', 'reativo_kvarh_reservado',
        'preco_kw_ponta', 'preco_kw_fora', 'preco_kw_reservado',
        'preco_kwh_ponta', 'preco_kwh_fora', 'preco_kwh_reservado',
        'preco_kvarh_ponta', 'preco_kvarh_fora', 'preco_kvarh_reservado', 'preco_kvarh_excedente',
        // Campos de Fator de Potência que devem ser somados/agregados
        'demanda_maxima_kw', 'kvar_corrigir_min', 'kvar_corrigir_max'
      ];
      
      numericFields.forEach(field => {
        acc[key][field] = (Number(acc[key][field]) || 0) + (Number(row[field]) || 0);
      });
      
      // For rates, calculate weighted average for reativo_limite_rate
      const currentTotalKwh = (Number(acc[key].energia_kwh_ponta) || 0) + 
                            (Number(acc[key].energia_kwh_fora) || 0) + 
                            (Number(acc[key].energia_kwh_reservado) || 0);
      const rowTotalKwh = (Number(row.energia_kwh_ponta) || 0) + 
                         (Number(row.energia_kwh_fora) || 0) + 
                         (Number(row.energia_kwh_reservado) || 0);
      
      if (rowTotalKwh > 0) {
        const currentRate = Number(acc[key].reativo_limite_rate) || 0.620;
        const rowRate = Number(row.reativo_limite_rate) || 0.620;
        const newTotalKwh = currentTotalKwh + rowTotalKwh;
        
        if (newTotalKwh > 0) {
          acc[key].reativo_limite_rate = (currentRate * currentTotalKwh + rowRate * rowTotalKwh) / newTotalKwh;
        }
      }
      
      // For other rates, keep the first non-zero value
      const otherRateFields = ['desconto_fonte', 'pis_rate', 'cofins_rate', 'icms_rate', 'rdb_rate'];
      otherRateFields.forEach(field => {
        if (!acc[key][field] && row[field]) {
          acc[key][field] = row[field];
        }
      });
      
      // For distribuidora in aggregated view, use "Múltiplas" if different
      if (acc[key].distribuidora !== row.distribuidora) {
        acc[key].distribuidora = "Múltiplas";
      }
    }
    return acc;
  }, {} as Record<string, EnergyRow>);
  
  // Recalculate derived fields after aggregation
  return Object.values(grouped).map(row => {
    const total_kwh = (Number(row.energia_kwh_ponta) || 0) + 
                     (Number(row.energia_kwh_fora) || 0) + 
                     (Number(row.energia_kwh_reservado) || 0);
    const total_kvarh = (Number(row.reativo_kvarh_ponta) || 0) + 
                       (Number(row.reativo_kvarh_fora) || 0) + 
                       (Number(row.reativo_kvarh_reservado) || 0);
    const reativo_limite_rate = Number(row.reativo_limite_rate) || 0.620;
    const limite_kvarh = reativo_limite_rate * total_kwh;
    const reativo_excedente_kvarh = Math.max(0, total_kvarh - limite_kvarh);
    const fator_potencia = total_kwh > 0 ? 1 / Math.sqrt(1 + Math.pow(total_kvarh / total_kwh, 2)) : 1;
    
    // Recalcular FP por período baseado nos totais agregados
    const fp_ponta = Number(row.energia_kwh_ponta) > 0 ? 
      1 / Math.sqrt(1 + Math.pow(Number(row.reativo_kvarh_ponta) / Number(row.energia_kwh_ponta), 2)) : null;
    const fp_fora = Number(row.energia_kwh_fora) > 0 ? 
      1 / Math.sqrt(1 + Math.pow(Number(row.reativo_kvarh_fora) / Number(row.energia_kwh_fora), 2)) : null;
    const fp_res = Number(row.energia_kwh_reservado) > 0 ? 
      1 / Math.sqrt(1 + Math.pow(Number(row.reativo_kvarh_reservado) / Number(row.energia_kwh_reservado), 2)) : null;
    
    // Recalcular FP global baseado nos totais (NÃO somar FPs individuais)
    const fp_global = total_kwh > 0 ? 1 / Math.sqrt(1 + Math.pow(total_kvarh / total_kwh, 2)) : null;
    
    return {
      ...row,
      reativo_excedente_kvarh: Math.round(reativo_excedente_kvarh * 100) / 100,
      fator_potencia: Math.round(fator_potencia * 10000) / 10000,
      // FP recalculados para agregação
      fp_ponta: fp_ponta ? Math.round(fp_ponta * 10000) / 10000 : null,
      fp_fora: fp_fora ? Math.round(fp_fora * 10000) / 10000 : null,
      fp_res: fp_res ? Math.round(fp_res * 10000) / 10000 : null,
      fp_global: fp_global ? Math.round(fp_global * 10000) / 10000 : null,
    };
  });
}

// Get distribuidora for a specific unit
export function getUnitDistribuidora(unitId: string, units: Unit[]): string | undefined {
  return units.find(u => u.id === unitId)?.distribuidora;
}

// Create units lookup map
export function createUnitsLookup(units: Unit[]): Record<string, Unit> {
  return units.reduce((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {} as Record<string, Unit>);
}

// Process data through the complete filtering pipeline
export function processEnergyData(
  rawData: EnergyRow[],
  selectedUnitId: string,
  selectedDistribuidora: string,
  selectedFornecedora: string,
  units: Unit[]
): EnergyRow[] {
  const unitsById = createUnitsLookup(units);
  
  // Step 1: Apply unit filter
  let filtered = filterByUnit(rawData, selectedUnitId);
  
  // Step 2: Apply distribuidora and fornecedora filters (only when "todas as unidades")
  if (selectedUnitId === "todas") {
    filtered = filterByDistribuidora(filtered, selectedDistribuidora, unitsById);
    filtered = filterByFornecedora(filtered, selectedFornecedora, unitsById);
  }
  
  // Step 3: Aggregate by month if showing all units
  let processed = selectedUnitId === "todas" ? aggregateByMonth(filtered) : filtered;
  
  // Step 4: Ensure numeric coercion
  processed = processed.map(row => ({
    ...row,
    fatura_livre_rs: Number(row.fatura_livre_rs) || 0,
    fatura_geral_rs: Number(row.fatura_geral_rs) || 0,
    economia_liquida_rs: Number(row.economia_liquida_rs) || 0,
    economia_liquida_pct: Number(row.economia_liquida_pct) || 0,
    mwh_total_gerador: Number(row.mwh_total_gerador) || 0,
    compra_energia_rs: Number(row.compra_energia_rs) || 0,
    icms_energia_rs: Number(row.icms_energia_rs) || 0,
    encargos_rs: Number(row.encargos_rs) || 0,
    banco_trianon_rs: Number(row.banco_trianon_rs) || 0,
    gestao_cco_rs: Number(row.gestao_cco_rs) || 0,
    gestao_parceiro_rs: Number(row.gestao_parceiro_rs) || 0,
    energia_kwh_ponta: Number(row.energia_kwh_ponta) || 0,
    energia_kwh_fora: Number(row.energia_kwh_fora) || 0,
    energia_kwh_reservado: Number(row.energia_kwh_reservado) || 0,
    demanda_contratada_kw_ponta: Number(row.demanda_contratada_kw_ponta) || 0,
    demanda_contratada_kw_fora: Number(row.demanda_contratada_kw_fora) || 0,
    demanda_contratada_kw_reservado: Number(row.demanda_contratada_kw_reservado) || 0,
    demanda_faturada_kw_ponta: Number(row.demanda_faturada_kw_ponta) || 0,
    demanda_faturada_kw_fora: Number(row.demanda_faturada_kw_fora) || 0,
    demanda_faturada_kw_reservado: Number(row.demanda_faturada_kw_reservado) || 0,
    reativo_kvarh_ponta: Number(row.reativo_kvarh_ponta) || 0,
    reativo_kvarh_fora: Number(row.reativo_kvarh_fora) || 0,
    reativo_kvarh_reservado: Number(row.reativo_kvarh_reservado) || 0,
    reativo_limite_rate: Number(row.reativo_limite_rate) || 0.620,
    // Campos de Fator de Potência
    demanda_maxima_kw: Number(row.demanda_maxima_kw) || 0,
    fp_ponta: row.fp_ponta !== null ? Number(row.fp_ponta) : null,
    fp_fora: row.fp_fora !== null ? Number(row.fp_fora) : null,
    fp_res: row.fp_res !== null ? Number(row.fp_res) : null,
    fp_global: row.fp_global !== null ? Number(row.fp_global) : null,
    kvar_corrigir_min: Number(row.kvar_corrigir_min) || 0,
    kvar_corrigir_max: Number(row.kvar_corrigir_max) || 0,
  }));
  
  return processed;
}

// Generate export filename
export function generateExportFilename(
  selectedUnitId: string,
  selectedDistribuidora: string,
  selectedFornecedora: string,
  period: string,
  clientName?: string,
  units?: Unit[]
): string {
  const basePrefix = clientName ? `energia_${clientName.replace(/\s+/g, '_')}` : 'energia';
  
  const unitPart = selectedUnitId === "todas" ? "todas" : 
    units?.find(u => u.id === selectedUnitId)?.code || "unidade";
  
  const distribuidoraPart = selectedDistribuidora === "todas" ? "todas" : 
    selectedDistribuidora.replace(/\s+/g, '_');
    
  const fornecedoraPart = selectedFornecedora === "todas" ? "todas" : 
    selectedFornecedora.replace(/\s+/g, '_');
  
  const periodPart = period.toLowerCase();
  
  return `${basePrefix}_${unitPart}_${distribuidoraPart}_${fornecedoraPart}_${periodPart}.csv`;
}
