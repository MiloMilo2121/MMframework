export const CHAPTER_STATUS = {
  PENDING: 'pending',
  WRITING: 'writing',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type ChapterStatus = typeof CHAPTER_STATUS[keyof typeof CHAPTER_STATUS];

export const STATUS_COLOR: Record<ChapterStatus, string> = {
  pending: '#1F2937',
  writing: 'var(--accent-primary)',
  done:    '#22C55E',
  error:   '#EF4444',
};
