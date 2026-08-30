import assert from 'node:assert/strict';
import { validateCreatorEligibility, generateUSSD, isValidOrangeMoneyNumber, GIFT_ITEMS } from '../src/lib/ld-monetization.js';

assert.equal(validateCreatorEligibility(999, 1000), false);
assert.equal(validateCreatorEligibility(1000, 1000), true);
assert.equal(validateCreatorEligibility(15000, 10000), true);
assert.equal(isValidOrangeMoneyNumber('0771234567'), true);
assert.equal(isValidOrangeMoneyNumber('+231770123456'), true);
assert.equal(isValidOrangeMoneyNumber('12345'), false);
assert.equal(GIFT_ITEMS.length, 50, 'Expected exactly 50 gift items');
assert.ok(GIFT_ITEMS.every(item => item.priceLD >= 50 && item.priceLD <= 500), 'Gift prices must stay in LD range');
assert.equal(generateUSSD('0771234567', 250), '*144*2*1*1*0771234567*250#');
console.log('LD monetization checks passed');
