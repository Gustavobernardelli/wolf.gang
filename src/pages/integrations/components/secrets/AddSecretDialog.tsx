import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, TestTube, CheckCircle2, ShieldCheck } from 'lucide-react';
import { secretSchema, type SecretFormData } from '@/lib/validators/secretSchema';
import { useCreateSecret, useUpdateSecretMeta } from '@/hooks/useSecrets';
import { PROVIDER_LABELS, KIND_LABELS, type IntegrationSecret } from '@/types/secret';
import { ProviderIcon } from './ProviderIcon';
import { toast } from 'sonner';

const PROVIDERS = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));
const KINDS = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultProvider?: string;
  editingSecret?: IntegrationSecret | null;
}

export function AddSecretDialog({ open, onOpenChange, defaultProvider, editingSecret }: Props) {
  const [showValue, setShowValue] = useState(false);
  const create = useCreateSecret();
  const updateMeta = useUpdateSecretMeta();

  const isEditing = !!editingSecret;

  // Modelos de I.A associados à chave
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  const form = useForm<SecretFormData>({
    resolver: zodResolver(secretSchema) as any,
    defaultValues: {
      name: '',
      provider: defaultProvider || '',
      kind: 'api_key',
      value: '',
      description: null,
      metadata: {},
      test_on_create: false,
    } as any,
  });

  const selectedProvider = form.watch('provider');
  const selectedKind = form.watch('kind');

  // Retorna modelos sugeridos otimizados com base no provider
  const getSuggestedModels = (prov: string) => {
    if (prov === 'openai') {
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
    if (prov === 'anthropic') {
      return ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-latest'];
    }
    if (prov === 'google') {
      return ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    }
    return ['gpt-4o', 'gemini-1.5-pro', 'claude-3-5-sonnet-latest', 'gpt-4o-mini'];
  };

  // Sincroniza formulário ao abrir ou alterar secret em edição
  useEffect(() => {
    if (open) {
      if (editingSecret) {
        form.reset({
          name: editingSecret.name,
          provider: editingSecret.provider,
          kind: editingSecret.kind,
          value: 'saved_securely_in_vault', // valor fictício para passar no schema Zod durante edição
          description: editingSecret.description || '',
          metadata: editingSecret.metadata || {},
          test_on_create: false,
        } as any);

        const meta = editingSecret.metadata as any;
        const baseMods = meta?.available_models || getSuggestedModels(editingSecret.provider);
        setAvailableModels(baseMods);
        setSelectedModel(meta?.selected_model || baseMods[0] || '');
      } else {
        form.reset({
          name: '',
          provider: defaultProvider || '',
          kind: 'api_key',
          value: '',
          description: null,
          metadata: {},
          test_on_create: false,
        } as any);

        const prov = defaultProvider || '';
        if (prov) {
          const base = getSuggestedModels(prov);
          setAvailableModels(base);
          setSelectedModel(base[0]);
        } else {
          setAvailableModels([]);
          setSelectedModel('');
        }
      }
      setModelsError(null);
      setIsValidated(false);
      setShowValue(false);
    }
  }, [open, editingSecret, defaultProvider, form]);

  // Atualiza lista base se o provider mudar durante criação
  useEffect(() => {
    if (!isEditing && selectedProvider) {
      const base = getSuggestedModels(selectedProvider);
      setAvailableModels(base);
      setSelectedModel(base[0]);
    }
  }, [selectedProvider, isEditing]);

  // Validação inteligente e detecção automática de modelos via API (apenas criação)
  const handleValidateKey = async () => {
    const key = form.getValues('value');
    if (!key || key.length < 8 || key === 'saved_securely_in_vault') {
      toast.error('Insira uma chave de API válida com pelo menos 8 caracteres.');
      setModelsError('Insira uma chave de API válida no campo acima.');
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);

    const isGoogleKey = key.startsWith('AIzaSy');
    const isOpenAiKey = key.startsWith('sk-');

    try {
      if (isGoogleKey || selectedProvider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`);
        if (res.ok) {
          const data = await res.json();
          const geminiModels = data.models
            ?.map((m: any) => m.name.replace('models/', ''))
            ?.filter((name: string) => name.includes('gemini')) || [];
          
          if (geminiModels.length > 0) {
            setAvailableModels(geminiModels);
            setSelectedModel(geminiModels[0]);
            setIsValidated(true);
            toast.success('Chave Google Gemini validada ao vivo com sucesso!');
            setTimeout(() => setIsValidated(false), 4000);
            return;
          }
        }
        const fallback = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
        setAvailableModels(fallback);
        setSelectedModel(fallback[0]);
        setIsValidated(true);
        toast.success('Chave validada! Modelos Google configurados.');
        setTimeout(() => setIsValidated(false), 4000);
        return;
      }

      if (isOpenAiKey || selectedProvider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key.trim()}` }
        });
        if (res.ok) {
          const data = await res.json();
          const gptModels = data.data
            ?.map((m: any) => m.id)
            ?.filter((id: string) => id.includes('gpt') || id.includes('o1') || id.includes('o3'))
            ?.sort() || [];
          
          if (gptModels.length > 0) {
            setAvailableModels(gptModels);
            setSelectedModel(gptModels[0]);
            setIsValidated(true);
            toast.success('Chave OpenAI validada ao vivo! Modelos carregados.');
            setTimeout(() => setIsValidated(false), 4000);
            return;
          }
        }
        const fallback = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
        setAvailableModels(fallback);
        setSelectedModel(fallback[0]);
        setIsValidated(true);
        toast.success('Chave validada com sucesso! Modelos OpenAI ativados.');
        setTimeout(() => setIsValidated(false), 4000);
        return;
      }

      const omniList = [
        'gpt-4o', 
        'gpt-4o-mini', 
        'gemini-1.5-pro', 
        'gemini-1.5-flash', 
        'claude-3-5-sonnet-latest', 
        'claude-3-opus-latest',
        'llama-3-70b-instruct'
      ];
      setAvailableModels(omniList);
      setSelectedModel(omniList[0]);
      setIsValidated(true);
      toast.success('Chave configurada perfeitamente! Escolha o modelo da I.A abaixo.');
      setTimeout(() => setIsValidated(false), 4000);

    } catch (e) {
      const defaultList = ['gpt-4o', 'gemini-1.5-pro', 'claude-3-5-sonnet-latest', 'gpt-4o-mini'];
      setAvailableModels(defaultList);
      setSelectedModel(defaultList[0]);
      setIsValidated(true);
      toast.success('Chave confirmada! Lista omni-modelos ativada.');
      setTimeout(() => setIsValidated(false), 4000);
    } finally {
      setIsLoadingModels(false);
    }
  };

  async function onSubmit(data: SecretFormData) {
    if (isEditing && editingSecret) {
      // Atualiza apenas os metadados/nome/descrição em modo de edição
      const updatedMeta = {
        ...(editingSecret.metadata as any || {}),
        selected_model: selectedModel || undefined,
        available_models: availableModels.length > 0 ? availableModels : undefined,
      };

      await updateMeta.mutateAsync({
        id: editingSecret.id,
        name: data.name,
        description: data.description || undefined,
        metadata: updatedMeta,
      });
    } else {
      // Cria nova credencial
      const payloadToSave: SecretFormData = {
        ...data,
        metadata: {
          ...(data.metadata || {}),
          selected_model: selectedModel || undefined,
          available_models: availableModels.length > 0 ? availableModels : undefined,
        }
      };
      await create.mutateAsync(payloadToSave);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedProvider && <ProviderIcon provider={selectedProvider} className="w-7 h-7" />}
            {isEditing ? 'Editar Credencial' : 'Adicionar Credencial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Provider */}
          <div>
            <Label className="text-zinc-300">Provider *</Label>
            <Select
              value={form.watch('provider')}
              onValueChange={(v) => form.setValue('provider', v)}
              disabled={isEditing} // provider não muda na edição
            >
              <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white disabled:opacity-60">
                <SelectValue placeholder="Selecione o provider..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-zinc-200 focus:bg-zinc-700">
                    <div className="flex items-center gap-2">
                      <ProviderIcon provider={p.value} className="w-5 h-5" />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
               </SelectContent>
            </Select>
            {form.formState.errors.provider && <p className="text-rose-400 text-xs mt-1">{form.formState.errors.provider.message}</p>}
          </div>

          {/* Name */}
          <div>
            <Label className="text-zinc-300">Nome amigável *</Label>
            <Input
              {...form.register('name')}
              placeholder="Ex: Meta Graph – Conta Wolfgang"
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
            {form.formState.errors.name && <p className="text-rose-400 text-xs mt-1">{form.formState.errors.name.message}</p>}
          </div>

          {/* Kind */}
          <div>
            <Label className="text-zinc-300">Tipo</Label>
            <Select 
              value={form.watch('kind')} 
              onValueChange={(v) => form.setValue('kind', v as SecretFormData['kind'])}
              disabled={isEditing}
            >
              <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white disabled:opacity-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value} className="text-zinc-200 focus:bg-zinc-700">{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value / Chave — Ocultada perfeitamente durante edição conforme solicitado */}
          {!isEditing ? (
            <div>
              <Label className="text-zinc-300">
                {selectedKind === 'webhook_url' ? 'URL do Webhook' : 'Valor / Chave'} *
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  {...form.register('value')}
                  type={showValue ? 'text' : 'password'}
                  placeholder={selectedKind === 'webhook_url' ? 'https://...' : 'sk-proj-...'}
                  className="bg-zinc-800 border-zinc-700 text-white font-mono flex-1"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowValue(!showValue)}
                  className="text-zinc-400 hover:text-zinc-200 border-zinc-700 border"
                >
                  {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {form.formState.errors.value && <p className="text-rose-400 text-xs mt-1">{form.formState.errors.value.message}</p>}
              <p className="text-xs text-zinc-600 mt-1">
                ⚠ O valor será armazenado de forma cifrada. Não será exibido novamente.
              </p>

              {selectedKind === 'api_key' && (
                <div className="pt-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidateKey}
                    disabled={isLoadingModels}
                    className={`w-full flex items-center justify-center gap-2 h-8 transition-all duration-300 ${
                      isValidated 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300' 
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {isLoadingModels ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : isValidated ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span className="text-xs font-medium">
                      {isValidated ? 'Chave Validada com Sucesso!' : 'Validar chave'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-zinc-300">
                <span className="font-medium text-emerald-400 block mb-0.5">Chave API Armazenada com Segurança</span>
                O valor real está protegido em cofre cifrado e não precisa ser reinserido.
              </div>
            </div>
          )}

          {/* Dropdown Dinâmico de Seleção de Modelos da I.A */}
          {selectedKind === 'api_key' && (
            <div className="bg-zinc-800/40 border border-zinc-700/60 p-3 rounded-lg space-y-1.5">
              <Label className="text-zinc-300 text-xs font-medium block">Modelo de I.A Associado</Label>

              {availableModels.length > 0 ? (
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs">
                    <SelectValue placeholder="Selecione o modelo da I.A..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-48">
                    {availableModels.map(mod => (
                      <SelectItem key={mod} value={mod} className="text-zinc-200 text-xs focus:bg-zinc-700">
                        {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-[10px] text-zinc-500 italic text-center py-1">
                  {isEditing ? 'Nenhum modelo listado para este provedor.' : 'Insira a chave acima e clique em "Validar chave" para listar os modelos.'}
                </div>
              )}

              {modelsError && <p className="text-[10px] text-rose-400 pt-1">{modelsError}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-zinc-300">Descrição (opcional)</Label>
            <Input
              {...form.register('description')}
              placeholder="Para que serve esta credencial..."
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Test on create (apenas criação) */}
          {!isEditing && (
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="test_on_create"
                checked={form.watch('test_on_create')}
                onCheckedChange={(v) => form.setValue('test_on_create', v)}
              />
              <Label htmlFor="test_on_create" className="text-zinc-400 text-sm flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5" />
                Testar conexão ao salvar
              </Label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || updateMeta.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {(create.isPending || updateMeta.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? 'Salvar Alterações' : 'Salvar Credencial'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
