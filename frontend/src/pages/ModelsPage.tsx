import React, { useState, useEffect } from 'react';
import { modelsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { ModelVersion, ModelComparison } from '../types';
import {
  Award,
  CheckCircle2,
  RefreshCw,
  Sliders,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const ModelsPage: React.FC = () => {
  const [data, setData] = useState<ModelComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await modelsApi.getComparison();
      setData(res);
      if (res.models && res.models.length > 0) {
        const champ = res.models.find((m) => m.is_champion) || res.models[0];
        setSelectedModel(champ);
      }
    } catch (err) {
      console.error('Failed to load model registry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await modelsApi.getComparison();
        if (!isMounted) return;
        setData(res);
        if (res.models && res.models.length > 0) {
          const champ = res.models.find((m) => m.is_champion) || res.models[0];
          setSelectedModel(champ);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load model registry', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePromote = async (modelId: number, version: string) => {
    setDeploying(version);
    setMessage(null);
    try {
      const res = await modelsApi.deployChampion(modelId);
      setMessage(res.message);
      fetchModels();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to activate model.');
    } finally {
      setDeploying(null);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setMessage(null);
    try {
      const res = await modelsApi.triggerTraining();
      setMessage(res.message);
      fetchModels();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to trigger model retraining.');
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading model information…" size="lg" />;
  }

  const champion = data?.models.find((m) => m.is_champion);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Models & Reports"
        subtitle="Benchmark model performance, inspect calibration curves, and promote active production models."
        actions={
          <button
            onClick={handleTrain}
            disabled={training}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b4332] text-white hover:bg-[#143326] px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${training ? 'animate-spin' : ''}`} />
            <span>{training ? 'Retraining models...' : 'Retrain models'}</span>
          </button>
        }
      />

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 p-4 text-xs font-semibold text-[#164e3f] dark:text-[#a7f3d0] shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#164e3f] dark:text-[#a7f3d0]" />
          <span>{message}</span>
        </div>
      )}

      {/* Active Model Banner matching PolicyLens */}
      {champion && (
        <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                <span className="text-xs font-bold text-[#164e3f] dark:text-[#a7f3d0] uppercase tracking-wider">
                  Active Production Champion
                </span>
                <span className="rounded-full bg-[#ebf3ef] dark:bg-[#1a382c] border border-[#cde2d6] dark:border-[#272d29] px-2.5 py-0.5 text-[10px] text-[#164e3f] dark:text-[#a7f3d0] font-bold">
                  Serving Live Stream
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#191c1d] dark:text-[#f3f4f6] tracking-tight">
                {champion.model_name}{' '}
                <span className="font-mono text-xs font-normal text-[#78716c]">({champion.model_version})</span>
              </h2>
              <p className="text-xs text-[#525252] dark:text-[#9aa19d]">
                Algorithm: <strong className="text-[#191c1d] dark:text-[#f3f4f6]">{champion.algorithm}</strong> · Threshold:{' '}
                <span className="font-numeric font-bold text-[#191c1d] dark:text-[#f3f4f6]">{champion.optimal_threshold != null ? champion.optimal_threshold.toFixed(2) : '—'}</span> · Training samples:{' '}
                {champion.training_sample_count != null ? `${champion.training_sample_count.toLocaleString()}` : '—'}
              </p>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[11px] text-[#78716c] block">F1-Score</span>
                <span className="text-xl font-bold font-numeric text-[#191c1d] dark:text-white">
                  {champion.f1_score != null ? champion.f1_score.toFixed(4) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#78716c] block">ROC-AUC</span>
                <span className="text-xl font-bold font-numeric text-[#191c1d] dark:text-white">
                  {champion.roc_auc != null ? champion.roc_auc.toFixed(4) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#78716c] block">PR-AUC</span>
                <span className="text-xl font-bold font-numeric text-[#191c1d] dark:text-white">
                  {champion.pr_auc != null ? champion.pr_auc.toFixed(4) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#78716c] block">P95 Latency</span>
                <span className="text-xl font-bold font-numeric text-[#164e3f] dark:text-[#34d399]">
                  {champion.inference_latency_p95_ms != null ? `${champion.inference_latency_p95_ms.toFixed(1)}ms` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Benchmark Comparison Table */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
        <div className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">
            Model registry
          </h3>
          <span className="text-xs text-[#78716c]">
            {data?.models.length || 0} registered versions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] font-semibold">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Algorithm</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">F1-Score</th>
                <th className="px-4 py-3 text-right">ROC-AUC</th>
                <th className="px-4 py-3 text-right">PR-AUC</th>
                <th className="px-4 py-3 text-right">Precision</th>
                <th className="px-4 py-3 text-right">Recall</th>
                <th className="px-4 py-3 text-right">Threshold</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
              {(!data?.models || data.models.length === 0) ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#78716c]">
                    No models registered yet. Trigger model training to register models.
                  </td>
                </tr>
              ) : (
                data.models.map((m) => {
                  const isSelected = selectedModel?.model_version === m.model_version;
                  return (
                    <tr
                      key={m.model_version}
                      onClick={() => setSelectedModel(m)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#ebf3ef] dark:bg-[#1a382c]/40'
                          : m.is_champion
                          ? 'bg-[#faf9f5] dark:bg-[#151a18]'
                          : 'hover:bg-[#faf9f5] dark:hover:bg-[#1f2422]'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#191c1d] dark:text-white">
                        <div>{m.model_name}</div>
                        <div className="text-[11px] font-mono text-[#78716c]">{m.model_version}</div>
                      </td>
                      <td className="px-4 py-3 text-[#525252] dark:text-[#d1d5db]">{m.algorithm}</td>
                      <td className="px-4 py-3">
                        {m.is_champion ? (
                          <span className="rounded-full bg-[#1b4332] text-white px-2.5 py-0.5 text-[10px] font-semibold">
                            Champion
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f0ede6] dark:bg-[#272d29] border border-[#e8e6df] dark:border-[#38423d] px-2.5 py-0.5 text-[10px] text-[#525252] dark:text-[#a3a3a3]">
                            Candidate
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#191c1d] dark:text-white font-numeric">
                        {m.f1_score != null ? m.f1_score.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#191c1d] dark:text-white font-numeric">
                        {m.roc_auc != null ? m.roc_auc.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#191c1d] dark:text-white font-numeric">
                        {m.pr_auc != null ? m.pr_auc.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#525252] dark:text-[#d1d5db] font-numeric">
                        {m.precision != null ? m.precision.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#525252] dark:text-[#d1d5db] font-numeric">
                        {m.recall != null ? m.recall.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#78716c] font-numeric">
                        {m.optimal_threshold != null ? m.optimal_threshold.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {m.is_champion ? (
                          <span className="text-xs text-[#164e3f] dark:text-[#a7f3d0] font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Serving</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromote(m.id, m.model_version)}
                            disabled={deploying === m.model_version}
                            className="rounded-xl bg-[#1b4332] hover:bg-[#143326] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-50"
                          >
                            {deploying === m.model_version ? 'Promoting...' : 'Make active'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation / Confusion Matrix Section */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white">
              Validation matrix
            </h3>
            <p className="text-xs text-[#78716c]">
              Trade-offs between fraud detection sensitivity and false positive review volume.
            </p>
          </div>
          {selectedModel && (
            <span className="text-xs text-[#78716c]">
              Selected: <strong className="text-[#191c1d] dark:text-white">{selectedModel.model_name}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.models.map((m) => {
            const cm = m.confusion_matrix;
            const isTarget = selectedModel?.model_version === m.model_version;
            return (
              <div
                key={m.model_version}
                onClick={() => setSelectedModel(m)}
                className={`rounded-xl border p-4 text-xs cursor-pointer transition-all ${
                  isTarget
                    ? 'border-[#1b4332] bg-[#ebf3ef] dark:bg-[#1a382c]/40 shadow-xs'
                    : 'border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] hover:border-[#1b4332]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#191c1d] dark:text-white">{m.model_name}</span>
                  {m.is_champion && (
                    <span className="text-[10px] text-[#164e3f] dark:text-[#a7f3d0] font-bold">ACTIVE</span>
                  )}
                </div>
                {cm ? (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-2">
                      <span className="text-[10px] text-[#78716c] block">True negative</span>
                      <span className="font-bold text-[#191c1d] dark:text-white text-sm font-numeric">{cm.tn}</span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-2">
                      <span className="text-[10px] text-[#78716c] block">False alert</span>
                      <span className="font-bold text-amber-600 text-sm font-numeric">{cm.fp}</span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-2">
                      <span className="text-[10px] text-[#78716c] block">Missed fraud</span>
                      <span className="font-bold text-rose-600 text-sm font-numeric">{cm.fn}</span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#171b19] border border-[#e8e6df] dark:border-[#272d29] p-2">
                      <span className="text-[10px] text-[#78716c] block">Detected fraud</span>
                      <span className="font-bold text-[#164e3f] dark:text-[#34d399] text-sm font-numeric">{cm.tp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-[#78716c] text-xs">
                    Evaluation matrix unavailable
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
