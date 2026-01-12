import type { Metadata } from './helpers/metadata';

type PageType = React.ComponentType & { metadata?: Metadata };

export type PageItem = {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType;
};

const pagesContext = require.context('./pages', false, /\.tsx$/);

export const PagesList: PageItem[] = pagesContext.keys().map((key) => {
  const module = pagesContext(key) as { default: PageType };
  const Component = module.default;
  const id = key.replace(/^\.\//, '').replace(/\.tsx$/, '');

  return {
    id,
    name: Component.metadata?.name ?? id,
    description: Component.metadata?.description ?? '',
    component: Component,
  };
});
