import { Badge } from '@/components/ui/badge';
import type { MockupFormat } from '@/types/mockup';

const formatLabels: Record<MockupFormat, string> = {
  feed_square: '1:1 Square',
  feed_portrait: '4:5 Portrait',
  reels: '9:16 Reels',
  stories: '9:16 Stories',
  blog_cover: '1.91:1 Blog',
};

export function FormatBadge({ format }: { format: MockupFormat }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
      {formatLabels[format]}
    </Badge>
  );
}
