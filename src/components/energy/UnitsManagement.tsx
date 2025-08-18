import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";

const UnitSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  nickname: z.string().optional(),
  distribuidora: z.string().optional(),
  fornecedora_energia: z.string().optional(),
});

interface Unit {
  id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
}

interface UnitsManagementProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnitChanged?: () => void;
}

export default function UnitsManagement({ userId, open, onOpenChange, onUnitChanged }: UnitsManagementProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [deleteMonthsCount, setDeleteMonthsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  const form = useForm<z.infer<typeof UnitSchema>>({
    resolver: zodResolver(UnitSchema),
    defaultValues: {
      code: "",
      nickname: "",
      distribuidora: "",
      fornecedora_energia: "",
    },
  });

  // Load units for the selected user
  useEffect(() => {
    if (!userId || !open) {
      setUnits([]);
      return;
    }

    const fetchUnits = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("energy_units")
          .select("*")
          .eq("user_id", userId)
          .order("code");

        if (error) {
          console.error("Error fetching units:", error);
          return;
        }

        setUnits(data || []);
      } catch (error) {
        console.error("Error fetching units:", error);
        setUnits([]);
      }
    };

    fetchUnits();
  }, [userId, open]);

  // Filter units based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUnits(units);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUnits(
        units.filter(
          (unit) =>
            unit.code.toLowerCase().includes(query) ||
            unit.nickname?.toLowerCase().includes(query) ||
            unit.distribuidora?.toLowerCase().includes(query) ||
            unit.fornecedora_energia?.toLowerCase().includes(query)
        )
      );
    }
  }, [units, searchQuery]);

  const handleCreateUnit = () => {
    form.reset({
      code: "",
      nickname: "",
      distribuidora: "",
      fornecedora_energia: "",
    });
    setSelectedUnit(null);
    setShowEditDialog(true);
  };

  const handleEditUnit = (unit: Unit) => {
    form.reset({
      code: unit.code,
      nickname: unit.nickname || "",
      distribuidora: unit.distribuidora || "",
      fornecedora_energia: unit.fornecedora_energia || "",
    });
    setSelectedUnit(unit);
    setShowEditDialog(true);
  };

  const handleDeleteUnit = async (unit: Unit) => {
    try {
      // Check if unit has associated months
      const { count, error } = await (supabase as any)
        .from("energy_monthly_metrics")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unit.id);

      if (error) {
        console.error("Error checking linked months:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao verificar meses vinculados",
        });
        return;
      }

      setDeleteMonthsCount(count || 0);
      setSelectedUnit(unit);
      setShowDeleteDialog(true);
    } catch (error) {
      console.error("Error checking linked months:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao verificar meses vinculados",
      });
    }
  };

  const confirmDeleteUnit = async () => {
    if (!selectedUnit || deleteMonthsCount > 0) return;

    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("energy_units")
        .delete()
        .eq("id", selectedUnit.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir unidade",
          description: error.message,
        });
        return;
      }

      setUnits(units.filter(u => u.id !== selectedUnit.id));
      setShowDeleteDialog(false);
      setSelectedUnit(null);
      onUnitChanged?.();
      toast({ title: "Unidade excluída com sucesso" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir unidade",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUnit = async (values: z.infer<typeof UnitSchema>) => {
    setIsLoading(true);
    try {
      let targetUserId: string;
      
      if (profile?.type === 'admin' && userId) {
        targetUserId = userId;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          throw new Error("Usuário não autenticado");
        }
        targetUserId = user.id;
      }

      const unitData = {
        user_id: targetUserId,
        code: values.code,
        nickname: values.nickname || null,
        distribuidora: values.distribuidora || null,
        fornecedora_energia: values.fornecedora_energia || null,
      };

      let result;
      if (selectedUnit) {
        // Update existing unit
        result = await (supabase as any)
          .from("energy_units")
          .update(unitData)
          .eq("id", selectedUnit.id)
          .select()
          .single();
      } else {
        // Create new unit
        result = await (supabase as any)
          .from("energy_units")
          .upsert(unitData, { onConflict: 'user_id,code' })
          .select()
          .single();
      }

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar unidade",
          description: result.error.message,
        });
        return;
      }

      const unit = result.data as Unit;
      if (selectedUnit) {
        // Update existing unit in list
        setUnits(units.map(u => u.id === unit.id ? unit : u));
      } else {
        // Add new unit to list
        setUnits([...units, unit]);
      }
      
      setShowEditDialog(false);
      setSelectedUnit(null);
      onUnitChanged?.();
      toast({ 
        title: selectedUnit ? "Unidade atualizada com sucesso" : "Unidade criada com sucesso" 
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar unidade",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Unidades (UC)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, apelido, distribuidora..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleCreateUnit}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código (UC)</TableHead>
                    <TableHead>Apelido</TableHead>
                    <TableHead>Distribuidora</TableHead>
                    <TableHead>Fornecedora</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {searchQuery ? "Nenhuma unidade encontrada" : "Nenhuma unidade cadastrada"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.code}</TableCell>
                        <TableCell>{unit.nickname || "-"}</TableCell>
                        <TableCell>{unit.distribuidora || "-"}</TableCell>
                        <TableCell>{unit.fornecedora_energia || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUnit(unit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUnit(unit)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Unit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código da Unidade *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: UC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apelido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Matriz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distribuidora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distribuidora</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CEMIG" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fornecedora_energia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedora de Energia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Engie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              disabled={isLoading}
              onClick={form.handleSubmit(handleSaveUnit)}
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMonthsCount > 0 ? (
                <>
                  Não é possível excluir a unidade <strong>{selectedUnit?.code}</strong>: 
                  existem {deleteMonthsCount} mês(es) vinculado(s) a esta unidade.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir a unidade <strong>{selectedUnit?.code}</strong>? 
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleteMonthsCount === 0 && (
              <AlertDialogAction
                onClick={confirmDeleteUnit}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}