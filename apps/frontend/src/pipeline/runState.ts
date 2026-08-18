import type { PipelineNode } from '@repo/shared-types';
import { GENERATE_REQUEST_TIMEOUT_MS } from '@/api/generation';

/**
 * A run older than this is treated as abandoned even if its owner is still connected — the owner
 * may have been suspended (background tab, sleeping machine) without finishing the request. The
 * margin over the request timeout absorbs clock skew between peers, since `startedAt` is written
 * with the owner's clock and compared against the reader's.
 */
export const RUN_TIMEOUT_MS = GENERATE_REQUEST_TIMEOUT_MS + 30_000;

/**
 * A `pending` node is only recoverable by the client that started it (it holds the in-flight
 * request), so peers must be able to tell a live run from one whose owner is gone. Without this
 * the node would stay `pending` forever and its run button would stay disabled — the node could
 * only be deleted. See docs/architecture.md "실행 상태(pending) 소유권과 회수".
 */
export function isRunAbandoned(
  node: PipelineNode,
  activeClientIds: ReadonlySet<number>,
  now: number = Date.now(),
): boolean {
  if (node.type === 'textPrompt' || node.status !== 'pending') return false;
  const run = node.pendingRun;
  if (run === null) return true;
  if (!activeClientIds.has(run.clientId)) return true;
  return now - run.startedAt > RUN_TIMEOUT_MS;
}

export function collectAbandonedRunNodeIds(
  nodes: PipelineNode[],
  activeClientIds: ReadonlySet<number>,
  now: number = Date.now(),
): Set<string> {
  const abandoned = new Set<string>();
  for (const node of nodes) {
    if (isRunAbandoned(node, activeClientIds, now)) abandoned.add(node.id);
  }
  return abandoned;
}
