import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeText } from '../lib/decode-text.js';

test('UTF-8 文本正确解码', () => {
  const utf8 = new TextEncoder().encode('你好，世界');
  assert.equal(decodeText(utf8), '你好，世界');
});

test('GBK 文本回退解码', () => {
  // "你好" 的 GBK 编码：你 = C4 E3，好 = BA C3
  const gbk = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3]);
  assert.equal(decodeText(gbk), '你好');
});
