'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Analysis, AnalysisStatus, ChapterEntry, CostSnapshot } from '@/lib/types/analysis';
import type { HandoffData1, HandoffOperativo } from '@/lib/types/handoff';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import type { CritiqueRound, StrategyThesis } from '@/lib/agents/types';
import type { CoherenceReport, InnovationScore } from '@/lib/agents/quality-pass';

interface AnalysisStore {
  analyses: Analysis[];
  activeAnalysisId: string | null;

  createAnalysis: (input: {
    clientName: string;
    clientUrl: string;
    sector: string;
    geography?: string;
    businessType?: 'b2b' | 'b2c' | 'mixed';
    notes?: string;
  }) => string;

  updateAnalysis: (id: string, updates: Partial<Analysis>) => void;
  updateStatus: (id: string, status: AnalysisStatus, errorMessage?: string) => void;
  setHandoffData1: (id: string, data: HandoffData1, rawText: string) => void;
  setReportPart1: (id: string, text: string, contextBridge: string) => void;
  setReportPart2: (id: string, text: string, handoffOperativo: HandoffOperativo | null) => void;
  setConclusions: (id: string, text: string) => void;
  setEffortTier: (id: string, tier: 1 | 2 | 3 | 4) => void;
  setChapterSpecs: (id: string, specs: ChapterSpec[]) => void;
  upsertChapter: (id: string, number: number, patch: Partial<ChapterEntry> & { title?: string }) => void;
  setCost: (id: string, cost: CostSnapshot) => void;
  appendCritiqueRound: (id: string, chapterNumber: number, round: CritiqueRound) => void;
  setStrategyThesis: (id: string, thesis: StrategyThesis) => void;
  setSelectedFrameworkIds: (id: string, ids: string[]) => void;
  setCoherenceReport: (id: string, report: CoherenceReport) => void;
  setInnovationScore: (id: string, score: InnovationScore) => void;
  setActive: (id: string | null) => void;
  getActive: () => Analysis | null;
  getById: (id: string) => Analysis | undefined;
  deleteAnalysis: (id: string) => void;
}

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      analyses: [],
      activeAnalysisId: null,

      createAnalysis: (input) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const analysis: Analysis = {
          id,
          clientName: input.clientName,
          clientUrl: input.clientUrl,
          sector: input.sector,
          geography: input.geography,
          businessType: input.businessType,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
          status: 'draft',
          metadata: {
            totalTokens: 0,
            generationTimeMs: 0,
            chaptersFound: 0,
            wordCount: 0,
          },
        };
        set((state) => ({ analyses: [...state.analyses, analysis], activeAnalysisId: id }));
        return id;
      },

      updateAnalysis: (id, updates) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      updateStatus: (id, status, errorMessage) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, status, errorMessage, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setHandoffData1: (id, data, rawText) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id
              ? { ...a, handoffData1: data, handoffData1RawText: rawText, status: 'blueprint', updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      setReportPart1: (id, text, contextBridge) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id
              ? { ...a, reportPart1: text, contextBridge, updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      setReportPart2: (id, text, handoffOperativo) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id
              ? {
                  ...a,
                  reportPart2: text,
                  handoffOperativo: handoffOperativo || a.handoffOperativo,
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }));
      },

      setConclusions: (id, text) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id
              ? { ...a, conclusions: text, status: 'complete', updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      setEffortTier: (id, tier) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, effortTier: tier, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setChapterSpecs: (id, specs) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, chapterSpecs: specs, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      upsertChapter: (id, number, patch) => {
        set((state) => ({
          analyses: state.analyses.map((a) => {
            if (a.id !== id) return a;
            const existing = a.chapters?.[number];
            const title      = patch.title      ?? existing?.title      ?? `Cap ${number}`;
            const text       = patch.text       ?? existing?.text       ?? '';
            const wordCount  = patch.wordCount  ?? existing?.wordCount  ?? 0;
            const status     = patch.status     ?? existing?.status     ?? 'pending';
            if (existing && existing.title === title && existing.text === text && existing.wordCount === wordCount && existing.status === status) {
              return a;
            }
            return {
              ...a,
              chapters: { ...(a.chapters || {}), [number]: { title, text, wordCount, status } },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setCost: (id, cost) => {
        set((state) => ({
          analyses: state.analyses.map((a) => {
            if (a.id !== id) return a;
            if (a.cost && a.cost.totalUsd === cost.totalUsd && a.cost.tokens === cost.tokens) return a;
            return { ...a, cost, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      appendCritiqueRound: (id, chapterNumber, round) => {
        set((state) => ({
          analyses: state.analyses.map((a) => {
            if (a.id !== id) return a;
            const existing = a.chapterCritiqueRounds?.[chapterNumber] ?? [];
            const updated = [...existing.filter((r) => r.iteration !== round.iteration), round];
            return {
              ...a,
              chapterCritiqueRounds: { ...(a.chapterCritiqueRounds || {}), [chapterNumber]: updated },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setStrategyThesis: (id, thesis) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, strategyThesis: thesis, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setSelectedFrameworkIds: (id, ids) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, selectedFrameworkIds: ids, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setCoherenceReport: (id, report) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, coherenceReport: report, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setInnovationScore: (id, score) => {
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, innovationScore: score, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      setActive: (id) => set({ activeAnalysisId: id }),

      getActive: () => {
        const { analyses, activeAnalysisId } = get();
        return analyses.find((a) => a.id === activeAnalysisId) || null;
      },

      getById: (id) => {
        return get().analyses.find((a) => a.id === id);
      },

      deleteAnalysis: (id) => {
        set((state) => ({
          analyses: state.analyses.filter((a) => a.id !== id),
          activeAnalysisId: state.activeAnalysisId === id ? null : state.activeAnalysisId,
        }));
      },
    }),
    {
      name: 'salesmap-storage',
      storage: createJSONStorage(() => localStorage),
      // Don't persist large report texts in localStorage to avoid quota errors
      partialize: (state) => ({
        ...state,
        analyses: state.analyses.map((a) => ({
          ...a,
          reportPart1: a.status === 'complete' ? a.reportPart1 : a.reportPart1?.slice(0, 1000),
          reportPart2: a.status === 'complete' ? a.reportPart2 : undefined,
          snapshotRawText: undefined,
          handoffData1RawText: undefined,
          // Exclude heavy chapter specs from localStorage; chapters text is kept for in-progress recovery
          chapterSpecs: undefined,
        })),
      }),
    }
  )
);
