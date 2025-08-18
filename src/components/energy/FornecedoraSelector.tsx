import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Unit {
  id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
}

interface FornecedoraSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  fornecedoras: string[];
  selectedUnitId: string;
  units: Unit[];
  disabled?: boolean;
}

export default function FornecedoraSelector({ 
  value, 
  onValueChange, 
  fornecedoras,
  selectedUnitId,
  units,
  disabled = false
}: FornecedoraSelectorProps) {
  // Se uma unidade específica está selecionada, mostrar apenas sua fornecedora
  const unitFornecedora = selectedUnitId !== "todas" 
    ? units.find(u => u.id === selectedUnitId)?.fornecedora_energia 
    : null;

  const shouldDisable = disabled || (selectedUnitId !== "todas" && !unitFornecedora);

  return (
    <div className="w-full md:w-64">
      <label className="block text-sm mb-1">Fornecedora</label>
      <Select 
        value={selectedUnitId !== "todas" ? (unitFornecedora || "todas") : value} 
        onValueChange={onValueChange}
        disabled={shouldDisable}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecionar fornecedora..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as fornecedoras</SelectItem>
          {selectedUnitId !== "todas" ? (
            unitFornecedora ? (
              <SelectItem value={unitFornecedora}>{unitFornecedora}</SelectItem>
            ) : null
          ) : (
            fornecedoras.map((fornecedora) => (
              <SelectItem key={fornecedora} value={fornecedora}>
                {fornecedora}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}