
import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserProfile | null;
  senderName: string | null;
}

export const ContactDialog = ({ open, onOpenChange, selectedUser, senderName }: ContactDialogProps) => {
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleSend = async () => {
    if (!message.trim() || !selectedUser || !senderName) return;
    
    setIsSending(true);
    try {
      // Insert notification into the database
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedUser.id,
          sender_name: senderName,
          message: message.trim(),
          read: false
        });

      if (error) throw error;

      toast({
        title: "Mensagem enviada",
        description: `Mensagem enviada para ${selectedUser.full_name} com sucesso!`
      });
      
      // Reset and close
      setMessage("");
      onOpenChange(false);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensagem</DialogTitle>
          <DialogDescription>
            Envie uma mensagem para {selectedUser?.full_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Digite sua mensagem aqui..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || isSending}
            className="bg-[#ADD8E6] hover:bg-[#9CC8D6] text-black"
          >
            {isSending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
