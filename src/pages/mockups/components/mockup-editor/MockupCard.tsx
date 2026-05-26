import type { Mockup } from '@/types/mockup';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Star, Trash } from 'lucide-react';

interface MockupCardProps {
  mockup: Mockup;
  onEdit: (id: string) => void;
  onSetDefault: (id: string, format: string) => void;
  onDelete: (id: string) => void;
}

export function MockupCard({ mockup, onEdit, onSetDefault, onDelete }: MockupCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-white/5 border-white/5 aspect-square">
      {/* Checkered Background for Transparency */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%), 
                           linear-gradient(-45deg, #000 25%, transparent 25%), 
                           linear-gradient(45deg, transparent 75%, #000 75%), 
                           linear-gradient(-45deg, transparent 75%, #000 75%)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      />

      {/* Mockup Image */}
      <img 
        src={mockup.asset_id ? `https://atkstqfnwdbwhplukkiq.supabase.co/storage/v1/object/public/Midia/${mockup.asset_id}` : ''} 
        alt={mockup.name}
        className="absolute inset-0 w-full h-full object-contain p-2 z-10"
        // Note: Replace the URL with proper construction if needed
      />

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col space-y-1 z-20">
        {mockup.is_default && (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[10px]">
            <Star className="h-3 w-3 mr-1 fill-current" /> Padrão
          </Badge>
        )}
        {mockup.category_tag && (
          <Badge variant="secondary" className="text-[10px] opacity-80">
            {mockup.category_tag}
          </Badge>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2 z-30">
        <Button size="sm" variant="secondary" className="w-28" onClick={() => onEdit(mockup.id)}>
          <Edit className="h-3 w-3 mr-2" /> Editar
        </Button>
        {!mockup.is_default && (
          <Button size="sm" variant="secondary" className="w-28" onClick={() => onSetDefault(mockup.id, mockup.format)}>
            <Star className="h-3 w-3 mr-2" /> Set Padrão
          </Button>
        )}
        <Button size="sm" variant="destructive" className="w-28" onClick={() => onDelete(mockup.id)}>
          <Trash className="h-3 w-3 mr-2" /> Excluir
        </Button>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-md border-t border-white/5 z-20">
        <p className="text-[10px] font-bold truncate text-white/90">{mockup.name}</p>
        <p className="text-[9px] text-white/40 uppercase">{mockup.width}x{mockup.height}</p>
      </div>
    </Card>
  );
}
