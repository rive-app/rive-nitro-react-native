import { useState, useEffect } from 'react';
import { RiveFileFactory, type RiveFile } from 'react-native-rive';

export type RiveFileInput = number | { uri: string } | string | ArrayBuffer;

export function useRiveFile(input?: RiveFileInput) {
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) {
      setRiveFile(null);
      setIsLoading(false);
      return;
    }

    let currentFile: RiveFile | null = null;

    const loadRiveFile = async () => {
      try {
        const currentInput = input;

        if (typeof currentInput === 'string') {
          if (
            currentInput.startsWith('http://') ||
            currentInput.startsWith('https://')
          ) {
            currentFile = await RiveFileFactory.fromURL(currentInput);
          } else {
            currentFile = await RiveFileFactory.fromResource(currentInput);
          }
        } else if (typeof currentInput === 'number' || 'uri' in currentInput) {
          currentFile = await RiveFileFactory.fromSource(currentInput);
        } else if (currentInput instanceof ArrayBuffer) {
          currentFile = await RiveFileFactory.fromBytes(currentInput);
        }

        setRiveFile(currentFile);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : 'Failed to load Rive file'
        );
        setIsLoading(false);
      }
    };

    loadRiveFile();

    return () => {
      if (currentFile) {
        currentFile.release();
      }
    };
  }, [input]);

  return { riveFile, isLoading, error };
}
