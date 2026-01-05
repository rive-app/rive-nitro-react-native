import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRiveFile } from '../useRiveFile';
import type { RiveFile } from '../../specs/RiveFile.nitro';

jest.mock('react-native/Libraries/Image/Image', () => ({
  resolveAssetSource: jest.fn((source: number) => ({
    uri: `asset://resolved/${source}`,
  })),
}));

describe('useRiveFile - input stability', () => {
  const mockRiveFile: RiveFile = {
    dispose: jest.fn(),
    updateReferencedAssets: jest.fn(),
    viewModelCount: 0,
    viewModelByIndex: jest.fn(),
    viewModelByName: jest.fn(),
    defaultArtboardViewModel: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // fromSource internally calls fromURL for http(s) URIs
    (global as any).mockRiveFileFactory.fromURL.mockResolvedValue(mockRiveFile);
  });

  it('should not reload file when input object reference changes but uri is the same', async () => {
    const { result, rerender } = renderHook(
      (props: { input: { uri: string } }) => useRiveFile(props.input),
      { initialProps: { input: { uri: 'https://example.com/animation.riv' } } }
    );

    await waitFor(() => {
      expect((result.current as any).isLoading).toBe(false);
    });

    const callCountBefore = (global as any).mockRiveFileFactory.fromURL.mock
      .calls.length;

    await act(async () => {
      // Pass NEW object reference with SAME uri value
      rerender({ input: { uri: 'https://example.com/animation.riv' } });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const callCountAfter = (global as any).mockRiveFileFactory.fromURL.mock
      .calls.length;
    expect(callCountAfter).toBe(callCountBefore);
  });
});

describe('useRiveFile - updateReferencedAssets', () => {
  const mockRiveFile: RiveFile = {
    dispose: jest.fn(),
    updateReferencedAssets: jest.fn(),
    viewModelCount: 0,
    viewModelByIndex: jest.fn(),
    viewModelByName: jest.fn(),
    defaultArtboardViewModel: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).mockRiveFileFactory.fromURL.mockResolvedValue(mockRiveFile);
    (global as any).mockRiveFileFactory.fromResource.mockResolvedValue(
      mockRiveFile
    );
  });

  it('should call updateReferencedAssets when referencedAssets change', async () => {
    const initialAssets = {
      'asset-1': { source: { uri: 'https://example.com/image1.png' } },
    };

    const { result, rerender } = renderHook(
      (props: { referencedAssets: any }) =>
        useRiveFile('https://example.com/animation.riv', {
          referencedAssets: props.referencedAssets,
        }),
      { initialProps: { referencedAssets: initialAssets } }
    );

    await waitFor(() => {
      expect((result.current as any).isLoading).toBe(false);
    });

    expect(mockRiveFile.updateReferencedAssets).not.toHaveBeenCalled();

    const updatedAssets = {
      'asset-1': { source: { uri: 'https://example.com/image2.png' } },
    };

    rerender({ referencedAssets: updatedAssets });

    await waitFor(() => {
      expect(mockRiveFile.updateReferencedAssets).toHaveBeenCalledWith({
        data: {
          'asset-1': { sourceUrl: 'https://example.com/image2.png' },
        },
      });
    });
  });

  it('should handle multiple asset changes', async () => {
    const initialAssets = {
      'asset-1': { source: { uri: 'https://example.com/image1.png' } },
      'asset-2': { source: { uri: 'https://example.com/image2.png' } },
    };

    const { result, rerender } = renderHook(
      (props: { referencedAssets: any }) =>
        useRiveFile('https://example.com/animation.riv', {
          referencedAssets: props.referencedAssets,
        }),
      { initialProps: { referencedAssets: initialAssets } }
    );

    await waitFor(() => {
      expect((result.current as any).isLoading).toBe(false);
    });

    const updatedAssets = {
      'asset-1': { source: { uri: 'https://example.com/image1-new.png' } },
      'asset-2': { source: { uri: 'https://example.com/image2-new.png' } },
    };

    rerender({ referencedAssets: updatedAssets });

    await waitFor(() => {
      expect(mockRiveFile.updateReferencedAssets).toHaveBeenCalledWith({
        data: {
          'asset-1': { sourceUrl: 'https://example.com/image1-new.png' },
          'asset-2': { sourceUrl: 'https://example.com/image2-new.png' },
        },
      });
    });
  });

  it('should not call updateReferencedAssets if assets have not changed', async () => {
    const assets = {
      'asset-1': { source: { uri: 'https://example.com/image1.png' } },
    };

    const { result, rerender } = renderHook(
      (props: { referencedAssets: any }) =>
        useRiveFile('https://example.com/animation.riv', {
          referencedAssets: props.referencedAssets,
        }),
      { initialProps: { referencedAssets: assets } }
    );

    await waitFor(() => {
      expect((result.current as any).isLoading).toBe(false);
    });

    rerender({ referencedAssets: assets });

    expect(mockRiveFile.updateReferencedAssets).not.toHaveBeenCalled();
  });
});
