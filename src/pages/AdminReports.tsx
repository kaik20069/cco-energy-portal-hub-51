
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminReportsTable } from "@/components/tables/AdminReportsTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminReports = () => {
  const [reports, setReports] = useState<(Report & { full_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // First, get all reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (reportsError) throw reportsError;
      
      // For each report, get the user's profile information
      const reportsWithProfiles = await Promise.all(
        reportsData.map(async (report) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', report.user_id)
            .single();
            
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return {
              ...report,
              full_name: 'Cliente sem nome'
            };
          }
          
          return {
            ...report,
            full_name: profileData?.full_name || 'Cliente sem nome'
          };
        })
      );

      setReports(reportsWithProfiles);
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
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(fileUrl, 60);
      
      if (error) throw error;
      
      setPreviewUrl(data.signedUrl);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao visualizar relatório",
        description: error.message,
      });
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer download",
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Relatórios de Clientes</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Último Relatório por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando relatórios...</p>
            ) : reports.length === 0 ? (
              <p>Nenhum relatório disponível.</p>
            ) : (
              <AdminReportsTable 
                reports={reports} 
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Visualização do Relatório</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Visualização do Relatório"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
