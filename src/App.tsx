// App.tsx - Expense Splitter PWA
import { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import "./App.css";
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
  Users,
} from "lucide-react";

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  isCredit: boolean;
  rawAmount: number;
}

type DecisionType = "personal" | "split50" | "split";
type StepType = "upload" | "confirm" | "swipe" | "summary";

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

const ExpenseSplitterApp = () => {
  const [step, setStep] = useState<StepType>("upload");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, DecisionType>>({});
  const [ratio, setRatio] = useState(0.7); // 70/30 default
  const [showRatio, setShowRatio] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
  });

  // dark mode
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // persist decisions in session
  useEffect(() => {
    const raw = sessionStorage.getItem("decisions");
    if (raw) setDecisions(JSON.parse(raw));
  }, []);
  useEffect(() => {
    sessionStorage.setItem("decisions", JSON.stringify(decisions));
  }, [decisions]);

  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const parsed = results.data
          .map((row: any, index: number): Transaction => {
            const amount = parseFloat(row.Amount || row.amount || 0);
            const date = new Date(row["Value Date"] || row.date || row.Date);
            return {
              id: index,
              date,
              description: row.Description || row.description || "",
              amount: Math.abs(amount),
              isCredit: amount > 0,
              rawAmount: amount,
            };
          })
          .filter((t: Transaction) => !isNaN(t.amount) && t.amount !== 0)
          .sort(
            (a: Transaction, b: Transaction) =>
              a.date.getTime() - b.date.getTime()
          );
        setTransactions(parsed);
        setStep("confirm");
      },
    });
  }, []);

  const decide = useCallback(
    (type: DecisionType) => {
      setDecisions((d) => ({ ...d, [transactions[currentIndex].id]: type }));
      if (currentIndex < transactions.length - 1) setCurrentIndex((i) => i + 1);
      else setStep("summary");
    },
    [currentIndex, transactions]
  );

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step !== "swipe") return;
      if (e.key === "ArrowLeft") decide("personal");
      if (e.key === "ArrowRight") decide("split");
      if (e.key === "ArrowUp") decide("split50");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, decide]);

  // Touch/swipe handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (step !== "swipe") return;
      const touch = e.touches[0];
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isDragging: true,
      });
    },
    [step]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (step !== "swipe" || !swipeState.isDragging) return;
      const touch = e.touches[0];
      setSwipeState((prev) => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }));
    },
    [step, swipeState.isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (step !== "swipe" || !swipeState.isDragging) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = swipeState.currentY - swipeState.startY;
    const threshold = 50;

    // Reset swipe state
    setSwipeState((prev) => ({ ...prev, isDragging: false }));

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          decide("split"); // Swipe right = split
        } else {
          decide("personal"); // Swipe left = personal
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold && deltaY < 0) {
        decide("split50"); // Swipe up = 50/50
      }
    }
  }, [step, swipeState, decide]);

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
    const cat: Record<DecisionType, Transaction[]> = {
      personal: [],
      split50: [],
      split: [],
    };
    transactions.forEach((t) => {
      const d = decisions[t.id];
      if (d && cat[d]) cat[d].push(t);
    });
    const splitTotal = cat.split.reduce(
      (s, t) => s + (t.isCredit ? -t.amount : t.amount),
      0
    );
    const split50Total = cat.split50.reduce(
      (s, t) => s + (t.isCredit ? -t.amount : t.amount),
      0
    );
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
      top: [...cat.split, ...cat.split50]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    };
  }, [decisions, transactions, ratio]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(v);
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);

  const reset = () => {
    setStep("upload");
    setTransactions([]);
    setCurrentIndex(0);
    setDecisions({});
    sessionStorage.removeItem("decisions");
  };

  const current = transactions[currentIndex];
  const progress = transactions.length
    ? ((currentIndex / transactions.length) * 100).toFixed(0)
    : 0;

  const share = async () => {
    const res = calculate();
    const text = `Expense Split
Period: ${transactions[0] ? fmtDate(transactions[0].date) : ""} – ${
      transactions.at(-1) ? fmtDate(transactions.at(-1)!.date) : ""
    }
Partner owes: ${fmt(res.totals.partnerOwes)}
`;
    if (navigator.share) await navigator.share({ title: "Split Report", text });
    else await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      <header className="sticky top-0 z-50 glass border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-400" />
            Expense Splitter
          </h1>
          <div className="flex items-center gap-3">
            {step !== "upload" && (
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
              {dark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            {step !== "upload" && (
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
        {step === "upload" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full animate-slide-up">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center shadow-glow transform hover:scale-105 transition-transform duration-200">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Upload Bank Statement
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Upload your CSV file to get started with expense splitting
                </p>
              </div>
              <div className="relative group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileUpload(e.target.files[0])
                  }
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-primary file:to-purple-600 file:text-white hover:file:shadow-glow file:cursor-pointer cursor-pointer bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 hover:border-primary/50 hover:shadow-card-hover transition-all duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="text-gray-400 text-sm">
                    Click to select or drag CSV file here
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-card-hover border border-gray-200/50 dark:border-gray-700/50 animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-glow transform hover:rotate-12 transition-transform duration-300">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  Ready to Process
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Found{" "}
                  <span className="font-bold text-primary text-lg">
                    {transactions.length}
                  </span>{" "}
                  transactions
                </p>
              </div>
              <button
                onClick={() => setStep("swipe")}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 shadow-glow hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                Start Categorizing →
              </button>
            </div>
          </div>
        )}

        {step === "swipe" && current && (
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

            {/* Transaction Card Stack */}
            <div className="flex-1 flex items-center justify-center p-6 relative card-stack">
              <div className="relative w-full max-w-sm h-96">
                {/* Background cards (stack effect) */}
                {transactions
                  .slice(currentIndex, currentIndex + 3)
                  .map((_, i) => (
                    <div
                      key={`bg-${currentIndex + i}`}
                      className="absolute inset-0 glass-dark rounded-[2rem] border border-white/10"
                      style={{
                        transform: `scale(${1 - i * 0.05}) translateY(${
                          i * 8
                        }px)`,
                        zIndex: 10 - i,
                        opacity: 1 - i * 0.3,
                      }}
                    />
                  ))}

                {/* Active swipe card */}
                <div
                  className={`absolute inset-0 glass rounded-[2rem] p-8 text-center border border-white/20 shadow-2xl swipe-card ${
                    swipeState.isDragging ? "dragging" : ""
                  }`}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform: swipeState.isDragging
                      ? `translateX(${
                          swipeState.currentX - swipeState.startX
                        }px) translateY(${
                          swipeState.currentY - swipeState.startY
                        }px) rotate(${
                          (swipeState.currentX - swipeState.startX) * 0.1
                        }deg)`
                      : "translateX(0px) translateY(0px) rotate(0deg)",
                    zIndex: 20,
                  }}
                >
                  {/* Swipe indicators */}
                  <div
                    className="absolute top-8 left-8 swipe-indicator-left"
                    style={{
                      opacity:
                        swipeState.isDragging &&
                        swipeState.currentX - swipeState.startX < -50
                          ? 1
                          : 0,
                    }}
                  >
                    PERSONAL
                  </div>
                  <div
                    className="absolute top-8 right-8 swipe-indicator-right"
                    style={{
                      opacity:
                        swipeState.isDragging &&
                        swipeState.currentX - swipeState.startX > 50
                          ? 1
                          : 0,
                    }}
                  >
                    SPLIT
                  </div>
                  <div
                    className="absolute top-8 left-1/2 transform -translate-x-1/2 swipe-indicator-up"
                    style={{
                      opacity:
                        swipeState.isDragging &&
                        swipeState.currentY - swipeState.startY < -50
                          ? 1
                          : 0,
                    }}
                  >
                    50/50
                  </div>

                  <div className="flex flex-col justify-center h-full">
                    <div className="text-5xl font-black mb-6 text-white">
                      {fmt(current.amount)}
                    </div>
                    <div className="text-xl mb-6 text-slate-200 leading-relaxed font-medium">
                      {current.description}
                    </div>
                    <div className="text-sm text-slate-400 font-semibold tracking-wider uppercase">
                      {fmtDate(current.date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 glass border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => decide("personal")}
                  className="py-5 px-4 bg-gradient-to-br from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 text-red-400 rounded-3xl font-bold transition-all duration-300 text-sm border-2 border-red-500/30 hover:border-red-500/50 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glass"
                >
                  <User className="w-5 h-5" />
                  Personal
                </button>
                <button
                  onClick={() => decide("split50")}
                  className="py-5 px-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 rounded-3xl font-bold transition-all duration-300 text-sm border-2 border-green-500/30 hover:border-green-500/50 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glass"
                >
                  <Users className="w-5 h-5" />
                  50/50 Split
                </button>
                <button
                  onClick={() => decide("split")}
                  className="py-5 px-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 hover:from-orange-500/30 hover:to-yellow-500/30 text-orange-400 rounded-3xl font-bold transition-all duration-300 text-sm border-2 border-orange-500/30 hover:border-orange-500/50 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 glass"
                >
                  <DollarSign className="w-5 h-5" />
                  {Math.round(ratio * 100)}% Split
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "summary" &&
          (() => {
            const res = calculate();
            return (
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="glass rounded-3xl p-6 text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                      {fmt(res.totals.partnerOwes)}
                    </div>
                    <div className="text-gray-300">Partner owes you</div>
                  </div>

                  <div className="glass rounded-3xl p-6">
                    <h3 className="font-semibold mb-4 text-white text-lg">
                      Top Shared Expenses
                    </h3>
                    <div className="space-y-3">
                      {res.top.map((t) => (
                        <div
                          key={t.id}
                          className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0"
                        >
                          <span className="truncate text-gray-300">
                            {t.description}
                          </span>
                          <span className="text-white font-medium">
                            {fmt(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={share}
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-4 px-6 rounded-3xl font-bold transition-all duration-300 shadow-xl flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Report
                  </button>
                </div>
              </div>
            );
          })()}
      </main>

      {/* ratio picker modal */}
      {showRatio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="glass rounded-3xl p-6 m-4 max-w-sm w-full">
            <label className="text-lg font-semibold text-white mb-4 block">
              Your share %
            </label>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={ratio * 100}
              onChange={(e) => setRatio(Number(e.target.value) / 100)}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider mb-4"
            />
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-white">
                {Math.round(ratio * 100)}% / {Math.round((1 - ratio) * 100)}%
              </div>
              <div className="text-gray-300 text-sm">You / Partner</div>
            </div>
            <button
              onClick={() => setShowRatio(false)}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-3 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSplitterApp;
