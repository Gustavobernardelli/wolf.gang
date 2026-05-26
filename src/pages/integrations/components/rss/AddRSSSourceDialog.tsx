import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertTriangle, Info, X, ExternalLink, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { feedSourceSchema, type FeedSourceFormData } from '@/lib/validators/feedSourceSchema';
import { FEED_SOURCES_KEY } from '@/hooks/useFeedSources';
import { feedSourcesService } from '@/services/integrations/feedSources.service';
import type { FeedSource as DbFeedSource } from '@/types/feedSource';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Status = 'idle' | 'validating' | 'success' | 'blocked' | 'error' | 'timeout';

type SourceType = 'rss' | 'json' | 'html' | 'html_js' | 'bloqueado' | 'pendente';

type PreviewItem = {
  title: string | null;
  link: string | null;
  description: string | null;
  image_url: string | null;
  published_at: string | null;
};

type FeedSource = {
  id: string;
  name: string;
  portal: string;
  feed_url: string;
  category: string | null;
  priority: number;
  active: boolean;
  source_type: SourceType;
  parser_config: Record<string, unknown> | null;
  preview_items: PreviewItem[] | null;
  validation_diagnostics: {
    success: boolean;
    error: string | null;
    hint: string | null;
    items_found_total: number;
    strategies_tried: Array<{
      strategy: string;
      result: string;
      reason?: string;
      items_found?: number;
      discovered_feed_url?: string;
    }>;
    validated_at: string;
  } | null;
  last_error: string | null;
  language?: string;
};

const SOURCE_TYPE_BADGES: Record<SourceType, { label: string; class: string }> = {
  rss: { label: 'RSS', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  json: { label: 'JSON', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  html: { label: 'HTML', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  html_js: { label: 'HTML+JS', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  bloqueado: { label: 'Bloqueado', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  pendente: { label: 'Pendente', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceToEdit?: DbFeedSource | null;
}

function formatPublishedAt(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) {
      const dateFallback = new Date(dateStr);
      if (!isNaN(dateFallback.getTime())) {
        return formatDistanceToNow(dateFallback, { addSuffix: true, locale: ptBR });
      }
      return dateStr;
    }
    return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
  } catch (e) {
    return dateStr;
  }
}

function CollapsibleDiagnostics({ diagnostics }: { diagnostics: FeedSource['validation_diagnostics'] }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!diagnostics || !diagnostics.strategies_tried) return null;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-[11px] text-zinc-400 hover:bg-zinc-800/40 transition-colors"
      >
        <span className="font-medium">Ver detalhes técnicos do diagnóstico</span>
        <span className="text-zinc-500 text-[10px]">{isOpen ? 'Ocultar' : 'Mostrar'}</span>
      </button>
      {isOpen && (
        <div className="p-3 border-t border-zinc-800 space-y-2 text-[11px] max-h-40 overflow-y-auto divide-y divide-zinc-800/40">
          {diagnostics.strategies_tried.map((strat, i) => (
            <div key={i} className="pt-2 first:pt-0 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[9px]">
                  {strat.strategy}
                </span>
                <span className={`px-1 rounded text-[9px] font-bold ${
                  strat.result === 'success' || strat.result === 'found_link'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : strat.result === 'skip'
                    ? 'bg-zinc-500/10 text-zinc-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {strat.result}
                </span>
              </div>
              {strat.reason && <p className="text-zinc-500">Motivo: {strat.reason}</p>}
              {strat.items_found !== undefined && <p className="text-zinc-500">Itens: {strat.items_found}</p>}
              {strat.discovered_feed_url && <p className="text-indigo-400 break-all">Descoberto: {strat.discovered_feed_url}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function safeParseJson<T>(val: any): T | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}

const EMPTY_OPTIONS: any[] = [];

export function AddRSSSourceDialog({ open, onOpenChange, sourceToEdit = null }: Props) {
  const qc = useQueryClient();

  const [status, setStatus] = useState<Status>('idle');
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [diagnostics, setDiagnostics] = useState<FeedSource['validation_diagnostics']>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [itemsFoundTotal, setItemsFoundTotal] = useState<number>(0);
  const [validating, setValidating] = useState(false);

  const [showNewPortalInput, setShowNewPortalInput] = useState(false);
  const [newPortalName, setNewPortalName] = useState('');
  const [isAddingPortal, setIsAddingPortal] = useState(false);

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Fetch portals and categories options from Supabase
  const { data: options = EMPTY_OPTIONS, refetch: refetchOptions } = useQuery({
    queryKey: ['feed-source-options'],
    queryFn: feedSourcesService.listOptions,
  });

  const dbPortals = [...options.filter((o) => o.type === 'portal')];
  const dbCategories = [...options.filter((o) => o.type === 'category')];

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  if (sourceToEdit && sourceToEdit.portal && !isUuid(sourceToEdit.portal)) {
    const exists = dbPortals.some((p) => p.name === sourceToEdit.portal || p.id === sourceToEdit.portal);
    if (!exists) {
      dbPortals.push({
        id: sourceToEdit.portal,
        name: sourceToEdit.portal,
        type: 'portal',
        created_at: '',
      });
    }
  }

  if (sourceToEdit && sourceToEdit.category && !isUuid(sourceToEdit.category)) {
    const exists = dbCategories.some((c) => c.name === sourceToEdit.category || c.id === sourceToEdit.category);
    if (!exists) {
      dbCategories.push({
        id: sourceToEdit.category,
        name: sourceToEdit.category,
        type: 'category',
        created_at: '',
      });
    }
  }

  const handlePortalChange = (value: string) => {
    if (value === '__new_portal__') {
      setShowNewPortalInput(true);
      form.setValue('portal', '');
    } else {
      setShowNewPortalInput(false);
      form.setValue('portal', value);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new_category__') {
      setShowNewCategoryInput(true);
      form.setValue('category', '');
    } else if (value === '__none__') {
      setShowNewCategoryInput(false);
      form.setValue('category', null);
    } else {
      setShowNewCategoryInput(false);
      form.setValue('category', value);
    }
  };

  const handleAddNewPortal = async () => {
    if (!newPortalName.trim()) return;
    setIsAddingPortal(true);
    try {
      const newOpt = await feedSourcesService.createOption('portal', newPortalName.trim());
      toast.success(`Portal "${newOpt.name}" adicionado com sucesso!`);
      await refetchOptions();
      form.setValue('portal', newOpt.id);
      setNewPortalName('');
      setShowNewPortalInput(false);
    } catch (err: any) {
      toast.error('Erro ao adicionar portal: ' + (err.message || err));
    } finally {
      setIsAddingPortal(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const newOpt = await feedSourcesService.createOption('category', newCategoryName.trim());
      toast.success(`Categoria "${newOpt.name}" adicionada com sucesso!`);
      await refetchOptions();
      form.setValue('category', newOpt.id);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (err: any) {
      toast.error('Erro ao adicionar categoria: ' + (err.message || err));
    } finally {
      setIsAddingCategory(false);
    }
  };

  // Refs for cleanup safety in effects
  const statusRef = useRef<Status>('idle');
  const currentSourceIdRef = useRef<string | null>(null);
  const currentChannelRef = useRef<any>(null);
  const timeoutIdRef = useRef<any>(null);
  const pollingIntervalIdRef = useRef<any>(null);
  const pollingFallbackTimerRef = useRef<any>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    currentSourceIdRef.current = currentSourceId;
  }, [currentSourceId]);

  const lastOpenedSourceIdRef = useRef<string | null>(null);

  const form = useForm<FeedSourceFormData>({
    resolver: zodResolver(feedSourceSchema) as any,
    defaultValues: { name: '', portal: '', feed_url: '', category: null, language: 'pt-BR', active: false, priority: 5 } as any,
  });

  const isEditMode = !!sourceToEdit;
  const feedUrl = form.watch('feed_url');
  const hasUrlChanged = isEditMode && sourceToEdit ? feedUrl !== sourceToEdit.feed_url : false;
  const showDirectSave = isEditMode && !hasUrlChanged && status === 'idle';

  // Run once when dialog opens (or edit target changes) to initialize form values
  useEffect(() => {
    if (!open) {
      lastOpenedSourceIdRef.current = null;
      return;
    }

    const currentId = sourceToEdit?.id || 'new';
    if (lastOpenedSourceIdRef.current === currentId) {
      return; // Already initialized for this source
    }
    lastOpenedSourceIdRef.current = currentId;

    if (sourceToEdit) {
      const pId = options.find((o) => o.type === 'portal' && (o.name === sourceToEdit.portal || o.id === sourceToEdit.portal))?.id || sourceToEdit.portal;
      const cId = options.find((o) => o.type === 'category' && (o.name === sourceToEdit.category || o.id === sourceToEdit.category))?.id || sourceToEdit.category;

      form.reset({
        name: sourceToEdit.name,
        portal: pId,
        feed_url: sourceToEdit.feed_url,
        category: cId || null,
        priority: sourceToEdit.priority,
        active: sourceToEdit.active,
        language: sourceToEdit.language || 'pt-BR',
      });
      setShowNewPortalInput(false);
      setShowNewCategoryInput(false);
    } else {
      form.reset({
        name: '',
        portal: '',
        feed_url: '',
        category: null,
        priority: 5,
        active: false,
        language: 'pt-BR',
      });
      setShowNewPortalInput(false);
      setShowNewCategoryInput(false);
    }
  }, [open, sourceToEdit]);

  // In edit mode, when options load/change, resolve legacy names/IDs to database option UUIDs if not already resolved
  useEffect(() => {
    if (!open || !sourceToEdit || options.length === 0) return;

    const pId = options.find((o) => o.type === 'portal' && (o.name === sourceToEdit.portal || o.id === sourceToEdit.portal))?.id;
    const cId = options.find((o) => o.type === 'category' && (o.name === sourceToEdit.category || o.id === sourceToEdit.category))?.id;

    const currentValues = form.getValues();

    if (pId && currentValues.portal === sourceToEdit.portal) {
      form.setValue('portal', pId);
    }

    if (cId && currentValues.category === sourceToEdit.category) {
      form.setValue('category', cId);
    }
  }, [open, sourceToEdit, options]);

  // Watch URL changes to reset back to idle if modified
  const lastFeedUrlRef = useRef(feedUrl);
  useEffect(() => {
    if (feedUrl !== lastFeedUrlRef.current) {
      lastFeedUrlRef.current = feedUrl;
      if (statusRef.current !== 'idle') {
        handleSoftReset();
      }
    }
  }, [feedUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentChannelRef.current) {
        supabase.removeChannel(currentChannelRef.current);
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (pollingIntervalIdRef.current) {
        clearInterval(pollingIntervalIdRef.current);
      }
      if (pollingFallbackTimerRef.current) {
        clearTimeout(pollingFallbackTimerRef.current);
      }
      // If unmounted while validating or error, delete orphaned row
      if (currentSourceIdRef.current && (statusRef.current === 'validating' || statusRef.current === 'error')) {
        if (!sourceToEdit) {
          supabase.from('feed_sources').delete().eq('id', currentSourceIdRef.current).then();
        } else if (sourceToEdit) {
          supabase.from('feed_sources').update({ active: sourceToEdit.active }).eq('id', currentSourceIdRef.current).then();
        }
      }
    };
  }, [sourceToEdit]);

  async function handleSoftReset() {
    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (pollingIntervalIdRef.current) {
      clearInterval(pollingIntervalIdRef.current);
      pollingIntervalIdRef.current = null;
    }
    if (pollingFallbackTimerRef.current) {
      clearTimeout(pollingFallbackTimerRef.current);
      pollingFallbackTimerRef.current = null;
    }

    if (currentSourceIdRef.current && !isEditMode) {
      await supabase.from('feed_sources').delete().eq('id', currentSourceIdRef.current);
    }

    setStatus('idle');
    setCurrentSourceId(null);
    setPreviewItems([]);
    setSourceType(null);
    setDiagnostics(null);
    setErrorMessage(null);
    setHint(null);
    setItemsFoundTotal(0);
    setValidating(false);
    setShowNewPortalInput(false);
    setShowNewCategoryInput(false);
    setNewPortalName('');
    setNewCategoryName('');
  }

  async function handleValidar(formValues: FeedSourceFormData) {
    setValidating(true);
    setStatus('validating');
    setPreviewItems([]);
    setErrorMessage(null);
    setDiagnostics(null);
    setHint(null);

    let sourceId = currentSourceId;

    if (!isEditMode) {
      const { data: newSource, error: insertError } = await supabase
        .from('feed_sources')
        .insert({
          name: formValues.name,
          portal: formValues.portal,
          feed_url: formValues.feed_url.trim(),
          category: formValues.category || null,
          priority: formValues.priority ?? 5,
          active: false,
          source_type: 'pendente',
        })
        .select()
        .single();

      if (insertError || !newSource) {
        setStatus('error');
        setErrorMessage(insertError?.message ?? 'Falha ao criar fonte no banco');
        setValidating(false);
        return;
      }
      sourceId = newSource.id;
      setCurrentSourceId(newSource.id);
    } else if (sourceToEdit) {
      const { data: updatedSource, error: updateError } = await supabase
        .from('feed_sources')
        .update({
          name: formValues.name,
          portal: formValues.portal,
          feed_url: formValues.feed_url.trim(),
          category: formValues.category || null,
          priority: formValues.priority ?? 5,
          active: false,
          source_type: 'pendente',
        })
        .eq('id', sourceToEdit.id)
        .select()
        .single();

      if (updateError || !updatedSource) {
        setStatus('error');
        setErrorMessage(updateError?.message ?? 'Falha ao atualizar fonte para validação');
        setValidating(false);
        return;
      }
      sourceId = updatedSource.id;
      setCurrentSourceId(updatedSource.id);
    }

    if (sourceId) {
      subscribeToValidation(sourceId);
      startPollingFallbackTrigger(sourceId);
      startTimeoutWatcher(sourceId, 30000);
    }
  }

  function subscribeToValidation(sourceId: string) {
    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }

    const channel = supabase
      .channel(`validation_${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feed_sources',
          filter: `id=eq.${sourceId}`,
        },
        (payload: any) => {
          const updated = payload.new as FeedSource;
          handleValidationResult(updated);
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription failed:', status);
          startPollingFallback(sourceId);
        }
      });

    currentChannelRef.current = channel;
  }

  function startPollingFallbackTrigger(sourceId: string) {
    if (pollingFallbackTimerRef.current) clearTimeout(pollingFallbackTimerRef.current);
    pollingFallbackTimerRef.current = setTimeout(() => {
      if (statusRef.current === 'validating' && !pollingIntervalIdRef.current) {
        console.warn('Realtime event delayed, starting polling fallback...');
        startPollingFallback(sourceId);
      }
    }, 5000);
  }

  function startPollingFallback(sourceId: string) {
    if (pollingIntervalIdRef.current) clearInterval(pollingIntervalIdRef.current);

    pollingIntervalIdRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('feed_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (data && data.source_type !== 'pendente') {
        stopPollingFallback();
        handleValidationResult(data as FeedSource);
      }
    }, 2000);
  }

  function stopPollingFallback() {
    if (pollingIntervalIdRef.current) {
      clearInterval(pollingIntervalIdRef.current);
      pollingIntervalIdRef.current = null;
    }
  }

  function startTimeoutWatcher(sourceId: string, ms: number) {
    clearTimeoutWatcher();
    timeoutIdRef.current = setTimeout(async () => {
      // Final DB check
      const { data } = await supabase
        .from('feed_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (data && data.source_type !== 'pendente') {
        handleValidationResult(data as FeedSource);
      } else {
        setStatus('timeout');
        setValidating(false);
        if (currentChannelRef.current) {
          supabase.removeChannel(currentChannelRef.current);
          currentChannelRef.current = null;
        }
        stopPollingFallback();
        if (pollingFallbackTimerRef.current) {
          clearTimeout(pollingFallbackTimerRef.current);
          pollingFallbackTimerRef.current = null;
        }
      }
    }, ms);
  }

  function clearTimeoutWatcher() {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }

  function handleValidationResult(updated: FeedSource) {
    const parsedDiagnostics = safeParseJson<FeedSource['validation_diagnostics']>(updated.validation_diagnostics);
    const parsedPreviewItems = safeParseJson<PreviewItem[]>(updated.preview_items);

    // Avoid double-processing if validation already finished
    if (updated.source_type === 'pendente' && !parsedDiagnostics) {
      return; // Still validating
    }

    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }
    clearTimeoutWatcher();
    stopPollingFallback();
    if (pollingFallbackTimerRef.current) {
      clearTimeout(pollingFallbackTimerRef.current);
      pollingFallbackTimerRef.current = null;
    }
    setValidating(false);

    setItemsFoundTotal(parsedDiagnostics?.items_found_total ?? 0);

    switch (updated.source_type) {
      case 'rss':
      case 'json':
      case 'html':
      case 'html_js':
        setStatus('success');
        setPreviewItems(parsedPreviewItems ?? []);
        setSourceType(updated.source_type);
        setDiagnostics(parsedDiagnostics);
        break;

      case 'bloqueado':
        setStatus('blocked');
        setErrorMessage(updated.last_error ?? 'Site bloqueia coleta automática');
        setDiagnostics(parsedDiagnostics);
        break;

      case 'pendente':
        setStatus('error');
        setErrorMessage(updated.last_error ?? 'Não foi possível validar a fonte');
        setDiagnostics(parsedDiagnostics);
        if (parsedDiagnostics?.hint) {
          setHint(parsedDiagnostics.hint);
        }
        break;
    }
  }

  async function handleAprovar(sourceId: string) {
    const { error } = await supabase
      .from('feed_sources')
      .update({
        name: form.getValues('name'),
        portal: form.getValues('portal'),
        category: form.getValues('category') || null,
        priority: form.getValues('priority') ?? 5,
        feed_url: form.getValues('feed_url').trim(),
        active: true,
        preview_items: null, // Clear preview items to save space
      })
      .eq('id', sourceId);

    if (error) {
      toast.error('Falha ao aprovar: ' + error.message);
      return;
    }

    qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY });
    qc.invalidateQueries({ queryKey: ['feed-validation-latest-all'] });
    toast.success(isEditMode ? 'Fonte atualizada com sucesso!' : 'Fonte adicionada e ativada com sucesso!');
    closeAndReset();
  }

  async function handleSaveDirect() {
    if (!sourceToEdit) return;
    const isValid = await form.trigger(['name', 'portal', 'feed_url', 'priority']);
    if (!isValid) return;

    const values = form.getValues();
    const { error } = await supabase
      .from('feed_sources')
      .update({
        name: values.name,
        portal: values.portal,
        category: values.category || null,
        priority: values.priority ?? 5,
        feed_url: values.feed_url.trim(),
      })
      .eq('id', sourceToEdit.id);

    if (error) {
      toast.error('Falha ao atualizar fonte: ' + error.message);
      return;
    }

    qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY });
    qc.invalidateQueries({ queryKey: ['feed-validation-latest-all'] });
    toast.success('Fonte atualizada com sucesso!');
    closeAndReset();
  }

  async function handleCancelar(sourceId: string | null) {
    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }
    clearTimeoutWatcher();
    stopPollingFallback();
    if (pollingFallbackTimerRef.current) {
      clearTimeout(pollingFallbackTimerRef.current);
      pollingFallbackTimerRef.current = null;
    }

    if (sourceId && !isEditMode) {
      await supabase.from('feed_sources').delete().eq('id', sourceId);
    } else if (sourceId && isEditMode && sourceToEdit) {
      await supabase.from('feed_sources').update({ active: sourceToEdit.active }).eq('id', sourceId);
    }

    closeAndReset();
  }

  async function handleTentarNovamente(sourceId: string) {
    const values = form.getValues();
    await handleCancelar(sourceId);
    await handleValidar(values);
  }

  async function handleUseHintUrl(suggestedUrl: string) {
    const oldSourceId = currentSourceId;
    form.setValue('feed_url', suggestedUrl);
    lastFeedUrlRef.current = suggestedUrl;

    setStatus('validating');
    setPreviewItems([]);
    setErrorMessage(null);
    setDiagnostics(null);
    setHint(null);
    setValidating(true);

    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }
    clearTimeoutWatcher();
    stopPollingFallback();
    if (pollingFallbackTimerRef.current) {
      clearTimeout(pollingFallbackTimerRef.current);
      pollingFallbackTimerRef.current = null;
    }

    if (oldSourceId) {
      await supabase.from('feed_sources').delete().eq('id', oldSourceId);
    }

    const values = form.getValues();
    const { data: newSource, error: insertError } = await supabase
      .from('feed_sources')
      .insert({
        name: values.name,
        portal: values.portal,
        feed_url: suggestedUrl.trim(),
        category: values.category || null,
        priority: values.priority ?? 5,
        active: false,
        source_type: 'pendente',
      })
      .select()
      .single();

    if (insertError || !newSource) {
      setStatus('error');
      setErrorMessage(insertError?.message ?? 'Falha ao recriar fonte');
      setValidating(false);
      return;
    }

    setCurrentSourceId(newSource.id);
    subscribeToValidation(newSource.id);
    startPollingFallbackTrigger(newSource.id);
    startTimeoutWatcher(newSource.id, 30000);
  }

  function closeAndReset() {
    onOpenChange(false);
    form.reset();
    setStatus('idle');
    setCurrentSourceId(null);
    setPreviewItems([]);
    setSourceType(null);
    setDiagnostics(null);
    setErrorMessage(null);
    setHint(null);
    setItemsFoundTotal(0);
    setValidating(false);
    setShowNewPortalInput(false);
    setShowNewCategoryInput(false);
    setNewPortalName('');
    setNewCategoryName('');
  }

  const isUrlValid = feedUrl && /^https?:\/\//i.test(feedUrl.trim());

  const onValidarClick = async () => {
    const isValid = await form.trigger(['name', 'portal', 'feed_url', 'priority']);
    if (!isValid) return;
    const values = form.getValues();
    await handleValidar(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancelar(currentSourceId); }}>
      <DialogContent
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest('[role="listbox"]') || 
            target.closest('[data-radix-select-content]') ||
            target.closest('.bg-zinc-900')
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest('[role="listbox"]') || 
            target.closest('[data-radix-select-content]') ||
            target.closest('.bg-zinc-900')
          ) {
            e.preventDefault();
          }
        }}
        className={`transition-all duration-500 ease-in-out bg-[#0c1120] border-white/10 text-white overflow-hidden shadow-2xl ${
          status === 'success' ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold flex items-center justify-between">
            <span>{isEditMode ? 'Editar Fonte RSS' : 'Adicionar Fonte RSS'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className={`mt-2 transition-all duration-500 ${
          status === 'success' 
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start divide-y lg:divide-y-0 lg:divide-x divide-white/5' 
            : 'space-y-4'
        }`}>
          {/* Left Column / Form Section (Full width unless validated successfully) */}
          <div className={`space-y-4 ${status === 'success' ? 'pr-0 lg:pr-4' : ''}`}>
            <form onSubmit={form.handleSubmit(onValidarClick)} className="space-y-4">
              <div>
                <Label className="text-zinc-300 text-xs font-semibold">Nome amigável *</Label>
                <Input
                  {...form.register('name')}
                  placeholder="G1 – Economia"
                  className="mt-1 bg-zinc-950 border-white/10 text-white text-sm w-full"
                  disabled={status === 'validating'}
                />
                {form.formState.errors.name && (
                  <p className="text-rose-400 text-xs mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label className="text-zinc-300 text-xs font-semibold">Portal *</Label>
                <div className="space-y-2">
                  <Select
                    onValueChange={handlePortalChange}
                    value={form.watch('portal') || ''}
                    disabled={status === 'validating'}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-950 border-white/10 text-white text-sm w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {dbPortals.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-zinc-200 focus:bg-zinc-800">
                          {p.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new_portal__" className="text-violet-400 font-semibold focus:bg-zinc-800">
                        + Novo Portal...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {showNewPortalInput && (
                    <div className="flex gap-2 items-center mt-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Input
                        type="text"
                        placeholder="Digitar novo portal"
                        value={newPortalName}
                        onChange={(e) => setNewPortalName(e.target.value)}
                        className="bg-zinc-950 border-white/10 text-white text-sm flex-1"
                        disabled={isAddingPortal}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleAddNewPortal}
                        className="bg-violet-600 hover:bg-violet-700 text-white w-9 h-9 flex-shrink-0"
                        disabled={isAddingPortal || !newPortalName.trim()}
                      >
                        {isAddingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNewPortalInput(false)}
                        className="text-zinc-400 hover:text-white w-9 h-9"
                        disabled={isAddingPortal}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {form.formState.errors.portal && (
                  <p className="text-rose-400 text-xs mt-1">{form.formState.errors.portal.message}</p>
                )}
              </div>

              <div>
                <Label className="text-zinc-300 text-xs font-semibold">Categoria</Label>
                <div className="space-y-2">
                  <Select
                    onValueChange={handleCategoryChange}
                    value={form.watch('category') || '__none__'}
                    disabled={status === 'validating'}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-950 border-white/10 text-white text-sm w-full">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="__none__" className="text-zinc-400 focus:bg-zinc-800">
                        Nenhuma
                      </SelectItem>
                      {dbCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800">
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new_category__" className="text-violet-400 font-semibold focus:bg-zinc-800">
                        + Nova Categoria...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {showNewCategoryInput && (
                    <div className="flex gap-2 items-center mt-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Input
                        type="text"
                        placeholder="Digitar nova categoria"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="bg-zinc-950 border-white/10 text-white text-sm flex-1"
                        disabled={isAddingCategory}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleAddNewCategory}
                        className="bg-violet-600 hover:bg-violet-700 text-white w-9 h-9 flex-shrink-0"
                        disabled={isAddingCategory || !newCategoryName.trim()}
                      >
                        {isAddingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNewCategoryInput(false)}
                        className="text-zinc-400 hover:text-white w-9 h-9"
                        disabled={isAddingCategory}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-zinc-300 text-xs font-semibold">URL do Feed *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    {...form.register('feed_url')}
                    placeholder="https://g1.globo.com/rss/g1/economia/noticia.xml"
                    className="bg-zinc-950 border-white/10 text-white text-sm flex-1"
                    disabled={status === 'validating'}
                  />
                  {status === 'idle' && (
                    <Button
                      type="button"
                      onClick={onValidarClick}
                      disabled={!isUrlValid || validating}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs whitespace-nowrap shadow-md shadow-violet-600/20"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Validando...
                        </>
                      ) : (
                        'Validar'
                      )}
                    </Button>
                  )}
                </div>
                {form.formState.errors.feed_url && (
                  <p className="text-rose-400 text-xs mt-1">{form.formState.errors.feed_url.message}</p>
                )}
              </div>

              <div>
                <Label className="text-zinc-300 text-xs font-semibold">Prioridade (1–10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...form.register('priority', { valueAsNumber: true })}
                  className="mt-1 bg-zinc-950 border-white/10 text-white text-sm w-full"
                  disabled={status === 'validating'}
                />
              </div>
            </form>

            {/* Inline validation states when NOT successful (under the fields) */}
            {status !== 'idle' && status !== 'success' && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                {status === 'validating' && (
                  <div className="p-4 border border-white/5 rounded-xl bg-white/[0.01] flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    <span className="text-sm text-zinc-300">Validando fonte em segundo plano...</span>
                  </div>
                )}

                {status === 'blocked' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                      Site bloqueia coleta automática
                    </h3>
                    <Alert className="bg-rose-500/5 border-rose-500/20">
                      <AlertDescription className="text-rose-300 text-xs">
                        {errorMessage || 'O site bloqueou o acesso automático por captcha ou bloqueio de requisição.'}
                      </AlertDescription>
                    </Alert>
                    <CollapsibleDiagnostics diagnostics={diagnostics} />
                  </div>
                )}

                {status === 'error' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Não foi possível validar a fonte
                    </h3>
                    <Alert className="bg-amber-500/5 border-amber-500/20">
                      <AlertDescription className="text-amber-300 text-xs">
                        {errorMessage || 'Ocorreu um erro ao processar a URL do feed.'}
                      </AlertDescription>
                    </Alert>
                    {hint && (
                      <div className="p-3 border border-violet-500/20 bg-violet-500/5 rounded-xl space-y-2">
                        <p className="text-xs text-violet-300 font-medium flex items-center gap-1">
                          <span>💡 Sugestão:</span>
                          <span className="text-[11px] text-zinc-300 truncate block flex-1 font-mono">{hint}</span>
                        </p>
                        {hint.startsWith('http') && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUseHintUrl(hint)}
                            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7 w-full shadow-md"
                          >
                            Usar esta URL sugerida
                          </Button>
                        )}
                      </div>
                    )}
                    <CollapsibleDiagnostics diagnostics={diagnostics} />
                    {currentSourceId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleTentarNovamente(currentSourceId)}
                        className="w-full text-xs gap-1.5 border-white/10 hover:bg-white/5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                )}

                {status === 'timeout' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Validação demorou demais
                    </h3>
                    <Alert className="bg-amber-500/5 border-amber-500/20">
                      <AlertDescription className="text-amber-300 text-xs">
                        O servidor não respondeu dentro de 30 segundos. Pode ser instabilidade temporária ou o site está muito lento.
                      </AlertDescription>
                    </Alert>
                    {currentSourceId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleTentarNovamente(currentSourceId)}
                        className="w-full text-xs gap-1.5 border-white/10 hover:bg-white/5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-white/5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleCancelar(currentSourceId)}
                className="text-zinc-400 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>

              {showDirectSave && (
                <Button
                  type="button"
                  onClick={handleSaveDirect}
                  className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20"
                >
                  Salvar
                </Button>
              )}

              {status === 'success' && currentSourceId && (
                <Button
                  type="button"
                  onClick={() => handleAprovar(currentSourceId)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                >
                  {isEditMode ? 'Salvar Alterações' : 'Aprovar'}
                </Button>
              )}
            </DialogFooter>
          </div>

          {/* Right Column: Previews and Diagnostics (Visible ONLY on success state) */}
          {status === 'success' && (
            <div className="pt-6 lg:pt-0 lg:pl-6 space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-300 flex flex-col max-h-[440px] overflow-y-auto pr-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Tipo detectado:{' '}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${SOURCE_TYPE_BADGES[sourceType || 'rss']?.class}`}>
                        {SOURCE_TYPE_BADGES[sourceType || 'rss']?.label}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {itemsFoundTotal} itens disponíveis para coleta
                    </p>
                  </div>
                </div>

                <Alert className="bg-emerald-500/5 border-emerald-500/20">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <AlertDescription className="text-emerald-300/80 text-xs">
                    Os cards parecem corretos? Aprovar adiciona a fonte e ativa a coleta automática.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {previewItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 border border-white/5 rounded-xl bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                    >
                      <img
                        src={item.image_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%233f3f46">Sem Imagem</text></svg>'}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%233f3f46">Sem Imagem</text></svg>';
                        }}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-zinc-900 border border-white/5"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug">
                          {item.title || 'Sem título'}
                        </h4>
                        {item.description && (
                          <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-zinc-500 font-medium">
                            {formatPublishedAt(item.published_at)}
                          </span>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-violet-400 hover:text-violet-300 font-medium inline-flex items-center gap-0.5 transition-colors"
                            >
                              ver original
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
