import type { AnyMap } from 'react-native-nitro-modules';

// export interface RiveEvent {
//   name: string;
//   type: number;
//   delay?: number;
//   //   properties?: RiveEventProperties;
// }

// export interface RiveEvent {
//   name: string;
//   type: number;
//   delay?: number;
// }

// export interface RiveGeneralEvent extends RiveEvent {}

// export interface RiveOpenUrlEvent extends RiveEvent {
//   url?: string;
//   target?: string;
// }

// export type RiveEventType = RiveGeneralEvent | RiveOpenUrlEvent;

// TODO: Nitro is failing with more complex inherrited types, so we're using AnyMap for now

export enum RiveEventType {
  General,
  OpenUrl,
}

// export type EventPropertiesOutput = number | boolean | string;

export interface RiveEvent {
  name: string;
  type: RiveEventType;
  delay?: number;
  // properties?: Record<string, EventPropertiesOutput>; // TODO: This is failing on Nitro android
  properties?: AnyMap;
  url?: string;
  target?: string;
}
