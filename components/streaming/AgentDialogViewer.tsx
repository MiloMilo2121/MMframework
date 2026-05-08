'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { CritiqueRound, CritiqueMessage, Severity } from '@/lib/agents/types';
import { REVIEWER_LABELS } from '@/lib/agents/types';

interface Props {
  rounds: Record<number, CritiqueRound[]>;
  chapterTitles: Record<number, string>;
}

const severityColor: Record<Severity, string> = {
  none: '#22C55E',
  minor: '#F59E0B',
  major: '#EA580C',
  blocker: '#DC2626',
};

const severityIcon: Record<Severity, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  none: CheckCircle2,
  minor: Info,
  major: AlertTriangle,
  blocker: AlertCircle,
};

export function AgentDialogViewer({ rounds, chapterTitles }: Props) {
  const chapterNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  if (chapterNumbers.length === 0) {
    return (
      <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Nessun dialogo agenti ancora disponibile.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chapterNumbers.map((num) => (
        <ChapterDialogBlock
          key={num}
          chapterNumber={num}
          title={chapterTitles[num] ?? `Cap ${num}`}
          rounds={rounds[num] ?? []}
        />
      ))}
    </div>
  );
}

function ChapterDialogBlock({
  chapterNumber,
  title,
  rounds,
}: {
  chapterNumber: number;
  title: string;
  rounds: CritiqueRound[];
}) {
  const [open, setOpen] = useState(false);
  const totalCritiques = rounds.reduce((s, r) => s + r.critiques.length, 0);
  const maxSeverity = computeMaxSeverity(rounds);

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            CAP {chapterNumber} — {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: severityColor[maxSeverity] + '20', color: severityColor[maxSeverity] }}
          >
            {rounds.length} round{rounds.length === 1 ? '' : 's'} · {totalCritiques} critiche
          </span>
        </div>
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 border-t" style={{ borderColor: 'var(--border-brand)' }}>
          {rounds.map((round) => (
            <RoundBlock key={round.iteration} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoundBlock({ round }: { round: CritiqueRound }) {
  const grouped = groupByAgent(round.critiques);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <MessageSquare className="w-3 h-3" />
        <span>Round {round.iteration}</span>
        {round.durationMs && <span>· {(round.durationMs / 1000).toFixed(1)}s</span>}
        <span>· {round.critiques.length} critiche</span>
      </div>
      {round.critiques.length === 0 ? (
        <div className="text-xs italic pl-5" style={{ color: 'var(--text-secondary)' }}>
          Nessuna critica — draft pulito al primo passaggio.
        </div>
      ) : (
        <div className="space-y-2 pl-5">
          {Object.entries(grouped).map(([agent, list]) => (
            <AgentBlock key={agent} agent={agent} critiques={list} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentBlock({ agent, critiques }: { agent: string; critiques: CritiqueMessage[] }) {
  const [open, setOpen] = useState(false);
  const label = REVIEWER_LABELS[agent as keyof typeof REVIEWER_LABELS] ?? agent;
  const maxSev = critiques.reduce<Severity>((max, c) => severityRankCompare(c.severity, max), 'none');
  const Icon = severityIcon[maxSev];

  return (
    <div className="border-l-2 pl-2" style={{ borderColor: severityColor[maxSev] + '60' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 w-full text-left"
        style={{ color: severityColor[maxSev] }}
      >
        <Icon className="w-3 h-3" />
        <span>{label}</span>
        <span style={{ color: 'var(--text-secondary)' }}>· {critiques.length}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-2 mt-1.5 pl-5">
          {critiques.map((c, i) => (
            <CritiqueItem key={i} critique={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CritiqueItem({ critique }: { critique: CritiqueMessage }) {
  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide"
          style={{ backgroundColor: severityColor[critique.severity] + '20', color: severityColor[critique.severity] }}
        >
          {critique.severity}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {critique.category}
        </span>
      </div>
      <p style={{ color: 'var(--text-primary)' }}>{critique.claim}</p>
      {critique.evidence && (
        <p className="italic pl-2 border-l-2" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-brand)' }}>
          “{critique.evidence}”
        </p>
      )}
      <p style={{ color: 'var(--accent-dark)' }}>
        <strong>Fix:</strong> {critique.suggestion}
      </p>
    </div>
  );
}

function groupByAgent(critiques: CritiqueMessage[]): Record<string, CritiqueMessage[]> {
  const out: Record<string, CritiqueMessage[]> = {};
  for (const c of critiques) {
    (out[c.agent] ||= []).push(c);
  }
  return out;
}

function severityRankCompare(a: Severity, b: Severity): Severity {
  const order: Severity[] = ['none', 'minor', 'major', 'blocker'];
  return order.indexOf(a) > order.indexOf(b) ? a : b;
}

function computeMaxSeverity(rounds: CritiqueRound[]): Severity {
  let max: Severity = 'none';
  for (const r of rounds) {
    for (const c of r.critiques) {
      max = severityRankCompare(c.severity, max);
    }
  }
  return max;
}
