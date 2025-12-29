"use client";

import { useState } from "react";

interface RiskCalcResult {
  lotSize: number;
  riskAmount: number;
  positionValue: number;
  recommendation: string;
}

export function RiskCalculator() {
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [riskPercentage, setRiskPercentage] = useState<string>("1");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [result, setResult] = useState<RiskCalcResult | null>(null);

  const calculateRisk = () => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercentage);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);

    if (isNaN(balance) || isNaN(risk) || isNaN(entry) || isNaN(sl)) {
      alert("Please fill in all fields with valid numbers");
      return;
    }

    if (risk > 5) {
      alert("⚠️ Risk percentage over 5% is not recommended!");
    }

    const riskAmount = (balance * risk) / 100;
    const pipDifference = Math.abs(entry - sl);

    // Determine pip size (0.0001 for most FX, 0.01 for JPY / metals style quotes)
    const pipSize = entry >= 10 ? 0.01 : 0.0001;
    const pipsAtRisk = pipDifference / pipSize;

    if (pipsAtRisk === 0) {
      alert("Stop loss must differ from entry price");
      return;
    }

    // Approx pip value per standard lot in USD
    const pipValuePerLot = (pipSize / entry) * 100000;
    const dollarRiskPerLot = pipsAtRisk * pipValuePerLot;
    const lotSize = riskAmount / dollarRiskPerLot;
    
    // Position size: for 0.01 lot = 1,000 units, so multiply by 1,000
    const positionValue = (lotSize * 1000) * entry;

    // Generate recommendation
    let recommendation = "";
    if (risk <= 1) {
      recommendation = "✅ Conservative risk - suitable for beginners and prop firm challenges";
    } else if (risk <= 2) {
      recommendation = "⚠️ Moderate risk - acceptable for experienced traders";
    } else if (risk <= 3) {
      recommendation = "⚠️ Aggressive risk - use only with high-probability setups";
    } else {
      recommendation = "🚫 Very high risk - not recommended! Consider reducing to 1-2%";
    }

    setResult({
      lotSize: parseFloat(lotSize.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      positionValue: parseFloat(positionValue.toFixed(2)),
      recommendation,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-panel/50 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Risk Calculator</h3>
        <span className="text-xs text-purple-400 font-semibold">Account Management</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">
            Account Balance ($)
          </label>
          <input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            placeholder="10000"
            className="w-full rounded-lg border border-border bg-slate-900/50 px-4 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">
            Risk Percentage (%)
          </label>
          <input
            type="number"
            value={riskPercentage}
            onChange={(e) => setRiskPercentage(e.target.value)}
            placeholder="1"
            step="0.1"
            max="5"
            className="w-full rounded-lg border border-border bg-slate-900/50 px-4 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">Recommended: 0.5% - 2%</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">
            Entry Price
          </label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="1.08500"
            step="0.00001"
            className="w-full rounded-lg border border-border bg-slate-900/50 px-4 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">
            Stop Loss Price
          </label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="1.08300"
            step="0.00001"
            className="w-full rounded-lg border border-border bg-slate-900/50 px-4 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
          />
        </div>

        <button
          onClick={calculateRisk}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:from-purple-700 hover:to-pink-700"
        >
          Calculate Position Size
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-300">Lot Size:</span>
            <span className="text-lg font-bold text-accent">{result.lotSize} lots</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-300">Risk Amount:</span>
            <span className="text-lg font-bold text-white">${result.riskAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-300">Position Value:</span>
            <span className="text-sm text-slate-400">${result.positionValue.toLocaleString()}</span>
          </div>
          <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
            <p className="text-sm text-slate-200">{result.recommendation}</p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
        <p className="text-xs text-slate-300 leading-relaxed">
          💡 <strong>Tip:</strong> Professional traders risk 0.5-1% per trade. Prop firm challenges typically allow max 5% daily loss and 10% total drawdown.
        </p>
      </div>
    </div>
  );
}
