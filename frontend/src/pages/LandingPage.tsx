import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { modelsApi, transactionsApi } from '../api/client';
import { usePreferences } from '../context/PreferencesContext';
import { formatNumber, formatPercent } from '../utils/formatters';
import type { Transaction } from '../types';
import {
  Shield,
  CreditCard,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sliders,
  Layers,
  Search,
  Activity,
  BarChart3,
  Bot,
} from 'lucide-react';
import { RiskBadge } from '../components/common/RiskBadge';
import { DecisionBadge } from '../components/common/DecisionBadge';

export const LandingPage: React.FC = () => {
  const { formatAmount } = usePreferences();
  const [championModel, setChampionModel] = useState<{
    f1?: number | null;
    roc_auc?: number | null;
    algorithm?: string;
  } | null>(null);
  const [sampleTxn, setSampleTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    modelsApi
      .getChampionSummary()
      .then((res) => {
        if (res && res.available) {
          setChampionModel(res);
        }
      })
      .catch(() => {});

    transactionsApi
      .getTransactions({ page: 1, page_size: 1 })
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          setSampleTxn(res.items[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-[#111413] text-[#191c1d] dark:text-[#f0f3f1] transition-colors">
      {/* Navigation Bar */}
      <header className="border-b border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b4332] text-white shadow-xs">
              <Shield className="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <span className="font-serif font-bold text-base tracking-tight text-[#191c1d] dark:text-white block leading-tight">
                FraudGuard
              </span>
              <span className="block text-[9px] font-bold tracking-widest text-[#78716c] dark:text-[#9aa19d] uppercase">
                FINANCIAL RISK INTELLIGENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#525252] dark:text-[#9aa19d] hover:text-[#191c1d] dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] hover:bg-[#143326] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <span>Dashboard</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="py-16 sm:py-24 border-b border-[#e8e6df] dark:border-[#272d29]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Subtle Sage Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cde2d6] dark:border-[#204a37] bg-[#ebf3ef] dark:bg-[#153226]/50 px-3.5 py-1 text-xs font-medium text-[#164e3f] dark:text-[#a7f3d0] mb-6">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>AI Risk Scoring & Anomaly Detection</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#191c1d] dark:text-[#f0f3f1] max-w-3xl mx-auto leading-tight">
            Financial fraud detection with explainable risk scoring
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[#525252] dark:text-[#9aa19d] max-w-2xl mx-auto leading-relaxed">
            Monitor transaction velocity, detect subtle anomalies, and review explainable SHAP feature
            attributions built for financial risk teams.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#1b4332] hover:bg-[#143326] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <span>Open overview</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/analyze"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-5 py-2.5 text-xs font-semibold text-[#191c1d] dark:text-white hover:bg-[#f5f4ef] dark:hover:bg-[#1f2422] transition-colors"
            >
              <span>Score a transaction</span>
            </Link>
          </div>

          {/* 2. Product Preview Card */}
          <div className="mt-14 max-w-4xl mx-auto rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs overflow-hidden text-left">
            <div className="border-b border-[#e8e6df] dark:border-[#272d29] px-6 py-3.5 flex items-center justify-between bg-[#faf9f5] dark:bg-[#121514]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                <span className="text-xs font-bold text-[#191c1d] dark:text-white">
                  Sample transaction review
                </span>
                {sampleTxn && (
                  <span className="font-mono text-xs text-[#78716c]">
                    ({sampleTxn.external_transaction_id || `TXN-${sampleTxn.id}`})
                  </span>
                )}
              </div>
              <div>
                {sampleTxn?.prediction?.decision ? (
                  <DecisionBadge decision={sampleTxn.prediction.decision} size="sm" />
                ) : (
                  <DecisionBadge decision="REVIEW" size="sm" />
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-[#171b19]">
              <div className="p-3.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514]">
                <span className="text-xs text-[#78716c] block mb-1">Amount</span>
                <span className="text-base font-bold font-numeric text-[#191c1d] dark:text-white">
                  {sampleTxn ? formatAmount(sampleTxn.amount) : '₹12,450.00'}
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514]">
                <span className="text-xs text-[#78716c] block mb-1">Risk score</span>
                <span className="text-base font-bold font-numeric text-rose-600">
                  {sampleTxn?.prediction?.risk_score != null
                    ? sampleTxn.prediction.risk_score.toFixed(1)
                    : '78.4'}{' '}
                  <span className="text-xs font-normal text-[#78716c]">/ 100</span>
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514]">
                <span className="text-xs text-[#78716c] block mb-1">Fraud probability</span>
                <span className="text-base font-bold font-numeric text-rose-600">
                  {sampleTxn?.prediction?.fraud_probability != null
                    ? formatPercent(sampleTxn.prediction.fraud_probability, true)
                    : '84.2%'}
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514]">
                <span className="text-xs text-[#78716c] block mb-1">Risk level</span>
                <div className="mt-1">
                  <RiskBadge
                    level={sampleTxn?.prediction?.risk_level || 'HIGH'}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] p-4 bg-[#faf9f5] dark:bg-[#121514]">
                <span className="text-xs font-bold text-[#191c1d] dark:text-white block mb-2.5">
                  Top contributing risk factors
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#525252] dark:text-[#d1d5db]">
                    <span>Unusual transaction amount for customer profile</span>
                    <span className="text-rose-600 font-semibold font-numeric">+34% impact</span>
                  </div>
                  <div className="flex items-center justify-between text-[#525252] dark:text-[#d1d5db]">
                    <span>Transaction velocity burst in past hour</span>
                    <span className="text-rose-600 font-semibold font-numeric">+26% impact</span>
                  </div>
                  <div className="flex items-center justify-between text-[#525252] dark:text-[#d1d5db]">
                    <span>Device or network discrepancy</span>
                    <span className="text-rose-600 font-semibold font-numeric">+19% impact</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#e8e6df] dark:border-[#272d29]">
        <div className="max-w-2xl mb-12">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#191c1d] dark:text-white">
            Architecture and operations
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#525252] dark:text-[#9aa19d]">
            FraudGuard integrates supervised machine learning with unsupervised anomaly detection and SHAP explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs">
            <span className="text-xs font-bold text-[#164e3f] dark:text-[#a7f3d0] block mb-1">01. INGESTION</span>
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1.5">Live feed & batch</h3>
            <p className="text-xs text-[#525252] dark:text-[#9aa19d] leading-relaxed">
              Stream transactions over WebSocket or upload multi-thousand record CSV batches for scoring.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs">
            <span className="text-xs font-bold text-[#164e3f] dark:text-[#a7f3d0] block mb-1">02. SCORING</span>
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1.5">Multi-signal model</h3>
            <p className="text-xs text-[#525252] dark:text-[#9aa19d] leading-relaxed">
              Supervised gradient-boosted trees, unsupervised isolation forest anomaly detection, and velocity rules.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs">
            <span className="text-xs font-bold text-[#164e3f] dark:text-[#a7f3d0] block mb-1">03. EXPLAINABILITY</span>
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1.5">SHAP attribution</h3>
            <p className="text-xs text-[#525252] dark:text-[#9aa19d] leading-relaxed">
              Inspect exactly which features and behavior shifts increased or lowered each transaction's risk score.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs">
            <span className="text-xs font-bold text-[#164e3f] dark:text-[#a7f3d0] block mb-1">04. RESOLUTION</span>
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1.5">Case investigation</h3>
            <p className="text-xs text-[#525252] dark:text-[#9aa19d] leading-relaxed">
              Triage alerts, open collaborative case files, and record auditable decisions for regulatory compliance.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Model Composition Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#e8e6df] dark:border-[#272d29]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#191c1d] dark:text-white mb-3">
              Model and risk synthesis
            </h2>
            <p className="text-xs sm:text-sm text-[#525252] dark:text-[#9aa19d] mb-6 leading-relaxed">
              Calibrated risk models synthesize supervised probability predictions with anomaly signals to mitigate fraud losses while preserving valid customer transactions.
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-[#525252] dark:text-[#d1d5db]">
                <CheckCircle2 className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0] shrink-0" />
                <span>
                  Supervised model: <strong className="text-[#191c1d] dark:text-white">{championModel?.algorithm || 'XGBoost'}</strong>{' '}
                  {championModel?.f1 != null && championModel?.roc_auc != null
                    ? `(F1: ${championModel.f1.toFixed(3)}, ROC-AUC: ${championModel.roc_auc.toFixed(3)})`
                    : ''}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[#525252] dark:text-[#d1d5db]">
                <CheckCircle2 className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0] shrink-0" />
                <span>Unsupervised Isolation Forest for outlier detection</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#525252] dark:text-[#d1d5db]">
                <CheckCircle2 className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0] shrink-0" />
                <span>Local SHAP feature attributions on all flagged records</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#525252] dark:text-[#d1d5db]">
                <CheckCircle2 className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0] shrink-0" />
                <span>Population stability index (PSI) & concept drift tracking</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] shadow-xs">
            <h3 className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-4">
              Risk score composition
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#525252] dark:text-[#9aa19d]">Supervised prediction</span>
                  <span className="font-semibold text-[#191c1d] dark:text-white">55% weight</span>
                </div>
                <div className="h-2 w-full bg-[#f3f2ee] dark:bg-[#272d29] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1b4332] rounded-full" style={{ width: '55%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#525252] dark:text-[#9aa19d]">Anomaly detector</span>
                  <span className="font-semibold text-[#191c1d] dark:text-white">25% weight</span>
                </div>
                <div className="h-2 w-full bg-[#f3f2ee] dark:bg-[#272d29] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6b9080] rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#525252] dark:text-[#9aa19d]">Behavioral and velocity signals</span>
                  <span className="font-semibold text-[#191c1d] dark:text-white">20% weight</span>
                </div>
                <div className="h-2 w-full bg-[#f3f2ee] dark:bg-[#272d29] rounded-full overflow-hidden">
                  <div className="h-full bg-[#94a3b8] rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Call to Action */}
      <section className="py-20 text-center max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="font-serif text-3xl font-bold text-[#191c1d] dark:text-white">
          Explore financial risk intelligence
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#525252] dark:text-[#9aa19d]">
          Review transactions, monitor live traffic, and manage investigation cases with explainable AI.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-[#1b4332] hover:bg-[#143326] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-5 py-2.5 text-xs font-semibold text-[#191c1d] dark:text-white hover:bg-[#f5f4ef] dark:hover:bg-[#1f2422] transition-colors"
          >
            Open dashboard
          </Link>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t border-[#e8e6df] dark:border-[#272d29] py-8 text-center text-xs text-[#78716c]">
        <p>FraudGuard — Financial Risk & Fraud Intelligence Platform</p>
      </footer>
    </div>
  );
};
