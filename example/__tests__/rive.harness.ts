import { describe, it } from 'react-native-harness';
import { suites } from '../src/testing/tests';

for (const suite of suites) {
  describe(suite.name, () => {
    for (const test of suite.tests) {
      it(test.name, test.fn);
    }
  });
}
