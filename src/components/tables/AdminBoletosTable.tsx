
import React, { useState } from "react";
import { Boleto, BoletoStatus } from "@/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BoletoStatusBadge } from "./BoletoStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Eye } from "lucide-react";

interface AdminBoletosTableProps {
  boletos: (Boleto & { full_name: string })[];
  onPreview: (fileUrl: string) => void;
  onDownload: (fileUrl: string) => void;
  onStatusChange: (boletoId: string, newStatus: BoletoStatus) => void;
}

export const AdminBoletosTable = ({ boletos, onPreview, onDownload, onStatusChange }: AdminBoletosTableProps) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (boletoId: string, currentStatus: BoletoStatus | null) => {
    try {
      setUpdatingId(boletoId);
      const newStatus = currentStatus === 'pago' ? 'devendo' as BoletoStatus : 'pago' as BoletoStatus;
      
      const { error } = await supabase
        .from('boletos')
        .update({ status: newStatus })
        .eq('id', boletoId);

      if (error) throw error;

      onStatusChange(boletoId, newStatus);
      
      toast({
        description: `Status atualizado com sucesso para ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter to show only unpaid boletos
  const unPaidBoletos = boletos.filter(boleto => boleto.status !== 'pago');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Mês de Referência</TableHead>
          <TableHead>Data de Vencimento</TableHead>
          <TableHead>Data de Envio</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {unPaidBoletos.map((boleto) => (
          <TableRow key={boleto.id}>
            <TableCell className="font-medium">{boleto.full_name}</TableCell>
            <TableCell>{boleto.reference_month}</TableCell>
            <TableCell>
              {boleto.due_date ? format(parseISO(boleto.due_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
            </TableCell>
            <TableCell>
              {boleto.uploaded_at ? format(parseISO(boleto.uploaded_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
            </TableCell>
            <TableCell>
              <BoletoStatusBadge status={boleto.status} dueDate={boleto.due_date} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(boleto.file_url)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onDownload(boleto.file_url)}
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
                <Button
                  size="sm"
                  variant={boleto.status === 'pago' ? 'destructive' : 'default'}
                  onClick={() => handleUpdateStatus(boleto.id, boleto.status)}
                  disabled={updatingId === boleto.id}
                >
                  {boleto.status === 'pago' ? 'Marcar como Devendo' : 'Marcar como Pago'}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
