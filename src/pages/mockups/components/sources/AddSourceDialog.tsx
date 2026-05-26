import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publicationSourceSchema } from '@/lib/validators/publicationSourceSchema';
import type { PublicationSourceFormValues } from '@/lib/validators/publicationSourceSchema';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEffect, useRef, useState } from 'react';
import slugify from 'slugify';
import { Upload, X, ExternalLink, Sparkles, Loader2, ImagePlus, Eye, EyeOff, Link2, Bold } from 'lucide-react';
import type { PublicationSource, TextLayout, TextElementLayout } from '@/types/publicationSource';
import { publicationSourcesService } from '@/services/mockups/publicationSources.service';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MockupCanvas, DEFAULT_LAYOUT, FONT_OPTIONS } from '../mockup-editor/MockupLayoutPreview';

export interface MockupUploads {
  [key: string]: { file: File; column: string; label: string; previewUrl: string };
}

const UPLOAD_FORMATS = [
  { id: 'insta_reels',   label: 'Instagram Reels',   dimensions: '1080×1920', column: 'mockup_instagram_reels'   },
  { id: 'insta_feed',    label: 'Instagram Feed',     dimensions: '1080×1350', column: 'mockup_instagram_feed'    },
  { id: 'insta_stories', label: 'Instagram Stories',  dimensions: '1080×1920', column: 'mockup_instagram_stories' },
  { id: 'fb_reels',      label: 'Facebook Reels',     dimensions: '1080×1920', column: 'mockup_facebook_reels'    },
  { id: 'fb_feed',       label: 'Facebook Feed',      dimensions: '1080×1350', column: 'mockup_facebook_feed'     },
  { id: 'fb_stories',    label: 'Facebook Stories',   dimensions: '1080×1920', column: 'mockup_facebook_stories'  },
  { id: 'blog',          label: 'Blog',               dimensions: 'Livre',     column: 'mockup_blog'              },
] as const;

type FormatId = typeof UPLOAD_FORMATS[number]['id'];

const FORMAT_META: Record<FormatId, { aspectRatio: string; previewMaxWidth: string }> = {
  insta_reels:   { aspectRatio: '9/16',  previewMaxWidth: '260px' },
  insta_feed:    { aspectRatio: '4/5',   previewMaxWidth: '300px' },
  insta_stories: { aspectRatio: '9/16',  previewMaxWidth: '260px' },
  fb_reels:      { aspectRatio: '9/16',  previewMaxWidth: '260px' },
  fb_feed:       { aspectRatio: '4/5',   previewMaxWidth: '300px' },
  fb_stories:    { aspectRatio: '9/16',  previewMaxWidth: '260px' },
  blog:          { aspectRatio: '16/9',  previewMaxWidth: '100%'  },
};

type ElementKey = 'title' | 'description';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PublicationSourceFormValues, files: MockupUploads, textLayout: any) => Promise<void>;
  isSaving: boolean;
  source?: PublicationSource | null;
}

export function AddSourceDialog({ open, onOpenChange, onSave, isSaving, source }: AddSourceDialogProps) {
  const isEditMode = !!source;
  const qc = useQueryClient();

  const form = useForm<PublicationSourceFormValues>({
    resolver: zodResolver(publicationSourceSchema),
    defaultValues: {
      name: '', slug: '', description: '', primary_color: '#3b82f6', is_active: true, ai_prompt: '', prompt: '',
    },
  });

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [tempPrompt, setTempPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // Estados de Conexão (Frontend demonstrativo)
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [tokenMeta, setTokenMeta] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyingMetaToken, setVerifyingMetaToken] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [isMetaValidated, setIsMetaValidated] = useState(false);
  const [metaValidationMsg, setMetaValidationMsg] = useState<string | null>(null);

  const handleConcluido = async () => {
    console.log('Clicou em Concluído. Estado atual:', { tokenMeta, instagramId, webhookUrl });
    if (isEditMode && source?.id) {
      setSavingConnection(true);
      try {
        const bodyToSend = {
          action: 'save_connection',
          channel_id: source.id,
          token_meta: tokenMeta.trim() || null,
          instagram_id: instagramId.trim() || null,
          webhook: webhookUrl.trim() || null,
        };
        console.log('Enviando para verify-channel-connection:', bodyToSend);
        const { data, error } = await supabase.functions.invoke('verify-channel-connection', {
          body: bodyToSend
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'Erro ao salvar conexões via Edge Function.');
        toast.success(data.message || 'Conexões salvas com sucesso!');
        console.log('Resposta do verify-channel-connection:', data);
        // Atualiza a query do React Query para refletir na interface do canal
        qc.invalidateQueries({ queryKey: ['publication-sources'] });
        setIsConnectOpen(false);
      } catch (err: any) {
        console.error('Erro ao salvar conexões:', err);
        toast.error(err.message || 'Falha ao salvar conexões.');
      } finally {
        setSavingConnection(false);
      }
    } else {
      setIsConnectOpen(false);
    }
  };

  const handleVerifyMetaToken = async () => {
    if (!tokenMeta.trim()) {
      toast.error('Preencha o Token Meta para verificar.');
      return;
    }
    setVerifyingMetaToken(true);
    setIsMetaValidated(false);
    setMetaValidationMsg(null);
    setInstagramId('');
    try {
      console.log('Validando Token Meta...');
      // Passo 1: Validar o token de acesso da Meta
      const { data: valData, error: valError } = await supabase.functions.invoke('valided-token', {
        body: { token: tokenMeta.trim(), platform: 'meta_validate' }
      });
      if (valError) throw valError;
      if (!valData?.ok) throw new Error(valData?.error || 'Erro ao validar Token Meta.');

      const accountName = valData.data?.name || 'Conta Meta';
      const successMsg = `Conta ativa: ${accountName}`;
      setMetaValidationMsg(successMsg);
      toast.success(`Token Meta validado! Perfil: ${accountName}`);
      console.log('Passo 1 concluído. Perfil:', accountName);

      // Passo 2: Buscar o ID da conta do Instagram
      console.log('Buscando ID do Instagram...');
      const { data: instaData, error: instaError } = await supabase.functions.invoke('valided-token', {
        body: { token: tokenMeta.trim(), platform: 'meta_instagram_id' }
      });
      if (instaError) throw instaError;
      console.log('Resposta de meta_instagram_id:', instaData);
      if (!instaData?.ok) throw new Error(instaData?.error || 'Erro ao buscar ID do Instagram.');

      const instaAccounts = instaData.data?.data;
      console.log('instaAccounts extraído:', instaAccounts);
      if (Array.isArray(instaAccounts) && instaAccounts.length > 0) {
        const firstId = instaAccounts[0].id;
        console.log('ID do Instagram encontrado:', firstId);
        setInstagramId(firstId);
        setIsMetaValidated(true);
      } else {
        throw new Error('Nenhuma conta do Instagram vinculada a esta conta Meta.');
      }
    } catch (err: any) {
      console.error('Erro na validação do Token Meta:', err);
      toast.error(err.message || 'Falha ao verificar Token Meta.');
      setIsMetaValidated(false);
      setMetaValidationMsg(null);
      setInstagramId('');
    } finally {
      setVerifyingMetaToken(false);
    }
  };

  const handleVerifyWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Preencha a URL do Webhook para verificar.');
      return;
    }
    setVerifyingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-channel-connection', {
        body: { action: 'verify_webhook', webhook: webhookUrl.trim() }
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erro ao verificar webhook.');
      toast.success(data.message || 'Webhook respondeu com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao verificar Webhook.');
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const [layouts, setLayouts] = useState<Record<string, TextLayout>>({});
  const [selectedFmt, setSelectedFmt] = useState<FormatId>('insta_reels');
  const [uploads, setUploads] = useState<MockupUploads>({});

  const [bgUrl, setBgUrl] = useState<string>('/hero.png');
  const bgObjUrl = useRef<string | null>(null);

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (bgObjUrl.current) URL.revokeObjectURL(bgObjUrl.current);
    const url = URL.createObjectURL(file);
    bgObjUrl.current = url;
    setBgUrl(url);
    e.target.value = '';
  };

  useEffect(() => {
    if (open && source) {
      const activePrompt = source.prompt ?? source.ai_prompt ?? '';
      form.reset({
        name: source.name, slug: source.slug, description: source.description ?? '',
        primary_color: source.primary_color ?? '#3b82f6', is_active: source.is_active,
        ai_prompt: activePrompt, prompt: activePrompt,
      });

      const baseLayout: any = source.text_layout || {};
      const isKeyed = UPLOAD_FORMATS.some(f => baseLayout[f.column]);
      const nextLayouts: Record<string, TextLayout> = {};

      UPLOAD_FORMATS.forEach(f => {
        if (isKeyed) {
          nextLayouts[f.column] = baseLayout[f.column] ?? DEFAULT_LAYOUT;
        } else if (baseLayout.title) {
          nextLayouts[f.column] = baseLayout;
        } else {
          nextLayouts[f.column] = DEFAULT_LAYOUT;
        }
      });

      setLayouts(nextLayouts);
      setUploads({});
      const loadedTokenMeta = source.token_meta ?? '';
      setTokenMeta(loadedTokenMeta);
      const loadedInstaId = source.instagram_id ?? '';
      setInstagramId(loadedInstaId);
      setIsMetaValidated(!!loadedTokenMeta && !!loadedInstaId);
      setMetaValidationMsg(null);
      setWebhookUrl(source.webhook ?? source.webhook_url ?? '');
    } else if (!open) {
      form.reset({ name: '', slug: '', description: '', primary_color: '#3b82f6', is_active: true, ai_prompt: '', prompt: '' });
      const nextLayouts: Record<string, TextLayout> = {};
      UPLOAD_FORMATS.forEach(f => { nextLayouts[f.column] = DEFAULT_LAYOUT; });
      setLayouts(nextLayouts);
      setUploads({});
      setTokenMeta('');
      setInstagramId('');
      setIsMetaValidated(false);
      setMetaValidationMsg(null);
      setWebhookUrl('');
      if (bgObjUrl.current) { URL.revokeObjectURL(bgObjUrl.current); bgObjUrl.current = null; setBgUrl('/hero.png'); }
    }
  }, [open, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = form.watch('name');
  useEffect(() => {
    if (!isEditMode && name && !form.getFieldState('slug').isDirty) {
      form.setValue('slug', slugify(name, { lower: true, strict: true }));
    }
  }, [name, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (id: string, column: string, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setUploads(prev => {
        if (prev[id]?.previewUrl) URL.revokeObjectURL(prev[id].previewUrl);
        return { ...prev, [id]: { file, column, label, previewUrl } };
      });
    }
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setUploads(prev => {
      if (prev[id]?.previewUrl) URL.revokeObjectURL(prev[id].previewUrl);
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const currentFmt = UPLOAD_FORMATS.find(f => f.id === selectedFmt)!;
  const currentMeta = FORMAT_META[selectedFmt];
  const activeLayout = layouts[currentFmt.column] ?? DEFAULT_LAYOUT;

  const updateLayout = (key: ElementKey, patch: Partial<TextElementLayout>) => {
    setLayouts(prev => {
      const current = prev[currentFmt.column] ?? DEFAULT_LAYOUT;
      return {
        ...prev,
        [currentFmt.column]: {
          ...current,
          [key]: { ...current[key], ...patch },
        },
      };
    });
  };

  const activeMockupUrl: string | null =
    uploads[selectedFmt]?.previewUrl ??
    (isEditMode && source ? (source as any)[currentFmt.column] as string | null : null) ??
    null;

  const onSubmit = async (values: PublicationSourceFormValues) => {
    console.log('Submetendo formulário principal do canal. Valores do form:', values);
    const finalValues = {
      ...values,
      prompt: values.prompt ?? values.ai_prompt ?? null,
      ai_prompt: values.prompt ?? values.ai_prompt ?? null,
      token_meta: tokenMeta.trim() || null,
      instagram_id: instagramId.trim() || null,
      webhook: webhookUrl.trim() || null,
    };
    console.log('Valores finais enviados para onSave:', finalValues);
    await onSave(finalValues, uploads, layouts);
    form.reset();
    setUploads({});
  };

  const handleConfirmPrompt = async () => {
    const finalVal = tempPrompt.trim() || null;
    if (isEditMode && source?.id) {
      setIsSavingPrompt(true);
      try {
        await publicationSourcesService.update(source.id, { prompt: finalVal, ai_prompt: finalVal });
        form.setValue('prompt', finalVal, { shouldDirty: true });
        form.setValue('ai_prompt', finalVal, { shouldDirty: true });
        qc.invalidateQueries({ queryKey: ['publication-sources'] });
        toast.success('Instruções de I.A salvas com sucesso no canal!');
        setIsPromptOpen(false);
      } catch (err: any) {
        toast.error(`Erro ao salvar instruções: ${err.message}`);
      } finally {
        setIsSavingPrompt(false);
      }
    } else {
      form.setValue('prompt', finalVal, { shouldDirty: true });
      form.setValue('ai_prompt', finalVal, { shouldDirty: true });
      setIsPromptOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setUploads({}); }}>
      <DialogContent className="sm:max-w-[1440px] w-full max-h-[96vh] flex flex-col p-0 bg-[#0c1120] border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/5 bg-[#080b14] flex-shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-white">
              {isEditMode ? `Editar Canal — ${source!.name}` : 'Novo Canal'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {isEditMode
                ? 'Atualize as informações e as páginas de template deste canal.'
                : 'Crie um novo canal de publicação com suas páginas de template.'}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsConnectOpen(true)}
            className="gap-2 bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 transition-colors"
          >
            <Link2 className="w-4 h-4 text-violet-400" />
            Conectar
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">

              {/* ── Col 1: Dados ── */}
              <div className="p-6 border-r border-white/5 space-y-4 overflow-y-auto">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Nome do Canal</FormLabel>
                    <FormControl><Input className="bg-zinc-900 border-white/10 text-white" placeholder="Ex: Cura Política" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Slug (identificador único)</FormLabel>
                    <FormControl>
                      <Input
                        className={`bg-zinc-900 border-white/10 ${isEditMode ? 'text-white/40 cursor-not-allowed' : 'text-white'}`}
                        placeholder="Ex: cura-politica" {...field} disabled={isEditMode}
                      />
                    </FormControl>
                    <FormDescription className="text-white/40">
                      {isEditMode ? 'O slug não pode ser alterado após a criação.' : 'Usado em caminhos de arquivo e URLs.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição do canal..." className="resize-none bg-zinc-900 border-white/10 text-white h-20" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="primary_color" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Cor Primária</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input type="color" className="p-1 w-12 h-10 bg-zinc-900 border-white/10" {...field} value={field.value || '#3b82f6'} />
                      </FormControl>
                      <Input {...field} value={field.value || '#3b82f6'} className="font-mono bg-zinc-900 border-white/10 text-white" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/5 bg-zinc-900/50 p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white/90">Canal Ativo</FormLabel>
                      <FormDescription className="text-white/40">Determina se este canal pode ser usado em automações.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

                <div>
                  <Button
                    type="button" variant="outline"
                    className="w-full bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 flex items-center justify-center gap-2 py-5 relative overflow-hidden group"
                    onClick={() => { setTempPrompt(form.getValues('prompt') || form.getValues('ai_prompt') || ''); setIsPromptOpen(true); }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-xs">Prompt I.A Customizado</span>
                    {(form.watch('prompt') || form.watch('ai_prompt')) && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ml-auto animate-pulse shadow-[0_0_8px_#10b981]" />
                    )}
                  </Button>
                  <p className="text-[10px] text-white/40 mt-1.5 text-center">
                    Instruções exclusivas para guiar a adaptação das notícias para este canal.
                  </p>
                </div>
              </div>

              {/* ── Col 2: Controles + Upload ── */}
              <div className="p-5 border-r border-white/5 space-y-4 overflow-y-auto bg-white/[0.01]">

                {/* Destination dropdown */}
                <div>
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Destino</p>
                  <select
                    value={selectedFmt}
                    onChange={e => setSelectedFmt(e.target.value as FormatId)}
                    className="w-full bg-zinc-900 border border-white/10 text-white text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  >
                    {UPLOAD_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Upload for selected format */}
                <div>
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Mockup</p>
                  {(() => {
                    const existingUrl = isEditMode && source ? (source as any)[currentFmt.column] as string | null : null;
                    const hasNew = !!uploads[selectedFmt];
                    const thumbUrl = uploads[selectedFmt]?.previewUrl ?? existingUrl;
                    return (
                      <div className="rounded-lg border border-white/5 bg-zinc-900/40 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2">
                          <p className="text-[11px] text-white/50">{currentFmt.dimensions} · PNG transparente</p>
                          {hasNew ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(selectedFmt)}
                              className="h-6 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px]">
                              <X className="w-3 h-3 mr-1" /> Remover
                            </Button>
                          ) : (
                            <label className="flex items-center h-6 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer text-[11px] font-medium text-white/70 transition-colors">
                              <Upload className="w-3 h-3 mr-1" />
                              {existingUrl ? 'Substituir' : 'Upload'}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                onChange={(e) => handleFileChange(selectedFmt, currentFmt.column, currentFmt.label, e)} />
                            </label>
                          )}
                        </div>
                        {thumbUrl && (
                          <div className="relative mx-2 mb-2 rounded overflow-hidden bg-black/30" style={{ height: '60px' }}>
                            <img src={thumbUrl} alt={currentFmt.label} className="w-full h-full object-contain" />
                            {hasNew && <span className="absolute top-1 right-1 bg-emerald-500/90 text-white text-[9px] font-semibold px-1 py-0.5 rounded">NOVO</span>}
                            {!hasNew && existingUrl && (
                              <a href={existingUrl} target="_blank" rel="noopener noreferrer"
                                className="absolute top-1 right-1 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white/70 text-[9px] px-1 py-0.5 rounded"
                                onClick={e => e.stopPropagation()}>
                                <ExternalLink className="w-2.5 h-2.5" /> Abrir
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Text element controls */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Texto</p>
                  {(['title', 'description'] as ElementKey[]).map(key => {
                    const el = activeLayout[key];
                    return (
                      <div key={key} className="rounded-lg border border-white/5 bg-zinc-900/60 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-white/80">
                            {key === 'title' ? 'Título' : 'Subtítulo'}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateLayout(key, { visible: !el.visible })}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              el.visible
                                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                : 'border-white/10 text-white/30 bg-white/5'
                            }`}
                          >
                            {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {el.visible ? 'Visível' : 'Oculto'}
                          </button>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={el.fontFamily}
                            onChange={e => updateLayout(key, { fontFamily: e.target.value })}
                            className="flex-1 bg-zinc-800 border border-white/10 text-white text-[11px] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500 min-w-0"
                            style={{ fontFamily: el.fontFamily }}
                          >
                            {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => updateLayout(key, { bold: !el.bold })}
                            className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${
                              el.bold
                                ? 'bg-violet-600/35 border-violet-500 text-violet-300 font-bold'
                                : 'bg-zinc-800 border-white/10 text-white/70 hover:text-white'
                            }`}
                            title="Negrito"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button type="button" onClick={() => updateLayout(key, { fontSize: Math.max(8, el.fontSize - 1) })}
                              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 border border-white/10 text-white/70 hover:text-white text-sm">−</button>
                            <span className="w-7 text-center text-[11px] text-white/80">{el.fontSize}</span>
                            <button type="button" onClick={() => updateLayout(key, { fontSize: Math.min(80, el.fontSize + 1) })}
                              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 border border-white/10 text-white/70 hover:text-white text-sm">+</button>
                          </div>
                        </div>
                        
                        {/* Controles de Cor e Preenchimento */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-white/50">Cor do Texto</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={el.color || '#ffffff'}
                                onChange={e => updateLayout(key, { color: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                              />
                              <input
                                type="text"
                                value={el.color || '#ffffff'}
                                onChange={e => updateLayout(key, { color: e.target.value })}
                                className="w-14 bg-zinc-850 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-white/50">Preenchimento</span>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={el.bgEnabled || false}
                                onCheckedChange={checked => updateLayout(key, { bgEnabled: checked })}
                                className="scale-75 origin-right"
                              />
                              {el.bgEnabled && (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={el.bgColor || '#000000'}
                                    onChange={e => updateLayout(key, { bgColor: e.target.value })}
                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={el.bgColor || '#000000'}
                                    onChange={e => updateLayout(key, { bgColor: e.target.value })}
                                    className="w-14 bg-zinc-850 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-[9px] text-white/25">
                          pos {el.x.toFixed(1)}%, {el.y.toFixed(1)}% · largura {(el.width ?? 88).toFixed(0)}% — arraste no preview
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Col 3: Prévia Visual ── */}
              <div className="flex flex-col bg-[#060912]">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                  <div>
                    <p className="text-xs font-semibold text-white">Prévia</p>
                    <p className="text-[10px] text-white/35">Arraste o texto para reposicionar.</p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-zinc-900 border border-white/10 text-white/50 hover:text-white text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors">
                    <ImagePlus className="w-3 h-3" />
                    Fundo
                    <input type="file" accept="image/*" className="hidden" onChange={handleBgChange} />
                  </label>
                </div>

                <div className="flex-1 flex items-center justify-center p-5 overflow-hidden">
                  <MockupCanvas
                    backgroundUrl={bgUrl}
                    mockupUrl={activeMockupUrl}
                    value={activeLayout}
                    onChange={(newLay) => {
                      setLayouts(prev => ({
                        ...prev,
                        [currentFmt.column]: newLay,
                      }));
                    }}
                    aspectRatio={currentMeta.aspectRatio}
                    maxWidth={currentMeta.previewMaxWidth}
                  />
                </div>
              </div>

            </div>

            <DialogFooter className="px-6 py-4 border-t border-white/5 bg-[#080b14] flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={isSaving} className="bg-violet-600 hover:bg-violet-500 text-white">
                {isSaving ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Canal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Prompt I.A dialog */}
      <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#0c1120] border-white/10 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>Prompt I.A do Canal</span>
            </DialogTitle>
            <DialogDescription className="text-white/50 text-xs">
              Configure as instruções personalizadas de reescrita que a inteligência artificial utilizará para gerar e formatar os conteúdos deste canal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea value={tempPrompt} onChange={e => setTempPrompt(e.target.value)}
              placeholder="Ex: Reescreva a notícia em tom enérgico e informal para redes sociais..."
              className="h-64 bg-zinc-900 border-white/10 text-white resize-none text-sm p-3 leading-relaxed placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsPromptOpen(false)} className="text-white/60 hover:text-white" disabled={isSavingPrompt}>Cancelar</Button>
            <Button type="button" size="sm" onClick={handleConfirmPrompt} disabled={isSavingPrompt} className="bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2">
              {isSavingPrompt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSavingPrompt ? 'Salvando...' : 'Confirmar Instruções'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conectar dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] bg-[#0c1120] border-white/10 p-6 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Link2 className="w-4 h-4 text-violet-400" />
              <span>Conectar Destinos e Webhooks</span>
            </DialogTitle>
            <DialogDescription className="text-white/50 text-xs">
              Configure as credenciais e destinos de notificação ou publicação externa para este canal. A integração de backend será configurada posteriormente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-white/70 font-medium">Token Meta</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={tokenMeta}
                  onChange={e => {
                    setTokenMeta(e.target.value);
                    setIsMetaValidated(false);
                    setMetaValidationMsg(null);
                    setInstagramId('');
                  }}
                  placeholder="EAA..."
                  className="bg-zinc-900 border-white/10 text-white flex-1 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleVerifyMetaToken}
                  disabled={verifyingMetaToken}
                  className={
                    isMetaValidated
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white font-medium border-emerald-600/20 text-xs px-3 min-w-[80px]"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs px-3 min-w-[80px]"
                  }
                >
                  {verifyingMetaToken ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isMetaValidated ? (
                    'Validado'
                  ) : (
                    'Verificar'
                  )}
                </Button>
              </div>
              {metaValidationMsg && (
                <div className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 flex flex-col gap-1 transition-all mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{metaValidationMsg}</span>
                  </div>
                  {instagramId && (
                    <div className="text-[11px] text-white/75 mt-0.5">
                      ID Instagram: <span className="font-mono text-emerald-300 font-semibold">{instagramId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/70 font-medium">Webhook</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://sua-api.com/webhook"
                  className="bg-zinc-900 border-white/10 text-white flex-1 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleVerifyWebhook}
                  disabled={verifyingWebhook}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs px-3"
                >
                  {verifyingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verificar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-white/5">
            <Button
              type="button"
              size="sm"
              onClick={handleConcluido}
              disabled={savingConnection}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 flex items-center gap-1.5"
            >
              {savingConnection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {savingConnection ? 'Salvando...' : 'Concluído'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
