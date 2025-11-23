import { test } from 'node:test';
import assert from 'node:assert';
import { simulateStep, createInitialState } from '../src/simulation.js';

test('Crisis recovery logic prevents premature recovery', async (t) => {
  await t.test('should not recover from reserves crisis if reserves are still low', () => {
    const mockRng = () => 0.5;
    let state = createInitialState();

    // Setup state for reserves depletion crisis
    state.regime = 'peg';
    state.preferredRegime = 'peg';
    state.reserves = 55; // Below 60 triggers crisis
    state.investorConfidence = 80; // High confidence
    state.crisis = null;

    // Step 1: Trigger crisis
    let nextState = simulateStep(state, mockRng);
    assert.strictEqual(nextState.crisis, '外貨準備枯渇');
    assert.strictEqual(nextState.regime, 'float');

    // Step 2: Attempt recovery
    // With the bug, it would recover here because confidence is high.
    // Correct behavior: It should NOT recover because reserves are still low (55 < 180).
    let step2State = simulateStep(nextState, mockRng);

    assert.strictEqual(step2State.crisis, '外貨準備枯渇', 'Should remain in crisis because reserves are low');
    assert.strictEqual(step2State.regime, 'float', 'Should remain in float regime');
  });

  await t.test('should not recover from confidence crisis if confidence is still low', () => {
    const mockRng = () => 0.5;
    let state = createInitialState();

    // Setup state for confidence crisis
    state.regime = 'peg';
    state.preferredRegime = 'peg';
    state.reserves = 500; // High reserves
    state.investorConfidence = 10; // Below 12 triggers crisis
    state.crisis = null;

    // Step 1: Trigger crisis
    let nextState = simulateStep(state, mockRng);
    assert.strictEqual(nextState.crisis, '信認危機');

    // Step 2: Attempt recovery
    // With the bug, it would recover here because reserves are high.
    // Correct behavior: It should NOT recover because confidence is still low (10 < 45).
    let step2State = simulateStep(nextState, mockRng);

    assert.strictEqual(step2State.crisis, '信認危機', 'Should remain in crisis because confidence is low');
  });
});
