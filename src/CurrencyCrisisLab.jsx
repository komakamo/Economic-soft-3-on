import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Flame,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  Waves,
} from 'lucide-react';

const INITIAL_MESSAGE = '準備完了。自動再生を押して、流れを追いかけてみてください。';
const MAX_LOGS = 12;
const RESERVES_RANGE = { min: 0, max: 800 };
const DEBT_RANGE = { min: 50, max: 700 };

const createInitialState = () => ({
  time: 0,
  exchangeRate: 100,
  reserves: 500,
  foreignDebtUSD: 200,
  investorConfidence: 80,
  interestRate: 5,
  globalInterestRate: 4,
  capitalControls: false,
  regime: 'peg',
  status: INITIAL_MESSAGE,
  logs: [INITIAL_MESSAGE],
  crisis: null,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const appendLog = (logs, message) => {
  const nextLogs = [...logs, message];
  if (nextLogs.length > MAX_LOGS) {
    return nextLogs.slice(-MAX_LOGS);
  }
  return nextLogs;
};

const withStatus = (prev, updates, status) => ({
  ...prev,
  ...updates,
  status,
  logs: appendLog(prev.logs, status),
});

const formatNumber = (value) => value.toLocaleString('ja-JP', { maximumFractionDigits: 1 });

function simulateStep(state) {
  const next = { ...state };
  next.time += 1;

  let pressure = 0;
  let status = '';

  const rateDifferential = next.interestRate - next.globalInterestRate;
  pressure -= rateDifferential * 3.5;

  const confidenceDrag = clamp((70 - next.investorConfidence) / 5, -4, 8);
  pressure += confidenceDrag;

  const debtLoad = (next.foreignDebtUSD * (next.exchangeRate / 100)) / 500;
  if (debtLoad > 1) {
    pressure += (debtLoad - 1) * 6;
  }

  if (next.capitalControls) {
    pressure *= 0.6;
    status = '資本規制により流出がやや抑制されています。';
  } else {
    pressure *= 1.05;
  }

  next.investorConfidence -= clamp(pressure / 8, -2, 4);
  next.investorConfidence = clamp(next.investorConfidence, 0, 100);

  if (next.regime === 'peg') {
    const defenseCost = Math.max(0, pressure * 2.2);
    next.reserves = clamp(next.reserves - defenseCost * 0.65, RESERVES_RANGE.min, RESERVES_RANGE.max);

    const pegDrift = 100 + clamp(pressure * 0.9, -12, 18);
    next.exchangeRate = pegDrift + (Math.random() * 2 - 1);

    if (next.reserves < 60 && !next.crisis) {
      next.crisis = '外貨準備枯渇';
      status = '外貨準備が尽きかけたため、変動相場へ移行しました。';
      next.regime = 'float';
    }
  } else {
    const move = clamp(pressure * 1.1, -18, 20);
    next.exchangeRate = clamp(next.exchangeRate + move + (Math.random() * 3 - 1.5), 40, 400);

    if (Math.abs(move) > 8) {
      next.investorConfidence = clamp(next.investorConfidence - 1.5, 0, 100);
    }
  }

  if (next.investorConfidence < 12 && !next.crisis) {
    next.crisis = '信認危機';
    status = '投資家の信認が急落し、通貨危機が迫っています。';
  }

  next.status = status || '市場は慎重に推移しています。';
  next.logs = appendLog(state.logs, next.status);
  return next;
}

function StatCard({ title, value, helper, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-900/70 border-slate-800 text-slate-100',
    success: 'bg-emerald-900/40 border-emerald-700/60 text-emerald-50',
    warning: 'bg-amber-900/40 border-amber-700/60 text-amber-50',
  };

  return (
    <div className={`card-glow rounded-xl border p-4 shadow-lg ${tones[tone] || tones.default}`}>
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-5 w-5 opacity-80" />}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="text-xl font-semibold leading-6">{value}</p>
          {helper && <p className="text-xs text-slate-400">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-slate-50 border border-emerald-500',
    danger: 'bg-rose-700 hover:bg-rose-600 text-rose-50 border border-rose-500',
    subtle: 'bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-slate-800',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${tones[tone]}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}

function CurrencyCrisisLab() {
  const [state, setState] = useState(() => createInitialState());
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay) return undefined;
    const id = setInterval(() => {
      setState((prev) => simulateStep(prev));
    }, 900);
    return () => clearInterval(id);
  }, [autoPlay]);

  useEffect(() => {
    if (state.crisis && autoPlay) {
      setAutoPlay(false);
    }
  }, [state.crisis, autoPlay]);

  const handleRateChange = (delta) => {
    setState((prev) => {
      const status = delta > 0 ? '政策金利を引き上げました。' : '政策金利を引き下げました。';
      return withStatus(prev, { interestRate: clamp(prev.interestRate + delta, 0, 25) }, status);
    });
  };

  const handleShock = (type) => {
    setState((prev) => {
      const next = { ...prev };
      let status = prev.status;
      if (type === 'global-rate') {
        next.globalInterestRate = clamp(next.globalInterestRate + 1.8, 0, 15);
        status = '米国の利上げショック。安全資産への資金逃避が起きています。';
      }
      if (type === 'panic') {
        next.investorConfidence = clamp(next.investorConfidence - 18, 0, 100);
        status = 'ニュースで投資家心理が急落しました。';
      }
      if (type === 'oil') {
        next.reserves = clamp(next.reserves - 50, RESERVES_RANGE.min, RESERVES_RANGE.max);
        status = '輸入コスト上昇で外貨準備が削られました。';
      }
      return withStatus(prev, next, status);
    });
  };

  const toggleRegime = () => {
    setState((prev) => {
      const status =
        prev.regime === 'peg'
          ? '固定相場を終了し、変動相場へ移行しました。'
          : '再びドルペッグへ戻しました。';
      return withStatus(
        prev,
        { regime: prev.regime === 'peg' ? 'float' : 'peg' },
        status,
      );
    });
  };

  const toggleControls = () => {
    setState((prev) => {
      const status = !prev.capitalControls
        ? '資本規制を導入し、フローを絞りました。'
        : '資本規制を解除しました。';
      return withStatus(prev, { capitalControls: !prev.capitalControls }, status);
    });
  };

  const adjustReserves = (value, reason) => {
    setState((prev) => {
      const clamped = clamp(value, RESERVES_RANGE.min, RESERVES_RANGE.max);
      const direction = clamped >= prev.reserves ? '積み増しました' : '取り崩しました';
      const status = reason || `外貨準備を${direction}（${formatNumber(clamped)} 億$）。`;
      return withStatus(prev, { reserves: clamped }, status);
    });
  };

  const adjustForeignDebt = (value, reason) => {
    setState((prev) => {
      const clamped = clamp(value, DEBT_RANGE.min, DEBT_RANGE.max);
      const direction = clamped >= prev.foreignDebtUSD ? '積み上がっています' : '圧縮しました';
      const status = reason || `外貨建て債務が${direction}（${formatNumber(clamped)} 億$）。`;
      return withStatus(prev, { foreignDebtUSD: clamped }, status);
    });
  };

  const reset = () => {
    setAutoPlay(false);
    setState(createInitialState());
  };

  const infoChips = useMemo(
    () => [
      {
        label: state.regime === 'peg' ? '固定相場 (peg)' : '変動相場 (float)',
        icon: Waves,
        tone: state.regime === 'peg' ? 'bg-amber-500/20 text-amber-100' : 'bg-sky-500/20 text-sky-100',
      },
      {
        label: state.capitalControls ? '資本規制 ON' : '資本規制 OFF',
        icon: Shield,
        tone: state.capitalControls ? 'bg-emerald-500/20 text-emerald-100' : 'bg-slate-800 text-slate-200',
      },
      {
        label: state.crisis ? '⚠️ 危機モード' : '安定モード',
        icon: AlertTriangle,
        tone: state.crisis ? 'bg-rose-600/30 text-rose-50' : 'bg-slate-800 text-slate-200',
      },
    ],
    [state.capitalControls, state.crisis, state.regime],
  );

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 flex flex-wrap gap-2">
        {infoChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span
              key={chip.label}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${chip.tone}`}
            >
              <Icon className="h-4 w-4" />
              {chip.label}
            </span>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="経過時間"
          value={`${state.time} 週経過`}
          helper="時間経過とともに市場が反応します"
          icon={Activity}
        />
        <StatCard
          title="為替レート"
          value={`${formatNumber(state.exchangeRate)} 自国通貨 / $`}
          helper={state.regime === 'peg' ? '固定相場のため大きくは動きません' : '変動相場では圧力で上下します'}
          icon={ArrowRight}
        />
        <StatCard
          title="外貨準備"
          value={`${formatNumber(state.reserves)} 億$`}
          helper="pegを守るほど消耗します"
          icon={Shield}
          tone={state.reserves < 120 ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard
          title="外貨建て債務"
          value={`${formatNumber(state.foreignDebtUSD)} 億$`}
          helper="通貨安で返済コストが増大"
          icon={ArrowRight}
        />
        <StatCard
          title="投資家の信認"
          value={`${formatNumber(state.investorConfidence)} / 100`}
          helper="信認が下がるほど売り圧力"
          icon={Shield}
          tone={state.investorConfidence < 30 ? 'warning' : 'default'}
        />
        <StatCard
          title="政策金利 vs 世界金利"
          value={`${state.interestRate.toFixed(1)}% / ${state.globalInterestRate.toFixed(1)}%`}
          helper="金利差がフローを左右"
          icon={Flame}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">政策金利</p>
            <p className="text-xs text-slate-400">高いほど通貨防衛に有利</p>
          </div>
          <div className="flex items-center gap-3 text-2xl font-bold text-emerald-200">
            {state.interestRate.toFixed(1)}%
            <span className="text-sm font-semibold text-slate-400">/ 世界 {state.globalInterestRate.toFixed(1)}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton label="-0.5%" onClick={() => handleRateChange(-0.5)} icon={ArrowRight} tone="subtle" />
            <ActionButton label="+0.5%" onClick={() => handleRateChange(0.5)} icon={ArrowRight} tone="primary" />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-300">
            <ActionButton label="米国が利上げ" onClick={() => handleShock('global-rate')} icon={Activity} tone="subtle" />
            <ActionButton label="投資家パニック" onClick={() => handleShock('panic')} icon={AlertTriangle} tone="danger" />
            <ActionButton label="外貨準備ショック" onClick={() => handleShock('oil')} icon={Flame} tone="subtle" />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-slate-200">通貨制度と資本フロー</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-slate-100">
            <ActionButton
              label={state.regime === 'peg' ? '変動相場に移行' : '固定相場に戻す'}
              onClick={toggleRegime}
              icon={Waves}
              tone="primary"
            />
            <ActionButton
              label={state.capitalControls ? '資本規制を解除' : '資本規制を導入'}
              onClick={toggleControls}
              icon={Shield}
              tone={state.capitalControls ? 'default' : 'subtle'}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-slate-800 px-3 py-1">peg: 準備を使ってレートを守る</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">float: 圧力をレート変動で吸収</span>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-slate-200">外貨準備と外貨建て債務</p>

          <div className="space-y-2 rounded-xl bg-slate-900/80 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>外貨準備</span>
              <span>
                {formatNumber(state.reserves)} 億$ / {RESERVES_RANGE.max} max
              </span>
            </div>
            <input
              type="range"
              min={RESERVES_RANGE.min}
              max={RESERVES_RANGE.max}
              step={10}
              value={state.reserves}
              onChange={(e) => adjustReserves(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-100">
              <ActionButton
                label="-25 億$"
                onClick={() => adjustReserves(state.reserves - 25)}
                tone="subtle"
              />
              <ActionButton
                label="+25 億$"
                onClick={() => adjustReserves(state.reserves + 25)}
                tone="primary"
              />
              <ActionButton
                label="備蓄を積む"
                onClick={() => adjustReserves(state.reserves + 60, '外貨準備を積み増しました。')}
                icon={Shield}
                tone="subtle"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-900/80 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>外貨建て債務</span>
              <span>
                {formatNumber(state.foreignDebtUSD)} 億$ / {DEBT_RANGE.max} max
              </span>
            </div>
            <input
              type="range"
              min={DEBT_RANGE.min}
              max={DEBT_RANGE.max}
              step={10}
              value={state.foreignDebtUSD}
              onChange={(e) => adjustForeignDebt(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-100">
              <ActionButton
                label="-20 億$"
                onClick={() => adjustForeignDebt(state.foreignDebtUSD - 20)}
                tone="subtle"
              />
              <ActionButton
                label="+20 億$"
                onClick={() => adjustForeignDebt(state.foreignDebtUSD + 20)}
                tone="danger"
              />
              <ActionButton
                label="借換を進める"
                onClick={() => adjustForeignDebt(state.foreignDebtUSD - 35, '借換で外貨債務を圧縮しました。')}
                icon={RefreshCw}
                tone="subtle"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionButton
          label={autoPlay ? '自動再生を停止' : '自動再生'}
          onClick={() => setAutoPlay((prev) => !prev)}
          icon={autoPlay ? Pause : Play}
          tone={autoPlay ? 'default' : 'primary'}
        />
        <ActionButton label="1ステップ進める" onClick={() => setState((prev) => simulateStep(prev))} icon={ArrowRight} />
        <ActionButton label="リセット" onClick={reset} icon={RotateCcw} tone="subtle" />
        <ActionButton
          label="市場の様子を見る"
          onClick={() =>
            setState((prev) => {
              const status = '市場は様子見しています。';
              return { ...prev, status, logs: appendLog(prev.logs, status) };
            })
          }
          icon={RefreshCw}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          {state.crisis ? <AlertTriangle className="h-5 w-5 text-rose-400" /> : <Activity className="h-5 w-5 text-emerald-300" />} 
          <span>{state.crisis ? '危機シグナル' : 'マーケットログ'}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {[...state.logs]
            .slice()
            .reverse()
            .map((log, index) => (
              <li
                key={`${index}-${log.slice(0, 12)}`}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-5 ${
                  index === 0
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-50'
                    : 'border-slate-800 bg-slate-900/80 text-slate-200'
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 rounded-full ${
                    index === 0 ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span className="flex-1">{log}</span>
              </li>
            ))}
        </ul>
        {state.crisis && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
            <AlertTriangle className="h-4 w-4" />
            <span>{state.crisis}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrencyCrisisLab;
