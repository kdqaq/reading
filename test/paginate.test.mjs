import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../lib/paginate.js';

test('正常分页：按高度分组', () => {
  const items = ['a', 'b', 'c', 'd'];
  const pages = paginate(items, () => 3, 6);
  assert.deepEqual(pages, [[0, 1], [2, 3]]);
});

test('空输入返回空数组', () => {
  assert.deepEqual(paginate([], () => 1, 10), []);
});

test('单个 item 超过一页时独占一页', () => {
  const items = ['big', 'small'];
  const measure = (s) => (s === 'big' ? 100 : 1);
  assert.deepEqual(paginate(items, measure, 10), [[0], [1]]);
});

test('刚好填满一页时不切页', () => {
  const items = ['a', 'b'];
  assert.deepEqual(paginate(items, () => 5, 10), [[0, 1]]);
});

test('measure 能拿到下标', () => {
  const items = ['x', 'y', 'z'];
  const seen = [];
  paginate(items, (_item, i) => { seen.push(i); return 1; }, 3);
  assert.deepEqual(seen, [0, 1, 2]);
});
