import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AvailableFont } from '@/types/mockup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FontPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FontPicker({ value, onChange, placeholder = "Selecione uma fonte" }: FontPickerProps) {
  const [fonts, setFonts] = useState<AvailableFont[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      try {
        const { data, error } = await supabase
          .from('available_fonts')
          .select('*')
          .eq('active', true)
          .order('family', { ascending: true });

        if (error) throw error;
        setFonts(data || []);
      } catch (err) {
        console.error('Failed to load fonts:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFonts();
  }, []);

  // Dynamically inject CSS for the selected font if it's a Google Font
  useEffect(() => {
    const selectedFont = fonts.find(f => f.family === value);
    if (selectedFont?.css_url) {
      const linkId = `font-${selectedFont.family.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = selectedFont.css_url;
        document.head.appendChild(link);
      }
    }
  }, [value, fonts]);

  return (
    <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {fonts.map((font) => (
          <SelectItem key={font.id} value={font.family}>
            <span style={{ fontFamily: font.family }}>{font.family}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
