import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer, Group } from 'react-konva';
import { useEditorStore } from './editorStore';
import { calculateFitScale, getSafeAreas } from '@/lib/canvas/konvaHelpers';
import { useMockups } from '@/hooks/useMockups';
import { TextRegionToolbar } from './TextRegionToolbar';
import { TextRegionPanel } from './TextRegionPanel';
import { Button } from '@/components/ui/button';
import { Save, ChevronLeft, ZoomIn, ZoomOut } from 'lucide-react';
import useImage from 'use-image';

interface MockupCanvasEditorProps {
  mockupId: string;
  onClose: () => void;
}

export function MockupCanvasEditor({ mockupId, onClose }: MockupCanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  
  const { mockup, setMockup, selectedRegionId, setSelectedRegionId, zoom, setZoom, updateRegion } = useEditorStore();
  const { mockups, updateMockup, isUpdating } = useMockups(mockup?.publication_source_id);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);

  // Load the current mockup into store
  useEffect(() => {
    const currentMockup = mockups?.find(m => m.id === mockupId);
    if (currentMockup) {
      setMockup(currentMockup);
    }
  }, [mockupId, mockups, setMockup]);

  // Handle resizing of container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && mockup) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        
        const scale = calculateFitScale(clientWidth, clientHeight, mockup.width, mockup.height);
        setStageScale(scale);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [mockup]);

  const [mockupImage] = useImage(mockup?.asset_id ? `https://atkstqfnwdbwhplukkiq.supabase.co/storage/v1/object/public/Midia/${mockup.asset_id}` : '');

  const handleStageClick = (e: any) => {
    // deselect when clicked on empty area
    if (e.target === e.target.getStage() || e.target.name() === 'mockup-image') {
      setSelectedRegionId(null);
      return;
    }
  };

  const handleSave = async () => {
    if (!mockup) return;
    await updateMockup({
      id: mockup.id,
      payload: {
        text_regions: mockup.text_regions,
        image_slot: mockup.image_slot,
        background_layer: mockup.background_layer,
      }
    });
    onClose();
  };

  if (!mockup) return null;

  const safeAreas = getSafeAreas(mockup.format, mockup.width, mockup.height);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Toolbar Left */}
      <TextRegionToolbar />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-[#080b14] overflow-hidden">
        {/* Canvas Header */}
        <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-between px-4 z-10">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/5">
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <span className="text-sm font-medium text-white/90">{mockup.name}</span>
            <span className="text-xs text-white/40 uppercase ml-2">{mockup.format} • {mockup.width}x{mockup.height}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white/5 rounded-md p-1 mr-4 border border-white/5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-mono w-10 text-center text-white/60">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => setZoom(zoom + 0.1)}>
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              <Save className="h-4 w-4 mr-2" /> Salvar Mockup
            </Button>
          </div>
        </div>

        {/* The Stage */}
        <div ref={containerRef} className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
          <div 
            style={{ 
              width: mockup.width * stageScale * zoom, 
              height: mockup.height * stageScale * zoom,
              transition: 'all 0.1s ease-out'
            }}
          >
            <Stage
              ref={stageRef}
              width={mockup.width}
              height={mockup.height}
              scaleX={stageScale * zoom}
              scaleY={stageScale * zoom}
              onMouseDown={handleStageClick}
              onTouchStart={handleStageClick}
              className="shadow-2xl bg-[#0c1120]"
            >
              <Layer>
                {/* 1. Background Layer */}
                {mockup.background_layer?.enabled && (
                  <Rect 
                    width={mockup.width} 
                    height={mockup.height} 
                    fill={mockup.background_layer.color || '#000000'} 
                  />
                )}

                {/* 2. Image Slot Placeholder */}
                {mockup.image_slot?.enabled && (
                  <Rect 
                    x={mockup.image_slot.x || 0}
                    y={mockup.image_slot.y || 0}
                    width={mockup.image_slot.width || mockup.width}
                    height={mockup.image_slot.height || 600}
                    fill="#e5e5e5"
                    stroke="#d4d4d4"
                    strokeWidth={2}
                    dash={[10, 10]}
                  />
                )}

                {/* 3. Mockup Image (The PNG) */}
                {mockupImage && (
                  <KonvaImage 
                    image={mockupImage} 
                    width={mockup.width} 
                    height={mockup.height} 
                    name="mockup-image"
                    listening={true}
                  />
                )}

                {/* 4. Text Regions */}
                {mockup.text_regions.map((region) => (
                  <Group
                    key={region.id}
                    id={region.id}
                    x={region.x}
                    y={region.y}
                    width={region.width}
                    height={region.height}
                    rotation={region.rotation}
                    draggable
                    onClick={() => setSelectedRegionId(region.id)}
                    onDragEnd={(e) => {
                      updateRegion(region.id, { x: e.target.x(), y: e.target.y() });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      // reset scale to 1 and update width/height instead
                      node.scaleX(1);
                      node.scaleY(1);
                      
                      updateRegion(region.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                        rotation: node.rotation()
                      });
                    }}
                  >
                    <Rect 
                      width={region.width}
                      height={region.height}
                      fill={selectedRegionId === region.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                      stroke={selectedRegionId === region.id ? '#3b82f6' : 'transparent'}
                      strokeWidth={1 / (stageScale * zoom)}
                    />
                    <Text 
                      text={region.placeholder_text}
                      width={region.width}
                      height={region.height}
                      fontFamily={region.font_family}
                      fontSize={region.font_size_px}
                      fontStyle={region.font_weight >= 700 ? 'bold' : 'normal'}
                      fill={region.color}
                      align={region.alignment}
                      verticalAlign={region.vertical_alignment}
                      textTransform={region.uppercase ? 'uppercase' : 'none'}
                      lineHeight={region.line_height}
                      letterSpacing={region.letter_spacing}
                      stroke={region.stroke.enabled ? region.stroke.color : undefined}
                      strokeWidth={region.stroke.enabled ? region.stroke.width : 0}
                      shadowColor={region.shadow.enabled ? region.shadow.color : undefined}
                      shadowBlur={region.shadow.enabled ? region.shadow.blur : 0}
                      shadowOffset={region.shadow.enabled ? { x: region.shadow.offset_x, y: region.shadow.offset_y } : undefined}
                      listening={false}
                    />
                  </Group>
                ))}

                {/* 5. Transformer for selection */}
                {selectedRegionId && (
                  <Transformer
                    ref={transformerRef}
                    nodes={stageRef.current?.findOne(`#${selectedRegionId}`) ? [stageRef.current?.findOne(`#${selectedRegionId}`)] : []}
                    boundBoxFunc={(oldBox, newBox) => {
                      // limit resize
                      if (newBox.width < 10 || newBox.height < 10) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                )}

                {/* 6. Safe Areas Overlay */}
                {(mockup.format === 'stories' || mockup.format === 'reels') && (
                  <>
                    {/* Top safe area */}
                    <Rect 
                      x={0} y={0} width={mockup.width} height={safeAreas.top} 
                      fill="rgba(239, 68, 68, 0.05)" 
                      stroke="rgba(239, 68, 68, 0.2)" strokeWidth={2} dash={[5, 5]}
                    />
                    {/* Bottom safe area */}
                    <Rect 
                      x={0} y={mockup.height - safeAreas.bottom} width={mockup.width} height={safeAreas.bottom} 
                      fill="rgba(239, 68, 68, 0.05)" 
                      stroke="rgba(239, 68, 68, 0.2)" strokeWidth={2} dash={[5, 5]}
                    />
                  </>
                )}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Properties Panel Right */}
      <TextRegionPanel />
    </div>
  );
}
