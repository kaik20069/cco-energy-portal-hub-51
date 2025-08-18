
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { BoletoStatus } from "@/types";

interface BoletoStatusBadgeProps {
  status: BoletoStatus | null;
  dueDate?: string;
}

export const BoletoStatusBadge = ({ status, dueDate }: BoletoStatusBadgeProps) => {
  const isOverdue = status !== 'pago' && dueDate ? new Date(dueDate) < new Date() : false;
  
  // Render an overdue badge if the boleto is past due date and not paid
  if (isOverdue || status === 'vencido') {
    return (
      <Badge
        variant="destructive"
        className="bg-red-500 flex items-center gap-1"
      >
        <AlertCircle className="w-3 h-3" />
        Vencido
      </Badge>
    );
  }

  // Otherwise show the regular status badge
  return (
    <Badge
      variant={status === 'pago' ? 'default' : 'destructive'}
      className={status === 'pago' ? 'bg-green-500' : ''}
    >
      {status === 'pago' ? 'Pago' : 'Devendo'}
    </Badge>
  );
};
