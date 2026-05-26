import { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Image as ImageIcon, Upload, Crop, Loader2, Save, X, CalendarClock, Eye, EyeOff, Download, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePublicationSources } from '@/hooks/usePublicationSources';
import { generateWithAI } from '@/services/ai/aiGeneration.service';
import { toast } from 'sonner';
import type { NewsItem } from '@/types/newsItem';

interface Edition {
  id: string;
  news_item_id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  portal: string;
  status: string;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  channel_id: string;
  channel_name: string;
  destination_column: string;
  destination_label: string;
  status: 'pendente' | 'agendado' | 'postado' | 'erro' | 'cancelado';
  title: string | null;
  subtitle: string | null;
  subtitle_visible: boolean | null;
  description: string | null;
  image_url: string | null;
  crop_settings: { scale: number; offsetX: number; offsetY: number } | null;
  media_url_post: string | null;
  publish_at: string | null;
}

interface Props {
  edition: Edition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOCKUP_COLUMNS = [
  { column: 'mockup_instagram_reels',   label: 'Instagram Reels' },
  { column: 'mockup_instagram_feed',    label: 'Instagram Feed' },
  { column: 'mockup_instagram_stories', label: 'Instagram Stories' },
  { column: 'mockup_facebook_reels',    label: 'Facebook Reels' },
  { column: 'mockup_facebook_feed',     label: 'Facebook Feed' },
  { column: 'mockup_facebook_stories',  label: 'Facebook Stories' },
  { column: 'mockup_blog',              label: 'Blog' },
] as const;

function getFormatAspect(column: string) {
  if (!column) return { aspectClass: 'aspect-[4/5]', styleAspect: 4 / 5, label: 'Padrão (4:5)', maxWidth: '240px' };
  if (column.includes('reels') || column.includes('stories'))
    return { aspectClass: 'aspect-[9/16]', styleAspect: 9 / 16, label: '9:16 (Reels/Stories)', maxWidth: '170px' };
  if (column.includes('feed'))
    return { aspectClass: 'aspect-[4/5]', styleAspect: 4 / 5, label: '4:5 (Feed)', maxWidth: '240px' };
  return { aspectClass: 'aspect-[16/9]', styleAspect: 16 / 9, label: '16:9 (Blog)', maxWidth: '320px' };
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  agendado: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  postado:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  erro:     'bg-rose-500/15 text-rose-400 border-rose-500/25',
  cancelado: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

export function EditionModal({ edition, open, onOpenChange }: Props) {
  const [originalNews, setOriginalNews] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { sources, updateSource } = usePublicationSources();
  const channels = sources || [];

  // Form state
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedPageColumn, setSelectedPageColumn] = useState<string>('');

  const currentChannel = channels.find(c => c.id === selectedChannelId);
  const channelTextLayout = currentChannel?.text_layout ?? null;
  const activeTextLayout = channelTextLayout?.[selectedPageColumn]?.title
    ? channelTextLayout[selectedPageColumn]
    : (channelTextLayout?.title ? channelTextLayout : null);

  const availablePages = currentChannel
    ? MOCKUP_COLUMNS.filter(m => !!(currentChannel as any)[m.column]).map(m => ({
        id: m.column,
        label: m.label,
        url: (currentChannel as any)[m.column] as string,
      }))
    : [];

  const selectedPageObj = availablePages.find(p => p.id === selectedPageColumn);
  const fmt = getFormatAspect(selectedPageColumn);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSubtitle, setEditedSubtitle] = useState('');
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingSubtitle, setIsGeneratingSubtitle] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Save state
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [savedPosts, setSavedPosts] = useState<ScheduledPost[]>([]);

  // Preview ref for download
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Crop state
  const [cropSettings, setCropSettings] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [tempCrop, setTempCrop] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageAspect, setImageAspect] = useState<number>(1);

  // Text dragging state & refs
  const [localTextLayout, setLocalTextLayout] = useState<any>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const textDragging = useRef<{
    key: 'title' | 'description';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const localLayoutRef = useRef<any>(null);

  useEffect(() => {
    if (editedImage) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setImageAspect(img.naturalWidth / img.naturalHeight);
        }
      };
      img.src = editedImage;
    } else {
      setImageAspect(1);
    }
  }, [editedImage]);

  // Load and inject all active fonts on mount so they are available in canvas rendering
  useEffect(() => {
    async function loadAndInjectFonts() {
      try {
        const { data, error } = await supabase
          .from('available_fonts')
          .select('*')
          .eq('active', true);
        if (error) throw error;
        
        data?.forEach((font) => {
          if (font.css_url) {
            const linkId = `font-${font.family.replace(/\s+/g, '-').toLowerCase()}`;
            if (!document.getElementById(linkId)) {
              const link = document.createElement('link');
              link.id = linkId;
              link.rel = 'stylesheet';
              link.href = font.css_url;
              document.head.appendChild(link);
            }
          }
        });
      } catch (err) {
        console.error('Failed to load fonts in EditionModal:', err);
      }
    }
    loadAndInjectFonts();
  }, []);

  // Synchronize localTextLayout with activeTextLayout or use default layout
  useEffect(() => {
    if (activeTextLayout) {
      setLocalTextLayout(activeTextLayout);
    } else if (selectedChannelId && selectedPageColumn) {
      setLocalTextLayout({
        title: { x: 5, y: 68, width: 88, fontFamily: 'Inter', fontSize: 22, visible: true },
        description: { x: 5, y: 82, width: 88, fontFamily: 'Inter', fontSize: 12, visible: true }
      });
    } else {
      setLocalTextLayout(null);
    }
  }, [activeTextLayout, selectedChannelId, selectedPageColumn]);

  const saveTextLayoutToChannel = useCallback(async (latestLayout: any) => {
    if (currentChannel && selectedPageColumn && latestLayout) {
      const currentLayout = { ...(currentChannel.text_layout || {}) };
      currentLayout[selectedPageColumn] = latestLayout;

      try {
        await updateSource({
          id: currentChannel.id,
          payload: {
            text_layout: currentLayout,
          },
        });
      } catch (err: any) {
        console.error('Failed to update text layout:', err);
      }
    }
  }, [currentChannel, selectedPageColumn, updateSource]);

  // Keep localLayoutRef updated with current localTextLayout value
  useEffect(() => {
    localLayoutRef.current = localTextLayout;
  }, [localTextLayout]);

  // Handle mouse down on title/subtitle overlay text box
  const handleTextMouseDown = useCallback((key: 'title' | 'description', e: React.MouseEvent) => {
    if (!localLayoutRef.current) return;
    const el = localLayoutRef.current[key];
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    textDragging.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
    setIsDraggingText(true);
  }, []);

  // Window mousemove and mouseup listeners for text drag-and-drop
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const d = textDragging.current;
      if (!d || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;

      setLocalTextLayout((prev: any) => {
        if (!prev) return prev;
        const key = d.key;
        const el = prev[key];
        if (!el) return prev;

        return {
          ...prev,
          [key]: {
            ...el,
            x: Math.max(0, Math.min(95, d.origX + dx)),
            y: Math.max(0, Math.min(98, d.origY + dy)),
          },
        };
      });
    };

    const handleWindowMouseUp = async () => {
      const d = textDragging.current;
      if (d) {
        textDragging.current = null;
        setIsDraggingText(false);

        // Save updated text layout to channel configuration in Supabase
        if (currentChannel && selectedPageColumn) {
          const latestLayout = localLayoutRef.current;
          if (latestLayout) {
            const currentLayout = { ...(currentChannel.text_layout || {}) };
            currentLayout[selectedPageColumn] = latestLayout;

            try {
              await updateSource({
                id: currentChannel.id,
                payload: {
                  text_layout: currentLayout,
                },
              });
            } catch (err: any) {
              console.error('Failed to update text layout:', err);
              toast.error(`Erro ao salvar posição do texto: ${err.message}`);
            }
          }
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [currentChannel, selectedPageColumn, updateSource]);

  // Schedule state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleTimes, setScheduleTimes] = useState<Record<string, string>>({});
  const [isScheduling, setIsScheduling] = useState(false);



  const fetchSavedPosts = useCallback(async (editionId: string) => {
    const { data } = await supabase
      .from('scheduled_posts')
      .select('id, channel_id, channel_name, destination_column, destination_label, status, title, subtitle, subtitle_visible, description, image_url, crop_settings, media_url_post, publish_at')
      .eq('edition_id', editionId)
      .order('created_at', { ascending: true });
    setSavedPosts((data as ScheduledPost[]) ?? []);
  }, []);

  useEffect(() => {
    if (edition && open) {
      fetchOriginalNews(edition.news_item_id);
      fetchSavedPosts(edition.id);
    } else {
      setOriginalNews(null);
      setSelectedChannelId('');
      setSelectedPageColumn('');
      setEditedTitle('');
      setEditedSubtitle('');
      setSubtitleVisible(true);
      setEditedDescription('');
      setEditedImage(null);
      setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 });
      setIsDragging(false);
      setSavedPosts([]);
    }
  }, [edition, open, fetchSavedPosts]);

  async function fetchOriginalNews(newsItemId: string) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_items')
        .select('*')
        .eq('id', newsItemId)
        .single();
      if (error) throw error;
      setOriginalNews(data);

      // Pre-fill with AI-generated values from the edition when available
      setEditedTitle(edition?.title || data.title || '');
      setEditedSubtitle(edition?.subtitle || '');
      setEditedDescription(
        edition?.description ||
        (data.description ? data.description.replace(/<[^>]*>/g, '').trim() : '')
      );
      setEditedImage(data.image_url || null);
      setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 });
    } catch (error) {
      console.error('Error fetching original news:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSavePost = async (): Promise<boolean> => {
    if (!edition || !selectedChannelId || !selectedPageColumn || !currentChannel) {
      toast.error('Selecione um canal e um destino antes de salvar.');
      return false;
    }
    const destinationLabel = availablePages.find(p => p.id === selectedPageColumn)?.label ?? selectedPageColumn;

    setIsSavingPost(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-scheduled-post', {
        body: {
          edition_id: edition.id,
          news_item_id: edition.news_item_id,
          channel_id: selectedChannelId,
          channel_name: currentChannel.name,
          destination_column: selectedPageColumn,
          destination_label: destinationLabel,
          title: editedTitle,
          subtitle: editedSubtitle,
          subtitle_visible: subtitleVisible,
          description: editedDescription,
          image_url: editedImage,
          crop_settings: cropSettings,
          status: 'pendente',
        }
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erro desconhecido na Edge Function.');

      // Resolve the post_id from the edge function response or by querying the DB
      let postId: string | undefined = data?.post_id ?? data?.id;
      if (!postId) {
        const { data: row } = await supabase
          .from('scheduled_posts')
          .select('id')
          .eq('edition_id', edition.id)
          .eq('channel_id', selectedChannelId)
          .eq('destination_column', selectedPageColumn)
          .single();
        postId = row?.id;
      }

      // Render the canvas and upload the final image synchronously so
      // media_url_post is already saved before fetchSavedPosts runs
      if (postId) {
        try {
          const dataUrl = await renderPreviewCanvas();
          if (dataUrl) {
            await supabase.functions.invoke('render-post-image', {
              body: { post_id: postId, image_data: dataUrl },
            });
          }
        } catch (e) {
          console.warn('[render-post-image]', e);
        }
      }

      toast.success(`Salvo: ${currentChannel.name} → ${destinationLabel}`);
      await fetchSavedPosts(edition.id);
      return true;
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
      return false;
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleRemoveSavedPost = async (postId: string) => {
    await supabase.from('scheduled_posts').delete().eq('id', postId);
    setSavedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleLoadPost = (post: ScheduledPost) => {
    setSelectedChannelId(post.channel_id);
    setSelectedPageColumn(post.destination_column);
    if (post.title !== null) setEditedTitle(post.title ?? '');
    if (post.subtitle !== null) setEditedSubtitle(post.subtitle ?? '');
    setSubtitleVisible(post.subtitle_visible ?? true);
    if (post.description !== null) setEditedDescription(post.description ?? '');
    if (post.image_url !== null) setEditedImage(post.image_url);
    if (post.crop_settings) setCropSettings(post.crop_settings);
  };

  const channelPrompt = (currentChannel as any)?.prompt || (currentChannel as any)?.ai_prompt || '';

  const handleGenerateTitle = async () => {
    if (!originalNews) {
      toast.error('Notícia original não carregada.');
      return;
    }
    setIsGeneratingTitle(true);
    try {
      const result = await generateWithAI({
        channelPrompt,
        originalTitle: originalNews.title || '',
        originalDescription: originalNews.description?.replace(/<[^>]*>/g, '').trim() || '',
        target: 'title',
      });
      if (result) setEditedTitle(result);
      toast.success('Título gerado com sucesso!');
    } catch (err: any) {
      console.error('[AI Generate Title]', err);
      toast.error(`Erro ao gerar título: ${err.message}`);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !edition) return;
    e.target.value = '';

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `imagens/${edition.id}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('Midia')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('Midia').getPublicUrl(path);
      setEditedImage(publicUrl);
      setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 });
      toast.success('Imagem enviada com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao enviar imagem: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSubtitle = async () => {
    if (!originalNews) { toast.error('Notícia original não carregada.'); return; }
    setIsGeneratingSubtitle(true);
    try {
      const result = await generateWithAI({
        channelPrompt,
        originalTitle: originalNews.title || '',
        originalDescription: originalNews.description?.replace(/<[^>]*>/g, '').trim() || '',
        target: 'subtitle',
      });
      if (result) setEditedSubtitle(result);
      toast.success('Subtítulo gerado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao gerar subtítulo: ${err.message}`);
    } finally {
      setIsGeneratingSubtitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!originalNews) {
      toast.error('Notícia original não carregada.');
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const platform = selectedPageColumn.toLowerCase().includes('instagram')
        ? 'instagram'
        : selectedPageColumn.toLowerCase().includes('facebook')
        ? 'facebook'
        : 'blog';

      const result = await generateWithAI({
        channelPrompt,
        originalTitle: originalNews.title || '',
        originalDescription: originalNews.description?.replace(/<[^>]*>/g, '').trim() || '',
        target: 'description',
        platform,
      });
      if (result) setEditedDescription(result);
      toast.success('Descrição gerada com sucesso!');
    } catch (err: any) {
      console.error('[AI Generate Description]', err);
      toast.error(`Erro ao gerar descrição: ${err.message}`);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!originalNews) {
      toast.error('Notícia original não carregada.');
      return;
    }
    setIsGeneratingAll(true);
    try {
      const platform = selectedPageColumn
        ? (selectedPageColumn.toLowerCase().includes('instagram')
          ? 'instagram'
          : selectedPageColumn.toLowerCase().includes('facebook')
          ? 'facebook'
          : 'blog')
        : 'blog';

      const originalTitle = originalNews.title || '';
      const originalDescription = originalNews.description?.replace(/<[^>]*>/g, '').trim() || '';

      const [titleRes, subtitleRes, descRes] = await Promise.all([
        generateWithAI({
          channelPrompt,
          originalTitle,
          originalDescription,
          target: 'title',
        }).catch(err => {
          console.error('[AI Generate Title Error]', err);
          return null;
        }),
        generateWithAI({
          channelPrompt,
          originalTitle,
          originalDescription,
          target: 'subtitle',
        }).catch(err => {
          console.error('[AI Generate Subtitle Error]', err);
          return null;
        }),
        generateWithAI({
          channelPrompt,
          originalTitle,
          originalDescription,
          target: 'description',
          platform,
        }).catch(err => {
          console.error('[AI Generate Description Error]', err);
          return null;
        }),
      ]);

      if (titleRes) setEditedTitle(titleRes);
      if (subtitleRes) setEditedSubtitle(subtitleRes);
      if (descRes) setEditedDescription(descRes);

      toast.success('Conteúdo completo gerado com IA!');
    } catch (err: any) {
      console.error('[AI Generate All Error]', err);
      toast.error(`Erro ao gerar conteúdo: ${err.message}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const renderPreviewCanvas = useCallback(async (): Promise<string | null> => {
    if (!previewRef.current || !editedImage) return null;
    const { width, height } = previewRef.current.getBoundingClientRect();
    if (!width || !height) return null;

    const SCALE = 2;
    const W = Math.round(width  * SCALE);
    const H = Math.round(height * SCALE);

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const SUPABASE_URL = 'https://atkstqfnwdbwhplukkiq.supabase.co';
    const PROXY = `${SUPABASE_URL}/functions/v1/proxy-image?url=`;

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = reject;
        img.src = src.startsWith(SUPABASE_URL) ? src : `${PROXY}${encodeURIComponent(src)}`;
      });

    const bg = await loadImg(editedImage).catch(() => null);
    if (bg) {
      const s  = cropSettings.scale;
      const ox = cropSettings.offsetX / 100;
      const oy = cropSettings.offsetY / 100;
      const imgR = bg.naturalWidth / bg.naturalHeight;
      const boxR = W / H;
      let drawW: number, drawH: number;
      if (imgR > boxR) { drawH = H; drawW = H * imgR; }
      else              { drawW = W; drawH = W / imgR; }
      const dW = drawW * s;
      const dH = drawH * s;
      ctx.drawImage(bg, (W - dW) / 2 + s * ox * W, (H - dH) / 2 + s * oy * H, dW, dH);
    }

    if (selectedPageObj?.url) {
      const mockup = await loadImg(selectedPageObj.url).catch(() => null);
      if (mockup) ctx.drawImage(mockup, 0, 0, W, H);
    }

    await document.fonts.ready;
    if (localTextLayout?.title) {
      const drawText = (text: string, lay: typeof localTextLayout.title) => {
        if (!lay) return;
        ctx.save();
        const fontSize = lay.fontSize * SCALE;
        ctx.font          = `${lay.bold ? 'bold ' : ''}${fontSize}px "${lay.fontFamily}", sans-serif`;
        
        const x    = (lay.x / 100) * W + 4 * SCALE;
        const maxW = ((lay.width ?? 88) / 100) * W - 8 * SCALE;
        const lineH = lay.fontSize * 1.25 * SCALE;
        let y = (lay.y / 100) * H + lay.fontSize * SCALE;
        
        const lines: string[] = [];
        let line = '';
        for (const word of text.split(' ')) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
          } else { line = test; }
        }
        if (line) lines.push(line);

        if (lay.bgEnabled) {
          ctx.save();
          ctx.fillStyle = lay.bgColor || '#000000';
          const paddingX = 8 * SCALE;
          const paddingY = 4 * SCALE;
          
          let maxLineWidth = 0;
          lines.forEach(l => {
            const w = ctx.measureText(l).width;
            if (w > maxLineWidth) maxLineWidth = w;
          });
          
          const rectW = maxLineWidth + paddingX * 2;
          const rectH = lines.length * lineH + paddingY * 2;
          const rectX = x - paddingX;
          const rectY = ((lay.y / 100) * H) - paddingY;
          
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rectX, rectY, rectW, rectH, 4 * SCALE);
          } else {
            ctx.rect(rectX, rectY, rectW, rectH);
          }
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle     = lay.color || '#ffffff';
        if (!lay.bgEnabled) {
          ctx.shadowColor   = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur    = 6 * SCALE;
          ctx.shadowOffsetY = SCALE;
        } else {
          ctx.shadowColor   = 'transparent';
          ctx.shadowBlur    = 0;
          ctx.shadowOffsetY = 0;
        }

        let currentY = y;
        lines.forEach(l => {
          ctx.fillText(l, x, currentY);
          currentY += lineH;
        });
        
        ctx.restore();
      };
      if (localTextLayout.title?.visible && editedTitle)
        drawText(editedTitle, localTextLayout.title);
      if (localTextLayout.description?.visible && subtitleVisible && editedSubtitle)
        drawText(editedSubtitle, localTextLayout.description);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  }, [editedImage, cropSettings, selectedPageObj, localTextLayout, editedTitle, subtitleVisible, editedSubtitle]);

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const maxFrameDim = 216;
    let frameW: number, frameH: number;
    if (fmt.styleAspect >= 1) {
      frameW = maxFrameDim;
      frameH = maxFrameDim / fmt.styleAspect;
    } else {
      frameH = maxFrameDim;
      frameW = maxFrameDim * fmt.styleAspect;
    }

    const sensitivityX = 100 / (frameW * tempCrop.scale);
    const sensitivityY = 100 / (frameH * tempCrop.scale);

    setTempCrop(prev => ({
      ...prev,
      offsetX: Math.max(-300, Math.min(300, prev.offsetX + dx * sensitivityX)),
      offsetY: Math.max(-300, Math.min(300, prev.offsetY + dy * sensitivityY)),
    }));
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleApplyCrop = () => { setCropSettings(tempCrop); setIsCropOpen(false); };

  // Convert a UTC timestamptz string to "YYYY-MM-DDTHH:MM" in São Paulo time (UTC-3)
  const toSPLocal = (utcStr: string) => {
    const d = new Date(utcStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset() - 180); // subtract 3h to get SP
    return d.toISOString().slice(0, 16);
  };

  const handleOpenSchedule = () => {
    const defaults: Record<string, string> = {};
    savedPosts.forEach(p => {
      if (p.publish_at) {
        defaults[p.id] = toSPLocal(p.publish_at);
      } else {
        // Default: tomorrow at 09:00 SP
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        // Express as SP offset string
        const iso = d.toISOString().slice(0, 16);
        defaults[p.id] = iso;
      }
    });
    setScheduleTimes(defaults);
    setIsScheduleOpen(true);
  };

  const handleSchedule = async () => {
    const entries = Object.entries(scheduleTimes).filter(([, dt]) => !!dt);
    if (entries.length === 0) {
      toast.error('Defina ao menos um horário para agendar.');
      return;
    }
    setIsScheduling(true);
    try {
      await Promise.all(
        entries.map(([id, dt]) =>
          supabase
            .from('scheduled_posts')
            .update({ publish_at: `${dt}:00-03:00`, status: 'agendado' })
            .eq('id', id)
        )
      );
      toast.success(`${entries.length} postagem(ns) agendada(s) com sucesso!`);
      setIsScheduleOpen(false);
      if (edition) await fetchSavedPosts(edition.id);
    } catch (err: any) {
      toast.error(`Erro ao agendar: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDownload = async () => {
    if (!editedImage) return;
    setIsDownloading(true);
    try {
      const dataUrl = await renderPreviewCanvas();
      if (!dataUrl) throw new Error('Não foi possível gerar a imagem.');
      const link = document.createElement('a');
      link.download = `${(selectedPageObj?.label ?? 'preview').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[Download]', err);
      toast.error('Erro ao gerar o download da imagem.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if current channel+destination is already saved
  const currentPostSaved = savedPosts.find(
    p => p.channel_id === selectedChannelId && p.destination_column === selectedPageColumn
  );

  const imgR = imageAspect || 1;
  const boxR = fmt.styleAspect || 1;
  let drawWPercent = '100%';
  let drawHPercent = '100%';
  let imgLeftPercent = '0%';
  let imgTopPercent = '0%';

  if (imgR > boxR) {
    drawWPercent = `${(imgR / boxR) * 100}%`;
    imgLeftPercent = `${(1 - imgR / boxR) * 50}%`;
  } else {
    drawHPercent = `${(boxR / imgR) * 100}%`;
    imgTopPercent = `${(1 - boxR / imgR) * 50}%`;
  }

  if (!edition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] flex flex-col bg-[#0c1120] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/5 flex-shrink-0 bg-[#080b14]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-white">Editar Postagem</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 bg-zinc-900 border-white/10 text-white/70 hover:bg-zinc-800 hover:text-white hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                disabled={isGeneratingAll || !originalNews}
                onClick={handleGenerateAll}
                title="Gerar Título, Subtítulo e Descrição com IA"
              >
                {isGeneratingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400/10" />
                )}
              </Button>
              <Button
                className="gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold shadow-lg shadow-orange-500/20"
                disabled={savedPosts.length === 0}
                onClick={handleOpenSchedule}
              >
                <CalendarClock className="w-4 h-4" />
                Agendar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr] overflow-hidden">

          {/* Column 1: Original Data */}
          <div className="p-6 border-r border-white/5 flex flex-col overflow-hidden space-y-6">
            {isLoading ? (
              <div className="text-white/40 text-sm">Carregando dados da notícia...</div>
            ) : originalNews ? (
              <div className="space-y-4 flex flex-col flex-1 min-h-0">
                {originalNews.image_url && (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0">
                    <img src={originalNews.image_url} alt="Original" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-shrink-0">
                  <p className="text-xs text-white/40 mb-1">Título</p>
                  <p className="text-sm text-white font-medium">{originalNews.title}</p>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-xs text-white/40 mb-1 flex-shrink-0">Descrição</p>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <p className="text-sm text-white/70 whitespace-pre-wrap">
                      {originalNews.description ? originalNews.description.replace(/<[^>]*>/g, '').trim() : 'Sem descrição'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={originalNews.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-white/60 hover:text-white transition-colors cursor-pointer"
                    title="Abrir matéria original"
                  >
                    {originalNews.portal}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-white/40 text-sm">Falha ao carregar a notícia.</div>
            )}
          </div>

          {/* Column 2: Editing Form */}
          <div className="p-6 border-r border-white/5 flex flex-col overflow-hidden space-y-5 bg-white/[0.01]">

            {/* Canal, Destino e Mídia */}
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/70">Canal, Destino e Mídia</label>
              </div>
              <div className="flex items-center gap-2">
                {/* Upload & Crop Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-zinc-900 border-white/10 text-white/70 hover:bg-zinc-800 hover:text-white"
                    disabled={isUploading}
                    onClick={() => uploadInputRef.current?.click()}
                    title="Fazer Upload"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadImage}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-zinc-900 border-white/10 text-white/70 hover:bg-zinc-800 hover:text-white"
                    onClick={() => { setTempCrop(cropSettings); setIsCropOpen(true); }}
                    disabled={!editedImage}
                    title="Redimensionar"
                  >
                    <Crop className="w-4 h-4" />
                  </Button>
                </div>

                {/* Canal Selector */}
                <div className="flex-1 min-w-[120px]">
                  <Select value={selectedChannelId} onValueChange={(val) => { setSelectedChannelId(val); setSelectedPageColumn(''); }}>
                    <SelectTrigger className="h-10 bg-zinc-900 border-white/10 text-white">
                      <SelectValue placeholder="Canal..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {channels.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-white/70">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destino Selector */}
                <div className="flex-1 min-w-[120px]">
                  <Select value={selectedPageColumn} onValueChange={setSelectedPageColumn} disabled={!selectedChannelId}>
                    <SelectTrigger className="h-10 bg-zinc-900 border-white/10 text-white">
                      <SelectValue placeholder="Destino..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {availablePages.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white/70">{p.label}</SelectItem>
                      ))}
                      {availablePages.length === 0 && selectedChannelId && (
                        <div className="p-2 text-xs text-white/40 text-center">Nenhum destino configurado</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/70">Título</label>
                <Button variant="ghost" size="sm" onClick={handleGenerateTitle} disabled={isGeneratingTitle || !originalNews} className="h-6 px-2 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">
                  {isGeneratingTitle ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {isGeneratingTitle ? 'Gerando...' : 'Gerar novo título'}
                </Button>
              </div>
              <Input value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className="bg-zinc-900 border-white/10 text-white" />
              
              {/* Controles de Estilo do Título */}
              {localTextLayout?.title && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 p-2 rounded-lg bg-zinc-900/40 border border-white/5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Cor:</span>
                    <input
                      type="color"
                      value={localTextLayout.title.color || '#ffffff'}
                      onChange={e => {
                        const newColor = e.target.value;
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            title: { ...prev.title, color: newColor }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={localTextLayout.title.color || '#ffffff'}
                      onChange={e => {
                        const newColor = e.target.value;
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            title: { ...prev.title, color: newColor }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="w-14 bg-zinc-800 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Fundo:</span>
                    <Switch
                      checked={localTextLayout.title.bgEnabled || false}
                      onCheckedChange={checked => {
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            title: { ...prev.title, bgEnabled: checked }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="scale-75 origin-left"
                    />
                    {localTextLayout.title.bgEnabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={localTextLayout.title.bgColor || '#000000'}
                          onChange={e => {
                            const newBgColor = e.target.value;
                            setLocalTextLayout((prev: any) => {
                              const updated = {
                                ...prev,
                                title: { ...prev.title, bgColor: newBgColor }
                              };
                              saveTextLayoutToChannel(updated);
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={localTextLayout.title.bgColor || '#000000'}
                          onChange={e => {
                            const newBgColor = e.target.value;
                            setLocalTextLayout((prev: any) => {
                              const updated = {
                                ...prev,
                                title: { ...prev.title, bgColor: newBgColor }
                              };
                              saveTextLayoutToChannel(updated);
                              return updated;
                            });
                          }}
                          className="w-14 bg-zinc-800 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {channelPrompt && selectedChannelId && (
                <p className="text-[10px] text-violet-400/60">✦ Usando prompt do canal: {currentChannel?.name}</p>
              )}
            </div>

            {/* Subtítulo */}
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-white/70">Subtítulo</label>
                  <button
                    type="button"
                    onClick={() => setSubtitleVisible(v => !v)}
                    className={`p-0.5 rounded transition-colors ${subtitleVisible ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/30 hover:text-white/50'}`}
                    title={subtitleVisible ? 'Ocultar subtítulo' : 'Mostrar subtítulo'}
                  >
                    {subtitleVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleGenerateSubtitle} disabled={isGeneratingSubtitle || !originalNews} className="h-6 px-2 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">
                  {isGeneratingSubtitle ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {isGeneratingSubtitle ? 'Gerando...' : 'Gerar subtítulo'}
                </Button>
              </div>
              <Input
                value={editedSubtitle}
                onChange={e => setEditedSubtitle(e.target.value)}
                placeholder="Linha de apoio que aparece na imagem..."
                className={`bg-zinc-900 border-white/10 text-white transition-opacity ${subtitleVisible ? '' : 'opacity-40'}`}
              />

              {/* Controles de Estilo do Subtítulo */}
              {localTextLayout?.description && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 p-2 rounded-lg bg-zinc-900/40 border border-white/5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Cor:</span>
                    <input
                      type="color"
                      value={localTextLayout.description.color || '#ffffff'}
                      onChange={e => {
                        const newColor = e.target.value;
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            description: { ...prev.description, color: newColor }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={localTextLayout.description.color || '#ffffff'}
                      onChange={e => {
                        const newColor = e.target.value;
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            description: { ...prev.description, color: newColor }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="w-14 bg-zinc-800 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Fundo:</span>
                    <Switch
                      checked={localTextLayout.description.bgEnabled || false}
                      onCheckedChange={checked => {
                        setLocalTextLayout((prev: any) => {
                          const updated = {
                            ...prev,
                            description: { ...prev.description, bgEnabled: checked }
                          };
                          saveTextLayoutToChannel(updated);
                          return updated;
                        });
                      }}
                      className="scale-75 origin-left"
                    />
                    {localTextLayout.description.bgEnabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={localTextLayout.description.bgColor || '#000000'}
                          onChange={e => {
                            const newBgColor = e.target.value;
                            setLocalTextLayout((prev: any) => {
                              const updated = {
                                ...prev,
                                description: { ...prev.description, bgColor: newBgColor }
                              };
                              saveTextLayoutToChannel(updated);
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={localTextLayout.description.bgColor || '#000000'}
                          onChange={e => {
                            const newBgColor = e.target.value;
                            setLocalTextLayout((prev: any) => {
                              const updated = {
                                ...prev,
                                description: { ...prev.description, bgColor: newBgColor }
                              };
                              saveTextLayoutToChannel(updated);
                              return updated;
                            });
                          }}
                          className="w-14 bg-zinc-800 border border-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between flex-shrink-0">
                <label className="text-xs font-medium text-white/70">Descrição</label>
                <Button variant="ghost" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !originalNews} className="h-6 px-2 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">
                  {isGeneratingDesc ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {isGeneratingDesc ? 'Gerando...' : 'Gerar nova descrição'}
                </Button>
              </div>
              <Textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} className="flex-1 bg-zinc-900 border-white/10 text-white resize-none" />
            </div>

            {/* Botão Salvar Edição na coluna do meio */}
            <div className="pt-2 flex-shrink-0">
              <Button
                onClick={handleSavePost}
                disabled={isSavingPost || !selectedChannelId || !selectedPageColumn}
                className={`w-full gap-2 ${currentPostSaved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'} text-white`}
              >
                {isSavingPost
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {isSavingPost ? 'Salvando...' : currentPostSaved ? 'Atualizar Edição' : 'Salvar Edição'}
              </Button>
              {currentPostSaved && (
                <p className="text-[10px] text-emerald-400/70 text-center mt-1.5">
                  ✓ Já salvo — clique para atualizar com os dados atuais
                </p>
              )}
            </div>
          </div>

          {/* Column 3: Preview */}
          <div className="p-4 flex flex-col gap-3 bg-black/20 overflow-hidden">

            {/* Preview area — grows to fill remaining column height */}
            <div className="flex-1 min-h-0 flex flex-col items-center gap-2">
              <div className="flex justify-end w-full flex-shrink-0">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !editedImage}
                  className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  title="Baixar imagem da prévia"
                >
                  {isDownloading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />}
                </button>
              </div>

              {/* Preview frame: height fills flex space, width derived from aspect ratio */}
              <div className="flex-1 min-h-0 w-full flex justify-center items-center">
                <div
                  ref={previewRef}
                  className={`h-full max-w-full ${fmt.aspectClass} bg-zinc-900 border border-white/10 rounded-xl overflow-hidden relative shadow-2xl transition-all duration-300 select-none`}
                >
                  {editedImage ? (
                    <div className="absolute inset-0 w-full h-full bg-zinc-800 overflow-hidden">
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          position: 'relative',
                          transform: `scale(${cropSettings.scale}) translate(${cropSettings.offsetX}%, ${cropSettings.offsetY}%)`,
                          transformOrigin: 'center',
                          transition: 'transform 100ms ease',
                        }}
                      >
                        <img
                          src={editedImage}
                          alt="Preview base"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            left: imgLeftPercent,
                            top: imgTopPercent,
                            width: drawWPercent,
                            height: drawHPercent,
                            maxWidth: 'none',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-800/50">
                      <ImageIcon className="w-10 h-10 text-white/10" />
                    </div>
                  )}
                  {selectedPageObj?.url && (
                    <img src={selectedPageObj.url} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" alt="Template" />
                  )}

                  {/* Text overlay: use channel text_layout if configured, else fall back to gradient */}
                  {localTextLayout?.title ? (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {localTextLayout.title?.visible && editedTitle && (
                        <div
                          className="absolute group pointer-events-auto border border-transparent hover:border-dashed hover:border-white/40 hover:bg-white/5 transition-all duration-150 rounded"
                          style={{
                            left:       `${localTextLayout.title.x}%`,
                            top:        `${localTextLayout.title.y}%`,
                            width:      `${localTextLayout.title.width ?? 88}%`,
                            cursor:     'move',
                            padding:    '2px 4px',
                            boxSizing:  'border-box',
                          }}
                          onMouseDown={(e) => handleTextMouseDown('title', e)}
                        >
                          <span
                            style={{
                              fontFamily: localTextLayout.title.fontFamily,
                              fontSize:   `${localTextLayout.title.fontSize}px`,
                              fontWeight: localTextLayout.title.bold ? 'bold' : 'normal',
                              color:      localTextLayout.title.color || '#fff',
                              textShadow: localTextLayout.title.bgEnabled ? 'none' : '0 1px 6px rgba(0,0,0,0.9)',
                              lineHeight: 1.25,
                              display:    'block',
                              wordBreak:  'break-word',
                              backgroundColor: localTextLayout.title.bgEnabled ? (localTextLayout.title.bgColor || '#000000') : 'transparent',
                              padding: localTextLayout.title.bgEnabled ? '4px 8px' : '0px',
                              borderRadius: localTextLayout.title.bgEnabled ? '4px' : '0px',
                            }}
                          >
                            {editedTitle}
                          </span>
                          <span
                            className="absolute -top-4 left-0 text-[8px] font-semibold px-1 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{
                              background: 'rgba(139,92,246,0.85)',
                              color: '#fff',
                              lineHeight: 1,
                            }}
                          >
                            TÍTULO
                          </span>
                        </div>
                      )}
                      {localTextLayout.description?.visible && subtitleVisible && editedSubtitle && (
                        <div
                          className="absolute group pointer-events-auto border border-transparent hover:border-dashed hover:border-white/40 hover:bg-white/5 transition-all duration-150 rounded"
                          style={{
                            left:       `${localTextLayout.description.x}%`,
                            top:        `${localTextLayout.description.y}%`,
                            width:      `${localTextLayout.description.width ?? 88}%`,
                            cursor:     'move',
                            padding:    '2px 4px',
                            boxSizing:  'border-box',
                          }}
                          onMouseDown={(e) => handleTextMouseDown('description', e)}
                        >
                          <span
                            style={{
                              fontFamily: localTextLayout.description.fontFamily,
                              fontSize:   `${localTextLayout.description.fontSize}px`,
                              fontWeight: localTextLayout.description.bold ? 'bold' : 'normal',
                              color:      localTextLayout.description.color || '#fff',
                              textShadow: localTextLayout.description.bgEnabled ? 'none' : '0 1px 4px rgba(0,0,0,0.8)',
                              lineHeight: 1.35,
                              display:    'block',
                              wordBreak:  'break-word',
                              backgroundColor: localTextLayout.description.bgEnabled ? (localTextLayout.description.bgColor || '#000000') : 'transparent',
                              padding: localTextLayout.description.bgEnabled ? '4px 8px' : '0px',
                              borderRadius: localTextLayout.description.bgEnabled ? '4px' : '0px',
                            }}
                          >
                            {editedSubtitle}
                          </span>
                          <span
                            className="absolute -top-4 left-0 text-[8px] font-semibold px-1 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{
                              background: 'rgba(16,185,129,0.85)',
                              color: '#fff',
                              lineHeight: 1,
                            }}
                          >
                            SUBTÍTULO
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    !selectedPageObj?.url && (editedTitle || (subtitleVisible && editedSubtitle)) && (
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20">
                        {editedTitle && <h2 className="text-white font-bold text-xl leading-tight mb-2 drop-shadow-md">{editedTitle}</h2>}
                        {subtitleVisible && editedSubtitle && <p className="text-white/80 text-sm line-clamp-3 drop-shadow-md">{editedSubtitle}</p>}
                      </div>
                    )
                  )}
                </div>
              </div>

              {selectedPageObj && (
                <div className="w-full text-center text-[11px] text-emerald-400 font-medium flex-shrink-0 pt-1">
                  Formato Aplicado: {selectedPageObj.label} ({fmt.label})
                </div>
              )}
            </div>
          </div>
        </div>

    {/* Footer — saved badges + actions */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between gap-4 flex-shrink-0 bg-[#080b14]">
          {/* Saved post badges */}
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            {savedPosts.length === 0 ? (
              <span className="text-xs text-white/25">Nenhum destino salvo ainda</span>
            ) : (
              savedPosts.map(post => {
                const isActive = post.channel_id === selectedChannelId && post.destination_column === selectedPageColumn;
                return (
                  <div
                    key={post.id}
                    className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all
                      ${isActive ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-[#080b14]' : 'opacity-70 hover:opacity-100'}
                      ${STATUS_COLORS[post.status]}`}
                    onClick={() => handleLoadPost(post)}
                    title="Clique para carregar esta edição"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      post.status === 'postado'
                        ? 'bg-emerald-400'
                        : post.status === 'erro' || post.status === 'cancelado'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`} />
                    <span>{post.channel_name}</span>
                    <span className="opacity-50">→</span>
                    <span>{post.destination_label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveSavedPost(post.id); }}
                      className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                      title="Remover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              className="bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => onOpenChange(false)}
            >
              Concluído
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Crop dialog */}
      <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
        <DialogContent className="max-w-[450px] bg-[#0c1120] border-white/10 p-6 text-white select-none">
          <DialogHeader>
            <DialogTitle>Ajustar Enquadramento da Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="flex flex-col items-center justify-center bg-black/40 p-4 rounded-lg border border-white/5">
              <div className="flex items-center justify-between w-full mb-2 text-[10px] text-white/40" style={{ maxWidth: 260 }}>
                <span className="uppercase tracking-wider">Molde: {fmt.label}</span>
                <span className="text-violet-400 animate-pulse font-medium">❖ Arraste no quadro</span>
              </div>
              {(() => {
                const containerSize = 260;
                const maxFrameDim  = 216;
                let frameW: number, frameH: number;
                if (fmt.styleAspect >= 1) {
                  frameW = maxFrameDim;
                  frameH = maxFrameDim / fmt.styleAspect;
                } else {
                  frameH = maxFrameDim;
                  frameW = maxFrameDim * fmt.styleAspect;
                }
                const frameLeft = (containerSize - frameW) / 2;
                const frameTop  = (containerSize - frameH) / 2;
                const maskStyle = (extra: React.CSSProperties): React.CSSProperties => ({
                  position: 'absolute', background: 'rgba(0,0,0,0.65)', pointerEvents: 'none', zIndex: 1, ...extra,
                });
                return (
                  <div
                    style={{
                      width: containerSize,
                      height: containerSize,
                      position: 'relative',
                      overflow: 'hidden',
                      background: '#0a0a0a',
                      borderRadius: 8,
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* Background image — uncropped, overflow visible, matches crop frame position and size */}
                    {(() => {
                      return (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              left: frameLeft,
                              top: frameTop,
                              width: frameW,
                              height: frameH,
                              overflow: 'visible',
                              zIndex: 0,
                              pointerEvents: 'none',
                              transform: `scale(${tempCrop.scale}) translate(${tempCrop.offsetX}%, ${tempCrop.offsetY}%)`,
                              transformOrigin: 'center',
                            }}
                          >
                            {editedImage && (
                              <img
                                src={editedImage}
                                alt=""
                                draggable={false}
                                style={{
                                  position: 'absolute',
                                  left: imgLeftPercent,
                                  top: imgTopPercent,
                                  width: drawWPercent,
                                  height: drawHPercent,
                                  maxWidth: 'none',
                                  objectFit: 'cover',
                                  pointerEvents: 'none',
                                  display: 'block',
                                  opacity: 0.4,
                                }}
                              />
                            )}
                          </div>

                          {/* Dark masks surrounding the crop frame */}
                          <div style={maskStyle({ top:0, left:0, right:0, height: frameTop })} />
                          <div style={maskStyle({ bottom:0, left:0, right:0, height: containerSize - frameTop - frameH })} />
                          <div style={maskStyle({ top: frameTop, left:0, width: frameLeft, height: frameH })} />
                          <div style={maskStyle({ top: frameTop, right:0, width: containerSize - frameLeft - frameW, height: frameH })} />

                          {/* Crop frame — identical rendering to the preview */}
                          <div
                            style={{
                              position:'absolute',
                              left: frameLeft,
                              top: frameTop,
                              width: frameW,
                              height: frameH,
                              overflow:'hidden',
                              zIndex:2,
                              borderRadius:3,
                              border: isDragging ? '2px solid rgb(16,185,129)' : '2px solid rgba(255,255,255,0.75)',
                              boxShadow: isDragging ? '0 0 0 3px rgba(16,185,129,0.2)' : '0 0 0 3px rgba(255,255,255,0.08)',
                              transition: 'border-color 0.15s, box-shadow 0.15s',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                transform: `scale(${tempCrop.scale}) translate(${tempCrop.offsetX}%, ${tempCrop.offsetY}%)`,
                                transformOrigin: 'center',
                              }}
                            >
                              {editedImage && (
                                <img
                                  src={editedImage}
                                  alt="crop"
                                  draggable={false}
                                  style={{
                                    position: 'absolute',
                                    left: imgLeftPercent,
                                    top: imgTopPercent,
                                    width: drawWPercent,
                                    height: drawHPercent,
                                    maxWidth: 'none',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                    display: 'block',
                                  }}
                                />
                              )}
                            </div>
                            {selectedPageObj?.url && (
                              <img
                                src={selectedPageObj.url}
                                alt=""
                                draggable={false}
                                style={{
                                  position:'absolute',
                                  inset:0,
                                  width:'100%',
                                  height:'100%',
                                  objectFit:'cover',
                                  opacity:0.5,
                                  pointerEvents:'none',
                                  zIndex:10
                                }}
                              />
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-4 text-xs">
              {[
                { key: 'scale' as const, label: 'Zoom / Escala', min: 1, max: 5, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}x` },
                { key: 'offsetX' as const, label: 'Ajuste Horizontal', min: -300, max: 300, step: 1, fmt: (v: number) => `${v.toFixed(0)}%` },
                { key: 'offsetY' as const, label: 'Ajuste Vertical', min: -300, max: 300, step: 1, fmt: (v: number) => `${v.toFixed(0)}%` },
              ].map(({ key, label, min, max, step, fmt: fmtFn }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between text-white/70">
                    <span>{label} ({fmtFn(tempCrop[key])})</span>
                    <Button variant="ghost" size="sm" className="h-4 p-0 text-[10px] text-violet-400" onClick={() => setTempCrop(p => ({ ...p, [key]: key === 'scale' ? 1 : 0 }))}>Reset</Button>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={tempCrop[key]}
                    onChange={e => setTempCrop(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                    className="w-full accent-violet-500 bg-zinc-800 h-1.5 rounded cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={() => setIsCropOpen(false)} className="text-white/60 hover:text-white">Cancelar</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white" onClick={handleApplyCrop}>Aplicar Corte</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-[520px] bg-[#0c1120] border-white/10 p-0 text-white overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-white/5 bg-[#080b14]">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="w-4 h-4 text-orange-400" />
              Agendar Postagens
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Group posts by channel */}
            {Object.entries(
              savedPosts.reduce<Record<string, ScheduledPost[]>>((acc, p) => {
                (acc[p.channel_name] = acc[p.channel_name] ?? []).push(p);
                return acc;
              }, {})
            ).map(([channelName, posts]) => (
              <div key={channelName} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 pb-1 border-b border-white/5">
                  {channelName}
                </p>
                {posts.map(post => (
                  <div key={post.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/80 truncate block">{post.destination_label}</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border mt-0.5 ${STATUS_COLORS[post.status] ?? STATUS_COLORS.pendente}`}>
                        {post.status}
                      </span>
                    </div>
                    <div className="relative flex-shrink-0">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                      <input
                        type="datetime-local"
                        value={scheduleTimes[post.id] ?? ''}
                        onChange={e => setScheduleTimes(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="pl-8 pr-3 py-1.5 rounded-md bg-zinc-900 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-orange-500/60 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-white/5 bg-[#080b14] flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsScheduleOpen(false)} className="text-white/60 hover:text-white">
              Cancelar
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-400 text-white font-semibold gap-2"
              onClick={handleSchedule}
              disabled={isScheduling}
            >
              {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              {isScheduling ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
