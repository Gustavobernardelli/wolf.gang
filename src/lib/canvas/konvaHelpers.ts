export function calculateFitScale(
  containerWidth: number,
  containerHeight: number,
  originalWidth: number,
  originalHeight: number,
  padding: number = 40
): number {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  
  const scaleX = availableWidth / originalWidth;
  const scaleY = availableHeight / originalHeight;
  
  return Math.min(scaleX, scaleY, 1); // Never scale up beyond 1
}

export function getSafeAreas(format: string, width: number, height: number) {
  if (format === 'stories' || format === 'reels') {
    return {
      top: 250,
      bottom: 250
    };
  }
  return { top: 0, bottom: 0 };
}
