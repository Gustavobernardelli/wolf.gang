import { Plus } from 'lucide-react';

export function AddMockupButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
    >
      <div className="bg-white/10 group-hover:bg-violet-500/20 p-2 rounded-full mb-2 transition-colors">
        <Plus className="h-5 w-5 text-white/40 group-hover:text-violet-400" />
      </div>
      <span className="text-[10px] font-bold text-white/40 group-hover:text-violet-400 uppercase tracking-wider">Novo Mockup</span>
    </button>
  );
}
