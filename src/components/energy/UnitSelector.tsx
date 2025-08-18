import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus } from "lucide-react";
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

interface UnitSelectorProps {
  userId: string;
  value?: string;
  onValueChange: (unitId: string) => void;
  onUnitCreated?: (unit: Unit) => void;
  showAddButton?: boolean;
}

export default function UnitSelector({ userId, value, onValueChange, onUnitCreated, showAddButton = false }: UnitSelectorProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [showNewUnitDialog, setShowNewUnitDialog] = useState(false);
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
    if (!userId) {
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
  }, [userId]);

  const handleCreateUnit = async (values: z.infer<typeof UnitSchema>) => {
    setIsLoading(true);
    try {
      // Determinar o dono da unidade
      let targetUserId: string;
      
      if (profile?.type === 'admin' && userId) {
        // Admin criando para um cliente selecionado
        targetUserId = userId;
      } else {
        // Cliente logado criando para si mesmo
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          throw new Error("Usuário não autenticado");
        }
        targetUserId = user.id;
      }

      // Usar upsert para lidar com duplicatas
      const { data, error } = await (supabase as any)
        .from("energy_units")
        .upsert(
          {
            user_id: targetUserId,
            code: values.code,
            nickname: values.nickname || null,
            distribuidora: values.distribuidora || null,
            fornecedora_energia: values.fornecedora_energia || null,
          },
          { onConflict: 'user_id,code' }
        )
        .select()
        .single();

      if (error) {
        // Exibir exatamente a mensagem de erro do back-end
        toast({
          variant: "destructive",
          title: "Erro ao criar unidade",
          description: error.message,
        });
        return; // Não fechar o modal em caso de erro
      }

      // Sucesso: atualizar lista, selecionar unidade e fechar modal
      const unit = data as Unit;
      const existingUnitIndex = units.findIndex(u => u.id === unit.id);
      if (existingUnitIndex >= 0) {
        // Atualizar unidade existente
        const updatedUnits = [...units];
        updatedUnits[existingUnitIndex] = unit;
        setUnits(updatedUnits);
      } else {
        // Adicionar nova unidade
        setUnits([...units, unit]);
      }
      
      onValueChange(unit.id);
      onUnitCreated?.(unit); // Chamar callback se fornecido
      setShowNewUnitDialog(false);
      form.reset();
      toast({ title: "Unidade criada com sucesso" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar unidade",
        description: error.message,
      });
      // Não fechar o modal em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecionar unidade (UC)..." />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.code} {unit.nickname ? `- ${unit.nickname}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAddButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowNewUnitDialog(true)}
            disabled={!userId}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      
      {/* Show unit basic info when unit is selected */}
      {value && units.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          {(() => {
            const selectedUnit = units.find(u => u.id === value);
            if (!selectedUnit) return null;
            
            return (
              <div className="space-y-1">
                <div><strong>Código:</strong> {selectedUnit.code}</div>
                {selectedUnit.nickname && <div><strong>Apelido:</strong> {selectedUnit.nickname}</div>}
                {selectedUnit.distribuidora && <div><strong>Distribuidora:</strong> {selectedUnit.distribuidora}</div>}
                {selectedUnit.fornecedora_energia && <div><strong>Fornecedora:</strong> {selectedUnit.fornecedora_energia}</div>}
              </div>
            );
          })()}
        </div>
      )}
      </div>

      <Dialog open={showNewUnitDialog} onOpenChange={setShowNewUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Unidade</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código da Unidade</FormLabel>
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
                    <FormLabel>Apelido (opcional)</FormLabel>
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
                      <FormLabel>Distribuidora (opcional)</FormLabel>
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
                      <FormLabel>Fornecedora de energia (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Engie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewUnitDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  disabled={isLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit(handleCreateUnit)();
                  }}
                >
                  {isLoading ? "Criando..." : "Criar Unidade"}
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}