import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publicationSourceSchema } from '@/lib/validators/publicationSourceSchema';
import type { PublicationSourceFormValues } from '@/lib/validators/publicationSourceSchema';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';
import type { PublicationSource } from '@/types/publicationSource';

interface EditSourceDialogProps {
  source: PublicationSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, values: PublicationSourceFormValues) => Promise<void>;
  isSaving: boolean;
}

export function EditSourceDialog({ source, open, onOpenChange, onSave, isSaving }: EditSourceDialogProps) {
  const form = useForm<PublicationSourceFormValues>({
    resolver: zodResolver(publicationSourceSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      primary_color: '#3b82f6',
      is_active: true,
    },
  });

  useEffect(() => {
    if (source) {
      form.reset({
        name: source.name,
        slug: source.slug,
        description: source.description || '',
        primary_color: source.primary_color || '#3b82f6',
        is_active: source.is_active,
      });
    }
  }, [source, form]);

  const onSubmit = async (values: PublicationSourceFormValues) => {
    if (source) await onSave(source.id, values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0c1120] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Canal</DialogTitle>
          <DialogDescription className="text-white/50">
            Atualize as informações do canal de publicação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Nome do Canal</FormLabel>
                  <FormControl>
                    <Input className="bg-zinc-900 border-white/10 text-white" placeholder="Ex: Cura Política" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Slug</FormLabel>
                  <FormControl>
                    <Input className="bg-zinc-900 border-white/10 text-white/40" placeholder="Ex: cura-politica" {...field} disabled />
                  </FormControl>
                  <FormDescription className="text-white/30">O slug não pode ser alterado após a criação.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do canal..."
                      className="resize-none bg-zinc-900 border-white/10 text-white"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Cor Primária</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input type="color" className="p-1 w-12 h-10 bg-zinc-900 border-white/10" {...field} value={field.value || '#3b82f6'} />
                    </FormControl>
                    <Input {...field} value={field.value || '#3b82f6'} className="font-mono bg-zinc-900 border-white/10 text-white" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/5 bg-zinc-900/50 p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white/90">Canal Ativo</FormLabel>
                    <FormDescription className="text-white/40">Determina se este canal pode ser usado em automações.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-violet-600 hover:bg-violet-500 text-white">
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
