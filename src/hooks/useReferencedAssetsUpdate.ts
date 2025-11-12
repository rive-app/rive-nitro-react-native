import { useRef, useEffect } from 'react';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { ResolvedReferencedAssets } from '../utils/riveFileLoading';

export function useReferencedAssetsUpdate(
  riveFile: RiveFile | null,
  referencedAssets: ResolvedReferencedAssets | undefined
) {
  const initialReferencedAssets = useRef(referencedAssets);

  useEffect(() => {
    if (initialReferencedAssets.current !== referencedAssets) {
      if (riveFile && referencedAssets) {
        riveFile.updateReferencedAssets({ data: referencedAssets });
        initialReferencedAssets.current = referencedAssets;
      }
    }
  }, [referencedAssets, riveFile]);
}
