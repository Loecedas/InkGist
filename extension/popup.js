let allBookmarks = [];

// 1. 获取所有书签
chrome.runtime.sendMessage({ action: 'GET_BROWSER_BOOKMARKS' }, (response) => {
  if (response && response.success) {
    allBookmarks = response.bookmarks || [];
    document.getElementById('count').textContent = `${allBookmarks.length} 个`;
  } else {
    document.getElementById('count').textContent = '读取失败';
  }
});

// 2. 点击直接打开墨萃并自动填入所有书签开始总结
document.getElementById('importBtn').addEventListener('click', () => {
  if (!allBookmarks.length) {
    alert('未在浏览器中找到有效书签');
    return;
  }

  // 存入 storage
  chrome.storage.local.set({ pendingBookmarks: allBookmarks }, () => {
    // 查找已打开的墨萃标签页
    chrome.tabs.query({ url: ['http://localhost:*/*', 'https://*/*'] }, (tabs) => {
      const inkgistTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('127.0.0.1') || t.url.includes('inkgist')));
      if (inkgistTab && inkgistTab.id) {
        chrome.tabs.update(inkgistTab.id, { active: true });
        chrome.tabs.sendMessage(inkgistTab.id, { action: 'IMPORT_TO_INKGIST', bookmarks: allBookmarks });
        window.close();
      } else {
        // 打开墨萃本地地址
        chrome.tabs.create({ url: 'http://localhost:3000/?import_extension=1' }, () => {
          window.close();
        });
      }
    });
  });
});
