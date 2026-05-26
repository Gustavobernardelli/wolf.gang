import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MockupFormat, MockupFormatSpec } from '@/types/mockup';

interface FormatTabsProps {
  formats: MockupFormatSpec[];
  value: MockupFormat;
  onChange: (value: MockupFormat) => void;
}

export function FormatTabs({ formats, value, onChange }: FormatTabsProps) {
  return (
    <div className="border-b border-white/5 px-4 py-2 bg-white/5">
      <Tabs value={value} onValueChange={(v) => onChange(v as MockupFormat)}>
        <TabsList className="bg-transparent h-12 space-x-2">
          {formats.map((f) => (
            <TabsTrigger 
              key={f.format} 
              value={f.format}
              className="data-[state=active]:bg-white/10 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-white/10 px-4"
            >
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">{f.display_name}</span>
                <span className="text-[10px] opacity-60">{f.aspect_label}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
