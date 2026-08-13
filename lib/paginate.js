// 分页算法：把内容块按高度分组为若干页
// items: 内容块数组（如按行切分的文本行）
// measure: (item, index) => number，返回该块的显示高度
// pageHeight: 单页可用高度
// 返回：二维数组，每个内层数组是该页包含的 item 下标
export function paginate(items, measure, pageHeight) {
  const pages = [];
  let current = [];
  let currentHeight = 0;

  for (let i = 0; i < items.length; i++) {
    const h = measure(items[i], i);
    if (current.length > 0 && currentHeight + h > pageHeight) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(i);
    currentHeight += h;
  }

  if (current.length > 0) pages.push(current);
  return pages;
}
