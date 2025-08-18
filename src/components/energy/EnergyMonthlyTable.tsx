import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sortByRefLabel } from "@/lib/energyCalc";

interface EnergyRecord {
  id?: string;
  reference_label: string;
  user_id?: string;
  unit_id?: string | null;
  distribuidora?: string | null;
  fatura_geral_rs?: number | null;
  economia_liquida_rs?: number | null;
  economia_liquida_pct?: number | null;
  mwh_total_gerador?: number | null;
  energia_kwh_ponta?: number | null;
  energia_kwh_fora?: number | null;
  energia_kwh_reservado?: number | null;
  [k: string]: any;
}

interface EnergyMonthlyTableProps {
  data: EnergyRecord[];
  onEdit?: (record: EnergyRecord) => void;
  onRefresh?: () => void;
  showActions?: boolean;
  showUnitColumn?: boolean;
  showDistribuidoraColumn?: boolean;
  showFornecedoraColumn?: boolean;
  units?: Array<{
    id: string;
    code: string;
    nickname?: string;
    distribuidora?: string;
    fornecedora_energia?: string;
  }>;
}

const EnergyMonthlyTable: React.FC<EnergyMonthlyTableProps> = ({ 
  data, 
  onEdit, 
  onRefresh, 
  showActions = true, 
  showUnitColumn = false, 
  showDistribuidoraColumn = false, 
  showFornecedoraColumn = false,
  units = []
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from("energy_monthly_metrics")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Registro excluído",
        description: "O registro foi removido com sucesso.",
      });

      onRefresh?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const sortedData = [...data].sort((a, b) => sortByRefLabel(a.reference_label, b.reference_label));

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                {showUnitColumn && <TableHead>Unidade</TableHead>}
                {showDistribuidoraColumn && <TableHead>Distribuidora</TableHead>}
                {showFornecedoraColumn && <TableHead>Fornecedora</TableHead>}
                <TableHead className="text-right">Fatura Geral (R$)</TableHead>
                <TableHead className="text-right">Economia (R$)</TableHead>
                <TableHead className="text-right">Economia (%)</TableHead>
                <TableHead className="text-right">Consumo (MWh)</TableHead>
                {showActions && <TableHead className="text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((record) => {
                const totalMwh = Number(record.mwh_total_gerador || 0) || 
                  (Number(record.energia_kwh_ponta || 0) + 
                   Number(record.energia_kwh_fora || 0) + 
                   Number(record.energia_kwh_reservado || 0)) / 1000;

                const economiaPercent = Number(record.economia_liquida_pct || 0) * 100;
                const unit = units.find(u => u.id === record.unit_id);

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.reference_label}
                    </TableCell>
                    {showUnitColumn && (
                      <TableCell>
                        {unit ? `${unit.code}${unit.nickname ? ` - ${unit.nickname}` : ''}` : '-'}
                      </TableCell>
                    )}
                    {showDistribuidoraColumn && (
                      <TableCell>
                        {record.distribuidora || unit?.distribuidora || '-'}
                      </TableCell>
                    )}
                    {showFornecedoraColumn && (
                      <TableCell>
                        {unit?.fornecedora_energia || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {Number(record.fatura_geral_rs || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={Number(record.economia_liquida_rs || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {Number(record.economia_liquida_rs || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={economiaPercent >= 0 ? 'default' : 'destructive'}>
                        {economiaPercent.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {totalMwh.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(record)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                disabled={deletingId === record.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o registro do mês{" "}
                                  <strong>{record.reference_label}</strong>?
                                  <br />
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(record.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyMonthlyTable;