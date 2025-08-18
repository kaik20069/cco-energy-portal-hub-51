import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DistribuidoraSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  distribuidoras: string[];
}

export default function DistribuidoraSelector({ 
  value, 
  onValueChange, 
  disabled = false,
  distribuidoras
}: DistribuidoraSelectorProps) {
  return (
    <div className="w-full md:w-64">
      <label className="block text-sm mb-1">Distribuidora</label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar distribuidora..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as distribuidoras</SelectItem>
          {distribuidoras.map((dist) => (
            <SelectItem key={dist} value={dist}>
              {dist}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}