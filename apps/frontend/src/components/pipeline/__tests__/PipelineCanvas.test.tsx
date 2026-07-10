import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PipelineCanvas } from '../PipelineCanvas';

describe('PipelineCanvas', () => {
  it('renders add-node buttons for all three node types', () => {
    render(<PipelineCanvas />);

    expect(screen.getByRole('button', { name: /text node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /image node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3d node/i })).toBeInTheDocument();
  });

  it('adds a Text Prompt node card when the toolbar button is clicked', async () => {
    const user = userEvent.setup();
    render(<PipelineCanvas />);

    await user.click(screen.getByRole('button', { name: /text node/i }));

    expect(screen.getByText('Text Prompt')).toBeInTheDocument();
  });

  it('adds Generate Image and Generate 3D node cards when their toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    render(<PipelineCanvas />);

    await user.click(screen.getByRole('button', { name: /image node/i }));
    await user.click(screen.getByRole('button', { name: /3d node/i }));

    expect(screen.getByText('Generate Image')).toBeInTheDocument();
    expect(screen.getByText('3D Mesh Synth')).toBeInTheDocument();
  });
});
