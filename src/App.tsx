import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import UsersPage from "./pages/UsersPage";
import CredentialsPage from "./pages/CredentialsPage";
import IngestionPage from "./pages/IngestionPage";
import IngestionLogsPage from "./pages/IngestionLogsPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/credentials" element={<CredentialsPage />} />
                <Route path="/ingestion" element={<IngestionPage />} />
                <Route path="/ingestion/logs" element={<IngestionLogsPage />} />
                <Route path="/api-docs" element={<ApiDocsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
