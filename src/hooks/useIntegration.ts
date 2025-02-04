import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Integration, IntegrationProvider } from "@/types/integration";

export const useIntegration = (provider: IntegrationProvider) => {
  return useQuery<Integration>({
    queryKey: ['integrations', provider],
    queryFn: async () => {
      console.log(`Fetching ${provider} integration...`);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', provider)
        .single();
      
      if (error) {
        console.error(`Error fetching ${provider} integration:`, error);
        throw error;
      }
      
      console.log(`${provider} integration found:`, !!data);
      return data;
    }
  });
};