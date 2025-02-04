import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Integration } from "@/types/integration";

export const useIntegration = (provider: string) => {
  return useQuery<Integration>({
    queryKey: ['integrations', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', provider)
        .single();
      
      if (error) throw error;
      return data;
    }
  });
};