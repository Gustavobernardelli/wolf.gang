import type { Mockup, MockupFormat } from '@/types/mockup';
import { MockupCard } from './MockupCard';
import { AddMockupButton } from './AddMockupButton';
import { UploadMockupDialog } from './UploadMockupDialog';
import { useState } from 'react';
import { useMockups } from '@/hooks/useMockups';

interface MockupGridProps {
  sourceId: string;
  format: MockupFormat;
  mockups: Mockup[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

export function MockupGrid({ sourceId, format, mockups, isLoading, onEdit }: MockupGridProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { deleteMockup, setDefault } = useMockups(sourceId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-lg border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {mockups.map((mockup) => (
        <MockupCard 
          key={mockup.id} 
          mockup={mockup} 
          onEdit={onEdit}
          onDelete={(id) => {
            if (confirm('Deseja realmente excluir este mockup?')) {
              deleteMockup(id);
            }
          }}
          onSetDefault={(id) => setDefault({ id, format })}
        />
      ))}
      
      <AddMockupButton onClick={() => setIsUploadOpen(true)} />

      <UploadMockupDialog 
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        sourceId={sourceId}
        format={format}
        onSuccess={(newMockupId) => {
          setIsUploadOpen(false);
          onEdit(newMockupId); // Open editor immediately
        }}
      />
    </div>
  );
}
