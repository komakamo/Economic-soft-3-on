const INITIAL_MESSAGE = '準備完了。自動再生を押して、流れを追いかけてみてください。';
const MAX_LOGS = 12;
const RESERVES_RANGE = { min: 0, max: 800 };
const DEBT_RANGE = { min: 50, max: 700 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const appendLog = (logs, message, id) => {
  const entry = { id, message };
  const nextLogs = [...logs, entry];
  if (nextLogs.length > MAX_LOGS) {
    return nextLogs.slice(-MAX_LOGS);
  }
  return nextLogs;
};

const withStatus = (prev, updates, status) => {
  const nextLogId = prev.logCounter;
  return {
    ...prev,
    ...updates,
    status,
    logCounter: nextLogId + 1,
    logs: appendLog(prev.logs, status, nextLogId),
  };
};

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
  logs: [
    {
      id: 0,
      message: INITIAL_MESSAGE,
    },
  ],
  logCounter: 1,
  crisis: null,
});

function simulateStep(state, rng = Math.random) {
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
    next.exchangeRate = pegDrift + (rng() * 2 - 1);

    if (next.reserves < 60 && !next.crisis) {
      next.crisis = '外貨準備枯渇';
      status = '外貨準備が尽きかけたため、変動相場へ移行しました。';
      next.regime = 'float';
    }
  } else {
    const move = clamp(pressure * 1.1, -18, 20);
    next.exchangeRate = clamp(next.exchangeRate + move + (rng() * 3 - 1.5), 40, 400);

    if (Math.abs(move) > 8) {
      next.investorConfidence = clamp(next.investorConfidence - 1.5, 0, 100);
    }
  }

  if (next.investorConfidence < 12 && !next.crisis) {
    next.crisis = '信認危機';
    status = '投資家の信認が急落し、通貨危機が迫っています。';
  }

  next.status = status || '市場は慎重に推移しています。';
  next.logs = appendLog(state.logs, next.status, state.logCounter);
  next.logCounter = state.logCounter + 1;
  return next;
}

export {
  appendLog,
  clamp,
  createInitialState,
  DEBT_RANGE,
  INITIAL_MESSAGE,
  RESERVES_RANGE,
  simulateStep,
  withStatus,
};
