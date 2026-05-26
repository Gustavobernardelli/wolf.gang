import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { z } from 'zod';
import { useRotateSecret } from '@/hooks/useSecrets';
import type { IntegrationSecret } from '@/types/secret';

const schema = z.object({
  value: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmation: z.string(),
}).superRefine((_data, _ctx) => { /* validated inline */ });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  secret: IntegrationSecret;
}

export function RotateSecretDialog({ open, onOpenChange, secret }: Props) {
  const [showValue, setShowValue] = useState(false);
  const [value, setValue] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const rotate = useRotateSecret();

  const isConfirmed = confirmation === secret.name;
  const isValueValid = value.length >= 8;
  const canSubmit = isValueValid && isConfirmed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await rotate.mutateAsync({ id: secret.id, value });
    onOpenChange(false);
    setValue('');
    setConfirmation('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Rotacionar Credencial
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-amber-500/10 border-amber-500/30">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-200/80 text-sm">
            O valor anterior será descartado permanentemente e substituído pelo novo. Esta ação não pode ser desfeita.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-zinc-300">Novo valor *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Novo valor da credencial..."
                className="bg-zinc-800 border-zinc-700 text-white font-mono flex-1"
                autoComplete="new-password"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setShowValue(!showValue)}
                className="border border-zinc-700 text-zinc-400"
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {value.length > 0 && value.length < 8 && (
              <p className="text-rose-400 text-xs mt-1">Mínimo 8 caracteres</p>
            )}
          </div>

          <div>
            <Label className="text-zinc-300">
              Digite <span className="text-amber-400 font-mono">"{secret.name}"</span> para confirmar *
            </Label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={secret.name}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              autoComplete="off"
            />
            {confirmation.length > 0 && !isConfirmed && (
              <p className="text-rose-400 text-xs mt-1">Nome não confere</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || rotate.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {rotate.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Rotacionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
