import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { splitBook } from '../tools/split-book.mjs';

const SAMPLE = `第一卷：魔性不改
------------
第一节：纵身亡魔心仍不悔
正文一
正文二
第二节：魔子出山
正文三
第二卷：魔头乱世
第一节：乱世之始
正文四
`;

test('按卷/节拆分并生成目录', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'split-test-'));
  try {
    const src = path.join(dir, '蛊真人.txt');
    const booksDir = path.join(dir, 'books');
    await writeFile(src, SAMPLE, 'utf-8');

    const toc = await splitBook(src, booksDir, '蛊真人');

    // 目录结构正确
    assert.equal(toc.title, '蛊真人');
    assert.equal(toc.volumes.length, 2);
    assert.equal(toc.volumes[0].title, '第一卷：魔性不改');
    assert.equal(toc.volumes[0].chapters.length, 2);
    assert.equal(toc.volumes[0].chapters[0].title, '第一节：纵身亡魔心仍不悔');
    assert.equal(toc.volumes[1].title, '第二卷：魔头乱世');
    assert.equal(toc.volumes[1].chapters.length, 1);

    // 章节文件内容正确
    const firstFile = toc.volumes[0].chapters[0].file;
    assert.ok(firstFile.startsWith('books/蛊真人/'));
    const content = await readFile(path.join(dir, firstFile), 'utf-8');
    assert.equal(content, '正文一\n正文二');

    // toc.json 已写入
    const tocJson = JSON.parse(
      await readFile(path.join(booksDir, '蛊真人', 'toc.json'), 'utf-8')
    );
    assert.equal(tocJson.volumes.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
