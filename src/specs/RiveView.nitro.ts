import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';

export interface RiveViewProps extends HybridViewProps {
  autoPlay: boolean;
  autoBind: boolean;
}
export interface RiveViewMethods extends HybridViewMethods {
  play(): void;
  pause(): void;
}

export type RiveView = HybridView<RiveViewProps, RiveViewMethods>;
