import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialState, simulateStep } from '../src/simulation.js';

const createRng = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('simulateStep', () => {
  it('uses an injected RNG to drive peg regime drift deterministically', () => {
    const rng = createRng(42);
    const next = simulateStep(createInitialState(), rng);

    assert.ok(Math.abs(next.exchangeRate - 93.80315741408677) < 1e-9);
    assert.equal(next.reserves, 500);
    assert.equal(next.status, '市場は慎重に推移しています。');
    assert.equal(next.logs.length, 2);
  });

  it('applies volatility under a float regime with deterministic movement', () => {
    const floatState = { ...createInitialState(), regime: 'float', reserves: 120, investorConfidence: 60 };
    const nextFloat = simulateStep(floatState, createRng(7));

    assert.ok(Math.abs(nextFloat.exchangeRate - 96.76766435235754) < 1e-9);
    assert.ok(Math.abs(nextFloat.investorConfidence - 60.196875) < 1e-9);
    assert.equal(nextFloat.status, '市場は慎重に推移しています。');
  });

  it('flags a confidence crisis when trust collapses', () => {
    const crisisState = { ...createInitialState(), investorConfidence: 5, regime: 'float' };
    const crisisNext = simulateStep(crisisState, createRng(3));

    assert.equal(crisisNext.crisis, '信認危機');
    assert.equal(crisisNext.status, '投資家の信認が急落し、通貨危機が迫っています。');
    assert.ok(crisisNext.investorConfidence < 10);
  });

  it('exits a peg with depleted reserves and logs the crisis details', () => {
    const lowReservesState = { ...createInitialState(), reserves: 55 };
    const rng = createRng(9);

    const crisisStep = simulateStep(lowReservesState, rng);

    assert.equal(crisisStep.crisis, '外貨準備枯渇');
    assert.equal(crisisStep.regime, 'float');
    assert.equal(crisisStep.status, '外貨準備が尽きかけたため、変動相場へ移行しました。');
    assert.ok(Math.abs(crisisStep.exchangeRate - 93.8026408737154) < 1e-9);
    assert.equal(crisisStep.logCounter, lowReservesState.logCounter + 1);
    assert.equal(crisisStep.logs.length, lowReservesState.logs.length + 1);
    assert.equal(crisisStep.logs.at(-1).id, lowReservesState.logCounter);
    assert.equal(crisisStep.logs.at(-1).message, crisisStep.status);
  });

  it('clears crises once buffers heal and restores the preferred regime', () => {
    const crisisState = {
      ...createInitialState(),
      regime: 'float',
      preferredRegime: 'peg',
      crisis: '外貨準備枯渇',
      reserves: 210,
      investorConfidence: 65,
      exchangeRate: 165,
      logCounter: 3,
      logs: [
        { id: 0, message: 'initial' },
        { id: 1, message: 'crisis hit' },
      ],
    };

    const recovered = simulateStep(crisisState, createRng(5));

    assert.equal(recovered.crisis, null);
    assert.equal(recovered.regime, 'peg');
    assert.ok(recovered.exchangeRate <= 140);
    assert.equal(recovered.logs.at(-1).message, recovered.status);
    assert.equal(recovered.logs.at(-1).id, crisisState.logCounter);
  });
});
