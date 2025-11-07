import type { HybridViewProps } from 'react-native-nitro-modules';
import type { RiveFile } from '../specs/RiveFile.nitro';
import '../specs/RiveView.nitro';
import type { Alignment } from './Alignment';
import type { Fit } from './Fit';
import { NitroRiveView } from 'react-native-rive';
import type { ReferencedAssets } from '../hooks/useRiveFile';
import type { RiveFileInput } from '../../lib/typescript/src';
import { useRiveFile } from '../hooks/useRiveFile';
import { ActivityIndicator, Text } from 'react-native';
import type { ComponentProps } from 'react';

export interface RiveViewProps
  extends Omit<ComponentProps<typeof NitroRiveView>, 'file'> {
  /** Name of the artboard to display from the Rive file */
  artboardName?: string;
  /** Name of the state machine to play */
  stateMachineName?: string;
  /** Whether to automatically bind the state machine and artboard */
  autoBind?: boolean;
  /** Whether to automatically start playing the state machine */
  autoPlay?: boolean;
  /** The Rive file to be displayed */
  file: RiveFile | RiveFileInput;
  /** How the Rive graphic should be aligned within its container */
  alignment?: Alignment;
  /** How the Rive graphic should fit within its container */
  fit?: Fit;
  /** The scale factor to apply to the Rive graphic when using Fit.Layout */
  layoutScaleFactor?: number;
  /** Referenced assets for out-of-band asset loading */
  referencedAssets?: ReferencedAssets;
}

function isNitroFile(file: RiveFile | RiveFileInput): file is RiveFile {
  return (
    typeof file === 'object' &&
    '__type' in file &&
    file.__type === 'HybridObject<RiveFile>'
  );
}

function RiveViewWithFileInput(
  props: Omit<RiveViewProps, 'file'> & {
    file: RiveFileInput;
    referencedAssets?: ReferencedAssets;
  }
) {
  const { file, referencedAssets, ...rest } = props;
  const { riveFile, isLoading, error } = useRiveFile(file, referencedAssets);

  if (isLoading) {
    return <ActivityIndicator />;
  } else if (error != null) {
    return <Text>{error}</Text>;
  } else {
    return <NitroRiveView {...rest} file={riveFile} />;
  }
}

export function RiveView(props: RiveViewProps) {
  const { file, referencedAssets, ...rest } = props;

  if (isNitroFile(file)) {
    return <NitroRiveView {...rest} file={file} />;
  } else {
    return (
      <RiveViewWithFileInput
        {...rest}
        file={file}
        referencedAssets={referencedAssets}
      />
    );
  }
}
