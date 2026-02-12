import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import UsersPage from "./pages/UsersPage";
import CredentialsPage from "./pages/CredentialsPage";
import IngestionPage from "./pages/IngestionPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/ingestion" element={<IngestionPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
