// ========== TAB SWITCHING ==========
let currentTab = 'thinking';

function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.mode-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update main panels
    document.querySelectorAll('.tab-panel').forEach(function(panel) {
        panel.classList.toggle('active', panel.dataset.panel === tab);
    });

    // Update sidebar panels
    document.querySelectorAll('.sidebar-tab-panel').forEach(function(panel) {
        panel.classList.toggle('active', panel.dataset.sidebar === tab);
    });

    // Update mobile nav
    document.getElementById('mobileNav').innerHTML = tab === 'thinking' ? thinkingMobileNav : changelogMobileNav;

    // Re-bind mobile nav clicks
    document.querySelectorAll('.mobile-nav-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', this.getAttribute('href'));
            }
        });
    });

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile nav templates
var thinkingMobileNav = '<a href="#progress" class="mobile-nav-item active">📋 清单</a>' +
    '<a href="#day-21" class="mobile-nav-item">D21 · 04-28</a>' +
    '<a href="#day-20" class="mobile-nav-item">D20 · 04-27</a>' +
    '<a href="#day-19" class="mobile-nav-item">D19 · 04-26</a>' +
    '<a href="#day-18" class="mobile-nav-item">D18 · 04-25</a>' +
    '<a href="#day-17" class="mobile-nav-item">D17 · 04-24</a>' +
    '<a href="#day-16" class="mobile-nav-item">D16 · 04-23</a>' +
    '<a href="#day-15" class="mobile-nav-item">D15 · 04-22</a>' +
    '<a href="#day-14" class="mobile-nav-item">D14 · 04-21</a>' +
    '<a href="#day-13" class="mobile-nav-item">D13 · 04-20</a>' +
    '<a href="#day-12" class="mobile-nav-item">D12 · 04-19</a>' +
    '<a href="#day-11" class="mobile-nav-item">D11 · 04-18</a>' +
    '<a href="#day-10" class="mobile-nav-item">D10 · 04-17</a>' +
    '<a href="#day-9" class="mobile-nav-item">D9 · 04-16</a>' +
    '<a href="#day-8" class="mobile-nav-item">D8 · 04-15</a>' +
    '<a href="#day-7" class="mobile-nav-item">D7 · 04-14</a>' +
    '<a href="#day-6" class="mobile-nav-item">D6 · 04-13</a>' +
    '<a href="#day-5" class="mobile-nav-item">D5 · 04-12</a>' +
    '<a href="#day-4" class="mobile-nav-item">D4 · 04-11</a>' +
    '<a href="#day-3" class="mobile-nav-item">D3 · 04-10</a>' +
    '<a href="#day-2" class="mobile-nav-item">D2 · 04-09</a>' +
    '<a href="#day-1" class="mobile-nav-item">D1 · 04-08</a>' +
    '<a href="#icebox" class="mobile-nav-item">🧊 冰箱</a>';

var changelogMobileNav = '<a href="#cl-2026-04-16" class="mobile-nav-item active">04-16</a>' +
    '<a href="#cl-2026-04-15" class="mobile-nav-item">04-15</a>';

// ========== LOAD THINKING ENTRIES ==========
const entries = [
    { id: 'content-day-1', file: '2026-04-08.md' },
    { id: 'content-day-2', file: '2026-04-09.md' },
    { id: 'content-day-3', file: '2026-04-10.md' },
    { id: 'content-day-4', file: '2026-04-11.md' },
    { id: 'content-day-5', file: '2026-04-12.md' },
    { id: 'content-day-6', file: '2026-04-13.md' },
    { id: 'content-day-7', file: '2026-04-14.md' },
    { id: 'content-day-8', file: '2026-04-15.md' },
    { id: 'content-day-9', file: '2026-04-16.md' },
    { id: 'content-day-10', file: '2026-04-17.md' },
    { id: 'content-day-11', file: '2026-04-18.md' },
    { id: 'content-day-12', file: '2026-04-19.md' },
    { id: 'content-day-13', file: '2026-04-20.md' },
    { id: 'content-day-14', file: '2026-04-21.md' },
    { id: 'content-day-15', file: '2026-04-22.md' },
    { id: 'content-day-16', file: '2026-04-23.md' },
    { id: 'content-day-17', file: '2026-04-24.md' },
    { id: 'content-day-18', file: '2026-04-25.md' },
    { id: 'content-day-19', file: '2026-04-26.md' },
    { id: 'content-day-20', file: '2026-04-27.md' },
    { id: 'content-day-21', file: '2026-04-28.md' },
];

// ========== LOAD CHANGELOG ENTRIES ==========
const changelogEntries = [
    { id: 'cl-content-2026-04-15', file: 'changelog/2026-04-15.md' },
    { id: 'cl-content-2026-04-16', file: 'changelog/2026-04-16.md' },
];

async function loadEntries() {
    var allEntries = entries.concat(changelogEntries);
    for (var i = 0; i < allEntries.length; i++) {
        var entry = allEntries[i];
        var el = document.getElementById(entry.id);
        if (!el) continue;
        try {
            var res = await fetch(entry.file);
            if (!res.ok) throw new Error('not found');
            var md = await res.text();
            md = md.replace(/^# .+\n/, '');
            // Convert crew comment markers to span tags before parsing (HTML comments get lost in DOM)
            md = md.replace(/<!--\s*comment:(\w+)\s*-->/g, '<span class="crew-data" data-crew="$1">');
            md = md.replace(/<!--\s*\/comment\s*-->/g, '</span>');
            el.innerHTML = marked.parse(md);
        } catch (e) {
            el.innerHTML = '<p style="color:var(--text-dim);font-style:italic;">日志加载失败</p>';
        }
    }
}

loadEntries();

// ========== DIGITAL CREW COMMENT PARSER ==========
var CREW_CONFIG = {
    elon:       { name: 'Elon Musk',  role: '首席激进官',   emoji: '🚀', avatar: 'avatars/elon.png' },
    jobs:       { name: 'Steve Jobs',  role: '首席品味官',   emoji: '🍎', avatar: 'avatars/jobs.png' },
    wanweigang: { name: '万维钢',      role: '首席实证官',   emoji: '📐', avatar: 'avatars/wanweigang.png' },
    trump:      { name: 'Trump',       role: '首席自信官',   emoji: '🏆', avatar: 'avatars/trump.png' },
    tim:        { name: 'Tim',         role: '首席影像官',   emoji: '🎬', avatar: 'avatars/tim.png' },
    mrbeast:    { name: 'MrBeast',     role: '首席流量官',   emoji: '🎯', avatar: 'avatars/mrbeast.png' }
};

function parseCrewComments() {
    document.querySelectorAll('.entry-content').forEach(function(el) {
        // Find crew-data spans
        var crewSpans = el.querySelectorAll('span.crew-data');
        if (crewSpans.length === 0) return;

        var comments = [];
        crewSpans.forEach(function(span) {
            comments.push({ key: span.dataset.crew, text: span.innerHTML.trim() });
        });

        if (comments.length === 0) return;

        // Remove the H2 crew section header and all crew spans
        var h2s = el.querySelectorAll('h2');
        h2s.forEach(function(h2) {
            if (h2.textContent.indexOf('💬') >= 0 && h2.textContent.indexOf('数字员工') >= 0) {
                h2.remove();
            }
        });
        crewSpans.forEach(function(span) { span.remove(); });

        // Build beautiful comment cards
        var cardsHtml = '<div class="crew-comments">';
        cardsHtml += '<div class="crew-comments-title">数字员工圆桌</div>';

        comments.forEach(function(c) {
            var cfg = CREW_CONFIG[c.key] || { name: c.key, role: '', emoji: '💬', avatar: '' };
            var avatarContent = '<img src="' + cfg.avatar + '" loading="lazy" decoding="async" alt="' + cfg.name + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + cfg.emoji + '\'">';

            cardsHtml += '<div class="crew-comment" data-crew="' + c.key + '">';
            cardsHtml += '  <div class="crew-avatar">' + avatarContent + '</div>';
            cardsHtml += '  <div class="crew-body">';
            cardsHtml += '    <div class="crew-name">' + cfg.name + ' <span class="crew-role">' + cfg.role + '</span></div>';
            cardsHtml += '    <div class="crew-text">' + marked.parseInline(c.text) + '</div>';
            cardsHtml += '  </div>';
            cardsHtml += '</div>';
        });

        cardsHtml += '</div>';

        // Append at end of content
        el.insertAdjacentHTML('beforeend', cardsHtml);
    });
}

// Run after entries load (with delay for async fetch)
setTimeout(parseCrewComments, 1500);

// ========== SIDEBAR ACTIVE STATE ==========
const sidebarItems = document.querySelectorAll('.sidebar-item[data-nav]');
const sections = [];

sidebarItems.forEach(function(item) {
    var target = item.getAttribute('href');
    if (target) {
        var section = document.querySelector(target);
        if (section) sections.push({ el: section, nav: item });
    }
});

function updateActiveNav() {
    var scrollY = window.scrollY + 200;
    var currentSidebarPanel = document.querySelector('.sidebar-tab-panel.active');
    if (!currentSidebarPanel) return;

    var visibleItems = currentSidebarPanel.querySelectorAll('.sidebar-item[data-nav]');
    var current = null;

    visibleItems.forEach(function(item) {
        var target = item.getAttribute('href');
        var section = document.querySelector(target);
        if (section && section.offsetTop <= scrollY) {
            current = item;
        }
    });

    visibleItems.forEach(function(item) { item.classList.remove('active'); });
    if (current) current.classList.add('active');

    // Also update mobile nav
    var mobileItems = document.querySelectorAll('.mobile-nav-item');
    mobileItems.forEach(function(item) {
        var href = item.getAttribute('href');
        item.classList.toggle('active', current && current.getAttribute('href') === href);
    });
}

window.addEventListener('scroll', updateActiveNav);
updateActiveNav();

// ========== SMOOTH SCROLL FOR SIDEBAR CLICKS ==========
document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', this.getAttribute('href'));
        }
    });
});

// ========== HANDLE DIRECT HASH NAVIGATION ==========
if (window.location.hash) {
    setTimeout(function() {
        // Auto-switch tab if hash is a changelog entry
        if (window.location.hash.startsWith('#cl-')) {
            switchTab('changelog');
        }
        var target = document.querySelector(window.location.hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 500);
}
