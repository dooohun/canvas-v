import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
  it('renders the pipeline canvas with its add-node toolbar', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /text node/i })).toBeInTheDocument();
  });
});
