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
});
