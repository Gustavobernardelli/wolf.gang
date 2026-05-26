export type TextRegionRole = 'headline' | 'kicker' | 'credit' | 'subtitle' | 'custom';
export type TextAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export type TextRegion = {
  id: string;
  role: TextRegionRole;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alignment: TextAlignment;
  vertical_alignment: VerticalAlignment;
  font_family: string;
  font_weight: number;
  font_size_px: number;
  line_height: number;
  letter_spacing: number;
  color: string;
  stroke: {
    enabled: boolean;
    color: string;
    width: number;
  };
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offset_x: number;
    offset_y: number;
  };
  uppercase: boolean;
  max_lines: number;
  auto_shrink: boolean;
  auto_shrink_min_size: number;
  placeholder_text: string;
  z_index: number;
};
