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
  // Boardroom events (USE_BOARDROOM=true)
  RAG_LOOKUP_COMPLETE:    'rag_lookup_complete',
  STRATEGY_THESIS_READY:  'strategy_thesis_ready',
  OUTLINE_READY:          'outline_ready',
  WRITER_DRAFT_READY:     'writer_draft_ready',
  REVIEWER_STARTED:       'reviewer_started',
  REVIEWER_COMPLETE:      'reviewer_complete',
  CHAIR_VERDICT:          'chair_verdict',
  REVISION_REQUESTED:     'revision_requested',
  CHAPTER_PROMOTED:       'chapter_promoted',
  AGENT_DIALOG:           'agent_dialog',
  COHERENCE_REPORT:       'coherence_report',
  INNOVATION_SCORE:       'innovation_score',
} as const;

export type SseEvent = typeof SSE_EVENT[keyof typeof SSE_EVENT];
