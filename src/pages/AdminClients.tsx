
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, FileDown, Search, Users, Pencil, Trash2 } from "lucide-react";
import { BoletoStatusBadge } from "@/components/tables/BoletoStatusBadge";
import { BoletoStatus, Boleto as BoletoType } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  full_name: string;
}

interface Boleto {
  id: string;
  file_url: string;
  reference_month: string;
  uploaded_at: string;
  due_date: string;
  status: BoletoStatus | null;
}

interface Report {
  id: string;
  file_url: string;
  reference_month: string;
  uploaded_at: string;
}

const AdminClients = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [clients, setClients] = useState<Profile[]>([]);
  const [filteredClients, setFilteredClients] = useState<Profile[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientBoletos, setClientBoletos] = useState<Boleto[]>([]);
  const [clientReports, setClientReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'boleto' | 'report'} | null>(null);
  
  const navigate = useNavigate();

  // Fetch all clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients whenever search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  // Fetch client data when a client is selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientBoletos(selectedClient.id);
      fetchClientReports(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("type", "client");

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar clientes",
        description: error.message,
      });
    }
  };

  const fetchClientBoletos = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      
      // Map the data from Supabase to ensure status is of type BoletoStatus
      const typedBoletos: Boleto[] = (data || []).map(item => ({
        ...item,
        // Ensure status is of type BoletoStatus or null
        status: item.status as BoletoStatus || null
      }));

      setClientBoletos(typedBoletos);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar boletos",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientReports = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setClientReports(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar relatórios",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
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
        title: "Erro ao visualizar documento",
        description: error.message,
      });
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(fileUrl, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer download",
        description: error.message,
      });
    }
  };

  const handleClientSelect = (client: Profile) => {
    setSelectedClient(client);
  };

  const handleAddDocument = () => {
    if (selectedClient) {
      navigate(`/dashboard/upload?clientId=${selectedClient.id}`);
    } else {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para adicionar documentos.",
      });
    }
  };

  const handleUpdateBoletoStatus = async (boletoId: string, currentStatus: string | null) => {
    try {
      setUpdatingId(boletoId);
      
      // Explicitly define valid status values as BoletoStatus
      let newStatus: BoletoStatus;
      
      if (currentStatus === 'pago') {
        newStatus = 'devendo';
      } else {
        newStatus = 'pago';
      }
      
      const { error } = await supabase
        .from('boletos')
        .update({ status: newStatus })
        .eq('id', boletoId);

      if (error) throw error;

      // Update local state
      setClientBoletos(current => 
        current.map(boleto => 
          boleto.id === boletoId ? { ...boleto, status: newStatus } : boleto
        )
      );
      
      toast({
        description: `Status atualizado para ${newStatus}`,
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

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      const { id, type } = itemToDelete;
      const tableName = type === 'boleto' ? 'boletos' : 'reports';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (type === 'boleto') {
        setClientBoletos(current => current.filter(item => item.id !== id));
      } else {
        setClientReports(current => current.filter(item => item.id !== id));
      }
      
      toast({
        description: `${type === 'boleto' ? 'Boleto' : 'Relatório'} removido com sucesso`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleEdit = (type: 'boleto' | 'report', item: any) => {
    if (selectedClient) {
      navigate(`/dashboard/upload?clientId=${selectedClient.id}&fileId=${item.id}&fileType=${type}`);
    }
  };

  const handleDelete = (type: 'boleto' | 'report', id: string) => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Clientes</h1>
          <p className="text-gray-500">Visualize clientes e seus documentos</p>
        </div>

        <div className="grid md:grid-cols-12 gap-6">
          {/* Left column - Client list */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-[#ADD8E6]" />
                Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar cliente por nome..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="h-96 overflow-auto border rounded-md">
                  {filteredClients.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-4 text-gray-500">
                      {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                    </div>
                  ) : (
                    <ul>
                      {filteredClients.map((client) => (
                        <li
                          key={client.id}
                          className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors
                            ${selectedClient?.id === client.id ? 'bg-secondary/20' : 'hover:bg-gray-50'}`}
                          onClick={() => handleClientSelect(client)}
                        >
                          <div className="font-medium">{client.full_name || "Cliente sem nome"}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right column - Client documents */}
          <div className="md:col-span-8 space-y-6">
            {selectedClient ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Detalhes do Cliente: {selectedClient.full_name}</CardTitle>
                      <Button onClick={handleAddDocument} variant="secondary">
                        Adicionar Documento
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="boletos">
                  <TabsList>
                    <TabsTrigger value="boletos">Boletos</TabsTrigger>
                    <TabsTrigger value="reports">Relatórios</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="boletos" className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        {isLoading ? (
                          <div className="text-center py-4">Carregando boletos...</div>
                        ) : clientBoletos.length === 0 ? (
                          <div className="text-center py-4">Nenhum boleto encontrado para este cliente</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mês de Referência</TableHead>
                                <TableHead>Data de Envio</TableHead>
                                <TableHead>Data de Vencimento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientBoletos.map((boleto) => (
                                <TableRow key={boleto.id}>
                                  <TableCell>{boleto.reference_month}</TableCell>
                                  <TableCell>
                                    {boleto.uploaded_at ? format(parseISO(boleto.uploaded_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {boleto.due_date ? format(parseISO(boleto.due_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant={boleto.status === 'pago' ? 'default' : 'outline'}
                                      size="sm"
                                      className={boleto.status === 'pago' ? 'bg-green-500 hover:bg-green-600' : ''}
                                      onClick={() => handleUpdateBoletoStatus(boleto.id, boleto.status)}
                                      disabled={updatingId === boleto.id}
                                    >
                                      <BoletoStatusBadge status={boleto.status} />
                                    </Button>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(boleto.file_url)}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Ver
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleDownload(boleto.file_url)}
                                      >
                                        <FileDown className="w-4 h-4 mr-1" />
                                        Baixar
                                      </Button>
                                      <Button
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleEdit('boleto', boleto)}
                                      >
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete('boleto', boleto.id)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Apagar
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reports" className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        {isLoading ? (
                          <div className="text-center py-4">Carregando relatórios...</div>
                        ) : clientReports.length === 0 ? (
                          <div className="text-center py-4">Nenhum relatório encontrado para este cliente</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mês de Referência</TableHead>
                                <TableHead>Data de Envio</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientReports.map((report) => (
                                <TableRow key={report.id}>
                                  <TableCell>{report.reference_month}</TableCell>
                                  <TableCell>
                                    {report.uploaded_at ? format(parseISO(report.uploaded_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(report.file_url)}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Ver
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleDownload(report.file_url)}
                                      >
                                        <FileDown className="w-4 h-4 mr-1" />
                                        Baixar
                                      </Button>
                                      <Button
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleEdit('report', report)}
                                      >
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete('report', report.id)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Apagar
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum cliente selecionado</h3>
                  <p>Selecione um cliente na lista à esquerda para ver seus documentos.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Visualização do Documento</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Visualização do Documento"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este {itemToDelete?.type === 'boleto' ? 'boleto' : 'relatório'}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminClients;
