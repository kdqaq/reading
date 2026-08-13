import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// 扫描 books 目录，生成书籍清单
// booksDir: books 目录绝对路径
// outputFile: books.json 输出绝对路径
// 返回：书籍数组 [{ title, file }]
export async function scanBooks(booksDir, outputFile) {
  const entries = await readdir(booksDir, { withFileTypes: true });
  const books = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.txt'))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    .map((e) => ({
      title: e.name.replace(/\.txt$/i, ''),
      file: path.posix.join('books', e.name),
    }));
  await writeFile(outputFile, JSON.stringify(books, null, 2) + '\n', 'utf-8');
  return books;
}

// 命令行入口：node tools/scan-books.mjs
const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const root = process.cwd();
  scanBooks(path.join(root, 'books'), path.join(root, 'books.json'))
    .then((books) => console.log(`已生成 books.json，共 ${books.length} 本`))
    .catch((err) => {
      console.error('生成失败：', err);
      process.exit(1);
    });
}
