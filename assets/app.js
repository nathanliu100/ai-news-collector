// ========== I18N ==========
const i18n = {
    zh: {
        filter_all: '全部', filter_critical: '重大', filter_notable: '关注', filter_fyi: '了解',
        stat_total: '共', stat_critical: '重大', stat_notable: '关注', stat_fyi: '了解',
        archive_title: '历史存档', loading: '加载中',
        no_briefing: '暂无简报', no_briefing_desc: '该日期的自动收集尚未执行。',
        no_weekly: '暂无周报', no_weekly_desc: '该周的周报尚未发布。',
        no_archive: '暂无存档。', scanning: '扫描中…',
        lang_label: 'EN', mode_daily: '日报', mode_weekly: '周报', mode_gallery: '🎬 作品', mode_ideas: '💡 想法',
        toast_copied: '🔗 链接已复制',
    },
    en: {
        filter_all: 'All', filter_critical: 'Critical', filter_notable: 'Notable', filter_fyi: 'FYI',
        stat_total: 'Total', stat_critical: 'Critical', stat_notable: 'Notable', stat_fyi: 'FYI',
        archive_title: 'Archive', loading: 'LOADING',
        no_briefing: 'No briefing for this date', no_briefing_desc: 'The automation hasn\'t run for this date yet.',
        no_weekly: 'No weekly briefing', no_weekly_desc: 'The weekly briefing hasn\'t been published yet.',
        no_archive: 'No archives found.', scanning: 'Scanning\u2026',
        lang_label: '中文', mode_daily: 'Daily', mode_weekly: 'Weekly', mode_gallery: '🎬 Gallery', mode_ideas: '💡 Ideas',
        toast_copied: '🔗 Link copied',
    }
};

function detectLang() {
    const saved = localStorage.getItem('ai-news-lang');
    if (saved) return saved;
    const nav = navigator.language || navigator.userLanguage || 'en';
    return nav.startsWith('zh') ? 'zh' : 'en';
}

let currentLang = detectLang();

function t(key) {
    return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.en[key]) || key;
}

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.getElementById('langToggle').textContent = t('lang_label');
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('.m-pill[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelector('.mode-tab[data-mode="daily"]').textContent = t('mode_daily');
    document.querySelector('.mode-tab[data-mode="weekly"]').textContent = t('mode_weekly');
    document.querySelector('.mode-tab[data-mode="gallery"]').textContent = t('mode_gallery');
    var ideasTab = document.querySelector('.mode-tab[data-mode="ideas"]');
    if (ideasTab) ideasTab.textContent = t('mode_ideas');
}

function toggleLang() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('ai-news-lang', currentLang);
    applyI18n();
    if (currentMode === 'daily') {
        loadNews(fmtDate(currentDate));
    } else {
        loadWeekly();
    }
    updateUrl();
}

// ========== STATE ==========
let currentDate = new Date();
let currentFilter = 'all';
let currentMarkdown = '';
let currentMode = 'daily';

// ========== FORMAT ==========
function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function displayDate(d) {
    const wdZh = ['周日','周一','周二','周三','周四','周五','周六'];
    const wdEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthsEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const wd = currentLang === 'zh' ? wdZh : wdEn;
    if (currentLang === 'zh') {
        return '<span>' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + '</span><span class="weekday">' + wd[d.getDay()] + '</span>';
    }
    return '<span>' + monthsEn[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + '</span><span class="weekday">' + wd[d.getDay()] + '</span>';
}

// ========== ISO WEEK ==========
function getISOWeek(d) {
    var date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getISOWeekYear(d) {
    var date = new Date(d.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

function displayWeek(d) {
    var wn = getISOWeek(d);
    var yr = getISOWeekYear(d);
    if (currentLang === 'zh') return '<span>' + yr + ' 第 ' + wn + ' 周</span>';
    return '<span>' + yr + ' W' + String(wn).padStart(2, '0') + '</span>';
}

function weeklyPath(d) {
    var wn = getISOWeek(d);
    var yr = getISOWeekYear(d);
    return 'news/weekly-' + yr + '-W' + String(wn).padStart(2, '0') + '.md';
}

// ========== MODE SWITCH ==========
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(function(tab) {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    if (mode === 'daily') {
        document.getElementById('statsRibbon').style.display = '';
        document.querySelectorAll('.pill[data-level]').forEach(function(p) { p.style.display = ''; });
        document.getElementById('mobileFilterBar').style.removeProperty('display');
        document.getElementById('currentDate').innerHTML = displayDate(currentDate);
        loadNews(fmtDate(currentDate));
    } else {
        document.getElementById('statsRibbon').style.display = 'none';
        document.querySelectorAll('.pill[data-level]').forEach(function(p) { p.style.display = 'none'; });
        document.getElementById('mobileFilterBar').style.display = 'none';
        findLatestWeekly().then(function() { loadWeekly(); updateUrl(); });
    }
    updateUrl();
}

// ========== NAV ==========
function changeDate(delta) {
    if (currentMode === 'daily') {
        currentDate.setDate(currentDate.getDate() + delta);
        document.getElementById('currentDate').innerHTML = displayDate(currentDate);
        loadNews(fmtDate(currentDate));
    } else {
        weeklyDate.setDate(weeklyDate.getDate() + delta * 7);
        document.getElementById('currentDate').innerHTML = displayWeek(weeklyDate);
        loadWeekly();
    }
    updateUrl();
}

// ========== P1: MASTHEAD COLLAPSE (IntersectionObserver) ==========
const mastheadEl = document.getElementById('masthead');
const navBrandEl = document.getElementById('navBrand');

const mastheadObserver = new IntersectionObserver(function(entries) {
    const isVisible = entries[0].isIntersecting;
    mastheadEl.classList.toggle('collapsed', !isVisible);
    navBrandEl.classList.toggle('show', !isVisible);
}, { threshold: 0.1 });

mastheadObserver.observe(mastheadEl);

// ========== SCROLL SHADOW ==========
window.addEventListener('scroll', function() {
    document.getElementById('navBar').classList.toggle('scrolled', window.scrollY > 60);
});

// ========== NEWS FILE PATH ==========
// 周末（周六=6 / 周日=0）优先尝试 -weekend.md，fallback 到普通日报
function isWeekendDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var dow = d.getDay();
    return dow === 0 || dow === 6;
}
function newsPath(dateStr) {
    var suffix = currentLang === 'en' ? '.en.md' : '.md';
    if (isWeekendDate(dateStr)) return 'news/' + dateStr + '-weekend' + suffix;
    return 'news/' + dateStr + suffix;
}
// 生成一组候选路径：周末先 weekend、再普通日报；普通日先中文/英文主版，再 fallback 另一语言
function newsPathCandidates(dateStr) {
    var isWeekend = isWeekendDate(dateStr);
    var primary = currentLang === 'en' ? '.en.md' : '.md';
    var fallbackLang = currentLang === 'en' ? '.md' : '.en.md';
    var list = [];
    if (isWeekend) {
        list.push('news/' + dateStr + '-weekend' + primary);
        list.push('news/' + dateStr + '-weekend' + fallbackLang);
    }
    list.push('news/' + dateStr + primary);
    list.push('news/' + dateStr + fallbackLang);
    return list;
}

// ========== LOAD DAILY ==========
async function loadNews(dateStr) {
    var el = document.getElementById('content');
    el.innerHTML = '<div class="loading"><div class="loader"></div><p>' + t('loading') + '</p></div>';
    currentFilter = 'all';
    document.querySelectorAll('.pill[data-level]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.level === 'all');
    });
    document.querySelectorAll('.m-pill[data-level]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.level === 'all');
    });

    try {
        var candidates = newsPathCandidates(dateStr);
        var res = null;
        var fallbackDate = null;
        for (var i = 0; i < candidates.length; i++) {
            var tryRes = await fetch(candidates[i]);
            if (tryRes.ok) { res = tryRes; break; }
        }
        // 所有候选路径都 404 后，尝试回退最近 3 天
        if (!res) {
            for (var retry = 1; retry <= 3; retry++) {
                var retryDate = new Date(dateStr + 'T00:00:00');
                retryDate.setDate(retryDate.getDate() - retry);
                var retryStr = fmtDate(retryDate);
                var retryCandidates = newsPathCandidates(retryStr);
                for (var j = 0; j < retryCandidates.length; j++) {
                    var retryRes = await fetch(retryCandidates[j]);
                    if (retryRes.ok) {
                        res = retryRes;
                        fallbackDate = retryStr;
                        break;
                    }
                }
                if (res) break;
            }
        }
        if (!res) throw new Error('not found');
        currentMarkdown = await res.text();
        // Convert crew comment markers to span tags before parsing
        var mdToParse = currentMarkdown
            .replace(/<!--\s*crew:(\w+)\s*-->/g, '<span class="crew-data" data-crew="$1">')
            .replace(/<!--\s*\/crew\s*-->/g, '</span>');
        var bannerHtml = '';
        if (fallbackDate) {
            var origMsg = currentLang === 'zh'
                ? ('📭 <strong>' + dateStr + '</strong> 暂无简报，已自动为你加载 <strong>' + fallbackDate + '</strong> 的内容')
                : ('📭 No briefing for <strong>' + dateStr + '</strong>. Showing <strong>' + fallbackDate + '</strong> instead.');
            bannerHtml = '<div class="fallback-banner">' + origMsg + '</div>';
        }
        el.innerHTML = bannerHtml + '<div class="news-content">' + marked.parse(mdToParse) + '</div>';
        structureNewsBlocks();
        styleSourceLines();
        addAnchorLinks();
        injectCrewComments();
        updateStats(currentMarkdown);
        handleHashNavigation();
    } catch (e) {
        currentMarkdown = '';
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">&empty;</div><h3>' + t('no_briefing') + '</h3><p>' + t('no_briefing_desc') + '</p></div>';
        resetStats();
    }
}

// ========== LOAD WEEKLY ==========
let weeklyDate = new Date();

async function loadWeekly() {
    var el = document.getElementById('content');
    el.innerHTML = '<div class="loading"><div class="loader"></div><p>' + t('loading') + '</p></div>';
    document.getElementById('currentDate').innerHTML = displayWeek(weeklyDate);
    var path = weeklyPath(weeklyDate);
    try {
        var res = await fetch(path);
        if (!res.ok) throw new Error('not found');
        var md = await res.text();
        el.innerHTML = '<div class="weekly-content">' + marked.parse(md) + '</div>';
    } catch (e) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128221;</div><h3>' + t('no_weekly') + '</h3><p>' + t('no_weekly_desc') + '</p></div>';
    }
}

async function findLatestWeekly() {
    var d = new Date();
    for (var i = 0; i < 12; i++) {
        var path = weeklyPath(d);
        try {
            var res = await fetch(path, { method: 'HEAD' });
            if (res.ok) { weeklyDate = new Date(d); return; }
        } catch(e){}
        d.setDate(d.getDate() - 7);
    }
    weeklyDate = new Date();
}

// ========== STRUCTURE NEWS BLOCKS ==========
function structureNewsBlocks() {
    var container = document.querySelector('.news-content');
    if (!container) return;
    var children = Array.from(container.children);
    var i = 0;

    while (i < children.length) {
        var el = children[i];
        if (el.tagName === 'H3') {
            var text = el.textContent;
            var level = 'unknown';
            if (text.indexOf('\uD83D\uDD34') >= 0) level = 'high';
            else if (text.indexOf('\uD83D\uDFE1') >= 0) level = 'medium';
            else if (text.indexOf('\uD83D\uDFE2') >= 0) level = 'low';
            else if (text.indexOf('\uD83D\uDD14') >= 0) level = 'rumor';

            var block = document.createElement('div');
            block.className = 'news-block';
            block.dataset.level = level;

            el.parentNode.insertBefore(block, el);
            block.appendChild(el);

            var next = block.nextSibling;
            while (next) {
                var tag = next.tagName;
                if (tag === 'H3' || tag === 'H2' || tag === 'HR') break;
                var toMove = next;
                next = next.nextSibling;
                block.appendChild(toMove);
            }

            i = Array.from(container.children).indexOf(block) + 1;
            children = Array.from(container.children);
        } else {
            i++;
        }
    }
}

// ========== P1: STYLE SOURCE LINES ==========
function styleSourceLines() {
    // Find paragraphs that start with **来源** or **Source** and add .news-meta class
    var paras = document.querySelectorAll('.news-block p');
    paras.forEach(function(p) {
        var text = p.textContent.trim();
        if (text.startsWith('来源') || text.startsWith('Source') ||
            (p.querySelector('strong') && (
                p.querySelector('strong').textContent.startsWith('来源') ||
                p.querySelector('strong').textContent.startsWith('Source')
            ))) {
            p.classList.add('news-meta');
        }
    });
}

// ========== DISABLE SCROLL RESTORATION ==========
// 防止刷新后浏览器恢复到上次滚动位置
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// ========== P0: ANCHOR LINKS ==========
var newsCounter = 0;

function addAnchorLinks() {
    newsCounter = 0;
    var blocks = document.querySelectorAll('.news-block');
    blocks.forEach(function(block) {
        newsCounter++;
        var anchorId = 'news-' + newsCounter;
        block.id = anchorId;

        var h3 = block.querySelector('h3');
        if (h3) {
            var btn = document.createElement('a');
            btn.className = 'anchor-link';
            btn.href = '#' + anchorId;
            btn.innerHTML = '🔗';
            btn.title = currentLang === 'zh' ? '复制链接' : 'Copy link';
            btn.onclick = function(e) {
                e.preventDefault();
                var url = window.location.origin + window.location.pathname + '#' + anchorId;
                // 方案B：标题 + URL，粘贴到 IM 时对方一眼知道是啥
                var titleText = h3.textContent.replace(/\s*🔗\s*$/, '').trim();
                var copyText = titleText + '\n' + url;
                navigator.clipboard.writeText(copyText).then(function() {
                    var shortTitle = titleText.length > 20 ? titleText.slice(0, 20) + '…' : titleText;
                    showToast('🔗 ' + (currentLang === 'zh' ? '已复制「' + shortTitle + '」' : 'Copied "' + shortTitle + '"'));
                }).catch(function() {
                    // fallback: just show toast without clipboard
                    showToast('🔗 ' + (currentLang === 'zh' ? '请手动复制链接' : 'Please copy link manually'));
                });
                // 不修改 URL hash，避免刷新时自动滚动到中间
            };
            h3.appendChild(btn);
        }
    });
}

// ========== P0: TOAST ==========
var toastTimer = null;
function showToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
        toast.classList.remove('show');
    }, 2000);
}

// ========== P0: HASH NAVIGATION (anchor highlight) ==========
// 首次从链接进来 → 跳到对应新闻；刷新 → 回顶部
var hashHandledKey = 'anchor_handled_' + window.location.hash;

function handleHashNavigation() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith('#news-')) return;

    // 如果这个 hash 已经处理过（说明是刷新），清掉 hash 回顶部
    if (sessionStorage.getItem(hashHandledKey)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        window.scrollTo(0, 0);
        return;
    }

    // 首次导航，标记并跳转
    sessionStorage.setItem(hashHandledKey, '1');
    setTimeout(function() {
        var target = document.querySelector(hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.classList.add('anchor-highlight');
            setTimeout(function() {
                target.classList.remove('anchor-highlight');
            }, 2500);
        }
    }, 300);
}

// Listen for hash changes (e.g. from shared links)
window.addEventListener('hashchange', function() {
    handleHashNavigation();
});

// ========== CREW COMMENTS (折叠式) ==========
var CREW = {
    elon:       { name: 'Elon Musk',  emoji: '🚀', avatar: 'thinking/avatars/elon.png' },
    jobs:       { name: 'Steve Jobs',  emoji: '🍎', avatar: 'thinking/avatars/jobs.png' },
    wanweigang: { name: '万维钢',      emoji: '📐', avatar: 'thinking/avatars/wanweigang.png' },
    tim:        { name: 'Tim · 影视飓风', emoji: '🎬', avatar: 'thinking/avatars/tim.png' },
    mrbeast:    { name: 'MrBeast',     emoji: '🎯', avatar: 'thinking/avatars/mrbeast.png' },
    // 退役员工（仅用于历史新闻回填，新日报不再写入）
    trump:      { name: 'Trump · 已退役', emoji: '🏛️', avatar: 'thinking/avatars/trump.png' }
};

function injectCrewComments() {
    var blocks = document.querySelectorAll('.news-block');
    blocks.forEach(function(block) {
        // Find crew-data spans inside this block
        var crewSpans = block.querySelectorAll('span.crew-data');
        if (crewSpans.length === 0) return;

        var comments = [];
        crewSpans.forEach(function(span) {
            comments.push({ key: span.dataset.crew, text: span.innerHTML.trim() });
            span.remove();
        });

        if (comments.length === 0) return;

        // Build toggle button with avatar row
        var avatarsHtml = '<span class="crew-avatars-row">';
        comments.forEach(function(c) {
            var cfg = CREW[c.key] || { emoji: '💬', avatar: '' };
            avatarsHtml += '<span class="crew-mini-avatar"><img src="' + cfg.avatar + '" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + cfg.emoji + '\'"></span>';
        });
        avatarsHtml += '</span>';

        var toggleId = 'crew-' + Math.random().toString(36).substr(2, 6);

        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'crew-toggle';
        toggleBtn.innerHTML = avatarsHtml + ' ' + comments.length + ' 位数字员工有话说 <span class="crew-arrow">▾</span>';
        toggleBtn.onclick = function() {
            var panel = document.getElementById(toggleId);
            toggleBtn.classList.toggle('open');
            panel.classList.toggle('open');
        };

        // Build panel
        var panelDiv = document.createElement('div');
        panelDiv.className = 'crew-panel';
        panelDiv.id = toggleId;

        var innerHtml = '<div class="crew-panel-inner">';
        comments.forEach(function(c) {
            var cfg = CREW[c.key] || { name: c.key, emoji: '💬', avatar: '' };
            var avContent = '<img src="' + cfg.avatar + '" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + cfg.emoji + '\'">';
            innerHtml += '<div class="crew-item">';
            innerHtml += '<div class="crew-av">' + avContent + '</div>';
            innerHtml += '<div class="crew-info">';
            innerHtml += '<div class="crew-nm">' + cfg.name + '</div>';
            innerHtml += '<div class="crew-msg">' + marked.parseInline(c.text) + '</div>';
            innerHtml += '</div></div>';
        });
        innerHtml += '</div>';
        panelDiv.innerHTML = innerHtml;

        // Append toggle and panel at end of block
        block.appendChild(toggleBtn);
        block.appendChild(panelDiv);
    });
}

// ========== STATS ==========
function updateStats(md) {
    var ribbon = document.getElementById('statsRibbon');
    // 周末特刊模式：检测 ☕ 八卦板块存在
    var isWeekend = md.indexOf('## ☕') >= 0 || md.indexOf('-weekend') >= 0 || /周末特刊/.test(md);

    if (isWeekend && ribbon) {
        ribbon.classList.add('weekend-mode');
        var gossip = (md.match(/^###?\s*☕/gm) || []).length;
        var tools = (md.match(/^###?\s*🎮/gm) || []).length;
        var bigQ = (md.match(/^##\s*🔭/gm) || []).length;
        document.getElementById('totalCount').textContent = (gossip + tools + bigQ) || '—';
        document.getElementById('highCount').textContent = gossip;
        document.getElementById('mediumCount').textContent = tools;
        document.getElementById('lowCount').textContent = bigQ;
        document.getElementById('mediaCount').textContent = '—';
        document.getElementById('xCount').textContent = '—';
        document.getElementById('officialCount').textContent = '—';
        var rumorEl = document.getElementById('rumorCount');
        if (rumorEl) rumorEl.textContent = '—';
        return;
    }

    if (ribbon) ribbon.classList.remove('weekend-mode');

    var h3s = (md.match(/^### /gm) || []).length;
    var highs = (md.match(/^### 🔴/gm) || []).length;
    var meds = (md.match(/^### 🟡/gm) || []).length;
    var lows = (md.match(/^### 🟢/gm) || []).length;
    var rumors = (md.match(/^### 🔔/gm) || []).length;
    var media = (md.match(/\[📰 媒体\]/g) || []).length;
    var xkol = (md.match(/\[🐦 X\/KOL\]/g) || []).length;
    var official = (md.match(/\[🏢 官方\]/g) || []).length;

    document.getElementById('totalCount').textContent = h3s || 0;
    document.getElementById('highCount').textContent = highs;
    document.getElementById('mediumCount').textContent = meds;
    document.getElementById('lowCount').textContent = lows;
    document.getElementById('mediaCount').textContent = media;
    document.getElementById('xCount').textContent = xkol;
    document.getElementById('officialCount').textContent = official;
    var rumorEl2 = document.getElementById('rumorCount');
    if (rumorEl2) rumorEl2.textContent = rumors;
}

function resetStats() {
    ['totalCount','highCount','mediumCount','lowCount','mediaCount','xCount','officialCount','rumorCount']
        .forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '\u2014';
        });
}

// ========== FILTER ==========
function setFilter(level) {
    currentFilter = level;
    document.querySelectorAll('.pill[data-level]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.level === level);
    });
    document.querySelectorAll('.m-pill[data-level]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.level === level);
    });
    applyFilter();
}

function applyFilter() {
    var blocks = document.querySelectorAll('.news-block');
    var sections = document.querySelectorAll('.news-content h2');

    blocks.forEach(function(block) {
        if (currentFilter === 'all') {
            block.classList.remove('hidden');
        } else if (currentFilter === 'low') {
            // FYI 同时包含 🟢 和 🔔 传闻（同属"了解即可"层级）
            var lvl = block.dataset.level;
            block.classList.toggle('hidden', lvl !== 'low' && lvl !== 'rumor');
        } else {
            block.classList.toggle('hidden', block.dataset.level !== currentFilter);
        }
    });

    sections.forEach(function(h2) {
        if (currentFilter === 'all') {
            h2.classList.remove('section-hidden');
            return;
        }
        var hasVisible = false;
        var sibling = h2.nextElementSibling;
        while (sibling) {
            if (sibling.tagName === 'H2' || sibling.tagName === 'HR') break;
            if (sibling.classList.contains('news-block') && !sibling.classList.contains('hidden')) {
                hasVisible = true;
                break;
            }
            sibling = sibling.nextElementSibling;
        }
        h2.classList.toggle('section-hidden', !hasVisible);
    });

    var hrs = document.querySelectorAll('.news-content hr');
    hrs.forEach(function(hr) {
        if (currentFilter === 'all') { hr.style.display = ''; return; }
        var prev = hr.previousElementSibling;
        var prevVisible = false;
        var nextVisible = false;
        while (prev) {
            if (prev.tagName === 'HR') break;
            if ((prev.classList.contains('news-block') && !prev.classList.contains('hidden')) ||
                (prev.tagName === 'H2' && !prev.classList.contains('section-hidden'))) {
                prevVisible = true; break;
            }
            prev = prev.previousElementSibling;
        }
        var next = hr.nextElementSibling;
        while (next) {
            if (next.tagName === 'HR') break;
            if ((next.classList.contains('news-block') && !next.classList.contains('hidden')) ||
                (next.tagName === 'H2' && !next.classList.contains('section-hidden'))) {
                nextVisible = true; break;
            }
            next = next.nextElementSibling;
        }
        hr.style.display = (prevVisible && nextVisible) ? '' : 'none';
    });
}

// ========== PANEL ==========
function togglePanel() {
    var o = document.getElementById('overlay');
    var p = document.getElementById('panel');
    var isOpen = o.classList.contains('show');
    if (isOpen) {
        o.classList.remove('show');
        p.style.display = 'none';
    } else {
        o.classList.add('show');
        p.style.display = 'block';
        scanFiles();
    }
}

async function scanFiles() {
    var el = document.getElementById('fileList');
    el.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;">' + t('scanning') + '</p>';
    var files = [];
    var today = new Date();
    for (var i = 0; i < 30; i++) {
        var d = new Date(today);
        d.setDate(d.getDate() - i);
        var ds = fmtDate(d);
        try {
            // 周六日优先查 -weekend.md，没有再查普通版
            var isWe = (d.getDay() === 0 || d.getDay() === 6);
            var primary = isWe ? ('news/' + ds + '-weekend.md') : ('news/' + ds + '.md');
            var r = await fetch(primary, { method: 'HEAD' });
            if (r.ok) {
                files.push({ date: ds, weekend: isWe });
                continue;
            }
            if (isWe) {
                // weekend 版不存在就 fallback 到普通版
                var r2 = await fetch('news/' + ds + '.md', { method: 'HEAD' });
                if (r2.ok) files.push({ date: ds, weekend: false });
            }
        } catch(e){}
    }
    if (!files.length) {
        el.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;">' + t('no_archive') + '</p>';
        return;
    }
    el.innerHTML = files.map(function(f) {
        var label = f.weekend ? (f.date + ' 🌴 Weekend') : f.date;
        return '<div class="panel-item ' + (f.date===fmtDate(currentDate)?'active':'') + '" onclick="jumpTo(\'' + f.date + '\')">' + label + '</div>';
    }).join('');
}

function jumpTo(ds) {
    currentDate = new Date(ds + 'T00:00:00');
    if (currentMode === 'weekly') setMode('daily');
    document.getElementById('currentDate').innerHTML = displayDate(currentDate);
    loadNews(ds);
    togglePanel();
    updateUrl();
}

// ========== URL ROUTING ==========
function getUrlParams() {
    var params = new URLSearchParams(window.location.search);
    return {
        mode: params.get('mode'),
        date: params.get('date'),
        week: params.get('week')
    };
}

function updateUrl() {
    var params = new URLSearchParams(window.location.search);
    // 保留 UTM 参数
    var utmKeys = [];
    params.forEach(function(val, key) {
        if (key.startsWith('utm_')) utmKeys.push(key);
    });
    var newParams = new URLSearchParams();
    utmKeys.forEach(function(key) { newParams.set(key, params.get(key)); });

    if (currentMode === 'weekly') {
        newParams.set('mode', 'weekly');
        var wn = getISOWeek(weeklyDate);
        var yr = getISOWeekYear(weeklyDate);
        newParams.set('week', yr + '-W' + String(wn).padStart(2, '0'));
    } else {
        newParams.set('mode', 'daily');
        newParams.set('date', fmtDate(currentDate));
    }
    var newUrl = window.location.pathname + '?' + newParams.toString() + window.location.hash;
    history.replaceState(null, '', newUrl);
}

// ========== INIT ==========
(function initFromUrl() {
    var p = getUrlParams();
    if (p.mode === 'weekly') {
        // 解析 week 参数，如 2026-W18
        if (p.week && /^\d{4}-W\d{2}$/.test(p.week)) {
            var parts = p.week.split('-W');
            var yr = parseInt(parts[0]);
            var wk = parseInt(parts[1]);
            // 计算该 ISO 周的周一日期
            var jan4 = new Date(yr, 0, 4);
            var dayOfWeek = jan4.getDay() || 7;
            var mondayOfWeek1 = new Date(jan4);
            mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
            weeklyDate = new Date(mondayOfWeek1);
            weeklyDate.setDate(weeklyDate.getDate() + (wk - 1) * 7);
        }
        applyI18n();
        setMode('weekly');
    } else {
        // daily 模式
        if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
            currentDate = new Date(p.date + 'T00:00:00');
        }
        applyI18n();
        document.getElementById('currentDate').innerHTML = displayDate(currentDate);
        loadNews(fmtDate(currentDate));
    }
    // 初始化后更新 URL（确保 URL 始终有参数）
    setTimeout(updateUrl, 100);
})();

// ========== DEV MODE EASTER EGG ==========
(function() {
    var PIN = '9527';
    var modal = document.getElementById('devModal');
    var trigger = document.getElementById('devTrigger');
    var hint = document.getElementById('devHint');
    var digits = modal.querySelectorAll('.pin-digit');

    trigger.addEventListener('click', function() {
        modal.classList.add('show');
        digits.forEach(function(d) { d.value = ''; d.classList.remove('error'); });
        hint.textContent = 'Enter PIN to continue';
        hint.style.color = '';
        setTimeout(function() { digits[0].focus(); }, 100);
    });

    // 点击遮罩关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.classList.remove('show');
    });

    // ESC 关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });

    // 输入逻辑：输入一个数字自动跳下一格
    digits.forEach(function(input, idx) {
        input.addEventListener('input', function() {
            var val = this.value;
            // 只保留最后一个字符
            if (val.length > 1) this.value = val.slice(-1);
            this.classList.remove('error');

            if (this.value && idx < 3) {
                digits[idx + 1].focus();
            }

            // 检查是否 4 位都填了
            var code = '';
            digits.forEach(function(d) { code += d.value; });
            if (code.length === 4) {
                if (code === PIN) {
                    hint.textContent = '✅ Access granted';
                    hint.style.color = 'var(--green)';
                    setTimeout(function() {
                        modal.classList.remove('show');
                        window.location.href = 'thinking/index.html';
                    }, 600);
                } else {
                    hint.textContent = '❌ Wrong PIN';
                    hint.style.color = 'var(--accent)';
                    digits.forEach(function(d) { d.classList.add('error'); });
                    setTimeout(function() {
                        digits.forEach(function(d) { d.value = ''; d.classList.remove('error'); });
                        hint.textContent = 'Enter PIN to continue';
                        hint.style.color = '';
                        digits[0].focus();
                    }, 800);
                }
            }
        });

        // Backspace 跳回上一格
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                digits[idx - 1].focus();
                digits[idx - 1].value = '';
            }
        });

        // 粘贴支持（直接粘 4 位数）
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{4}$/.test(pasted)) {
                digits.forEach(function(d, i) { d.value = pasted[i]; });
                digits[3].focus();
                // 触发检查
                digits[3].dispatchEvent(new Event('input'));
            }
        });
    });
})();

// ========== IDEAS LAB PASSWORD GATE ==========
function showIdeasGate() {
    var modal = document.getElementById('ideasModal');
    if (!modal) return;
    modal.classList.add('show');
    var digits = modal.querySelectorAll('.ideas-pin');
    var hint = document.getElementById('ideasHint');
    digits.forEach(function(d) { d.value = ''; d.classList.remove('error'); });
    hint.textContent = 'Enter PIN to continue';
    hint.style.color = '';
    setTimeout(function() { digits[0].focus(); }, 100);
}

(function() {
    var PIN = '9527';
    var modal = document.getElementById('ideasModal');
    if (!modal) return;
    var hint = document.getElementById('ideasHint');
    var digits = modal.querySelectorAll('.ideas-pin');

    // Close on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.classList.remove('show');
    });

    // ESC close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });

    digits.forEach(function(input, idx) {
        input.addEventListener('input', function() {
            var val = this.value;
            if (val.length > 1) this.value = val.slice(-1);
            this.classList.remove('error');

            if (this.value && idx < 3) {
                digits[idx + 1].focus();
            }

            var code = '';
            digits.forEach(function(d) { code += d.value; });
            if (code.length === 4) {
                if (code === PIN) {
                    hint.textContent = '✅ Access granted';
                    hint.style.color = 'var(--green, #4A7C59)';
                    setTimeout(function() {
                        modal.classList.remove('show');
                        window.location.href = 'ideas/';
                    }, 600);
                } else {
                    hint.textContent = '❌ Wrong PIN';
                    hint.style.color = 'var(--accent)';
                    digits.forEach(function(d) { d.classList.add('error'); });
                    setTimeout(function() {
                        digits.forEach(function(d) { d.value = ''; d.classList.remove('error'); });
                        hint.textContent = 'Enter PIN to continue';
                        hint.style.color = '';
                        digits[0].focus();
                    }, 800);
                }
            }
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                digits[idx - 1].focus();
                digits[idx - 1].value = '';
            }
        });

        input.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{4}$/.test(pasted)) {
                digits.forEach(function(d, i) { d.value = pasted[i]; });
                digits[3].focus();
                digits[3].dispatchEvent(new Event('input'));
            }
        });
    });
})();
