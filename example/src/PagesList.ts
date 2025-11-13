import type { Metadata } from './helpers/metadata';
import * as Pages from './pages';

type PageIds = keyof typeof Pages;
type PageType = React.ComponentType & { metadata?: Metadata };

const PageEntries = Object.entries(Pages) as [PageIds, PageType][];

export type PageItem = {
  id: PageIds;
  name: string;
  description: string;
  component: React.ComponentType;
};

const PagesList: PageItem[] = PageEntries.map(([key, Component]) => ({
  id: key,
  name: Component.metadata?.name ?? key,
  description: Component.metadata?.description ?? '',
  component: Component,
}));

export { PagesList };
