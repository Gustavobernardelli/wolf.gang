import { useQuery } from '@tanstack/react-query';
import { mockupsService } from '@/services/mockups/mockups.service';

export function useMockupFormatSpecs() {
  return useQuery({
    queryKey: ['mockup-format-specs'],
    queryFn: () => mockupsService.getFormatSpecs(),
    staleTime: Infinity, // These specs rarely change
  });
}
