import { Button } from '@/components/ui/button';
import { Type, Heading1, Hash, User, PlusCircle, Layers, Square } from 'lucide-react';
import { useEditorStore } from './editorStore';
import type { TextRegionRole } from '@/types/textRegion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function TextRegionToolbar() {
  const { addRegion, mockup } = useEditorStore();

  const handleAddRegion = (role: TextRegionRole) => {
    if (!mockup) return;

    const defaults: Record<TextRegionRole, any> = {
      headline: { label: 'Manchete', size: 64, weight: 700, color: '#FFFFFF', placeholder: 'MANCHETE AQUI' },
      kicker: { label: 'Chapéu', size: 24, weight: 500, color: '#3b82f6', placeholder: 'TÓPICO' },
      credit: { label: 'Crédito', size: 16, weight: 400, color: '#AAAAAA', placeholder: 'Foto: Autor' },
      subtitle: { label: 'Subtítulo', size: 32, weight: 400, color: '#EEEEEE', placeholder: 'Texto complementar aqui' },
      custom: { label: 'Texto Custom', size: 24, weight: 400, color: '#FFFFFF', placeholder: 'Texto livre' },
    };

    const config = defaults[role];

    addRegion({
      id: crypto.randomUUID(),
      role,
      label: config.label,
      x: 100,
      y: 100 + mockup.text_regions.length * 40,
      width: 400,
      height: 100,
      rotation: 0,
      alignment: 'left',
      vertical_alignment: 'middle',
      font_family: mockup.default_font_family || 'Inter',
      font_weight: config.weight,
      font_size_px: config.size,
      line_height: 1.1,
      letter_spacing: 0,
      color: config.color,
      stroke: { enabled: false, color: '#000000', width: 2 },
      shadow: { enabled: false, color: '#000000', blur: 8, offset_x: 0, offset_y: 4 },
      uppercase: role === 'headline' || role === 'kicker',
      max_lines: 3,
      auto_shrink: true,
      auto_shrink_min_size: 24,
      placeholder_text: config.placeholder,
      z_index: 10 + mockup.text_regions.length,
    });
  };

  return (
    <div className="w-16 border-r border-white/5 bg-white/5 flex flex-col items-center py-4 space-y-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleAddRegion('headline')}>
              <Heading1 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Adicionar Manchete</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleAddRegion('kicker')}>
              <Hash className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Adicionar Chapéu (Kicker)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleAddRegion('subtitle')}>
              <Type className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Adicionar Subtítulo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleAddRegion('credit')}>
              <User className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Adicionar Crédito</TooltipContent>
        </Tooltip>

        <div className="h-[1px] w-8 bg-white/10" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Layers className="h-5 w-5 text-white/20" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Configurar Slot de Imagem (Breve)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Square className="h-5 w-5 text-white/20" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Configurar Fundo (Breve)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
