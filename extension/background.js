// 递归提取书签树中的所有有效网址
function extractBookmarks(nodes, results = []) {
  if (!nodes || !nodes.length) return results;
  for (const node of nodes) {
    if (node.url && /^https?:\/\//i.test(node.url)) {
      results.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        dateAdded: node.dateAdded
      });
    }
    if (node.children && node.children.length) {
      extractBookmarks(node.children, results);
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
