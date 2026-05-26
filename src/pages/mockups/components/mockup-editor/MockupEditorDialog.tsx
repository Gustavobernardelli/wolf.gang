import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PublicationSource } from '@/types/publicationSource';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MockupFormat } from '@/types/mockup';
import { useMockupFormatSpecs } from '@/hooks/useMockupFormatSpecs';
import { useMockups } from '@/hooks/useMockups';
import { FormatTabs } from './FormatTabs';
import { MockupGrid } from './MockupGrid';
import { MockupCanvasEditor } from './MockupCanvasEditor';
import { MockupPreviewPane } from './MockupPreviewPane';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MockupEditorDialogProps {
  source: PublicationSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MockupEditorDialog({ source, open, onOpenChange }: MockupEditorDialogProps) {
  const { data: formats } = useMockupFormatSpecs();
  const { mockups, isLoading } = useMockups(source.id);
  
  const [selectedFormat, setSelectedFormat] = useState<MockupFormat>('feed_square');
  const [editingMockup, setEditingMockup] = useState<string | null>(null); // ID of mockup being edited in Canvas

  const activeMockups = mockups?.filter(m => m.format === selectedFormat) || [];
  const selectedMockup = mockups?.find(m => m.id === editingMockup) || 
                         mockups?.find(m => m.format === selectedFormat && m.is_default) ||
                         activeMockups[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col bg-[#0c1120] border-white/10">
        <DialogHeader className="px-5 py-4 border-b border-white/5 bg-[#080b14] flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-4">
            <div className="bg-violet-500/20 p-2 rounded-lg text-violet-300 font-bold">
              {source.name.substring(0, 1)}
            </div>
            <div>
              <DialogTitle className="text-white">{source.name}</DialogTitle>
              <p className="text-xs text-white/40">Editor de Páginas</p>
            </div>
          </div>
          {editingMockup && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setEditingMockup(null)} className="border-white/10 text-white/70 hover:bg-white/10 bg-transparent">
                Voltar à Lista
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {editingMockup ? (
            <MockupCanvasEditor 
              mockupId={editingMockup} 
              onClose={() => setEditingMockup(null)} 
            />
          ) : (
            <>
              {/* Left Side: Mockup Management */}
              <div className="w-1/2 border-r border-white/5 flex flex-col bg-[#0c1120]">
                <FormatTabs 
                  formats={formats || []} 
                  value={selectedFormat} 
                  onChange={setSelectedFormat} 
                />
                <div className="flex-1 overflow-y-auto p-6">
                  <MockupGrid 
                    sourceId={source.id}
                    format={selectedFormat}
                    mockups={activeMockups}
                    isLoading={isLoading}
                    onEdit={setEditingMockup}
                  />
                </div>
              </div>

              {/* Right Side: Preview */}
              <div className="w-1/2 bg-[#080b14] flex flex-col">
                <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="font-medium text-white">Preview do Formato</h3>
                  <p className="text-xs text-white/40">Como a arte final será composta.</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MockupPreviewPane 
                    mockup={selectedMockup} 
                    format={selectedFormat}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
