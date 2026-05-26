import type { PublicationSource } from '@/types/publicationSource';
import { SourceCard } from './SourceCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface SourcesListProps {
  sources: PublicationSource[];
  onAdd: () => void;
  onEdit: (source: PublicationSource) => void;
  onDelete: (source: PublicationSource) => void;
  onSelect: (source: PublicationSource) => void;
}

export function SourcesList({ sources, onAdd, onEdit, onDelete, onSelect }: SourcesListProps) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-xl border-2 border-dashed border-white/10">
        <div className="bg-white/10 p-4 rounded-full mb-4">
          <Plus className="h-8 w-8 text-white/40" />
        </div>
        <h3 className="text-xl font-semibold text-white/90">Nenhuma fonte encontrada</h3>
        <p className="text-white/40 mb-6 text-center max-w-sm">
          Comece adicionando uma marca ou conta onde o Wolfgang irá realizar as publicações.
        </p>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Primeira Fonte
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sources.map((source) => (
        <SourceCard 
          key={source.id} 
          source={source} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onClick={onSelect}
        />
      ))}
      <button 
        onClick={onAdd}
        className="flex flex-col items-center justify-center h-full min-h-[160px] bg-white/5 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
      >
        <div className="bg-white/10 group-hover:bg-violet-500/20 p-3 rounded-full mb-2 transition-colors">
          <Plus className="h-6 w-6 text-white/40 group-hover:text-violet-400" />
        </div>
        <span className="text-sm font-medium text-white/40 group-hover:text-violet-400">Nova Fonte</span>
      </button>
    </div>
  );
}
