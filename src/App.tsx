// App.jsx – V2 improvements
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  DollarSign, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  Sun, 
  Moon, 
  RotateCcw, 
  Share2,
  User,
  Users
} from 'lucide-react';

const ExpenseSplitterApp = () => {
  const [step, setStep] = useState('upload');
  const [transactions, setTransactions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState({});
  const [ratio, setRatio] = useState(0.7); // 70/30 default
  const [showRatio, setShowRatio] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  // dark mode
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // persist decisions in session
  useEffect(() => {
    const raw = sessionStorage.getItem('decisions');
    if (raw) setDecisions(JSON.parse(raw));
  }, []);
  useEffect(() => {
    sessionStorage.setItem('decisions', JSON.stringify(decisions));
  }, [decisions]);

  const handleFileUpload = useCallback((file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data
          .map((row, index) => {
            const amount = parseFloat(row.Amount || row.amount || 0);
            const date = new Date(row['Value Date'] || row.date || row.Date);
            return {
              id: index,
              date,
              description: row.Description || row.description || '',
              amount: Math.abs(amount),
              isCredit: amount > 0,
              rawAmount: amount,
            };
          })
          .filter((t) => !isNaN(t.amount) && t.amount !== 0)
          .sort((a, b) => a.date - b.date);
        setTransactions(parsed);
        setStep('confirm');
      },
    });
  }, []);

  const decide = useCallback(
    (type) => {
      setDecisions((d) => ({ ...d, [transactions[currentIndex].id]: type }));
      if (currentIndex < transactions.length - 1) setCurrentIndex((i) => i + 1);
      else setStep('summary');
    },
    [currentIndex, transactions]
  );

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (step !== 'swipe') return;
      if (e.key === 'ArrowLeft') decide('personal');
      if (e.key === 'ArrowRight') decide('split');
      if (e.key === 'ArrowUp') decide('split50');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, decide]);

  const undo = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      setDecisions((d) => {
        const copy = { ...d };
        delete copy[transactions[prev].id];
        return copy;
      });
    }
  };

  const calculate = useCallback(() => {
    const cat = { personal: [], split50: [], split: [] };
    transactions.forEach((t) => {
      const d = decisions[t.id];
      if (d && cat[d]) cat[d].push(t);
    });
    const splitTotal = cat.split.reduce((s, t) => s + (t.isCredit ? -t.amount : t.amount), 0);
    const split50Total = cat.split50.reduce((s, t) => s + (t.isCredit ? -t.amount : t.amount), 0);
    const partnerSplit = splitTotal * (1 - ratio);
    const partner50 = split50Total * 0.5;
    return {
      cat,
      totals: {
        personal: cat.personal.reduce((s, t) => s + t.amount, 0),
        split: splitTotal,
        split50: split50Total,
        partnerOwes: partnerSplit + partner50,
      },
      breakdown: { partnerSplit, partner50 },
      top: [...cat.split, ...cat.split50].sort((a, b) => b.amount - a.amount).slice(0, 5),
    };
  }, [decisions, transactions, ratio]);

  const fmt = (v) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);
  const fmtDate = (d) =>
    new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

  const reset = () => {
    setStep('upload');
    setTransactions([]);
    setCurrentIndex(0);
    setDecisions({});
    sessionStorage.removeItem('decisions');
  };

  const current = transactions[currentIndex];
  const progress = transactions.length ? ((currentIndex / transactions.length) * 100).toFixed(0) : 0;

  const share = async () => {
    const res = calculate();
    const text = `Expense Split
Period: ${fmtDate(transactions[0]?.date)} – ${fmtDate(transactions.at(-1)?.date)}
Partner owes: ${fmt(res.totals.partnerOwes)}
`;
    if (navigator.share) await navigator.share({ title: 'Split Report', text });
    else await navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 backdrop-blur-lg bg-white/95 dark:bg-gray-800/95">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Expense Splitter
          </h1>
          <div className="flex items-center gap-3">
            {step !== 'upload' && (
              <button 
                onClick={() => setShowRatio(!showRatio)} 
                className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                {Math.round(ratio * 100)}/{Math.round((1 - ratio) * 100)}
              </button>
            )}
            <button 
              onClick={() => setDark(!dark)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {step !== 'upload' && (
              <button 
                onClick={reset} 
                className="px-3 py-1.5 text-sm font-medium text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {step === 'upload' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Upload Bank Statement</h2>
                <p className="text-gray-600 dark:text-gray-400">Upload your CSV file to get started with expense splitting</p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer cursor-pointer bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 hover:border-primary/50 transition-colors"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Click to select or drag CSV file here</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-success/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Ready to Process</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Found <span className="font-semibold text-primary">{transactions.length}</span> transactions
                </p>
              </div>
              <button
                onClick={() => setStep('swipe')}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-xl font-semibold transition-colors shadow-lg"
              >
                Start Categorizing →
              </button>
            </div>
          </div>
        )}

        {step === 'swipe' && current && (
          <div className="flex-1 flex flex-col">
            {/* Progress Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentIndex + 1} of {transactions.length}
                </span>
                {currentIndex > 0 && (
                  <button 
                    onClick={undo} 
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Undo
                  </button>
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                <div 
                  style={{ width: `${progress}%` }} 
                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3 text-danger" />
                  Personal
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-success" />
                  50/50
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-warning" />
                  {Math.round(ratio * 100)}%
                </span>
              </div>
            </div>

            {/* Transaction Card */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center border border-gray-200 dark:border-gray-700 transform hover:scale-[1.02] transition-transform">
                <div className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                  {fmt((current as any).amount)}
                </div>
                <div className="text-lg mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {(current as any).description}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {fmtDate((current as any).date)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <button 
                  onClick={() => decide('personal')} 
                  className="py-4 px-3 bg-danger/10 hover:bg-danger/20 text-danger rounded-2xl font-semibold transition-colors text-sm border border-danger/20 flex flex-col items-center gap-1"
                >
                  <User className="w-4 h-4" />
                  Personal
                </button>
                <button 
                  onClick={() => decide('split50')} 
                  className="py-4 px-3 bg-success/10 hover:bg-success/20 text-success rounded-2xl font-semibold transition-colors text-sm border border-success/20 flex flex-col items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  50/50 Split
                </button>
                <button 
                  onClick={() => decide('split')} 
                  className="py-4 px-3 bg-warning/10 hover:bg-warning/20 text-warning rounded-2xl font-semibold transition-colors text-sm border border-warning/20 flex flex-col items-center gap-1"
                >
                  <DollarSign className="w-4 h-4" />
                  {Math.round(ratio * 100)}% Split
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'summary' && (() => {
          const res = calculate();
          return (
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-lg mx-auto space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{fmt(res.totals.partnerOwes)}</div>
                    <div>Partner owes you</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
                  <h3 className="font-semibold mb-2">Top Shared</h3>
                  {res.top.map((t) => (
                    <div key={t.id} className="flex justify-between py-1">
                      <span className="truncate">{t.description}</span>
                      <span>{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>

                <button onClick={share} className="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Report
                </button>
              </div>
            </div>
          );
        })()}
      </main>

      {/* ratio picker modal */}
      {showRatio && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <label className="text-sm">Your share %</label>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={ratio * 100}
              onChange={(e) => setRatio(Number(e.target.value) / 100)}
              className="w-full"
            />
            <div className="text-center mt-2">{Math.round(ratio * 100)} / {Math.round((1 - ratio) * 100)}</div>
            <button onClick={() => setShowRatio(false)} className="mt-2 w-full bg-primary text-white py-1 rounded">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSplitterApp;