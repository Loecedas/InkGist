// 墨萃-InkGist 官方扩展 Content Script
(function () {
  function isValidContext() {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch {
      return false;
    }
  }

  // 监听来自 popup 或 background 的直接消息
  if (isValidContext() && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!isValidContext()) return;
      if (msg && msg.action === 'IMPORT_TO_INKGIST' && Array.isArray(msg.bookmarks)) {
        window.postMessage({
          type: 'INKGIST_RESP_BROWSER_BOOKMARKS',
          success: true,
          bookmarks: msg.bookmarks
        }, '*');
      }
    });
  }

  // 监听宿主页面的双向 postMessage 通信
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (!isValidContext()) return;

    // 1. 实时探活检测
    if (event.data.type === 'INKGIST_CHECK_EXTENSION' || event.data.type === 'INKGIST_EXTENSION_PING') {
      window.postMessage({
        type: 'INKGIST_EXTENSION_PONG',
        installed: true,
        version: '1.0.0'
      }, '*');
    }

    // 2. 实时获取书签列表
    if (event.data.type === 'INKGIST_REQ_BROWSER_BOOKMARKS') {
      try {
        chrome.runtime.sendMessage({ action: 'GET_BROWSER_BOOKMARKS' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            window.postMessage({
              type: 'INKGIST_RESP_BROWSER_BOOKMARKS',
              success: false,
              bookmarks: []
            }, '*');
            return;
          }
          window.postMessage({
            type: 'INKGIST_RESP_BROWSER_BOOKMARKS',
            success: response.success,
            bookmarks: response.bookmarks || []
          }, '*');
        });
      } catch (err) {
        window.postMessage({
          type: 'INKGIST_RESP_BROWSER_BOOKMARKS',
          success: false,
          bookmarks: []
        }, '*');
      }
    }
  });

  // 3. 检查是否有 popup 暂存的待导入书签
  if (isValidContext() && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.get(['pendingBookmarks'], (result) => {
        if (!isValidContext()) return;
        if (result && Array.isArray(result.pendingBookmarks) && result.pendingBookmarks.length > 0) {
          window.postMessage({
            type: 'INKGIST_RESP_BROWSER_BOOKMARKS',
            success: true,
            bookmarks: result.pendingBookmarks
          }, '*');
          chrome.storage.local.remove(['pendingBookmarks']);
        }
      });
    } catch {}
  }
})();
