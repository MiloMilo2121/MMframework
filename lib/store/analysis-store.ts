'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Analysis, AnalysisStatus, AnalysisVectorConfig } from '@/lib/types/analysis';
import type { HandoffData1, HandoffOperativo } from '@/lib/types/handoff';

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
    vectorConfig?: AnalysisVectorConfig;
  }) => string;

  updateAnalysis: (id: string, updates: Partial<Analysis>) => void;
  updateStatus: (id: string, status: AnalysisStatus, errorMessage?: string) => void;
  setHandoffData1: (id: string, data: HandoffData1, rawText: string) => void;
  setReportPart1: (id: string, text: string, contextBridge: string) => void;
  setReportPart2: (id: string, text: string, handoffOperativo: HandoffOperativo | null) => void;
  setConclusions: (id: string, text: string) => void;
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
          vectorConfig: input.vectorConfig,
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
          // Keep full text only for completed analyses
          reportPart1: a.status === 'complete' ? a.reportPart1 : a.reportPart1?.slice(0, 1000),
          reportPart2: a.status === 'complete' ? a.reportPart2 : undefined,
          snapshotRawText: undefined,
          handoffData1RawText: undefined,
        })),
      }),
    }
  )
);
