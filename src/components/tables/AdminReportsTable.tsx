
import { Report } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Eye, Pencil, Trash2 } from "lucide-react";

interface AdminReportsTableProps {
  reports: (Report & { full_name: string })[];
  onPreview: (fileUrl: string) => void;
  onDownload: (fileUrl: string) => void;
  onEdit?: (report: Report & { full_name: string }) => void;
  onDelete?: (reportId: string) => void;
  showEditDelete?: boolean;
}

export const AdminReportsTable = ({ 
  reports, 
  onPreview, 
  onDownload, 
  onEdit, 
  onDelete,
  showEditDelete = false
}: AdminReportsTableProps) => {
  // Get only the latest report for each client
  const latestReports = reports.reduce((acc, report) => {
    if (!acc[report.user_id] || new Date(acc[report.user_id].uploaded_at) < new Date(report.uploaded_at)) {
      acc[report.user_id] = report;
    }
    return acc;
  }, {} as Record<string, any>);

  const latestReportsArray = Object.values(latestReports);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Mês de Referência</TableHead>
          <TableHead>Data de Envio</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {latestReportsArray.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.full_name}</TableCell>
            <TableCell>{report.reference_month}</TableCell>
            <TableCell>
              {report.uploaded_at ? format(parseISO(report.uploaded_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(report.file_url)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onDownload(report.file_url)}
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
                
                {showEditDelete && onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(report)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}

                {showEditDelete && onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(report.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Apagar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
