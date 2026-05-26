import type { PublicationSource } from '@/types/publicationSource';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Trash, Layers } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface SourceCardProps {
  source: PublicationSource;
  onEdit: (source: PublicationSource) => void;
  onDelete: (source: PublicationSource) => void;
  onClick: (source: PublicationSource) => void;
}

export function SourceCard({ source, onEdit, onDelete, onClick }: SourceCardProps) {
  const initials = source.name.substring(0, 2).toUpperCase();
  const color = source.primary_color || '#7c3aed';

  return (
    <div
      className="group cursor-pointer rounded-xl border border-white/10 bg-[#0c1120] hover:border-violet-500/40 hover:bg-violet-500/5 transition-all overflow-hidden"
      onClick={() => onClick(source)}
    >
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="flex items-center space-x-4 p-5">
        {/* Avatar */}
        <div
          className="h-12 w-12 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
            {source.name}
          </p>
          <p className="text-xs text-white/40 truncate mt-0.5">{source.slug}</p>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
              <DropdownMenuItem onClick={() => onEdit(source)} className="text-white/80 focus:bg-white/10 focus:text-white gap-2">
                <Edit className="h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 gap-2"
                onClick={() => onDelete(source)}
              >
                <Trash className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-5 pb-4 flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center space-x-1.5">
          <Layers className="h-3 w-3" />
          <span>Páginas configuradas</span>
        </div>
        <Badge
          variant={source.is_active ? 'default' : 'secondary'}
          className={source.is_active
            ? 'text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20 border'
            : 'text-[10px] bg-white/5 text-white/40 border-white/10 border'
          }
        >
          {source.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </div>
  );
}
