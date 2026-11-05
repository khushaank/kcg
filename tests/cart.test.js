import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCart,mergeCarts,cartLines,cartTotal,money } from '../src/cart.js';

test('cart sanitizes storage, merges duplicates and calculates integer-paise totals',()=>{
  const cart=normalizeCart([{product_id:'a',quantity:2},{product_id:'a',quantity:3},{product_id:'b',quantity:20},{product_id:'bad',quantity:-2},{product_id:'bad',quantity:1.5},null]);
  assert.deepEqual(cart,[{product_id:'a',quantity:5},{product_id:'b',quantity:10}]);
  const lines=cartLines(cart,[{id:'a',price_paise:125000}]);
  assert.equal(lines.length,1);
  assert.equal(cartTotal(lines),625000);
  assert.equal(money(125000),'₹1,250');
  assert.equal(money(125050),'₹1,250.5');
  assert.deepEqual(normalizeCart({items:[]}),[]);
  assert.deepEqual(mergeCarts(cart,cart),cart,'cloud and device carts must not double quantities on every page load');
  assert.equal(mergeCarts([{product_id:'a',quantity:2}],[{product_id:'a',quantity:4}])[0].quantity,4);
});
