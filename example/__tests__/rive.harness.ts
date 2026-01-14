import { describe, it } from 'react-native-harness';
import { allSuites } from '../src/testing/suites';

for (const suite of allSuites) {
  describe(suite.name, () => {
    for (const test of suite.tests) {
      it(test.name, async () => {
        await test.run();
      });
    }
  });
}
