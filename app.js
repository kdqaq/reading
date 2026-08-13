import { decodeText } from './lib/decode-text.js';
import { paginate } from './lib/paginate.js';

const $ = (sel) => document.querySelector(sel);

const bookshelfEl = $('#bookshelf');
const readerEl = $('#reader');
const bookListEl = $('#book-list');
const bookTitleEl = $('#book-title');
const pageIndicatorEl = $('#page-indicator');
const pageContentEl = $('#page-content');
const btnBack = $('#btn-back');
const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnFontMinus = $('#btn-font-minus');
const btnFontPlus = $('#btn-font-plus');
const btnTheme = $('#btn-theme');

let books = [];
let lines = [];        // 当前书按行切分
let lineHeights = [];  // 每行实测高度
let pages = [];        // 页分组（每页是行下标的数组）
let currentPage = 0;
let fontSize = 20;

// —— 书架 ——
async function loadBooks() {
  try {
    const res = await fetch('books.json');
    if (!res.ok) throw new Error(res.status);
    books = await res.json();
  } catch {
    books = [];
  }
  renderShelf();
}

function renderShelf() {
  bookListEl.innerHTML = '';
  if (books.length === 0) {
    bookListEl.innerHTML =
      '<p class="empty">暂无书籍，请把 txt 放进 books/ 文件夹，然后运行 npm run scan</p>';
    return;
  }
  for (const book of books) {
    const card = document.createElement('div');
    card.className = 'book-card';
    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.textContent = (book.title || '书').charAt(0);
    const name = document.createElement('div');
    name.className = 'book-name';
    name.textContent = book.title;
    card.append(cover, name);
    card.addEventListener('click', () => openBook(book));
    bookListEl.append(card);
  }
}

// —— 阅读 ——
async function openBook(book) {
  try {
    const res = await fetch(book.file);
    if (!res.ok) throw new Error(res.status);
    const buf = await res.arrayBuffer();
    const text = decodeText(buf);
    lines = text.split('\n');
    currentPage = 0;
    bookTitleEl.textContent = book.title;
    showReader();
    measureAndPaginate();
    renderPage();
  } catch {
    alert('书籍加载失败：' + book.title);
  }
}

function showReader() {
  bookshelfEl.classList.add('hidden');
  readerEl.classList.remove('hidden');
}

function backToShelf() {
  readerEl.classList.add('hidden');
  bookshelfEl.classList.remove('hidden');
}

function measureAndPaginate() {
  // 用隐藏容器测量每行在正文内容区宽度下的实际显示高度
  const measurer = document.createElement('div');
  const cs = getComputedStyle(pageContentEl);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  measurer.style.font = cs.font;
  measurer.style.lineHeight = cs.lineHeight;
  measurer.style.letterSpacing = cs.letterSpacing;
  measurer.style.whiteSpace = 'pre-wrap';
  measurer.style.wordBreak = 'break-word';
  measurer.style.width = (pageContentEl.clientWidth - padX) + 'px';
  measurer.style.visibility = 'hidden';
  measurer.style.position = 'absolute';
  measurer.style.left = '-9999px';
  document.body.append(measurer);

  lineHeights = lines.map((line) => {
    measurer.textContent = line === '' ? ' ' : line;
    return measurer.offsetHeight;
  });
  measurer.remove();

  const pageHeight = pageContentEl.clientHeight - padY;
  pages = paginate(lines, (_line, i) => lineHeights[i], pageHeight);
  if (pages.length === 0) pages = [[]];
  currentPage = Math.min(currentPage, pages.length - 1);
}

function renderPage() {
  const idxs = pages[currentPage] || [];
  pageContentEl.textContent = idxs.map((i) => lines[i]).join('\n');
  pageIndicatorEl.textContent = `${currentPage + 1} / ${pages.length}`;
  btnPrev.disabled = currentPage === 0;
  btnNext.disabled = currentPage >= pages.length - 1;
}

function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

function changeFont(delta) {
  fontSize = Math.min(36, Math.max(12, fontSize + delta));
  pageContentEl.style.fontSize = fontSize + 'px';
  measureAndPaginate();
  renderPage();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  btnTheme.textContent = document.body.classList.contains('dark') ? '浅色' : '深色';
}

// —— 事件 ——
btnBack.addEventListener('click', backToShelf);
btnNext.addEventListener('click', nextPage);
btnPrev.addEventListener('click', prevPage);
btnFontPlus.addEventListener('click', () => changeFont(2));
btnFontMinus.addEventListener('click', () => changeFont(-2));
btnTheme.addEventListener('click', toggleTheme);
document.addEventListener('keydown', (e) => {
  if (readerEl.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
  else if (e.key === 'Escape') backToShelf();
});
window.addEventListener('resize', () => {
  if (!readerEl.classList.contains('hidden')) {
    measureAndPaginate();
    renderPage();
  }
});

// —— 启动 ——
loadBooks();
