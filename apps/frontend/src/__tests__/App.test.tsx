import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

class InertWebSocket {
  binaryType = 'blob';
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send(): void {}
  close(): void {}
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', InertWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the pipeline canvas with its add-node toolbar', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /text node/i })).toBeInTheDocument();
  });

  it('renders the presence bar for the room taken from the URL', () => {
    render(<App />);

    expect(screen.getByTestId('presence-bar')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('연결 중');
  });
});
