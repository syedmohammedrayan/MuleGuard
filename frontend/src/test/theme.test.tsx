import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { MuleProvider, useMuleContext } from '@/context/MuleContext';

function TestConsumer() {
  const { settings, updateSettings } = useMuleContext();
  return (
    <div>
      <span data-testid="dark-flag">{String(settings.enableDarkTheme)}</span>
      <span data-testid="threshold">{settings.highRiskThreshold}</span>
      <button
        data-testid="attempt-dark"
        onClick={() => updateSettings({ enableDarkTheme: true as any })}
      >
        Attempt Dark
      </button>
      <button
        data-testid="update-threshold"
        onClick={() => updateSettings({ highRiskThreshold: 90 })}
      >
        Update Threshold
      </button>
    </div>
  );
}

describe('MuleGuard Light Theme Enforcement', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('initializes with enableDarkTheme false and no dark class on documentElement', () => {
    const { getByTestId } = render(
      <MuleProvider>
        <TestConsumer />
      </MuleProvider>
    );

    expect(getByTestId('dark-flag').textContent).toBe('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('overrides legacy localStorage containing enableDarkTheme = true', () => {
    // Simulate preexisting dark theme setting
    localStorage.setItem(
      'mule_settings',
      JSON.stringify({
        highRiskThreshold: 77,
        mediumRiskThreshold: 55,
        enableDarkTheme: true,
        detectCycles: true,
        detectSmurfing: true,
      })
    );
    document.documentElement.classList.add('dark');

    const { getByTestId } = render(
      <MuleProvider>
        <TestConsumer />
      </MuleProvider>
    );

    // enableDarkTheme is overridden to false
    expect(getByTestId('dark-flag').textContent).toBe('false');
    // Other settings are preserved
    expect(getByTestId('threshold').textContent).toBe('77');
    // documentElement does not have 'dark' class
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Stored localStorage has been sanitized
    const saved = JSON.parse(localStorage.getItem('mule_settings') || '{}');
    expect(saved.enableDarkTheme).toBe(false);
    expect(saved.highRiskThreshold).toBe(77);
  });

  it('prevents updateSettings from enabling dark mode while preserving other updates', () => {
    const { getByTestId } = render(
      <MuleProvider>
        <TestConsumer />
      </MuleProvider>
    );

    act(() => {
      getByTestId('attempt-dark').click();
    });

    expect(getByTestId('dark-flag').textContent).toBe('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      getByTestId('update-threshold').click();
    });

    expect(getByTestId('threshold').textContent).toBe('90');
    expect(getByTestId('dark-flag').textContent).toBe('false');
  });
});

