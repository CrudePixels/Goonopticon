/**
 * Hidden-window chat scraper for Twitch, Kick, YouTube, Rumble, Odysee, DLive, Pod Awful.
 * Opens the livestream in an off-screen BrowserWindow and scrapes chat from the DOM (+ shadow roots where used).
 */

const { BrowserWindow } = require('electron');

const SCRAPE_INTERVAL_MS = 1200;
const WINDOW_OPTS = {
  show: false,
  width: 1024,
  height: 768,
  x: -2000,
  y: -2000,
  webPreferences: {
    partition: 'persist:goonopticon_chat_scraper',
    nodeIntegration: false,
    contextIsolation: true,
    // Kick/YouTube live UIs often fail to render chat under sandbox; we only load remote URLs (no node).
    sandbox: false,
    backgroundThrottling: false
  }
};

const platformConfig = {
  twitch: {
    url: 'https://www.twitch.tv/podawful',
    getScrapeScript: () => `
      (function() {
        var out = [];
        var lines = document.querySelectorAll('.chat-line__message, [data-a-target="chat-line-message"], [class*="chat-line"]');
        lines.forEach(function(el, i) {
          var authorEl = el.querySelector('[data-a-target="chat-message-username"], .chat-author__display-name, [class*="username"], [class*="author"]');
          var msgEl = el.querySelector('.chat-line__message-body, [data-a-target="chat-message-text"], [class*="message"]');
          var author = authorEl ? (authorEl.textContent || '').trim() : '';
          var msg = msgEl ? (msgEl.textContent || '').trim() : '';
          if (!msg && el.textContent) msg = (el.textContent || '').trim();
          if (author && msg) out.push({ key: 'tw_' + i + '_' + (msg.slice(0,40)), author: author, message: msg });
        });
        return out;
      })();
    `,
    getViewerCountScript: () => `
      (function() {
        var sel = '[data-a-target="animated-channel-viewers-count"],[data-a-target="viewer-count"],[data-a-target="tw-channel-status-text-indicator"],[class*="viewer-count"],[class*="live-viewer"],[class*="stream-info-card"] [class*="viewer"]';
        var el = document.querySelector(sel);
        if (el) { var n = parseInt((el.textContent || '').replace(/[^0-9]/g, ''), 10); if (!isNaN(n) && n >= 0) return n; }
        var t = (document.body.innerText || '').match(/([0-9,]+)\\s*viewers?/i); return t ? parseInt((t[1] || '0').replace(/,/g, ''), 10) : null;
      })();
    `
  },
  kick: {
    url: 'https://kick.com/podawful',
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        var items = document.querySelectorAll(
          '[data-testid="chat-message"], [class*="ChatMessage"], [class*="chat-message"], .chat-entry, [class*="message-row"], [class*="chat-entry"], [class*="MessageList"] [class*="group"]'
        );
        if (!items.length) {
          items = document.querySelectorAll('[class*="chat"] [class*="message"], [class*="livestream-chat"] [class*="flex"]');
        }
        items.forEach(function(el, i) {
          var authorEl = el.querySelector('[class*="username"], [class*="author"], [class*="sender"], a[href*="/profile"], [data-testid*="username"]');
          var msgEl = el.querySelector('[class*="message"], [class*="content"], [class*="text"], [data-testid*="message"]');
          var author = authorEl ? (authorEl.textContent || '').trim() : '';
          var msg = msgEl ? (msgEl.textContent || '').trim() : '';
          if (!msg && el.textContent) msg = (el.textContent || '').trim();
          if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
          if (!msg || msg.length > 2000) return;
          var key = (author || '?') + '|' + msg.slice(0, 120);
          if (seen[key]) return;
          seen[key] = 1;
          out.push({ key: 'kick_' + i + '_' + msg.slice(0, 40), author: author || '?', message: msg });
        });
        return out;
      })();
    `,
    getViewerCountScript: () => `
      (function() {
        var t = (document.body.innerText || '').match(/([0-9,]+)\\s*viewers?/i); if (t) return parseInt((t[1] || '0').replace(/,/g, ''), 10);
        var el = document.querySelector('[class*="viewer"], [class*="watching"]'); if (el) { var n = parseInt((el.textContent || '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; } return null;
      })();
    `
  },
  youtube: {
    // Load channel live URL; after redirect we get watch page. Then scrape or switch to live_chat popout.
    url: 'https://www.youtube.com/@podawfulH2BH/live',
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        function walk(root, fn) {
          if (!root || root.nodeType !== 1) return;
          try {
            fn(root);
            if (root.shadowRoot) walk(root.shadowRoot, fn);
            var c = root.children || [];
            for (var j = 0; j < c.length; j++) walk(c[j], fn);
          } catch (e) {}
        }
        function isChatMsgEl(node) {
          if (!node || !node.tagName) return false;
          var t = node.tagName.toLowerCase();
          return (
            t === 'yt-live-chat-text-message-renderer' ||
            t === 'ytd-live-chat-text-message-renderer' ||
            t === 'yt-live-chat-paid-message-renderer' ||
            t === 'ytd-live-chat-paid-message-renderer' ||
            t === 'yt-live-chat-paid-sticker-renderer' ||
            t === 'ytd-live-chat-paid-sticker-renderer' ||
            t === 'yt-live-chat-membership-item-renderer' ||
            t === 'ytd-live-chat-membership-item-renderer'
          );
        }
        function textFromMessageRoot(el) {
          var msgRoot = el.querySelector && el.querySelector('#message');
          if (msgRoot) {
            var fs = msgRoot.querySelectorAll('yt-formatted-string');
            if (fs && fs.length) {
              var acc = '';
              for (var k = 0; k < fs.length; k++) acc += (fs[k].textContent || '');
              var t = acc.trim();
              if (t) return t;
            }
            return (msgRoot.textContent || '').trim();
          }
          return '';
        }
        var items = [];
        walk(document.documentElement || document.body, function(n) {
          if (isChatMsgEl(n)) items.push(n);
        });
        for (var i = 0; i < items.length; i++) {
          var el = items[i];
          var author = '';
          var msg = textFromMessageRoot(el);
          walk(el, function(n) {
            if (!n || !n.id) return;
            var id = n.id.toLowerCase();
            var txt = (n.textContent || '').trim();
            if (id === 'author-name' && txt) author = txt;
            if (id === 'message' && txt && !msg) msg = txt;
          });
          if (!author) {
            var chip = el.querySelector('yt-live-chat-author-chip, #author-name');
            if (chip) author = (chip.textContent || '').trim();
          }
          if (!msg && el.textContent) {
            msg = (el.textContent || '').trim();
            if (author) msg = msg.replace(author, '').trim();
          }
          if (!msg || msg.length < 1) continue;
          if (!author) author = '?';
          var dedupe = author + '|' + msg.slice(0, 160);
          if (seen[dedupe]) continue;
          seen[dedupe] = 1;
          out.push({ key: (el.id || 'yt_' + i + '_' + msg.slice(0, 28)), author: author, message: msg });
        }
        return out;
      })();
    `,
    // If watch page has no chat in main doc, we need to navigate to live_chat popout. Get video ID from current URL.
    getPopoutUrl: (winUrl) => {
      const m =
        /[?&]v=([a-zA-Z0-9_-]{11})/.exec(winUrl) ||
        /[?&]v=([^&]+)/.exec(winUrl) ||
        /\/watch\/([a-zA-Z0-9_-]{11})/.exec(winUrl) ||
        /\/watch\/([^/?]+)/.exec(winUrl) ||
        /\/live\/([a-zA-Z0-9_-]{11})/.exec(winUrl) ||
        /\/embed\/([a-zA-Z0-9_-]{11})/.exec(winUrl) ||
        /\/shorts\/([a-zA-Z0-9_-]{11})/.exec(winUrl);
      if (!m) return null;
      let raw = m[1];
      try {
        raw = decodeURIComponent(raw);
      } catch (_) {}
      const vid = encodeURIComponent(String(raw).slice(0, 32));
      return `https://www.youtube.com/live_chat?is_popout=1&v=${vid}&embed_domain=${encodeURIComponent('https://www.youtube.com')}`;
    },
    getViewerCountScript: () => `
      (function() {
        function walk(root, fn) {
          if (!root || root.nodeType !== 1) return;
          try {
            fn(root);
            if (root.shadowRoot) walk(root.shadowRoot, fn);
            var c = root.children || [];
            for (var j = 0; j < c.length; j++) walk(c[j], fn);
          } catch (e) {}
        }
        var found = null;
        walk(document.documentElement || document.body, function(n) {
          if (found != null) return;
          if (!n || !n.tagName) return;
          var t = n.tagName.toLowerCase();
          if (t === 'yt-viewer-count-renderer' || t === 'ytd-live-chat-viewer-count-renderer') {
            var idel = n.querySelector && n.querySelector('#viewer-count, [id*="viewer-count"]');
            var txt = (idel && idel.textContent) || (n.textContent || '');
            var num = parseInt(String(txt).replace(/,/g, '').replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num) && num >= 0) found = num;
          }
        });
        if (found != null) return found;
        var el = document.querySelector('yt-viewer-count-renderer #viewer-count, [id*="viewer-count"]');
        if (el) {
          var t2 = (el.textContent || '').replace(/,/g, '').replace(/[^0-9]/g, '');
          if (t2) return parseInt(t2, 10);
        }
        var all = document.body.innerText || '';
        var m = all.match(/([0-9,]+)\\s*(?:watching|viewers|watching now)/i) || all.match(/([0-9,]+)\\s*viewers?/i);
        return m ? parseInt((m[1] || '0').replace(/,/g, ''), 10) : null;
      })();
    `
  },
  rumble: {
    url: 'https://rumble.com/c/PODAWFUL',
    getViewerCountScript: () => `
      (function() {
        var text = document.body.innerText || '';
        var m = text.match(/([0-9,]+)\\s*(?:watching|viewers?|live)/i) || text.match(/watching\\s*([0-9,]+)/i);
        if (m) return parseInt((m[1] || '0').replace(/,/g, ''), 10) || null;
        var el = document.querySelector('[class*="viewer"], [class*="watching"], [data-viewers]');
        if (el) { var n = parseInt((el.textContent || el.getAttribute('data-viewers') || '0').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; }
        return null;
      })();
    `,
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        function add(author, msg, i, prefix) {
          author = (author || '?').trim();
          msg = (msg || '').trim();
          if (!msg || msg.length > 2500) return;
          var k = author + '|' + msg.slice(0, 140);
          if (seen[k]) return;
          seen[k] = 1;
          out.push({ key: prefix + '_' + i + '_' + msg.slice(0, 36), author: author, message: msg });
        }
        function walk(root, fn) {
          if (!root || out.length > 200) return;
          if (root.nodeType === 1) {
            try {
              fn(root);
              if (root.shadowRoot) walk(root.shadowRoot, fn);
              var c = root.children || [];
              for (var j = 0; j < c.length; j++) walk(c[j], fn);
            } catch (e) {}
          }
        }
        function scrapeRow(el, idx) {
          var userEl = el.querySelector(
            '.chat-history--username, [class*="chat-history--username"], [class*="ChatUsername"], [class*="username"], [class*="author"], [class*="display-name"], [class*="UserName"], strong, b, a[href*="/user/"]'
          );
          var msgEl = el.querySelector(
            '.chat-history--message, [class*="chat-history--message"], [class*="ChatMessage"], [class*="message-text"], [class*="msg-text"], [class*="MessageText"], [class*="content"], [class*="CommentText"]'
          );
          var author = userEl ? (userEl.textContent || '').trim() : '';
          var msg = msgEl ? (msgEl.textContent || '').trim() : '';
          if (!msg && el.textContent) msg = (el.textContent || '').trim();
          if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
          if (msg.length > 4000 || !msg) return;
          add(author, msg, idx, 'rumble');
        }
        var i = 0;
        var selectors = [
          '.chat-history--row',
          '[class*="chat-history--row"]',
          '[class*="ChatHistoryRow"]',
          '[class*="ChatHistory"] [class*="row"]',
          '[class*="chat-history"] li',
          '[class*="stream-chat"] [class*="message"]',
          '[data-cy="chat-message"]',
          '[class*="message-row"]',
          '[class*="live-chat"] [class*="Message"]',
          '[class*="ChatMessage"]',
          '[class*="chat-message-row"]',
          '[class*="message-list"] [class*="item"]',
          '[class*="_messageRow"]',
          '[class*="Message_item"]',
          '[role="listitem"]'
        ];
        selectors.forEach(function(sel) {
          try {
            document.querySelectorAll(sel).forEach(function(el) {
              scrapeRow(el, i++);
            });
          } catch (e) {}
        });
        walk(document.body, function(n) {
          if (!n || !n.getAttribute) return;
          var cn = n.getAttribute('class') || '';
          if (
            cn.indexOf('chat-history--row') >= 0 ||
            (cn.indexOf('ChatHistory') >= 0 && cn.indexOf('row') >= 0) ||
            (cn.indexOf('ChatMessage') >= 0 && cn.indexOf('message') >= 0)
          ) {
            scrapeRow(n, i++);
          }
        });
        return out;
      })();
    `
  },
  odysee: {
    url: 'https://odysee.com/@podawful/live',
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        function walk(node, fn) {
          if (!node || out.length > 150) return;
          if (node.nodeType === 1) {
            try {
              fn(node);
              if (node.shadowRoot) walk(node.shadowRoot, fn);
              var c = node.children || [];
              for (var j = 0; j < c.length; j++) walk(c[j], fn);
            } catch (e) {}
          }
        }
        function allNodes(root, selector) {
          var list = [];
          walk(root, function(node) {
            if (node.matches && node.matches(selector)) list.push(node);
          });
          return list;
        }
        function add(author, msg, idx) {
          author = (author || '?').trim();
          msg = (msg || '').trim();
          if (!msg || msg.length > 2000) return;
          var k = author + '|' + msg.slice(0, 120);
          if (seen[k]) return;
          seen[k] = 1;
          out.push({ key: 'odysee_' + idx + '_' + msg.slice(0, 40), author: author, message: msg });
        }
        function scrapeCommentEl(el, idx) {
          var authorEl = el.querySelector(
            'a[href*="/@"], [class*="author"], [class*="channel"], [class*="username"], [class*="CommentAuthor"], [class*="comment__meta"] a, [class*="channel-thumbnail"] + a'
          );
          var msgEl = el.querySelector(
            '[class*="markdown-preview"], [class*="comment__message"], p, [class*="body"], [class*="message"], [class*="content"], [class*="text"], [class*="comment-text"]'
          );
          var author = authorEl ? (authorEl.textContent || '').trim() : '';
          var msg = msgEl ? (msgEl.textContent || '').trim() : (el.textContent || '').trim();
          if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
          add(author, msg, idx);
        }
        var selectors = [
          '.livestream__comment',
          '.livestream__chat-comment',
          '[class*="livestream-comment"]',
          '[class*="comment-create"]',
          '[class*="comment__message"]',
          '[class*="comment--content"]',
          '[class*="comment__body"]',
          'article[class*="comment"]',
          'li[class*="comment"]',
          'div[class*="comment"]',
          '[class*="chat__message"]',
          '[class*="livestream__chat"] [class*="body"]',
          '[class*="Comments"] [class*="comment"]',
          '[class*="livestream"] [class*="Comment"]',
          '[class*="discussion"] [class*="post"]',
          '[class*="comment-published"]',
          '[class*="claim-preview__wrapper"]'
        ];
        var i = 0;
        selectors.forEach(function(sel) {
          try {
            var nodes = document.querySelectorAll(sel);
            if (!nodes.length) nodes = allNodes(document.body, sel);
            nodes.forEach(function(el) {
              scrapeCommentEl(el, i++);
            });
          } catch (e) {}
        });
        walk(document.body, function(n) {
          if (!n || !n.getAttribute) return;
          var cn = n.getAttribute('class') || '';
          if (cn.indexOf('comment') >= 0 && cn.indexOf('livestream') >= 0) scrapeCommentEl(n, i++);
        });
        return out;
      })();
    `,
    getViewerCountScript: () => `
      (function() {
        var t = (document.body.innerText || '').match(/([0-9,]+)\\s*(?:viewers?|watching)/i);
        return t ? parseInt((t[1] || '0').replace(/,/g, ''), 10) || null : null;
      })();
    `
  },
  dlive: {
    url: 'https://dlive.tv/podawful',
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        function walk(root, fn) {
          if (!root || out.length > 180) return;
          if (root.nodeType === 1) {
            try {
              fn(root);
              if (root.shadowRoot) walk(root.shadowRoot, fn);
              var c = root.children || [];
              for (var j = 0; j < c.length; j++) walk(c[j], fn);
            } catch (e) {}
          }
        }
        function pushMsg(author, msg, i) {
          author = (author || '?').trim();
          msg = (msg || '').trim();
          if (!msg || msg.length > 2000) return;
          var k = author + '|' + msg.slice(0, 120);
          if (seen[k]) return;
          seen[k] = 1;
          out.push({ key: 'dlive_' + i + '_' + msg.slice(0, 40), author: author, message: msg });
        }
        function scrapeEl(el, i) {
          var authorEl = el.querySelector(
            '[class*="username"], [class*="Username"], [class*="name"], [class*="sender"], [class*="author"], [class*="nickname"], [class*="display-name"], [class*="user-name"]'
          );
          var msgEl = el.querySelector(
            '[class*="content"], [class*="Content"], [class*="text"], [class*="message-text"], [class*="MessageText"], [class*="body"], [class*="comment-text"]'
          );
          var author = authorEl ? (authorEl.textContent || '').trim() : '';
          var msg = msgEl ? (msgEl.textContent || '').trim() : '';
          if (!msg && el.textContent) msg = (el.textContent || '').trim();
          if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
          pushMsg(author, msg, i);
        }
        var i = 0;
        var sels = [
          '[class*="chat-message"]',
          '[class*="ChatMessage"]',
          '[class*="message-item"]',
          '[class*="Message_item"]',
          '[class*="chatroom"] [class*="message"]',
          '[class*="Chatroom"] [class*="Message"]',
          '[class*="stream-chat"] [class*="message"]',
          '[data-testid*="chat"]',
          '[class*="live-chat"] [class*="item"]',
          '[class*="comment-item"]',
          '[class*="ChatList"] [class*="message"]',
          '[class*="chat-list"] [class*="row"]',
          '[class*="message-list"] > div',
          '[class*="ChatItem"]'
        ];
        sels.forEach(function(sel) {
          try {
            document.querySelectorAll(sel).forEach(function(el) {
              scrapeEl(el, i++);
            });
          } catch (e) {}
        });
        walk(document.body, function(n) {
          if (!n || !n.getAttribute) return;
          var cn = n.getAttribute('class') || '';
          if ((cn.indexOf('Chat') >= 0 && cn.indexOf('essage') >= 0) || cn.indexOf('chat-message') >= 0) {
            scrapeEl(n, i++);
          }
        });
        return out;
      })();
    `,
    getViewerCountScript: () => `
      (function() {
        var t = (document.body.innerText || '').match(/([0-9,]+)\\s*(?:viewers?|watching)/i);
        return t ? parseInt((t[1] || '0').replace(/,/g, ''), 10) || null : null;
      })();
    `
  },
  podawful: {
    url: 'https://podawful.com/live',
    getViewerCountScript: () => `
      (function() {
        var text = document.body.innerText || '';
        var m = text.match(/([0-9,]+)\\s*(?:watching|viewers?|online)/i) || text.match(/viewers?\\s*([0-9,]+)/i);
        if (m) return parseInt((m[1] || '0').replace(/,/g, ''), 10) || null;
        var el = document.querySelector('[class*="viewer"], [class*="viewers"], [class*="watching"], [data-viewer-count]');
        if (el) { var n = parseInt((el.textContent || el.getAttribute('data-viewer-count') || '0').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; }
        return null;
      })();
    `,
    getScrapeScript: () => `
      (function() {
        var out = [];
        var seen = {};
        function add(author, msg, idx) {
          author = (author || '?').trim();
          msg = (msg || '').trim();
          if (!msg || msg.length > 2000) return;
          var k = author + '|' + msg.slice(0, 100);
          if (seen[k]) return;
          seen[k] = 1;
          out.push({ key: 'pa_' + idx + '_' + msg.slice(0, 40), author: author, message: msg });
        }
        function walk(root, fn) {
          if (!root || out.length > 120) return;
          if (root.nodeType === 1) {
            try {
              fn(root);
              if (root.shadowRoot) walk(root.shadowRoot, fn);
              var c = root.children || [];
              for (var j = 0; j < c.length; j++) walk(c[j], fn);
            } catch (e) {}
          }
        }
        var i = 0;
        var sels = [
          '[class*="chat"] [class*="message"]',
          '[class*="comment"] [class*="author"]',
          '.chat-message',
          '[data-testid*="chat"]',
          '[class*="livestream"] [class*="message"]',
          '[id*="chat"] [class*="message"]',
          '[class*="ChatMessage"]',
          '[class*="chat-message"]',
          '[class*="live-chat"] li',
          '[class*="twitch-embed"] [class*="chat"]',
          'ul[class*="comments"] li'
        ];
        sels.forEach(function(sel) {
          try {
            document.querySelectorAll(sel).forEach(function(el) {
              var author = '';
              var authorEl = el.querySelector('[class*="user"], [class*="author"], [class*="name"], strong, b');
              var msgEl = el.querySelector('[class*="message"], [class*="content"], [class*="text"], p');
              var msg = msgEl ? (msgEl.textContent || '').trim() : (el.textContent || '').trim();
              if (authorEl) {
                author = (authorEl.textContent || '').trim();
                if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
              }
              add(author, msg, i++);
            });
          } catch (e) {}
        });
        walk(document.body, function(n) {
          if (!n || !n.getAttribute) return;
          var cn = n.getAttribute('class') || '';
          if (cn.indexOf('chat') >= 0 && cn.indexOf('message') >= 0) {
            var authorEl = n.querySelector('[class*="user"], [class*="author"], [class*="name"]');
            var msg = (n.textContent || '').trim();
            var author = authorEl ? (authorEl.textContent || '').trim() : '';
            if (author && msg.indexOf(author) === 0) msg = msg.slice(author.length).trim();
            add(author, msg, i++);
          }
        });
        return out;
      })();
    `
  }
};

const active = new Map(); // platformId -> { win, intervalId, seenKeys, emitFn, platformName, config }
const scrapedViewerCounts = new Map(); // streamKey -> number (from DOM)
/** Live WS counts (e.g. Odysee viewers) — keyed like odysee:channel; wins over scraped for same key in getScrapedViewerCounts */
const socketViewerCounts = new Map();

/** Chat often lives in iframes; also run main webContents.executeJavaScript (some Electron builds differ on framesInSubtree). */
async function executeScrapeInFrames(webContents, script) {
  const seen = new Set();
  const merged = [];
  function consume(arr) {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item) continue;
      const k = item.key != null ? String(item.key) : `${item.author}|${item.message}`;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(item);
    }
  }
  try {
    consume(await webContents.executeJavaScript(script));
  } catch (_) {}
  let frames = [];
  try {
    const mf = webContents.mainFrame;
    if (mf && mf.framesInSubtree && mf.framesInSubtree.length) frames = [...mf.framesInSubtree];
    else if (mf) frames = [mf];
  } catch (_) {
    frames = [];
  }
  for (const frame of frames) {
    if (!frame) continue;
    try {
      consume(await frame.executeJavaScript(script));
    } catch (_) {}
  }
  return merged;
}

/** Viewer UI is often in an iframe; take the largest plausible count from main + subtree frames. */
async function executeViewerCountInFrames(webContents, script) {
  let best = null;
  function consider(v) {
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0) return;
    if (best == null || v > best) best = v;
  }
  try {
    consider(await webContents.executeJavaScript(script));
  } catch (_) {}
  let frames = [];
  try {
    const mf = webContents.mainFrame;
    if (mf && mf.framesInSubtree && mf.framesInSubtree.length) frames = [...mf.framesInSubtree];
    else if (mf) frames = [mf];
  } catch (_) {
    frames = [];
  }
  for (const frame of frames) {
    if (!frame) continue;
    try {
      consider(await frame.executeJavaScript(script));
    } catch (_) {}
  }
  return best;
}

async function seedYoutubeConsent(session) {
  const exp = Math.floor(Date.now() / 1000) + 86400 * 400;
  try {
    await session.cookies.set({
      url: 'https://www.youtube.com',
      name: 'CONSENT',
      value: 'YES+cb.20210328-17-p0.en+FX+777',
      expirationDate: exp,
      sameSite: 'no_restriction'
    });
  } catch (_) {}
}

function start(platformIdOrStreamKey, platformName, emitFn, opts) {
  const streamKey = typeof platformIdOrStreamKey === 'string' ? platformIdOrStreamKey : '';
  const platformId = streamKey.indexOf(':') >= 0 ? streamKey.split(':')[0] : streamKey;
  const key = streamKey || platformId;
  if (active.has(key)) return;
  const config = platformConfig[platformId];
  if (!config) return;

  const loadUrl = (opts && opts.url) ? opts.url : config.url;
  const win = new BrowserWindow(WINDOW_OPTS);
  win.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );
  win.webContents.setAudioMuted(true);
  const entry = { win, intervalId: null, seenKeys: new Set(), emitFn, platformName, config, key };
  active.set(key, entry);

  const spaScraperIds = new Set(['rumble', 'odysee', 'dlive', 'podawful']);
  if (spaScraperIds.has(platformId)) {
    win.webContents.once('dom-ready', () => {
      setTimeout(() => runScrape(key), 450);
      setTimeout(() => runScrape(key), 2400);
    });
  } else if (platformId === 'youtube') {
    win.webContents.once('dom-ready', () => {
      setTimeout(() => runScrape(key), 1200);
    });
  }

  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL();
    const beginScrapeAfterDelay = () => {
      const u = win.webContents.getURL();
      let delay = 0;
      if (platformId === 'youtube') delay = u.includes('live_chat') ? 4000 : 4500;
      else if (platformId === 'twitch' || platformId === 'kick') delay = 2500;
      else if (platformId === 'rumble' || platformId === 'odysee') delay = 3200;
      else if (platformId === 'dlive') delay = 2600;
      const startScraping = () => {
        runScrape(key);
        if (!entry.intervalId) {
          entry.intervalId = setInterval(() => runScrape(key), SCRAPE_INTERVAL_MS);
        }
      };
      if (delay > 0) {
        setTimeout(() => runScrape(key), 700);
        setTimeout(startScraping, delay);
      } else startScraping();
    };

    // YouTube: popout has reliable yt-live-chat DOM; watch + /live/ establish session first.
    if (platformId === 'youtube' && config.getPopoutUrl && !url.includes('live_chat')) {
      const onWatchOrLive =
        url.includes('/watch') || url.includes('youtube.com/watch') || url.includes('/live');
      if (onWatchOrLive) {
        const tryNavigatePopout = () => {
          if (win.isDestroyed()) return false;
          const u = win.webContents.getURL();
          if (u.includes('live_chat')) return true;
          const pop = config.getPopoutUrl(u);
          if (pop) {
            win.webContents.loadURL(pop);
            return true;
          }
          return false;
        };
        if (tryNavigatePopout()) return;

        let gaveUp = false;
        const tryYtInitialVid = () => {
          if (win.isDestroyed() || win.webContents.getURL().includes('live_chat')) return;
          const js = `(function(){try{
            var p=window.ytInitialPlayerResponse;
            if(p&&p.videoDetails&&p.videoDetails.videoId)return String(p.videoDetails.videoId);
            var w=document.querySelector('ytd-watch-flexy');
            if(w){var a=w.getAttribute('video-id');if(a&&/^[a-zA-Z0-9_-]{11}$/.test(a))return a;}
            var e=document.querySelector('ytd-player, ytd-video-primary-info-renderer');
            if(e){var v=e.getAttribute('video-id');if(v&&/^[a-zA-Z0-9_-]{11}$/.test(v))return v;}
          }catch(e){}return null})()`;
          win.webContents
            .executeJavaScript(js)
            .then((vid) => {
              if (win.isDestroyed() || win.webContents.getURL().includes('live_chat')) return;
              if (vid && /^[a-zA-Z0-9_-]{11}$/.test(String(vid))) {
                win.webContents.loadURL(
                  'https://www.youtube.com/live_chat?is_popout=1&v=' +
                    encodeURIComponent(String(vid)) +
                    '&embed_domain=' +
                    encodeURIComponent('https://www.youtube.com')
                );
              }
            })
            .catch(() => {});
        };

        [1200, 3200, 6200].forEach((ms) => {
          setTimeout(() => {
            if (win.isDestroyed() || gaveUp) return;
            if (win.webContents.getURL().includes('live_chat')) return;
            if (tryNavigatePopout()) return;
            tryYtInitialVid();
          }, ms);
        });
        setTimeout(() => {
          if (win.isDestroyed() || gaveUp || win.webContents.getURL().includes('live_chat')) return;
          gaveUp = true;
          beginScrapeAfterDelay();
        }, 14000);
        return;
      }
    }
    beginScrapeAfterDelay();
  });

  win.webContents.on('did-navigate', () => {
    const e = active.get(key);
    if (e) runScrape(key);
  });

  win.webContents.on('did-navigate-in-page', () => {
    const e = active.get(key);
    if (!e) return;
    let d = 900;
    if (platformId === 'youtube') d = 2200;
    else if (platformId === 'kick') d = 1800;
    else if (platformId === 'rumble' || platformId === 'odysee' || platformId === 'dlive' || platformId === 'podawful') d = 1700;
    setTimeout(() => runScrape(key), d);
  });

  win.on('closed', () => {
    const s = active.get(key);
    if (s && s.intervalId) clearInterval(s.intervalId);
    active.delete(key);
    scrapedViewerCounts.delete(key);
  });

  void (async () => {
    try {
      if (platformId === 'youtube') await seedYoutubeConsent(win.webContents.session);
    } catch (_) {}
    win.loadURL(loadUrl);
  })();
}

function runScrape(activeKey) {
  const s = active.get(activeKey);
  if (!s || s.win.isDestroyed()) return;
  const config = s.config;
  const platformId = activeKey.indexOf(':') >= 0 ? activeKey.split(':')[0] : activeKey;
  const script = config.getScrapeScript ? config.getScrapeScript() : null;
  if (!script) return;
  executeScrapeInFrames(s.win.webContents, script)
    .then((arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        const key = item.key || (item.author + item.message);
        if (s.seenKeys.has(key)) return;
        s.seenKeys.add(key);
        if (s.seenKeys.size > 500) {
          const arrKeys = [...s.seenKeys];
          arrKeys.slice(0, 200).forEach((k) => s.seenKeys.delete(k));
        }
        if (item.author != null && item.message != null) {
          const payload = { platformId, platformName: s.platformName, username: item.author, message: item.message };
          if (item.donationAmount != null) payload.donationAmount = item.donationAmount;
          if (item.donationCurrency) payload.donationCurrency = item.donationCurrency;
          s.emitFn(payload);
        }
      });
    })
    .catch(() => {});

  if (config.getViewerCountScript) {
    executeViewerCountInFrames(s.win.webContents, config.getViewerCountScript()).then((n) => {
      if (socketViewerCounts.has(activeKey)) return;
      if (typeof n === 'number' && !Number.isNaN(n) && n >= 0) scrapedViewerCounts.set(activeKey, n);
    });
  }
}

function stop(platformIdOrStreamKey) {
  const key = typeof platformIdOrStreamKey === 'string' ? platformIdOrStreamKey : '';
  const s = active.get(key);
  if (!s) return;
  if (s.intervalId) {
    clearInterval(s.intervalId);
    s.intervalId = null;
  }
  if (s.win && !s.win.isDestroyed()) s.win.close();
  active.delete(key);
  scrapedViewerCounts.delete(key);
}

function stopAll() {
  for (const id of active.keys()) stop(id);
}

function stopAllForPlatform(platformId) {
  for (const key of active.keys()) {
    if (key === platformId || key.startsWith(platformId + ':')) stop(key);
  }
}

function reportSocketViewerCount(streamKey, n) {
  if (!streamKey || typeof n !== 'number' || Number.isNaN(n) || n < 0) return;
  socketViewerCounts.set(streamKey, Math.floor(n));
}

function clearSocketViewerCountsWithPrefix(prefix) {
  if (!prefix) {
    socketViewerCounts.clear();
    return;
  }
  for (const k of [...socketViewerCounts.keys()]) {
    if (k.startsWith(prefix)) socketViewerCounts.delete(k);
  }
}

function getScrapedViewerCounts() {
  const o = {};
  for (const [id, n] of socketViewerCounts.entries()) {
    if (typeof n !== 'number' || n < 0) continue;
    const platformId = id.indexOf(':') >= 0 ? id.split(':')[0] : id;
    o[platformId] = (o[platformId] || 0) + n;
  }
  for (const [id, n] of scrapedViewerCounts.entries()) {
    if (typeof n !== 'number' || n < 0) continue;
    if (socketViewerCounts.has(id)) continue;
    const platformId = id.indexOf(':') >= 0 ? id.split(':')[0] : id;
    o[platformId] = (o[platformId] || 0) + n;
  }
  return o;
}

function executeInPlatform(platformId, script) {
  const s = active.get(platformId);
  if (!s || s.win.isDestroyed()) return Promise.resolve(null);
  return s.win.webContents.executeJavaScript(script).catch(() => null);
}

function runPlatformAction(platformId, action, params) {
  const s = active.get(platformId);
  if (!s || s.win.isDestroyed()) return Promise.resolve({ ok: false, error: 'No scraper window for this platform' });

  if (action === 'createPoll') {
    const title = (params?.title || 'Poll').slice(0, 200);
    const options = Array.isArray(params?.options) ? params.options.slice(0, 5).filter(Boolean).map((t) => String(t).slice(0, 100)) : [];
    if (options.length < 2) return Promise.resolve({ ok: false, error: 'Need at least 2 options' });
    const script = platformId === 'rumble' ? `
      (function() {
        var btn = document.querySelector('[class*="poll"], [aria-label*="poll"], [data-testid*="poll"]');
        if (!btn) { var b = document.querySelectorAll('button, a'); for (var i = 0; i < b.length; i++) { if ((b[i].textContent || '').toLowerCase().indexOf('poll') >= 0) { btn = b[i]; break; } } }
        if (!btn) return { ok: false, error: 'Poll button not found' };
        btn.click();
        return { ok: true, message: 'Clicked poll - fill form if it opened' };
      })();
    ` : platformId === 'podawful' ? `
      (function() {
        var btn = document.querySelector('[class*="poll"], [class*="Poll"], button, a');
        var found = null;
        document.querySelectorAll('button, a, [role="button"]').forEach(function(b) { if ((b.textContent || '').toLowerCase().indexOf('poll') >= 0) found = found || b; });
        if (found) { found.click(); return { ok: true }; return { ok: false, error: 'Poll control not found' };
      })();
    ` : null;
    if (!script) return Promise.resolve({ ok: false, error: 'Polls not automated for this platform' });
    return executeInPlatform(platformId, script).then((r) => (r && r.ok === true ? { ok: true } : { ok: false, error: (r && r.error) || 'Automation failed' }));
  }

  if (action === 'timeout' || action === 'ban' || action === 'unban') {
    const username = (params?.username || '').trim().slice(0, 64);
    if (!username) return Promise.resolve({ ok: false, error: 'Username required' });
    const script = `
      (function() {
        var name = ${JSON.stringify(username)};
        var actionText = ${JSON.stringify(action === 'ban' ? 'ban' : action === 'unban' ? 'unban' : 'timeout')};
        var userEl = null;
        document.querySelectorAll('[class*="chat"], [class*="message"], [class*="comment"]').forEach(function(block) {
          if ((block.textContent || '').indexOf(name) >= 0) { userEl = block; }
        });
        if (!userEl) return { ok: false, error: 'User not found in chat' };
        userEl.click();
        var menu = document.querySelector('[class*="menu"], [class*="dropdown"], [role="menu"]');
        if (!menu) { userEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window, button: 2 })); }
        var actions = document.querySelectorAll('button, a, [role="menuitem"]');
        for (var i = 0; i < actions.length; i++) {
          if ((actions[i].textContent || '').toLowerCase().indexOf(actionText) >= 0) { actions[i].click(); return { ok: true }; }
        }
        return { ok: false, error: actionText + ' option not found' };
      })();
    `;
    return executeInPlatform(platformId, script).then((r) => (r && r.ok === true ? { ok: true } : { ok: false, error: (r && r.error) || 'Moderation automation failed' }));
  }

  return Promise.resolve({ ok: false, error: 'Unknown action' });
}

module.exports = {
  start,
  stop,
  stopAll,
  stopAllForPlatform,
  active: () => active,
  getScrapedViewerCounts,
  reportSocketViewerCount,
  clearSocketViewerCountsWithPrefix,
  executeInPlatform,
  runPlatformAction
};
