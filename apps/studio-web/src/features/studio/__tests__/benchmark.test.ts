import { describe, expect, it } from 'vitest';
import { createRoot } from '../document';
import { insertNode, moveNode, updateProps } from '../tree';
import type { MuipNode } from '@microapp/runtime-web';

/**
 * Builder responsiveness budget (plan §4.4): a 200-node document must accept an
 * add/move/prop operation in under 50 ms so typing and dragging never feel laggy.
 * The measurement is wall-clock on the CI machine, so the assertion is generous
 * but still catches an accidental O(n²) rewrite of a tree operation.
 */
const NODE_BUDGET = 200;
const OPERATION_BUDGET_MS = 50;

function buildDocument(): MuipNode {
  const children: MuipNode[] = [];
  for (let index = 0; index < NODE_BUDGET - 1; index += 1) {
    children.push({ type: 'Badge', id: `badge-${index}`, props: { text: `Label ${index}` } });
  }
  return createRoot(children);
}

describe('builder benchmark', () => {
  it(`keeps 20 tree operations on a ${NODE_BUDGET}-node document under ${OPERATION_BUDGET_MS} ms each`, () => {
    let root = buildDocument();
    const durations: number[] = [];

    for (let step = 0; step < 20; step += 1) {
      const started = performance.now();
      if (step % 3 === 0) {
        root = insertNode(root, 'root', 0, { type: 'Badge', id: `added-${step}`, props: { text: 'x' } });
      } else if (step % 3 === 1) {
        root = moveNode(root, `badge-${step}`, 'root', 0);
      } else {
        root = updateProps(root, `badge-${step}`, { text: `edited ${step}` });
      }
      durations.push(performance.now() - started);
    }

    expect(root.children?.length).toBeGreaterThanOrEqual(NODE_BUDGET - 1);
    const slowest = Math.max(...durations);
    expect(slowest, `slowest operation took ${slowest.toFixed(2)} ms`).toBeLessThan(OPERATION_BUDGET_MS);
  });
});
