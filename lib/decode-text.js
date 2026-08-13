// 解码 txt 文件内容：优先按 UTF-8 解码，失败则回退 GBK（gb18030）
// 覆盖常见中文 txt 的 UTF-8 与 GBK/GB2312 编码
export function decodeText(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('gb18030').decode(buffer);
  }
}
