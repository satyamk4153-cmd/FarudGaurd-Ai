import React, { useState, useRef } from 'react';
import { predictionApi } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { RiskBadge } from '../components/common/RiskBadge';
import { DecisionBadge } from '../components/common/DecisionBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { usePreferences } from '../context/PreferencesContext';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import type { BatchAnalysisResult } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileDown,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

const REQUIRED_COLUMNS = [
  'amount',
  'transaction_type',
  'merchant_category',
  'location',
  'channel',
  'timestamp',
  'account_age_days',
  'transaction_frequency',
  'previous_transaction_amount',
  'balance_before',
  'balance_after',
  'distance_from_previous_transaction',
  'ip_risk',
  'device_risk',
];

export const BatchAnalysisPage: React.FC = () => {
  const { currency } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Only CSV files (.csv) are accepted for batch inference.');
      setFile(null);
      setFileHeaders([]);
      setPreviewRows([]);
      setValidationErrors([]);
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File exceeds maximum upload size of 50 MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setValidationErrors(['File is empty or could not be read.']);
        setIsValidating(false);
        return;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setValidationErrors(['CSV must contain a header row and at least one transaction row.']);
        setIsValidating(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      setFileHeaders(headers);

      const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setValidationErrors([`Missing required schema columns: ${missing.join(', ')}`]);
      } else {
        setValidationErrors([]);
      }

      const preview: string[][] = [];
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        preview.push(lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
      }
      setPreviewRows(preview);
      setIsValidating(false);
    };

    reader.onerror = () => {
      setValidationErrors(['Error reading CSV file. Please verify file integrity.']);
      setIsValidating(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      REQUIRED_COLUMNS.join(',') +
      '\n' +
      '1250.00,PURCHASE,ELECTRONICS,New Delhi,WEB,2026-03-30T10:15:00Z,420,3,450.00,14500.00,13250.00,4.2,0.12,0.08\n' +
      '84000.00,WIRE_TRANSFER,CRYPTO,Lagos,API,2026-03-30T10:16:30Z,14,9,1200.00,92000.00,8000.00,7400.0,0.85,0.78\n' +
      '240.00,PURCHASE,GROCERY,Mumbai,POS,2026-03-30T10:18:00Z,920,1,180.00,8400.00,8160.00,1.1,0.02,0.01';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fraudguard_batch_template.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleUploadAndRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const res = await predictionApi.predictBatch(file);
      setResult(res);
    } catch (err: any) {
      console.error('Batch scoring failed', err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to execute batch inference. Please verify CSV schema alignment.'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadEnrichedCsv = () => {
    if (!result) return;

    if (result.results && result.results.length > 0) {
      const headers = [
        'row_index',
        'transaction_id',
        'amount',
        'decision',
        'risk_score',
        'risk_level',
        'fraud_probability',
        'anomaly_score',
        'triggered_rules',
      ];

      const rows = result.results.map((r) => [
        r.row_index,
        `"${r.transaction_id}"`,
        r.amount,
        r.decision,
        r.risk_score,
        r.risk_level,
        r.fraud_probability.toFixed(4),
        r.anomaly_score.toFixed(4),
        `"${(r.triggered_rules || []).join(';')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `fraudguard_batch_scored_${Date.now()}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } else {
      const downloadUrl = (result as any).download_url || '/api/predict/batch/export';
      const token = localStorage.getItem('fraudguard_token');
      const authDownloadUrl = token
        ? `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : downloadUrl;
      window.open(authDownloadUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Analysis"
        subtitle="Upload and score bulk transaction records through supervised and anomaly detection models."
        actions={
          <button
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-3.5 py-2 text-xs font-semibold text-[#191c1d] dark:text-white hover:bg-[#faf9f5] transition-colors shadow-xs"
          >
            <FileDown className="h-3.5 w-3.5 text-[#164e3f] dark:text-[#a7f3d0]" />
            <span>Download CSV template</span>
          </button>
        }
      />

      {/* 5-Step Workflow Tracker matching PolicyLens */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className={`flex items-center gap-2 ${file ? 'text-[#164e3f] dark:text-[#a7f3d0] font-bold' : 'text-[#78716c]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${file ? 'bg-[#1b4332] text-white' : 'bg-[#faf9f5] dark:bg-[#272d29] text-[#78716c]'}`}>1</span>
            <span>Upload CSV</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#78716c]" />
          <div className={`flex items-center gap-2 ${validationErrors.length === 0 && fileHeaders.length > 0 ? 'text-[#164e3f] dark:text-[#a7f3d0] font-bold' : 'text-[#78716c]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${validationErrors.length === 0 && fileHeaders.length > 0 ? 'bg-[#1b4332] text-white' : 'bg-[#faf9f5] dark:bg-[#272d29] text-[#78716c]'}`}>2</span>
            <span>Validate file</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#78716c]" />
          <div className={`flex items-center gap-2 ${previewRows.length > 0 ? 'text-[#164e3f] dark:text-[#a7f3d0] font-bold' : 'text-[#78716c]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${previewRows.length > 0 ? 'bg-[#1b4332] text-white' : 'bg-[#faf9f5] dark:bg-[#272d29] text-[#78716c]'}`}>3</span>
            <span>Preview rows</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#78716c]" />
          <div className={`flex items-center gap-2 ${loading || result ? 'text-[#164e3f] dark:text-[#a7f3d0] font-bold' : 'text-[#78716c]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${loading || result ? 'bg-[#1b4332] text-white' : 'bg-[#faf9f5] dark:bg-[#272d29] text-[#78716c]'}`}>4</span>
            <span>Score batch</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#78716c]" />
          <div className={`flex items-center gap-2 ${result ? 'text-[#164e3f] dark:text-[#a7f3d0] font-bold' : 'text-[#78716c]'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${result ? 'bg-[#1b4332] text-white' : 'bg-[#faf9f5] dark:bg-[#272d29] text-[#78716c]'}`}>5</span>
            <span>Export results</span>
          </div>
        </div>
      </div>

      {/* Upload Drag-and-Drop Area */}
      <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-6 shadow-xs">
        <form onSubmit={handleUploadAndRun} className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-[#1b4332] bg-[#ebf3ef] dark:bg-[#1a382c]'
                : 'border-[#d8d5cb] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] hover:border-[#1b4332]/50'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-[#164e3f] dark:text-[#a7f3d0] mb-3" />
            <p className="font-serif text-base font-bold text-[#191c1d] dark:text-white mb-1">
              Drag and drop transaction CSV file here, or browse
            </p>
            <p className="text-xs text-[#78716c] dark:text-[#9aa19d] max-w-md mb-4 leading-relaxed">
              Accepted format: CSV (.csv) up to 50 MB. File must include standard transaction columns (amount, merchant category, type, and location).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              className="rounded-lg border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] px-4 py-2 text-xs font-semibold text-[#191c1d] dark:text-white shadow-xs hover:bg-[#faf9f5]"
            >
              Select CSV file
            </button>
          </div>

          {/* Upload Metadata & Pre-Flight Validation */}
          {file && (
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#164e3f] dark:text-[#a7f3d0]" />
                  <span className="font-bold text-[#191c1d] dark:text-white">{file.name}</span>
                  <span className="text-[#78716c]">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <div>
                  {isValidating ? (
                    <span className="text-[#78716c] flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Checking columns…</span>
                    </span>
                  ) : validationErrors.length === 0 ? (
                    <span className="text-[#164e3f] dark:text-[#a7f3d0] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>File verified ({fileHeaders.length} columns)</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Missing required columns</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Validation Errors or Alerts */}
              {validationErrors.length > 0 && (
                <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                  <div className="font-semibold mb-1">Required columns missing:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">
                    Please download the template above to match FraudGuard's expected column headers.
                  </p>
                </div>
              )}

              {/* CSV Preview (Top 5 rows) */}
              {previewRows.length > 0 && validationErrors.length === 0 && (
                <div className="space-y-2 pt-2 border-t border-[#e8e6df] dark:border-[#272d29]">
                  <div className="flex items-center justify-between text-xs text-[#525252] dark:text-[#9aa19d]">
                    <span className="font-bold text-[#191c1d] dark:text-white">Data preview (first 5 rows):</span>
                    <span>{fileHeaders.length} columns detected</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[#e8e6df] dark:border-[#272d29]">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-[#f0ede6] dark:bg-[#1a1f1d] text-[#525252] dark:text-[#9aa19d] uppercase">
                        <tr>
                          {fileHeaders.slice(0, 8).map((h, i) => (
                            <th key={i} className="px-3 py-1.5 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                          {fileHeaders.length > 8 && <th className="px-3 py-1.5 text-[#78716c]">+{fileHeaders.length - 8} more</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29] bg-white dark:bg-[#121514]">
                        {previewRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.slice(0, 8).map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-[#191c1d] dark:text-[#f0f3f1]">
                                {cell}
                              </td>
                            ))}
                            {fileHeaders.length > 8 && <td className="px-3 py-1.5 text-[#78716c]">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
              <Info className="h-3.5 w-3.5" />
              <span>Inference applies formula-injection sanitization to object fields before export.</span>
            </div>

            <button
              type="submit"
              disabled={!file || validationErrors.length > 0 || loading || isValidating}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] px-5 py-2.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" label="" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Execute Batch Inference</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Batch Results Overview matching PolicyLens */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
              <span className="text-xs text-[#525252] dark:text-[#9aa19d] block mb-1">
                Processed records
              </span>
              <span className="text-2xl font-bold font-numeric text-[#191c1d] dark:text-white">
                {formatNumber(result.total_processed)}
              </span>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
              <span className="text-xs text-[#525252] dark:text-[#9aa19d] block mb-1">
                Approved
              </span>
              <span className="text-2xl font-bold font-numeric text-[#164e3f] dark:text-[#34d399]">
                {formatNumber(result.approved_count)}
              </span>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
              <span className="text-xs text-[#525252] dark:text-[#9aa19d] block mb-1">
                Under review
              </span>
              <span className="text-2xl font-bold font-numeric text-amber-600">
                {formatNumber(result.review_count)}
              </span>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
              <span className="text-xs text-[#525252] dark:text-[#9aa19d] block mb-1">
                Blocked
              </span>
              <span className="text-2xl font-bold font-numeric text-rose-600">
                {formatNumber(result.blocked_count)}
              </span>
            </div>

            <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] p-4 shadow-xs">
              <span className="text-xs text-[#525252] dark:text-[#9aa19d] block mb-1">
                Fraud rate
              </span>
              <span className="text-2xl font-bold font-numeric text-rose-600">
                {result.total_processed > 0
                  ? formatPercent(result.total_fraud_detected / result.total_processed)
                  : '0.0%'}
              </span>
            </div>
          </div>

          {/* Results Action Strip & Table */}
          <div className="rounded-xl border border-[#e8e6df] dark:border-[#272d29] bg-white dark:bg-[#171b19] overflow-hidden shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] px-4 py-3">
              <div>
                <span className="font-serif text-sm font-bold text-[#191c1d] dark:text-white">
                  Batch results
                </span>
                <span className="text-xs text-[#78716c] ml-2">
                  (Latency: {result.avg_latency_ms.toFixed(1)}ms per record)
                </span>
              </div>
              <button
                onClick={downloadEnrichedCsv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download scored CSV</span>
              </button>
            </div>

            {result.results && result.results.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8e6df] dark:border-[#272d29] bg-[#faf9f5] dark:bg-[#121514] text-[#525252] dark:text-[#9aa19d] font-semibold sticky top-0">
                    <tr>
                      <th className="px-3.5 py-2.5">Row</th>
                      <th className="px-3.5 py-2.5">Transaction ID</th>
                      <th className="px-3.5 py-2.5 text-right">Amount</th>
                      <th className="px-3.5 py-2.5">Decision</th>
                      <th className="px-3.5 py-2.5 text-right">Risk score</th>
                      <th className="px-3.5 py-2.5">Risk tier</th>
                      <th className="px-3.5 py-2.5 text-right">Fraud probability</th>
                      <th className="px-3.5 py-2.5 text-right">Anomaly score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e6df] dark:divide-[#272d29]">
                    {result.results.slice(0, 100).map((r, i) => (
                      <tr key={i} className="hover:bg-[#faf9f5] dark:hover:bg-[#1f2422] transition-colors">
                        <td className="px-3.5 py-2 text-[#78716c] font-mono">{r.row_index}</td>
                        <td className="px-3.5 py-2 font-mono font-medium text-[#191c1d] dark:text-white">
                          {r.transaction_id}
                        </td>
                        <td className="px-3.5 py-2 text-right font-numeric font-bold text-[#191c1d] dark:text-white">
                          {formatCurrency(r.amount, currency)}
                        </td>
                        <td className="px-3.5 py-2">
                          <DecisionBadge decision={r.decision} size="sm" />
                        </td>
                        <td className="px-3.5 py-2 text-right font-numeric font-bold text-[#191c1d] dark:text-white">
                          {r.risk_score.toFixed(1)}
                        </td>
                        <td className="px-3.5 py-2">
                          <RiskBadge level={r.risk_level} size="sm" />
                        </td>
                        <td className="px-3.5 py-2 text-right font-numeric text-[#78716c]">
                          {formatPercent(r.fraud_probability, true)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-numeric text-[#78716c]">
                          {r.anomaly_score.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#78716c]">
                No row-level predictions available in this batch summary.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
