import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { mockupUploadService } from '@/services/mockups/mockupUpload.service';
import { useMockups } from '@/hooks/useMockups';
import { toast } from 'sonner';

interface UploadMockupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  format: string;
  onSuccess: (id: string) => void;
}

export function UploadMockupDialog({ open, onOpenChange, sourceId, format, onSuccess }: UploadMockupDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { createMockup } = useMockups(sourceId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'image/png') {
        toast.error('Somente arquivos PNG são permitidos');
        return;
      }
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace('.png', ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !name) return;

    setIsUploading(true);
    try {
      const response = await mockupUploadService.upload(file, sourceId, format, name);
      
      if (!response.ok) {
        toast.error(response.error_message || 'Erro no upload');
        return;
      }

      // After successful upload to Storage, create the mockup record in DB
      const newMockup = await createMockup({
        publication_source_id: sourceId,
        format: format as any,
        name,
        category_tag: category || null,
        asset_id: response.asset.id,
        width: response.asset.width,
        height: response.asset.height,
        active: true,
        is_default: false,
        text_regions: [],
        background_layer: {},
        image_slot: { enabled: true },
        preview_asset_id: null,
        description: null,
      });

      toast.success('Mockup enviado com sucesso!');
      onSuccess(newMockup.id);
      
      // Reset
      setFile(null);
      setName('');
      setCategory('');
    } catch (err: any) {
      toast.error(`Falha no upload: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Mockup - {format}</DialogTitle>
          <DialogDescription>
            Faça upload de um PNG transparente com as dimensões corretas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/10 hover:border-white/20'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png" 
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-violet-400 mb-2" />
                <p className="text-sm font-medium text-violet-400 text-center truncate w-full">{file.name}</p>
                <p className="text-[10px] text-violet-400/70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-white/20 mb-2" />
                <p className="text-sm font-medium text-white/60">Clique ou arraste o PNG aqui</p>
                <p className="text-[10px] text-white/30 mt-1">Limite de 10MB • Transparência obrigatória</p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Manchete Vermelha" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria (opcional)</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Política, Esportes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || !name || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
              </>
            ) : (
              'Fazer Upload e Configurar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
