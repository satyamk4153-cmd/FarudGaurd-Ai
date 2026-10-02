import React, { useState, useEffect } from 'react';
import { datasetsApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { DatasetCatalogItem, DatasetProfile } from '../types';
import {
  Database,
  FileText,
  BarChart2,
  Table,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/formatters';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'schema' | 'correlations'>('profile');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDatasets = async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const list = await datasetsApi.getDatasets();
        if (!isMounted) return;
        setDatasets(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load datasets', err);
        if (err.response?.status === 403 || err.response?.status === 401) {
          setAuthError('Dataset repository and statistical quality profiling are restricted to certified Administrators.');
        } else {
          setAuthError('Unable to load dataset catalog.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchDatasets();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let isMounted = true;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const prof = await datasetsApi.getDatasetProfile(selectedId);
        if (!isMounted) return;
        setProfile(prof);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load dataset quality profile', err);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  if (loading) {
    return <LoadingSpinner label="Loading datasets…" size="lg" />;
  }

  const selectedDataset = datasets.find((d) => d.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datasets"
        subtitle="Review training datasets, schema profiles, and feature statistics."
      />

      {authError ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-[#faf9f5] dark:bg-[#1a1714] p-8 text-center shadow-xs">
          <ShieldAlert className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
            Administrator Access Required
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1 max-w-md mx-auto">
            {authError}
          </p>
        </div>
      ) : (
        <>
          {/* Dataset Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {datasets.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedId === d.id
                    ? 'border-[#1b4332] bg-[#ebf3ef] dark:bg-[#1a382c]/40 text-[#191c1d] dark:text-[#f3f4f6] shadow-xs'
                    : 'border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] text-[#78716c] dark:text-[#9ca3af] hover:border-[#1b4332]/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Database className={`h-4 w-4 ${selectedId === d.id ? 'text-[#164e3f] dark:text-[#a7f3d0]' : 'text-[#78716c]'}`} />
                  <span className="font-serif font-bold text-sm text-[#191c1d] dark:text-[#f3f4f6]">{d.name}</span>
                </div>
                <p className="text-xs text-[#78716c] dark:text-[#9ca3af] line-clamp-1 mb-3">{d.description}</p>
                <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] pt-2.5 border-t border-[#e8e6df] dark:border-[#272d29]">
                  <span className="font-numeric font-medium">{formatNumber(d.row_count)} rows</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-numeric">{formatPercent(d.fraud_rate)} fraud</span>
                  <span className="font-numeric">{d.file_size_mb.toFixed(1)} MB</span>
                </div>
              </button>
            ))}
          </div>

          {/* Dataset Detail Summary Strip */}
          {selectedDataset && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
                <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">Total records</span>
                <span className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-[#f3f4f6]">
                  {formatNumber(selectedDataset.row_count)}
                </span>
                <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af] block mt-1">Labeled observations</span>
              </div>

              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
                <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">Features</span>
                <span className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-[#f3f4f6]">
                  {profile?.feature_stats?.length ?? '—'}
                </span>
                <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af] block mt-1">Tabular columns</span>
              </div>

              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
                <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">Fraud rate</span>
                <span className="text-2xl font-bold font-numeric text-rose-600 dark:text-rose-400">
                  {formatPercent(selectedDataset.fraud_rate)}
                </span>
                <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af] block mt-1">Class imbalance</span>
              </div>

              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
                <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">Missing values</span>
                <span className="text-2xl font-bold font-numeric text-[#164e3f] dark:text-[#a7f3d0]">
                  0.0%
                </span>
                <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af] block mt-1">Complete records</span>
              </div>

              <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
                <span className="text-xs text-[#78716c] dark:text-[#9ca3af] block mb-1">Data format</span>
                <span className="text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6] block mt-1">
                  Structured Tabular
                </span>
                <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af] block">CSV / Parquet</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[#e8e6df] dark:border-[#272d29] gap-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-[#1b4332] text-[#1b4332] dark:border-[#a7f3d0] dark:text-[#a7f3d0]'
                  : 'border-transparent text-[#78716c] hover:text-[#191c1d] dark:hover:text-white'
              }`}
            >
              Schema profile
            </button>
            <button
              onClick={() => setActiveTab('correlations')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'correlations'
                  ? 'border-[#1b4332] text-[#1b4332] dark:border-[#a7f3d0] dark:text-[#a7f3d0]'
                  : 'border-transparent text-[#78716c] hover:text-[#191c1d] dark:hover:text-white'
              }`}
            >
              Feature correlation
            </button>
          </div>

          {loadingProfile ? (
            <LoadingSpinner label="Computing dataset distribution statistics..." size="md" />
          ) : profile ? (
            <div className="space-y-6">
              {/* Feature Distribution Table */}
              {activeTab === 'profile' && (
                <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
                  <div className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
                        Feature Distributions
                      </h3>
                      <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                        Overview of numerical distributions for {profile.feature_stats?.length || 0} extracted features.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5]/60 dark:bg-[#141816]/60 text-[#78716c] dark:text-[#9ca3af]">
                        <tr>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Feature</th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Data type</th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Missing %</th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Min</th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Max</th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Mean</th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">Std Dev</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                        {profile.feature_stats?.map((f) => (
                          <tr key={f.name} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2522] transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#191c1d] dark:text-[#f3f4f6]">{f.name}</td>
                            <td className="px-5 py-3.5 text-[#78716c] dark:text-[#9ca3af] font-mono text-[11px]">{f.type}</td>
                            <td className="px-5 py-3.5 text-right">
                              <span
                                className={
                                  f.null_pct > 0
                                    ? 'text-amber-600 dark:text-amber-400 font-semibold font-numeric'
                                    : 'text-[#164e3f] dark:text-[#a7f3d0] font-semibold font-numeric'
                                }
                              >
                                {f.null_pct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-[#78716c] dark:text-[#9ca3af] font-numeric">{f.min.toFixed(2)}</td>
                            <td className="px-5 py-3.5 text-right text-[#78716c] dark:text-[#9ca3af] font-numeric">{f.max.toFixed(2)}</td>
                            <td className="px-5 py-3.5 text-right font-medium text-[#191c1d] dark:text-[#f3f4f6] font-numeric">
                              {f.mean.toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5 text-right text-[#78716c] dark:text-[#9ca3af] font-numeric">{f.std.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Correlations Tab */}
              {activeTab === 'correlations' && (
                <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-[#191c1d] dark:text-[#f3f4f6]">
                      Target Correlation Analysis
                    </h3>
                    <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
                      Statistical correlation magnitude against confirmed historical fraud labels.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {profile.correlations_with_target && profile.correlations_with_target.length > 0 ? (
                      profile.correlations_with_target.slice(0, 12).map((c) => (
                        <div
                          key={c.feature}
                          className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#141816] p-3.5 text-xs transition-colors hover:border-[#1b4332]/40"
                        >
                          <span className="text-[#78716c] dark:text-[#9ca3af] block text-[11px] truncate font-mono">{c.feature}</span>
                          <span className="font-bold text-[#164e3f] dark:text-[#a7f3d0] text-sm mt-1 block font-numeric">
                            +{c.correlation.toFixed(3)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-xs text-[#78716c] dark:text-[#9ca3af] py-6 text-center">
                        Target correlations calculated during model training.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
