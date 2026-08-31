import { describe, expect, it } from 'vitest';
import type { PipelineEdge, PipelineNode } from '@repo/shared-types';
import { composeInputPrompt, composeInputPromptsByNodeId } from '../promptComposition';

function textPrompt(id: string, prompt: string, x = 0, y = 0): PipelineNode {
  return { id, type: 'textPrompt', position: { x, y }, prompt };
}

function generateImage(id: string): PipelineNode {
  return {
    id,
    type: 'generateImage',
    position: { x: 500, y: 0 },
    status: 'idle',
    imageUrl: null,
    errorMessage: null,
    pendingRun: null,
  };
}

function edge(id: string, sourceNodeId: string, targetNodeId: string): PipelineEdge {
  return { id, sourceNodeId, targetNodeId };
}

describe('composeInputPrompt', () => {
  it('returns an empty string when nothing is connected', () => {
    const nodes = [generateImage('img'), textPrompt('t1', 'unconnected')];

    expect(composeInputPrompt(nodes, [], 'img')).toBe('');
  });

  it('returns the single connected prompt, trimmed', () => {
    const nodes = [generateImage('img'), textPrompt('t1', '  a neon jellyfish  ')];
    const edges = [edge('e1', 't1', 'img')];

    expect(composeInputPrompt(nodes, edges, 'img')).toBe('a neon jellyfish');
  });

  it('joins fan-in prompts with a newline ordered top-to-bottom then left-to-right', () => {
    const nodes = [
      generateImage('img'),
      textPrompt('t-bottom', 'bottom', 0, 200),
      textPrompt('t-top-right', 'top right', 300, 0),
      textPrompt('t-top-left', 'top left', 0, 0),
    ];
    const edges = [
      edge('e1', 't-bottom', 'img'),
      edge('e2', 't-top-right', 'img'),
      edge('e3', 't-top-left', 'img'),
    ];

    expect(composeInputPrompt(nodes, edges, 'img')).toBe('top left\ntop right\nbottom');
  });

  it('breaks ties on identical positions by node id so every peer composes the same string', () => {
    const nodes = [generateImage('img'), textPrompt('b', 'second'), textPrompt('a', 'first')];
    const edges = [edge('e1', 'b', 'img'), edge('e2', 'a', 'img')];

    expect(composeInputPrompt(nodes, edges, 'img')).toBe('first\nsecond');
    expect(composeInputPrompt([...nodes].reverse(), [...edges].reverse(), 'img')).toBe(
      'first\nsecond',
    );
  });

  it('skips blank prompts and edges that target another node', () => {
    const nodes = [
      generateImage('img'),
      generateImage('other'),
      textPrompt('t1', '   ', 0, 0),
      textPrompt('t2', 'kept', 0, 100),
      textPrompt('t3', 'elsewhere', 0, 200),
    ];
    const edges = [edge('e1', 't1', 'img'), edge('e2', 't2', 'img'), edge('e3', 't3', 'other')];

    expect(composeInputPrompt(nodes, edges, 'img')).toBe('kept');
  });

  it('maps every generateImage node to its resolved prompt', () => {
    const nodes = [generateImage('img'), generateImage('empty'), textPrompt('t1', 'hello')];
    const edges = [edge('e1', 't1', 'img')];

    expect(composeInputPromptsByNodeId(nodes, edges)).toEqual(
      new Map([
        ['img', 'hello'],
        ['empty', ''],
      ]),
    );
  });
});
