import { cn } from '@/lib/utils';
import type { MockupFormat } from '@/types/mockup';
import type { ReactNode } from 'react';

interface AspectRatioFrameProps {
  format: MockupFormat;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function AspectRatioFrame({ format, children, className, containerClassName }: AspectRatioFrameProps) {
  const aspectRatios: Record<MockupFormat, string> = {
    feed_square: 'aspect-square',
    feed_portrait: 'aspect-[4/5]',
    reels: 'aspect-[9/16]',
    stories: 'aspect-[9/16]',
    blog_cover: 'aspect-[1.91/1]',
  };

  return (
    <div className={cn("w-full flex items-center justify-center", containerClassName)}>
      <div className={cn(
        "relative overflow-hidden bg-white/5 border border-white/5 shadow-sm rounded-lg w-full max-h-[80vh] max-w-full",
        aspectRatios[format],
        className
      )}>
        {children}
      </div>
    </div>
  );
}
