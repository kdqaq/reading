import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanBooks } from '../tools/scan-books.mjs';

test('扫描 books 目录生成清单：过滤非 txt、忽略子目录、大小写后缀', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'scan-test-'));
  try {
    const booksDir = path.join(dir, 'books');
    await mkdir(booksDir);
    await writeFile(path.join(booksDir, '三国演义.txt'), '第一回', 'utf-8');
    await writeFile(path.join(booksDir, '红楼梦.TXT'), '第一回', 'utf-8');
    await writeFile(path.join(booksDir, '说明.md'), '不是 txt', 'utf-8');
    await mkdir(path.join(booksDir, '子目录'));
    await writeFile(path.join(booksDir, '子目录', '忽略.txt'), 'x', 'utf-8');

    const output = path.join(dir, 'books.json');
    const books = await scanBooks(booksDir, output);

    assert.deepEqual(
      new Set(books.map((b) => `${b.title}|${b.file}`)),
      new Set(['三国演义|books/三国演义.txt', '红楼梦|books/红楼梦.TXT'])
    );

    const content = JSON.parse(await readFile(output, 'utf-8'));
    assert.equal(content.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
