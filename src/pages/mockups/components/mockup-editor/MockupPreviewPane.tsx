import type { Mockup, MockupFormat } from '@/types/mockup';
import { AspectRatioFrame } from '../shared/AspectRatioFrame';

interface MockupPreviewPaneProps {
  mockup?: Mockup;
  format: MockupFormat;
}

export function MockupPreviewPane({ mockup, format }: MockupPreviewPaneProps) {
  if (!mockup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40">
        <div className="w-full max-w-[300px]">
          <AspectRatioFrame format={format}>
            <div className="flex items-center justify-center h-full text-[10px] uppercase tracking-widest font-bold opacity-30">
              Nenhum Mockup Selecionado
            </div>
          </AspectRatioFrame>
        </div>
        <p className="mt-4 text-xs">Selecione um mockup para ver o preview.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto">
      <div className="w-full max-w-[400px]">
        <AspectRatioFrame format={format} className="shadow-2xl">
          {/* 1. Background Layer */}
          {mockup.background_layer?.enabled && (
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: mockup.background_layer.color || '#000000' }} 
            />
          )}

          {/* 2. News Image Slot */}
          {mockup.image_slot?.enabled && (
            <div 
              className="absolute flex items-center justify-center bg-white/10 border border-white/5"
              style={{
                left: `${(mockup.image_slot.x || 0) / mockup.width * 100}%`,
                top: `${(mockup.image_slot.y || 0) / mockup.height * 100}%`,
                width: `${(mockup.image_slot.width || mockup.width) / mockup.width * 100}%`,
                height: `${(mockup.image_slot.height || 600) / mockup.height * 100}%`,
              }}
            >
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-tighter text-center px-4">
                Imagem da Notícia
              </div>
            </div>
          )}

          {/* 3. Mockup PNG */}
          <img 
            src={`https://atkstqfnwdbwhplukkiq.supabase.co/storage/v1/object/public/Midia/${mockup.asset_id}`} 
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            alt={mockup.name}
          />

          {/* 4. Text Regions (CSS Preview) */}
          {mockup.text_regions.map((region) => (
            <div
              key={region.id}
              className="absolute flex"
              style={{
                left: `${region.x / mockup.width * 100}%`,
                top: `${region.y / mockup.height * 100}%`,
                width: `${region.width / mockup.width * 100}%`,
                height: `${region.height / mockup.height * 100}%`,
                transform: `rotate(${region.rotation}deg)`,
                justifyContent: region.alignment === 'left' ? 'flex-start' : region.alignment === 'right' ? 'flex-end' : 'center',
                alignItems: region.vertical_alignment === 'top' ? 'flex-start' : region.vertical_alignment === 'bottom' ? 'flex-end' : 'center',
                zIndex: region.z_index,
              }}
            >
              <span
                style={{
                  fontFamily: region.font_family,
                  fontSize: `calc(${region.font_size_px}px * (100 / ${mockup.width}))`, // Rough scaling for preview
                  fontWeight: region.font_weight,
                  color: region.color,
                  textAlign: region.alignment,
                  textTransform: region.uppercase ? 'uppercase' : 'none',
                  lineHeight: region.line_height,
                  letterSpacing: `${region.letter_spacing}px`,
                  WebkitTextStroke: region.stroke.enabled ? `${region.stroke.width}px ${region.stroke.color}` : 'none',
                  textShadow: region.shadow.enabled ? `${region.shadow.offset_x}px ${region.shadow.offset_y}px ${region.shadow.blur}px ${region.shadow.color}` : 'none',
                  display: '-webkit-box',
                  WebkitLineClamp: region.max_lines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {region.placeholder_text}
              </span>
            </div>
          ))}
        </AspectRatioFrame>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[400px]">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 shadow-sm">
          <p className="text-[10px] text-white/40 uppercase font-bold">Resolução</p>
          <p className="text-sm font-medium">{mockup.width} x {mockup.height}</p>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 shadow-sm">
          <p className="text-[10px] text-white/40 uppercase font-bold">Regiões</p>
          <p className="text-sm font-medium">{mockup.text_regions.length} camadas</p>
        </div>
      </div>
    </div>
  );
}
