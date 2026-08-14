import { readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// 扫描 books 目录，生成书籍清单
// 支持两种书：
//   1. 单文件书：books/xxx.txt            -> { title, file }
//   2. 目录书  ：books/xxx/toc.json        -> { title, toc }
// booksDir: books 目录绝对路径
// outputFile: books.json 输出绝对路径
// 返回：书籍数组
export async function scanBooks(booksDir, outputFile) {
  const entries = await readdir(booksDir, { withFileTypes: true });
  const books = [];

  for (const e of entries) {
    if (e.isDirectory()) {
      const tocPath = path.join(booksDir, e.name, 'toc.json');
      try {
        await access(tocPath);
        books.push({
          title: e.name,
          toc: path.posix.join('books', e.name, 'toc.json'),
        });
      } catch {
        // 子目录里没有 toc.json，跳过
      }
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.txt')) {
      books.push({
        title: e.name.replace(/\.txt$/i, ''),
        file: path.posix.join('books', e.name),
      });
    }
  }

  books.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
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
