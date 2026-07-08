/**
 * Outer WS envelope tag. See docs/data-model.md section 5 and
 * docs/ws-protocol.md section 2 — the payload's own byte format is defined
 * by y-protocols/sync and y-protocols/awareness, not reimplemented here.
 */
export const WS_MESSAGE_TYPE = {
  SYNC: 0,
  AWARENESS: 1,
} as const;

export type WsMessageType = (typeof WS_MESSAGE_TYPE)[keyof typeof WS_MESSAGE_TYPE];
