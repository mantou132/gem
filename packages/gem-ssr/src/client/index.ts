import { setHydrationEngine } from '@mantou/gem';

import { hydrateContainer } from './hydration';

export { hydrateStores } from './store';

setHydrationEngine(hydrateContainer);
