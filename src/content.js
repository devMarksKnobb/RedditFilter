/* Live DOM adapter for current and classic Reddit. No network requests. */
(() => {
  'use strict';
  if (globalThis.__redditFilterLoaded) return;
  globalThis.__redditFilterLoaded = true;
  const engine = globalThis.RedditFilterEngine;
  if (!engine) return;
  const selector = 'shreddit-post, article[data-testid="post-container"], div[data-testid="post-container"], .thing.link';
  let settings = engine.normalize(), pending = false, total = 0;
  const handled = new Map(), roots = new WeakSet();
  const stats = {hidden:0, reasons:{}}; let statsTimer;
  function report(reason) { stats.hidden++; stats.reasons[reason]=(stats.reasons[reason]||0)+1; clearTimeout(statsTimer); statsTimer=setTimeout(()=>chrome.storage.local.set({liveStats:stats}),400); }
  const read = (el, name) => el.getAttribute(name) || '';
  function deepFind(root, selector) {
    const result = [];
    const visit = node => {
      if (!node.querySelectorAll) return;
      for (const el of node.querySelectorAll(selector)) result.push(el);
      for (const el of node.querySelectorAll('*')) if (el.shadowRoot) visit(el.shadowRoot);
    };
    visit(root);
    return result;
  }
  function score(value) {
    const m = String(value || '').replace(/,/g,'').match(/(-?\d+(?:\.\d+)?)\s*([km])?/i);
    return m ? Math.round(Number(m[1]) * ({k:1e3,m:1e6}[m[2]?.toLowerCase()] || 1)) : NaN;
  }
  function info(el) {
    const links = deepFind(el, 'a[href]');
    const urls = links.map(a => a.getAttribute('href') || '');
    const sub = read(el,'subreddit-prefixed-name') || urls.find(u => /^\/r\/[^/]+\/?(?:\?|$)/.test(u))?.split('/')[2] || '';
    const author = read(el,'author') || urls.find(u => /^\/(?:user|u)\/[^/]+/.test(u))?.split('/')[2] || '';
    const external = links.find(a => { try {const h = new URL(a.href).hostname; return h !== 'reddit.com' && !h.endsWith('.reddit.com');} catch {return false;} });
    const labels = deepFind(el,'[data-testid="promoted-label"], [slot="credit-bar"], .promoted-tag');
    const flair = read(el,'post-flair') || deepFind(el,'[slot="flair"], [data-testid="post-flair"], .linkflairlabel').map(x => x.textContent).join(' ');
    const visibleText = (el.innerText || el.textContent || '').slice(0,16000);
    const title = read(el,'post-title') || deepFind(el,'[slot="title"], h3, a.title').map(x => x.textContent).join(' ');
    return {
      text: `${title} ${visibleText}`, author, subreddit: sub, flair,
      url: read(el,'content-href') || external?.href || '',
      score: score(read(el,'score') || deepFind(el,'[data-testid="vote-score"], faceplate-number, .score').map(x => x.getAttribute('number') || x.textContent).join(' ')),
      promoted: read(el,'promoted') === 'true' || el.matches('.promotedlink') || labels.some(x => /promoted|sponsored/i.test(x.textContent || '')),
      crosspost: el.hasAttribute('crosspost-root-id') || !!el.querySelector('shreddit-crosspost'),
      nsfw: el.hasAttribute('over-18') || read(el,'over-18') === 'true' || !!el.querySelector('.nsfw-stamp'),
      spoiler: el.hasAttribute('spoiler') || read(el,'spoiler') === 'true' || !!el.querySelector('.spoiler-stamp'),
      deleted: author.toLowerCase() === '[deleted]' 
    };
  }
  function restore(el) {
    const old = handled.get(el);
    if (!old) return;
    el.style.removeProperty('display'); el.style.removeProperty('opacity'); el.style.removeProperty('filter');
    old.placeholder?.remove();
    handled.delete(el);
  }
  function apply(el) {
    if (!el.isConnected) return;
    const post = info(el);
    const reason = engine.match(post, settings);
    const old = handled.get(el);
    if (!reason) {if (old) restore(el); return;}
    if (old?.reason === reason && old.mode === settings.mode) return;
    if (old) restore(el);
    const entry = {reason,mode:settings.mode,placeholder:null};
    handled.set(el,entry);
    if (settings.mode === 'dim') {
      el.style.setProperty('opacity','0.17','important');
      el.style.setProperty('filter','grayscale(1)','important');
    } else if (settings.mode === 'collapse') {
      const placeholder = document.createElement('button');
      placeholder.type = 'button'; placeholder.className = 'reddit-filter-reveal';
      placeholder.textContent = `Reddit Filter · ${reason} · Show post`;
      placeholder.addEventListener('click', () => {
        restore(el);
        el.dataset.redditFilterRevealed = 'true';
      });
      el.before(placeholder); entry.placeholder = placeholder;
      el.style.setProperty('display','none','important');
    } else el.style.setProperty('display','none','important');
    if (!old) { report(reason); total++; if (total % 5 === 0) chrome.storage.local.set({blockedSession:total}); }
  }
  function scan() {
    pending = false;
    for (const el of deepFind(document,selector)) {
      if (el.dataset.redditFilterRevealed === 'true') continue;
      apply(el);
    }
    for (const el of handled.keys()) if (!el.isConnected) handled.delete(el);
    watchShadows(document);
  }
  function schedule() { if (!pending) {pending = true; requestAnimationFrame(scan);} }
  function watchShadows(root) {
    for (const el of root.querySelectorAll?.('*') || []) if (el.shadowRoot) {
      observe(el.shadowRoot); watchShadows(el.shadowRoot);
    }
  }
  function observe(root) {
    if (roots.has(root)) return;
    roots.add(root);
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.classList?.contains('reddit-filter-reveal')) || m.type === 'attributes')) schedule();
    });
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['score','post-title','promoted','author','subreddit-prefixed-name']});
  }
  chrome.storage.local.get(['settings','blockedSession'], data => {
    settings = engine.normalize(data.settings || {});
    total = Number(data.blockedSession) || 0;
    observe(document.documentElement); schedule();
  });
  chrome.storage.onChanged.addListener((changes,area) => {
    if (area !== 'local' || !changes.settings) return;
    settings = engine.normalize(changes.settings.newValue || {});
    for (const el of [...handled.keys()]) restore(el);
    document.querySelectorAll('[data-reddit-filter-revealed]').forEach(el => delete el.dataset.redditFilterRevealed);
    schedule();
  });
  document.addEventListener('visibilitychange',() => {if (!document.hidden) schedule();});
  window.addEventListener('popstate',schedule);
  window.addEventListener('pageshow',schedule);
})();
