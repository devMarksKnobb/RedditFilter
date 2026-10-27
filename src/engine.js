/* Reddit Filter — pure, testable matching rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RedditFilterEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const defaults = Object.freeze({enabled:true,keywords:[],subreddits:[],authors:[],domains:[],flairs:[],allowedSubreddits:[],allowedAuthors:[],allowedDomains:[],hidePromoted:true,hideLowScore:false,minScore:-10,hideCrossposts:false,hideNSFW:false,hideSpoilers:false,hideDeleted:false,hideAutomod:false,mode:'hide',stats:{blocked:0}});
  function lines(value) { return (Array.isArray(value) ? value : String(value || '').split(/[,\n]/)).map(v => String(v).trim().toLowerCase()).filter(Boolean).slice(0,2000); }
  const strip = (v, prefix) => v.replace(new RegExp('^' + prefix + '/','i'),'');
  function normalize(value = {}) {
    const s = {...defaults,...value};
    for (const key of ['keywords','subreddits','authors','domains','flairs','allowedSubreddits','allowedAuthors','allowedDomains']) s[key] = lines(s[key]);
    for (const key of ['subreddits','allowedSubreddits']) s[key] = s[key].map(v => strip(v,'r'));
    for (const key of ['authors','allowedAuthors']) s[key] = s[key].map(v => strip(v,'u'));
    for (const key of ['domains','allowedDomains']) s[key] = s[key].map(v => v.replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,''));
    s.minScore = Number.isFinite(Number(s.minScore)) ? Number(s.minScore) : -10;
    s.mode = ['hide','dim','collapse'].includes(s.mode) ? s.mode : 'hide';
    s.stats = {blocked: Math.max(0, Number(s.stats?.blocked) || 0)};
    return s;
  }
  const domainMatches = (host, domain) => !!host && (host === domain || host.endsWith('.' + domain));
  function match(post, raw) {
    const s = normalize(raw);
    if (!s.enabled) return null;
    const text = String(post.text || '').toLowerCase();
    const author = strip(String(post.author || '').toLowerCase(),'u');
    const subreddit = strip(String(post.subreddit || '').toLowerCase(),'r');
    const flair = String(post.flair || '').toLowerCase();
    let host = '';
    try { host = new URL(post.url).hostname.toLowerCase().replace(/^www\./,''); } catch {}
    if (s.allowedSubreddits.includes(subreddit) || s.allowedAuthors.includes(author) || s.allowedDomains.some(d => domainMatches(host,d))) return null;
    if (s.hidePromoted && post.promoted) return 'Promoted post';
    if (s.hideCrossposts && post.crosspost) return 'Crosspost';
    if (s.hideNSFW && post.nsfw) return 'NSFW post';
    if (s.hideSpoilers && post.spoiler) return 'Spoiler post';
    if (s.hideDeleted && (post.deleted || author === '[deleted]')) return 'Deleted author';
    if (s.hideAutomod && author === 'automoderator') return 'AutoModerator';
    if (s.subreddits.includes(subreddit)) return 'Blocked community';
    if (s.authors.includes(author)) return 'Blocked author';
    if (s.domains.some(d => domainMatches(host,d))) return 'Blocked domain';
    if (s.flairs.some(f => flair.includes(f))) return 'Blocked flair';
    if (s.keywords.some(k => text.includes(k))) return 'Blocked keyword';
    if (s.hideLowScore && Number.isFinite(post.score) && post.score < s.minScore) return 'Low score';
    return null;
  }
  return {defaults,lines,normalize,match};
});
