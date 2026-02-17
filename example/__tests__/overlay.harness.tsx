import { describe, it, expect, render, cleanup } from 'react-native-harness';
import { View } from 'react-native';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('Test overlay', () => {
  it('no UI element — overlay should be hidden', async () => {
    await delay(3000);
    expect(true).toBe(true);
  });

  it('renders a red ball — overlay should appear', async () => {
    await render(
      <View
        style={{
          flex: 1,
          backgroundColor: '#1a1a2e',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#ff3b30',
          }}
        />
      </View>
    );

    // Keep it visible for 5 seconds so you can expand the overlay
    await delay(5000);

    cleanup();
  });

  it('after cleanup — overlay should hide again', async () => {
    await delay(3000);
    expect(true).toBe(true);
  });
});
