import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  crushSpiceStep,
  addBrewIngredientStep,
  advanceBoiling,
  plateOrderStep,
  isOrderReadyToServe,
  completeServeCustomer,
  getRadioEventForCustomerIndex,
  calculateOrderCoins,
  purchaseUpgrade,
  generateCustomerOrder,
  resetCurrentPreparation,
  hasAnyStationProgress,
} from './rules';

test('Station 1 -> Station 2 -> Station 3 full preparation and serving flow', () => {
  let state = createInitialGameState({ coins: 20, customersServedTotal: 0 });
  assert.equal(state.station.crushCount, 0);
  assert.equal(isOrderReadyToServe(state.station), false);

  // Crush 3 times in Station 1 (Mortar & Pestle)
  state = crushSpiceStep(state);
  state = crushSpiceStep(state);
  state = crushSpiceStep(state);
  assert.equal(state.station.crushCount, 3);

  // Add ingredients in Station 2 (Stove & Pot)
  state = addBrewIngredientStep(state, 'water');
  assert.equal(state.station.waterAdded, true);
  state = addBrewIngredientStep(state, 'tea_leaves');
  assert.equal(state.station.teaLeavesAdded, true);
  state = addBrewIngredientStep(state, 'milk_or_lemon');
  assert.equal(state.station.milkOrLemonAdded, true);
  state = addBrewIngredientStep(state, 'crushed_spices');
  assert.equal(state.station.spicesInPot, true);

  // Simmer for 3 seconds — never burns or boils over even if left longer
  state = advanceBoiling(state, 3.5);
  assert.equal(state.station.isBoiled, true);
  state = advanceBoiling(state, 10.0);
  assert.equal(state.station.boilProgress, 100);
  assert.equal(state.station.isBoiled, true);

  // Station 3: Pour into cup and add snack
  state = plateOrderStep(state, 'auto_plate');
  assert.equal(state.station.pouredCup, state.currentCustomer.cup);
  state = plateOrderStep(state, 'auto_plate');
  assert.equal(state.station.platedSnack, state.currentCustomer.snack);
  assert.equal(isOrderReadyToServe(state.station), true);

  // Serve customer and earn coins
  const result = completeServeCustomer(state);
  assert.equal(result.earnedCoins, 10);
  assert.equal(result.nextState.coins, 30);
  assert.equal(result.nextState.customersServedTotal, 1);
});

test('Radio events rotate every 3 customers and adjust orders & rewards', () => {
  assert.equal(getRadioEventForCustomerIndex(0), 'normal');
  assert.equal(getRadioEventForCustomerIndex(2), 'normal');
  assert.equal(getRadioEventForCustomerIndex(3), 'monsoon');
  assert.equal(getRadioEventForCustomerIndex(6), 'milkman_delayed');
  assert.equal(getRadioEventForCustomerIndex(9), 'diwali');

  // Milkman delayed order uses black_lemon_chai
  const milkmanOrder = generateCustomerOrder(6, 'milkman_delayed', []);
  assert.equal(milkmanOrder.teaBase, 'black_lemon_chai');

  // Diwali doubles coin rewards
  const diwaliOrder = generateCustomerOrder(9, 'diwali', ['samosa']);
  const diwaliCoins = calculateOrderCoins(diwaliOrder, 'diwali', ['samosa']);
  assert.equal(diwaliCoins.total, (diwaliCoins.base + diwaliCoins.upgradeBonus) * 2);
});

test('Upgrade shop unlocks items and deducts coins safely', () => {
  const state = createInitialGameState({ coins: 50, unlockedUpgrades: [] });
  const res1 = purchaseUpgrade(state, 'samosa'); // costs 30
  assert.equal(res1.success, true);
  assert.equal(res1.nextState.coins, 20);
  assert.equal(res1.nextState.unlockedUpgrades.includes('samosa'), true);

  // Cannot buy duplicate or unaffordable item
  const resDuplicate = purchaseUpgrade(res1.nextState, 'samosa');
  assert.equal(resDuplicate.success, false);
  const resTooExpensive = purchaseUpgrade(res1.nextState, 'marigold_lights'); // costs 100
  assert.equal(resTooExpensive.success, false);
});

test('Empty Tray / Undo clears current preparation with zero penalty', () => {
  let state = createInitialGameState({ coins: 40 });
  assert.equal(hasAnyStationProgress(state.station), false);
  state = crushSpiceStep(state);
  state = addBrewIngredientStep(state, 'water');
  assert.equal(hasAnyStationProgress(state.station), true);

  const cleared = resetCurrentPreparation(state);
  assert.equal(hasAnyStationProgress(cleared.station), false);
  assert.equal(cleared.coins, 40);
});
