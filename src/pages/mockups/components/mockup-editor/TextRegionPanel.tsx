import { useEditorStore } from './editorStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FontPicker } from '../shared/FontPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Copy, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export function TextRegionPanel() {
  const { mockup, selectedRegionId, updateRegion, removeRegion, addRegion } = useEditorStore();
  
  const selectedRegion = mockup?.text_regions.find(r => r.id === selectedRegionId);

  if (!selectedRegion) {
    return (
      <div className="w-80 border-l border-white/5 bg-[#0c1120] flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white/5 p-4 rounded-full mb-4">
          <AlignLeft className="h-8 w-8 text-white/20" />
        </div>
        <p className="text-sm font-medium text-white/40">Nenhuma região selecionada</p>
        <p className="text-xs text-white/20 mt-1">Selecione um elemento no canvas para editar suas propriedades.</p>
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    updateRegion(selectedRegion.id, { [field]: value });
  };

  const handleDuplicate = () => {
    addRegion({
      ...selectedRegion,
      id: crypto.randomUUID(),
      x: selectedRegion.x + 20,
      y: selectedRegion.y + 20,
    });
  };

  return (
    <div className="w-80 border-l border-white/5 bg-[#0c1120] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Propriedades</h3>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRegion(selectedRegion.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Identidade */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label Interno</Label>
            <Input 
              value={selectedRegion.label} 
              onChange={(e) => handleChange('label', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Papel (Role)</Label>
            <Select value={selectedRegion.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headline">Manchete</SelectItem>
                <SelectItem value="kicker">Chapéu (Kicker)</SelectItem>
                <SelectItem value="subtitle">Subtítulo</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="custom">Customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Tipografia */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fonte</Label>
            <FontPicker 
              value={selectedRegion.font_family} 
              onChange={(v) => handleChange('font_family', v)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tamanho (px)</Label>
              <Input 
                type="number" 
                value={selectedRegion.font_size_px} 
                onChange={(e) => handleChange('font_size_px', Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Peso</Label>
              <Select value={String(selectedRegion.font_weight)} onValueChange={(v) => handleChange('font_weight', Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semi-Bold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="800">Extra-Bold (800)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor do Texto</Label>
            <div className="flex space-x-2">
              <Input 
                type="color" 
                className="p-1 w-12 h-10" 
                value={selectedRegion.color} 
                onChange={(e) => handleChange('color', e.target.value)} 
              />
              <Input 
                value={selectedRegion.color} 
                onChange={(e) => handleChange('color', e.target.value)} 
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Alinhamento */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Alinhamento Horizontal</Label>
            <div className="flex bg-white/5 p-1 rounded-md border border-white/10">
              <Button 
                variant={selectedRegion.alignment === 'left' ? 'secondary' : 'ghost'} 
                size="icon" className="flex-1 h-8" 
                onClick={() => handleChange('alignment', 'left')}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant={selectedRegion.alignment === 'center' ? 'secondary' : 'ghost'} 
                size="icon" className="flex-1 h-8"
                onClick={() => handleChange('alignment', 'center')}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button 
                variant={selectedRegion.alignment === 'right' ? 'secondary' : 'ghost'} 
                size="icon" className="flex-1 h-8"
                onClick={() => handleChange('alignment', 'right')}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Caixa Alta (Uppercase)</Label>
            <Switch 
              checked={selectedRegion.uppercase} 
              onCheckedChange={(v) => handleChange('uppercase', v)} 
            />
          </div>
        </div>

        <Separator />

        {/* Comportamento */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Máximo de Linhas</Label>
            <Input 
              type="number" 
              value={selectedRegion.max_lines} 
              onChange={(e) => handleChange('max_lines', Number(e.target.value))} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ajuste Automático</Label>
              <p className="text-[10px] text-white/40">Diminui fonte se não couber</p>
            </div>
            <Switch 
              checked={selectedRegion.auto_shrink} 
              onCheckedChange={(v) => handleChange('auto_shrink', v)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Texto de Exemplo (Placeholder)</Label>
            <Textarea 
              value={selectedRegion.placeholder_text} 
              onChange={(e) => handleChange('placeholder_text', e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

