import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import { IntegrationsPage } from '@/pages/integrations/IntegrationsPage';
import { FeedPage } from '@/pages/feed/FeedPage';
import MockupsPage from '@/pages/mockups/MockupsPage';
import { SchedulesPage } from '@/pages/schedule/SchedulesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/schedule" element={<SchedulesPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/channels" element={<MockupsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

