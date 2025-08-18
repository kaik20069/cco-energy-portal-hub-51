
import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const ClientReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      fetchReports();
    }
  }, [profile]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Only fetch reports for the logged-in user
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', profile?.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar relatórios",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (fileUrl: string) => {
    try {
      console.log("Tentando visualizar relatório:", fileUrl);
      
      // Tratar o caminho do arquivo corretamente
      let filePath = fileUrl;
      
      // Se o caminho já contém "documents/", remover o prefixo para obter apenas o caminho relativo
      if (filePath.includes("documents/")) {
        filePath = filePath.split("documents/")[1];
      }
      
      console.log("Caminho processado para visualização:", filePath);
      
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos
      
      if (error) {
        console.error("Erro ao gerar URL assinada:", error);
        throw new Error(`Erro ao acessar relatório: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error("URL de visualização não foi gerada");
      }
      
      console.log("URL assinada gerada com sucesso:", data.signedUrl);
      setPreviewUrl(data.signedUrl);
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao visualizar relatório",
        description: error.message || "Relatório não encontrado. Por favor, entre em contato com o suporte.",
      });
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      console.log("Tentando baixar relatório:", fileUrl);
      
      // Tratar o caminho do arquivo corretamente
      let filePath = fileUrl;
      
      // Se o caminho já contém "documents/", remover o prefixo para obter apenas o caminho relativo
      if (filePath.includes("documents/")) {
        filePath = filePath.split("documents/")[1];
      }
      
      console.log("Caminho processado para download:", filePath);

      const { data, error } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos

      if (error) {
        console.error("Erro ao gerar URL para download:", error);
        throw new Error(`Erro ao acessar relatório para download: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error("URL de download não foi gerada");
      }
      
      console.log("URL de download gerada com sucesso:", data.signedUrl);
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer download",
        description: error.message || "Relatório não encontrado. Por favor, entre em contato com o suporte.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Meus Relatórios</h1>
        
        <Card>
          <div className="p-6">
            {loading ? (
              <p className="text-center py-4">Carregando relatórios...</p>
            ) : reports.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum relatório disponível.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{report.reference_month}</h3>
                          <p className="text-sm text-muted-foreground">
                            Enviado em: {format(parseISO(report.uploaded_at), "PPP", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(report.file_url)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(report.file_url)}
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Visualização do Relatório</DialogTitle>
              <DialogDescription>Relatório gerado pelo sistema</DialogDescription>
            </DialogHeader>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Visualização do Relatório"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p>Carregando visualização...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ClientReports;
