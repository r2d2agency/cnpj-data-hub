import { useState, useEffect } from 'react';
import { Save, Loader2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { fetchSettings, updateSettings } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';

export default function SettingsPage() {
  const { refreshSettings } = useSettings();
  const [siteName, setSiteName] = useState('');
  const [siteSubtitle, setSiteSubtitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings().then(data => {
      if (data) {
        setSiteName(data.site_name || '');
        setSiteSubtitle(data.site_subtitle || '');
        setSiteDescription(data.site_description || '');
      }
    }).finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    if (!siteName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await updateSettings({
        site_name: siteName.trim(),
        site_subtitle: siteSubtitle.trim(),
        site_description: siteDescription.trim(),
      });
      await refreshSettings();
      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalize o nome e branding da plataforma</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Identidade do Sistema</h2>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Nome do Sistema</Label>
          <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="CNPJ Data" maxLength={50} />
          <p className="text-xs text-muted-foreground">Exibido no menu lateral e na barra do navegador</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Subtítulo</Label>
          <Input value={siteSubtitle} onChange={e => setSiteSubtitle(e.target.value)} placeholder="Receita Federal" maxLength={50} />
          <p className="text-xs text-muted-foreground">Texto menor exibido abaixo do nome no menu</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Descrição</Label>
          <Input value={siteDescription} onChange={e => setSiteDescription(e.target.value)} placeholder="Plataforma de consulta..." maxLength={200} />
          <p className="text-xs text-muted-foreground">Descrição para SEO e metadados</p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
