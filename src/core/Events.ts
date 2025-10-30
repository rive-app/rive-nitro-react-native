export enum RiveEventType {
  General,
  OpenUrl,
}

export type EventPropertiesOutput = number | boolean | string;

export interface UnifiedRiveEvent {
  name: string;
  type: RiveEventType;
  delay?: number;
  properties?: Record<string, EventPropertiesOutput>;
  url?: string;
  target?: string;
}

export type RiveEvent = {
  name: string;
  delay?: number;
  properties?: Record<string, EventPropertiesOutput>;
  type: RiveEventType;
} & (
  | {
      type: RiveEventType.General;
    }
  | {
      type: RiveEventType.OpenUrl;
      url?: string;
      target?: string;
    }
);
