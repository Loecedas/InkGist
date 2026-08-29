// 递归提取书签树中的所有有效网址并智能保留多级目录层级
function extractBookmarks(nodes, pathStack = [], results = []) {
  if (!nodes || !nodes.length) return results;

  // 浏览器顶层默认无意义容器名称过滤列表
  const IGNORED_ROOT_FOLDERS = new Set([
    '书签栏',
    'bookmarks bar',
    'bookmarks menu',
    '其他书签',
    'other bookmarks',
    '移动设备书签',
    'mobile bookmarks',
    '收藏夹栏',
    'favorites bar',
    'synced bookmarks'
  ]);

  for (const node of nodes) {
    const isFolder = Boolean(node.children);
    const title = (node.title || '').trim();

    if (isFolder) {
      const isIgnoredRoot = pathStack.length === 0 && IGNORED_ROOT_FOLDERS.has(title.toLowerCase());
      const nextStack = isIgnoredRoot || !title ? [...pathStack] : [...pathStack, title];
      extractBookmarks(node.children, nextStack, results);
    } else if (node.url && /^https?:\/\//i.test(node.url)) {
      const folderPath = pathStack.length > 0 ? pathStack.join('/') : undefined;
      results.push({
        id: node.id,
        title: title || node.url,
        url: node.url,
        folder: folderPath,
        dateAdded: node.dateAdded
      });
    }
  }

  return results;
}

// 插件安装或更新时，自动向所有已有标签页注入 content.js，无需手动刷新页面
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      }
    }
  });
});

// 监听获取书签请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_BROWSER_BOOKMARKS') {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allBookmarks = extractBookmarks(bookmarkTreeNodes);
      sendResponse({ success: true, bookmarks: allBookmarks });
    });
    return true; // 异步响应必须返回 true
  }
});
