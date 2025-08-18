import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  full_name?: string | null;
  email?: string | null;
  cod_instal?: string | null;
}

interface ClientSearchProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ClientSearch({ 
  value, 
  onValueChange, 
  placeholder = "Buscar cliente...",
  className 
}: ClientSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  
  const selectedClient = clients.find(c => c.id === value) || 
    recentClients.find(c => c.id === value);

  // Load recent clients from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recent-clients');
    if (recent) {
      try {
        setRecentClients(JSON.parse(recent));
      } catch (e) {
        console.error('Error loading recent clients:', e);
      }
    }
  }, []);

  // Save client to recent clients
  const saveToRecent = useCallback((client: Client) => {
    const recent = JSON.parse(localStorage.getItem('recent-clients') || '[]');
    const filtered = recent.filter((c: Client) => c.id !== client.id);
    const newRecent = [client, ...filtered].slice(0, 5);
    localStorage.setItem('recent-clients', JSON.stringify(newRecent));
    setRecentClients(newRecent);
  }, []);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setClients([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        // Search in profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("type", "client")
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
          .order("full_name", { ascending: true })
          .limit(15);

        if (profileError) throw profileError;

        // Also search by cod_instal in energy_monthly_metrics
        const { data: energyData, error: energyError } = await supabase
          .from("energy_monthly_metrics")
          .select("user_id, cod_instal")
          .ilike("cod_instal", `%${search}%`)
          .not("cod_instal", "is", null)
          .limit(5);

        if (energyError) throw energyError;

        // Get profile info for users found by cod_instal
        const userIds = energyData?.map(e => e.user_id) || [];
        const { data: codInstallProfiles, error: codError } = userIds.length > 0 
          ? await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("type", "client")
              .in("id", userIds)
          : { data: [], error: null };

        if (codError) throw codError;

        // Merge results and deduplicate
        const allClients = [...(profileData || [])];
        codInstallProfiles?.forEach(profile => {
          if (!allClients.find(c => c.id === profile.id)) {
            allClients.push(profile);
          }
        });

        setClients(allClients.slice(0, 15));
      } catch (error) {
        console.error("Error searching clients:", error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleSelect = (client: Client) => {
    onValueChange?.(client.id);
    saveToRecent(client);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onValueChange?.("");
    setSearch("");
    setOpen(false);
  };

  const displayValue = selectedClient 
    ? `${selectedClient.full_name || selectedClient.email || selectedClient.id}`
    : "";

  const showRecent = search.length < 2 && recentClients.length > 0;
  const showResults = search.length >= 2;
  const hasNoResults = showResults && !loading && clients.length === 0;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={displayValue}
              placeholder={placeholder}
              className="pr-20"
              readOnly
              onClick={() => setOpen(true)}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setOpen(true)}
              >
                <Search className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite pelo menos 2 letras..."
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <CommandList className="max-h-[300px]">
              {showRecent && (
                <CommandGroup heading="Recentes">
                  {recentClients.map((client) => (
                    <CommandItem
                      key={client.id}
                      onSelect={() => handleSelect(client)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {client.full_name || client.email || client.id}
                        </span>
                        {client.email && client.full_name && (
                          <span className="text-sm text-muted-foreground">
                            {client.email}
                          </span>
                        )}
                      </div>
                      {value === client.id && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {showResults && (
                <CommandGroup heading={search.length >= 2 ? "Resultados" : undefined}>
                  {loading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Buscando...
                    </div>
                  ) : hasNoResults ? (
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado. Tente pelo e-mail ou COD INSTAL.
                      </div>
                    </CommandEmpty>
                  ) : (
                    clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => handleSelect(client)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {client.full_name || client.email || client.id}
                            </span>
                            {client.cod_instal && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {client.cod_instal}
                              </span>
                            )}
                          </div>
                          {client.email && client.full_name && (
                            <span className="text-sm text-muted-foreground">
                              {client.email}
                            </span>
                          )}
                        </div>
                        {value === client.id && <Check className="h-4 w-4 ml-2" />}
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              )}
              
              {!showRecent && !showResults && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 letras para buscar
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}