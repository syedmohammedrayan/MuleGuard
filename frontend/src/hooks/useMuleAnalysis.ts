// src/hooks/useMuleAnalysis.ts
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { analyzeTransactions, AnalysisResult, Transaction } from '@/services/api';

export type AppState = 'idle' | 'scanning' | 'results' | 'error';

// ── Graph Detection Engine (Client-side fallback) ─────────────────────────────

function detectCycles(adj: Map<string, string[]>, nodes: string[]): string[][] {
  const rings: string[][] = [];
  const visited = new Set<string>();

  function dfs(node: string, start: string, path: string[], depth: number) {
    if (depth > 5) return;
    const neighbors = adj.get(node) || [];
    for (const nb of neighbors) {
      if (nb === start && path.length >= 3) {
        rings.push([...path]);
        return;
      }
      if (!path.includes(nb)) {
        dfs(nb, start, [...path, nb], depth + 1);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      dfs(node, node, [node], 1);
      visited.add(node);
    }
  }
  return rings;
}

function detectSmurfing(transactions: Transaction[]): { fanIn: string[]; fanOut: string[] } {
  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();
  const inSenders = new Map<string, Set<string>>();
  const outReceivers = new Map<string, Set<string>>();

  for (const tx of transactions) {
    inCount.set(tx.receiver_id, (inCount.get(tx.receiver_id) || 0) + 1);
    outCount.set(tx.sender_id, (outCount.get(tx.sender_id) || 0) + 1);
    if (!inSenders.has(tx.receiver_id)) inSenders.set(tx.receiver_id, new Set());
    inSenders.get(tx.receiver_id)!.add(tx.sender_id);
    if (!outReceivers.has(tx.sender_id)) outReceivers.set(tx.sender_id, new Set());
    outReceivers.get(tx.sender_id)!.add(tx.receiver_id);
  }

  const fanIn = [...inSenders.entries()]
    .filter(([, s]) => s.size >= 5)
    .map(([id]) => id);
  const fanOut = [...outReceivers.entries()]
    .filter(([, r]) => r.size >= 5)
    .map(([id]) => id);

  return { fanIn, fanOut };
}

function detectShells(adj: Map<string, string[]>, transactions: Transaction[]): string[] {
  const txCount = new Map<string, number>();
  for (const tx of transactions) {
    txCount.set(tx.sender_id, (txCount.get(tx.sender_id) || 0) + 1);
    txCount.set(tx.receiver_id, (txCount.get(tx.receiver_id) || 0) + 1);
  }

  const shells: string[] = [];
  for (const [node, count] of txCount.entries()) {
    if (count >= 2 && count <= 4) {
      const outDeg = (adj.get(node) || []).length;
      if (outDeg === 1) shells.push(node);
    }
  }
  return shells;
}

export function analyzeLocally(transactions: Transaction[]): AnalysisResult {
  const start = Date.now();

  // Build adjacency list
  const adj = new Map<string, string[]>();
  const allNodes = new Set<string>();
  for (const tx of transactions) {
    allNodes.add(tx.sender_id);
    allNodes.add(tx.receiver_id);
    if (!adj.has(tx.sender_id)) adj.set(tx.sender_id, []);
    adj.get(tx.sender_id)!.push(tx.receiver_id);
  }

  const nodes = [...allNodes];
  const cycles = detectCycles(adj, nodes);
  const { fanIn, fanOut } = detectSmurfing(transactions);
  const shells = detectShells(adj, transactions);

  // Build fraud rings from cycles
  const fraudRings: AnalysisResult['fraud_rings'] = [];
  const suspiciousMap = new Map<string, { score: number; patterns: string[]; ringId: string }>();
  const usedRingIds = new Set<string>();

  cycles.forEach((cycle, i) => {
    const ringId = `RING_${String(i + 1).padStart(3, '0')}`;
    usedRingIds.add(ringId);
    fraudRings.push({
      ring_id: ringId,
      member_accounts: cycle,
      pattern_type: `cycle_length_${cycle.length}`,
      risk_score: Math.min(100, 85 + cycle.length * 2),
    });
    for (const acc of cycle) {
      const existing = suspiciousMap.get(acc) || { score: 0, patterns: [], ringId };
      existing.score = Math.min(100, existing.score + 80);
      existing.patterns.push(`cycle_length_${cycle.length}`, 'circular_routing');
      suspiciousMap.set(acc, existing);
    }
  });

  // Add smurfing accounts
  fanIn.forEach((acc, i) => {
    const ringId = `RING_${String(usedRingIds.size + i + 1).padStart(3, '0')}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: [acc],
      pattern_type: 'fan_in',
      risk_score: 75.0,
    });
    const existing = suspiciousMap.get(acc) || { score: 0, patterns: [], ringId };
    existing.score = Math.min(100, existing.score + 30);
    existing.patterns.push('fan_in_aggregation', 'smurfing');
    suspiciousMap.set(acc, existing);
  });

  fanOut.forEach((acc, i) => {
    const ringId = `RING_${String(usedRingIds.size + fanIn.length + i + 1).padStart(3, '0')}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: [acc],
      pattern_type: 'fan_out',
      risk_score: 75.0,
    });
    const existing = suspiciousMap.get(acc) || { score: 0, patterns: [], ringId };
    existing.score = Math.min(100, existing.score + 30);
    existing.patterns.push('fan_out_dispersion', 'smurfing');
    suspiciousMap.set(acc, existing);
  });

  // Add shells
  shells.forEach(acc => {
    const existing = suspiciousMap.get(acc) || { score: 0, patterns: [], ringId: 'SHELL' };
    existing.score = Math.min(100, existing.score + 40);
    existing.patterns.push('shell_account', 'layered_network');
    suspiciousMap.set(acc, existing);
  });

  const suspicious_accounts: AnalysisResult['suspicious_accounts'] = [...suspiciousMap.entries()]
    .map(([id, data]) => ({
      account_id: id,
      suspicion_score: parseFloat(data.score.toFixed(1)),
      detected_patterns: [...new Set(data.patterns)],
      ring_id: data.ringId,
    }))
    .sort((a, b) => b.suspicion_score - a.suspicion_score);

  const elapsed = (Date.now() - start) / 1000;

  return {
    suspicious_accounts,
    fraud_rings: fraudRings,
    summary: {
      total_accounts_analyzed: allNodes.size,
      suspicious_accounts_flagged: suspicious_accounts.length,
      fraud_rings_detected: fraudRings.length,
      processing_time_seconds: parseFloat(elapsed.toFixed(2)),
    },
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMuleAnalysis() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const parseCSV = (file: File): Promise<Transaction[]> =>
    new Promise((resolve, reject) =>
      Papa.parse<Transaction>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: r => {
          if (r.errors.length > 0) reject(new Error('CSV parse error'));
          else resolve(r.data as Transaction[]);
        },
        error: reject,
      })
    );

  const analyze = useCallback(async (file: File) => {
    setFileName(file.name);
    setState('scanning');
    setError(null);

    let txns: Transaction[] = [];
    try {
      txns = await parseCSV(file);
      setTransactions(txns);
    } catch {
      setTransactions([]);
    }

    // Minimum scan animation time
    await new Promise(r => setTimeout(r, 2500));

    try {
      const res = await analyzeTransactions(file);
      setResult(res);
      setState('results');
    } catch {
      // Backend not running → use local analysis
      if (txns.length > 0) {
        const localResult = analyzeLocally(txns);
        setResult(localResult);
        setState('results');
      } else {
        setError('Backend unavailable and no parseable CSV data found.');
        setState('error');
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setTransactions([]);
    setError(null);
    setFileName('');
  }, []);

  const downloadJSON = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'muleguard_analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return { state, result, transactions, error, fileName, analyze, reset, downloadJSON };
}
