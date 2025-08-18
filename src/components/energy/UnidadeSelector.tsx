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

interface UnidadeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  units: Unit[];
}

export default function UnidadeSelector({ 
  value, 
  onValueChange, 
  units
}: UnidadeSelectorProps) {
  return (
    <div className="w-full md:w-64">
      <label className="block text-sm mb-1">Unidade (UC)</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar unidade..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as unidades</SelectItem>
          {units.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.nickname || unit.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}