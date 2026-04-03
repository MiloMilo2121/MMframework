'use client';

import { useState } from 'react';
import { Step1ClientData } from './steps/Step1ClientData';
import { Step2Scouting } from './steps/Step2Scouting';
import { Step3Questionnaire } from './steps/Step3Questionnaire';
import { Step4Blueprint } from './steps/Step4Blueprint';
import { Step5Research } from './steps/Step5Research';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';

const DEFAULT_VECTOR: AnalysisVectorConfig = {
  effort_tier: 2,
  target_audience: { role: 'Titolare', age_bracket: '40-60', tech_literacy: 'medium', cynicism_level: 'standard' },
  strategic_modifiers: { international_context: false, include_ma_targets: false, include_blue_ocean: false },
};

const STEP_LABELS = [
  'Dati Cliente',
  'Scouting',
  'Questionario',
  'Blueprint',
  'Deep Research',
];

export function WizardShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisId, setAnalysisId] = useState('');
  const [questionnaire, setQuestionnaire] = useState('');
  const [materials, setMaterials] = useState<string | undefined>();
  const [vectorConfig, setVectorConfig] = useState<AnalysisVectorConfig>(DEFAULT_VECTOR);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface)' }}>
      {/* Step indicator */}
      <div className="border-b bg-white sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const step = i + 1;
              const isActive = step === currentStep;
              const isDone = step < currentStep;

              return (
                <div key={i} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--accent-deepest)'
                          : isDone
                          ? 'var(--accent-primary)'
                          : '#E5E7EB',
                        color: isActive || isDone ? 'white' : '#9CA3AF',
                      }}
                    >
                      {isDone ? '✓' : step}
                    </div>
                    <span
                      className="text-sm font-medium hidden sm:block"
                      style={{
                        color: isActive
                          ? 'var(--accent-deepest)'
                          : isDone
                          ? 'var(--text-primary)'
                          : '#9CA3AF',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className="w-8 h-px mx-2"
                      style={{ backgroundColor: isDone ? 'var(--accent-primary)' : '#E5E7EB' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {currentStep === 1 && (
          <Step1ClientData
            onNext={(id, config) => {
              setAnalysisId(id);
              setVectorConfig(config);
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 2 && analysisId && (
          <Step2Scouting
            analysisId={analysisId}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Questionnaire
            onNext={(q, m) => {
              setQuestionnaire(q);
              setMaterials(m);
              setCurrentStep(4);
            }}
          />
        )}

        {currentStep === 4 && analysisId && (
          <Step4Blueprint
            analysisId={analysisId}
            questionnaire={questionnaire}
            materials={materials}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && analysisId && (
          <Step5Research
            analysisId={analysisId}
            vectorConfig={vectorConfig}
          />
        )}
      </div>
    </div>
  );
}
