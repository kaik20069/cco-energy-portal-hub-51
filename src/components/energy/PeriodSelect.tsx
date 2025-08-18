import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PeriodState } from "@/lib/periodRef";

interface PeriodSelectProps {
  value: PeriodState;
  onChange: (value: PeriodState) => void;
  className?: string;
}

const PeriodSelect: React.FC<PeriodSelectProps> = ({ value, onChange, className }) => {
  const handleModeChange = (mode: PeriodState['mode']) => {
    onChange({ mode });
  };

  const handleStartChange = (startLabel: string) => {
    onChange({ ...value, startLabel: startLabel.toLowerCase() });
  };

  const handleEndChange = (endLabel: string) => {
    onChange({ ...value, endLabel: endLabel.toLowerCase() });
  };

  return (
    <div className={`flex flex-col md:flex-row gap-3 md:items-end ${className || ''}`}>
      <div className="w-full md:w-64">
        <label className="block text-sm mb-1">Período</label>
        <Select value={value.mode} onValueChange={handleModeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LAST12">Últimos 12 meses</SelectItem>
            <SelectItem value="THIS_YEAR">Ano atual</SelectItem>
            <SelectItem value="PREV_YEAR">Ano anterior</SelectItem>
            <SelectItem value="CUSTOM">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.mode === "CUSTOM" && (
        <div className="flex gap-3 w-full md:w-auto">
          <div>
            <label className="block text-sm mb-1">Início (MMM/AA)</label>
            <Input 
              value={value.startLabel || ""} 
              onChange={(e) => handleStartChange(e.target.value)} 
              placeholder="ago/23" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fim (MMM/AA)</label>
            <Input 
              value={value.endLabel || ""} 
              onChange={(e) => handleEndChange(e.target.value)} 
              placeholder="jul/24" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodSelect;