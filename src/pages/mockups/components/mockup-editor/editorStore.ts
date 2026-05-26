import { create } from 'zustand';
import type { TextRegion } from '@/types/textRegion';
import type { Mockup } from '@/types/mockup';

interface EditorState {
  mockup: Mockup | null;
  selectedRegionId: string | null;
  zoom: number;
  setMockup: (mockup: Mockup | null) => void;
  setSelectedRegionId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  updateRegion: (regionId: string, updates: Partial<TextRegion>) => void;
  addRegion: (region: TextRegion) => void;
  removeRegion: (regionId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mockup: null,
  selectedRegionId: null,
  zoom: 1,
  setMockup: (mockup) => set({ mockup, selectedRegionId: null }),
  setSelectedRegionId: (id) => set({ selectedRegionId: id }),
  setZoom: (zoom) => set({ zoom }),
  updateRegion: (regionId, updates) => set((state) => {
    if (!state.mockup) return state;
    return {
      mockup: {
        ...state.mockup,
        text_regions: state.mockup.text_regions.map((r) => 
          r.id === regionId ? { ...r, ...updates } : r
        ),
      },
    };
  }),
  addRegion: (region) => set((state) => {
    if (!state.mockup) return state;
    return {
      mockup: {
        ...state.mockup,
        text_regions: [...state.mockup.text_regions, region],
      },
      selectedRegionId: region.id,
    };
  }),
  removeRegion: (regionId) => set((state) => {
    if (!state.mockup) return state;
    return {
      mockup: {
        ...state.mockup,
        text_regions: state.mockup.text_regions.filter((r) => r.id !== regionId),
      },
      selectedRegionId: state.selectedRegionId === regionId ? null : state.selectedRegionId,
    };
  }),
}));
