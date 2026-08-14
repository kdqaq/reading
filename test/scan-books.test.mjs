import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanBooks } from '../tools/scan-books.mjs';

test('扫描 books 目录：单文件书 + 目录书 + 过滤', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'scan-test-'));
  try {
    const booksDir = path.join(dir, 'books');
    await mkdir(booksDir);

    // 单文件书
    await writeFile(path.join(booksDir, '三国演义.txt'), '第一回', 'utf-8');
    // 非 txt，忽略
    await writeFile(path.join(booksDir, '说明.md'), '不是书', 'utf-8');
    // 目录书：子目录 + toc.json
    await mkdir(path.join(booksDir, '蛊真人'));
    await writeFile(path.join(booksDir, '蛊真人', 'toc.json'), '{}', 'utf-8');
    await writeFile(path.join(booksDir, '蛊真人', '001.txt'), '正文', 'utf-8');
    // 无 toc.json 的子目录，忽略
    await mkdir(path.join(booksDir, '普通目录'));
    await writeFile(path.join(booksDir, '普通目录', 'x.txt'), '忽略', 'utf-8');

    const output = path.join(dir, 'books.json');
    const books = await scanBooks(booksDir, output);

    // 只识别出两本书
    assert.deepEqual(
      new Set(books.map((b) => b.title)),
      new Set(['三国演义', '蛊真人'])
    );

    // 单文件书结构
    const san = books.find((b) => b.title === '三国演义');
    assert.equal(san.file, 'books/三国演义.txt');
    assert.equal(san.toc, undefined);

    // 目录书结构
    const gu = books.find((b) => b.title === '蛊真人');
    assert.equal(gu.toc, 'books/蛊真人/toc.json');
    assert.equal(gu.file, undefined);

    // 输出文件内容正确
    const content = JSON.parse(await readFile(output, 'utf-8'));
    assert.equal(content.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
