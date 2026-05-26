import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rss, KeyRound } from 'lucide-react';
import { RSSSourcesSection } from './components/rss/RSSSourcesSection';
import { SecretsSection } from './components/secrets/SecretsSection';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

export function IntegrationsPage() {
  return (
    <TooltipProvider>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Integrações</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie fontes RSS, credenciais de API e webhooks do Wolfgang.
          </p>
        </div>

        <Tabs defaultValue="rss" className="space-y-6">
          <TabsList className="bg-zinc-800/60 border border-zinc-700 p-1">
            <TabsTrigger
              value="rss"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 gap-2"
            >
              <Rss className="w-4 h-4" />
              Fontes RSS
            </TabsTrigger>
            <TabsTrigger
              value="secrets"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Webhooks & APIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rss" className="mt-0">
            <RSSSourcesSection />
          </TabsContent>

          <TabsContent value="secrets" className="mt-0">
            <SecretsSection />
          </TabsContent>
        </Tabs>
      </div>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}
