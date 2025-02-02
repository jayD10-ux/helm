import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const provider = state?.toLowerCase();

      if (!code || !provider) {
        setError("Missing required parameters");
        return;
      }

      try {
        console.log(`Processing ${provider} OAuth callback...`);
        
        // Get the current session to get the user ID
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session?.user?.id) {
          throw new Error("Authentication required");
        }

        const { data, error: functionError } = await supabase.functions.invoke(
          `${provider}-oauth`,
          {
            body: { 
              code,
              redirectUri: `${window.location.origin}/oauth/callback`
            }
          }
        );

        if (functionError) {
          throw functionError;
        }

        if (!data?.access_token) {
          throw new Error("No access token received");
        }

        // Store the integration in the database with user_id
        const { error: dbError } = await supabase
          .from('integrations')
          .upsert({
            provider,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            user_id: sessionData.session.user.id
          }, {
            onConflict: 'provider,user_id'
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }

        toast({
          title: "Success",
          description: `Successfully connected to ${provider}`,
        });

        // Return to the dashboard
        navigate("/");
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setError(error.message || "Failed to complete authentication");
        toast({
          title: "Error",
          description: error.message || "Failed to complete authentication",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-semibold text-red-500 mb-4">Authentication Error</h1>
        <p className="text-muted-foreground text-center">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Loader className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
};

export default OAuthCallback;