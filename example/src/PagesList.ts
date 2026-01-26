import type { Metadata } from './shared/metadata';

type PageType = React.ComponentType & { metadata?: Metadata };

export type Category = 'demos' | 'exercisers' | 'tests' | 'reproducers';

export type PageItem = {
  id: string;
  name: string;
  description: string;
  order: number;
  category: Category;
  component: React.ComponentType;
};

function loadPagesFromContext(
  context: __MetroModuleApi.RequireContext,
  category: Category
): PageItem[] {
  return context
    .keys()
    .map((key) => {
      const module = context(key) as { default: PageType };
      const Component = module.default;
      const id = key.replace(/^\.\//, '').replace(/\.tsx$/, '');

      return {
        id,
        name: Component.metadata?.name ?? id,
        description: Component.metadata?.description ?? '',
        order: Component.metadata?.order ?? 999,
        category,
        component: Component,
      };
    })
    .sort((a, b) => a.order - b.order);
}

const demosContext = require.context('./demos', false, /\.tsx$/);
const exercisersContext = require.context('./exercisers', false, /\.tsx$/);
const testsContext = require.context('./tests', false, /\.tsx$/);
const reproducersContext = require.context('./reproducers', false, /\.tsx$/);

// Try to load local reproducers (gitignored)
let localReproducersContext: __MetroModuleApi.RequireContext | null = null;
try {
  localReproducersContext = require.context(
    './reproducers/local',
    false,
    /\.tsx$/
  );
} catch {
  // folder may be empty or not exist
}

export const DemosList = loadPagesFromContext(demosContext, 'demos');
export const ExercisersList = loadPagesFromContext(
  exercisersContext,
  'exercisers'
);
export const ReproducersList = [
  ...loadPagesFromContext(reproducersContext, 'reproducers'),
  ...(localReproducersContext
    ? loadPagesFromContext(localReproducersContext, 'reproducers')
    : []),
];

export const TestsList = loadPagesFromContext(testsContext, 'tests');

export const PagesList: PageItem[] = [
  ...DemosList,
  ...ExercisersList,
  ...TestsList,
  ...ReproducersList,
];

export const PagesListByCategory: Record<Category, PageItem[]> = {
  demos: DemosList,
  exercisers: ExercisersList,
  tests: TestsList,
  reproducers: ReproducersList,
};
