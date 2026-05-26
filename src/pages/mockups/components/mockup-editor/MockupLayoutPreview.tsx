import { useCallback, useEffect, useRef } from 'react';
import type { TextLayout, TextElementLayout } from '@/types/publicationSource';

export const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Oswald', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather', 'Georgia',
];

export const DEFAULT_LAYOUT: TextLayout = {
  title:       { x: 5, y: 68, width: 88, height: 10, fontFamily: 'Inter', fontSize: 22, visible: true },
  description: { x: 5, y: 82, width: 88, height: 7,  fontFamily: 'Inter', fontSize: 12, visible: true },
};

export type ElementKey = 'title' | 'description';
type DragMode = 'move' | 'resize';

interface CanvasProps {
  backgroundUrl: string;
  mockupUrl: string | null;
  value: TextLayout | null;
  onChange: (layout: TextLayout) => void;
  aspectRatio: string;
  maxWidth?: string;
  titleText?: string;
  descriptionText?: string;
}

/** Canvas with background image, mockup overlay, and draggable+resizable text boxes. */
export function MockupCanvas({
  backgroundUrl,
  mockupUrl,
  value,
  onChange,
  aspectRatio,
  maxWidth = '220px',
  titleText = 'Título da Notícia',
  descriptionText = 'Subtítulo do post',
}: CanvasProps) {
  const layout: TextLayout = value ?? DEFAULT_LAYOUT;
  const containerRef = useRef<HTMLDivElement>(null);

  const dragging = useRef<{
    key: ElementKey;
    mode: DragMode;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const update = useCallback(
    (key: ElementKey, patch: Partial<TextElementLayout>) => {
      onChange({ ...layout, [key]: { ...layout[key], ...patch } });
    },
    [layout, onChange],
  );

  const startDrag = useCallback(
    (key: ElementKey, mode: DragMode, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = layout[key];
      dragging.current = {
        key, mode,
        startX: e.clientX, startY: e.clientY,
        origX: el.x, origY: el.y,
        origW: el.width  ?? 88,
        origH: el.height ?? 8,
      };
    },
    [layout],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragging.current;
      if (!d || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width)  * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;

      if (d.mode === 'move') {
        update(d.key, {
          x: Math.max(0, Math.min(95, d.origX + dx)),
          y: Math.max(0, Math.min(98, d.origY + dy)),
        });
      } else {
        update(d.key, {
          width:  Math.max(8,  Math.min(100, d.origW + dx)),
          height: Math.max(3,  d.origH + dy),
        });
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [update]);

  return (
    <div className="flex justify-center w-full">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg select-none w-full"
        style={{ aspectRatio, maxWidth, background: '#111' }}
      >
        {/* Background */}
        <img
          src={backgroundUrl}
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Mockup overlay */}
        {mockupUrl && (
          <img
            src={mockupUrl}
            alt="mockup"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* Text bounding boxes */}
        {(['title', 'description'] as ElementKey[]).map(key => {
          const el = layout[key];
          if (!el.visible) return null;
          const elW = el.width  ?? 88;
          const elH = el.height ?? 8;

          return (
            <div
              key={key}
              className="absolute group"
              style={{
                left:      `${el.x}%`,
                top:       `${el.y}%`,
                width:     `${elW}%`,
                minHeight: `${elH}%`,
                cursor:    'move',
                boxSizing: 'border-box',
                padding:   '2px 4px',
                border:    '1.5px dashed rgba(255,255,255,0.55)',
                borderRadius: '2px',
              }}
              onMouseDown={(e) => startDrag(key, 'move', e)}
            >
              {/* Text content */}
              <span
                style={{
                  display:    'block',
                  fontFamily: el.fontFamily,
                  fontSize:   `${el.fontSize}px`,
                  fontWeight: el.bold ? 'bold' : 'normal',
                  color:      el.color || '#fff',
                  textShadow: el.bgEnabled ? 'none' : '0 1px 5px rgba(0,0,0,0.85)',
                  lineHeight: 1.25,
                  wordBreak:  'break-word',
                  pointerEvents: 'none',
                  backgroundColor: el.bgEnabled ? (el.bgColor || '#000000') : 'transparent',
                  padding: el.bgEnabled ? '4px 8px' : '0px',
                  borderRadius: el.bgEnabled ? '4px' : '0px',
                }}
              >
                {key === 'title' ? titleText : descriptionText}
              </span>

              {/* Label badge */}
              <span
                className="absolute -top-4 left-0 text-[8px] font-semibold px-1 py-0.5 rounded-sm"
                style={{
                  background: key === 'title' ? 'rgba(139,92,246,0.85)' : 'rgba(16,185,129,0.85)',
                  color: '#fff',
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
              >
                {key === 'title' ? 'TÍTULO' : 'SUBTÍTULO'}
              </span>

              {/* Resize grip — bottom-right corner */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                onMouseDown={(e) => startDrag(key, 'resize', e)}
              >
                {/* 3-dot resize icon */}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="7" cy="7" r="1" fill="white" opacity="0.9" />
                  <circle cx="4" cy="7" r="1" fill="white" opacity="0.6" />
                  <circle cx="7" cy="4" r="1" fill="white" opacity="0.6" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
