/**
 * SSE event names — shared between orchestrator (emitter) and Step5Research (consumer)
 * so typos fail at compile time.
 */
export const SSE_EVENT = {
  STATUS:           'status',
  MODULE_STATUS:    'module_status',
  CHUNK:            'chunk',
  CHAPTER:          'chapter',
  CHAPTER_INDEX:    'chapter_index',
  CHAPTER_START:    'chapter_start',
  CHAPTER_COMPLETE: 'chapter_complete',
  COST_UPDATE:      'cost_update',
  COST_EXCEEDED:    'cost_exceeded',
  WARNING:          'warning',
  COMPLETE:         'complete',
  ERROR:            'error',
  PING:             'ping',
} as const;

export type SseEvent = typeof SSE_EVENT[keyof typeof SSE_EVENT];
