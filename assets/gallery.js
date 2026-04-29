// ========== GALLERY · DATA-DRIVEN RENDERER ==========
// 从 gallery-data.json 读取作品数据，动态渲染到 .gallery-grid
// 支持按工具过滤

var galleryState = {
    works: [],
    activeFilter: 'all'
};

function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildCrewItem(c) {
    var emoji = c.emoji || '💬';
    var name = escHtml(c.name || c.key || 'Unknown');
    return '' +
        '<div class="crew-comment">' +
            '<div class="crew-avatar-wrap">' +
                '<img class="crew-avatar" loading="lazy" decoding="async" src="' + escHtml(c.avatar) + '" alt="' + name + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                '<div class="crew-avatar-fallback" style="display:none">' + emoji + '</div>' +
            '</div>' +
            '<div class="crew-content">' +
                '<span class="crew-name">' + name + '</span>' +
                '<p>' + (c.html || '') + '</p>' +
            '</div>' +
        '</div>';
}

function buildCard(w) {
    var featured = w.featured ? 'featured-card' : 'featured-card';
    var banner = w.featuredBanner ? '<span class="featured-banner">' + escHtml(w.featuredBanner) + '</span>' : '';
    var badgeClass = w.videoBadgeClass ? (' ' + w.videoBadgeClass) : '';
    var videoBadge = w.videoBadge ? '<div class="video-badge' + badgeClass + '">' + escHtml(w.videoBadge) + '</div>' : '';

    var insightsHtml = (w.insights || []).map(function(it) {
        return '<div class="insight-item">' + it + '</div>';
    }).join('');

    var statsHtml = (w.stats || []).map(function(s) {
        return '<span class="card-stat">' + escHtml(s) + '</span>';
    }).join('');

    var crewHtml = (w.crew || []).map(buildCrewItem).join('');
    var crewCount = (w.crew || []).length;

    return '' +
        '<article class="' + featured + '" data-tool="' + escHtml((w.tool || '').toLowerCase()) + '" data-id="' + escHtml(w.id) + '">' +
            '<div class="video-embed">' +
                '<video controls preload="metadata" playsinline poster="" style="width:100%; height:100%; object-fit:cover; background:#000;">' +
                    '<source src="' + escHtml(w.videoSrc) + '" type="video/mp4">' +
                    '您的浏览器不支持视频播放，<a href="' + escHtml(w.videoSrc) + '">点此下载</a>。' +
                '</video>' +
                videoBadge +
            '</div>' +
            '<div class="card-body">' +
                banner +
                '<div class="card-meta-top">' +
                    '<span class="tool-badge">' + escHtml(w.toolBadge) + '</span>' +
                    '<span class="category-tag">' + escHtml(w.categoryTag) + '</span>' +
                '</div>' +
                '<h2 class="card-title">' +
                    '<a href="' + escHtml(w.titleLink) + '" target="_blank" rel="noopener">' + escHtml(w.title) + '</a>' +
                '</h2>' +
                '<div class="card-creator">' +
                    'by <a href="' + escHtml(w.creatorLink) + '" target="_blank">' + escHtml(w.creatorName) + '</a>' +
                    ' · ' + escHtml(w.date) +
                    (w.creatorExtra ? ' · ' + escHtml(w.creatorExtra) : '') +
                '</div>' +
                '<div class="card-note">' +
                    '<span class="card-note-label">' + escHtml(w.noteLabel || "Editor's Note") + '</span>' +
                    (w.noteHtml || '') +
                '</div>' +
                '<div class="card-insights">' + insightsHtml + '</div>' +
                '<div class="card-footer">' +
                    '<div class="card-stats">' + statsHtml + '</div>' +
                    '<div class="card-actions">' +
                        '<a href="' + escHtml(w.ctaLink) + '" target="_blank" class="card-action-btn primary">' + escHtml(w.ctaText || '查看 ↗') + '</a>' +
                    '</div>' +
                '</div>' +
                (crewHtml ? (
                    '<div class="crew-section">' +
                        '<div class="crew-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
                            '<span class="crew-header-label">💬 数字员工评论区</span>' +
                            '<span class="crew-header-count">' + crewCount + ' 位员工已点评</span>' +
                            '<span class="crew-toggle">▸</span>' +
                        '</div>' +
                        '<div class="crew-comments">' + crewHtml + '</div>' +
                    '</div>'
                ) : '') +
            '</div>' +
        '</article>';
}

function renderGallery() {
    var grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    var works = galleryState.works;
    var filter = galleryState.activeFilter;
    var filtered = filter === 'all'
        ? works
        : works.filter(function(w) {
            return (w.tool || '').toLowerCase() === filter.toLowerCase();
        });

    grid.innerHTML = filtered.map(buildCard).join('');

    // 更新筛选数量
    var countEl = document.querySelector('.filter-count');
    if (countEl) {
        countEl.textContent = '共 ' + filtered.length + ' 件作品';
    }
}

function bindFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(function(c) {
                c.classList.remove('active');
            });
            chip.classList.add('active');
            var label = chip.textContent.trim();
            galleryState.activeFilter = (label === '全部' || /^all$/i.test(label)) ? 'all' : label;
            renderGallery();
        });
    });
}

async function initGallery() {
    try {
        var res = await fetch('gallery-data.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('gallery-data.json not found');
        var data = await res.json();
        galleryState.works = data.works || [];
    } catch (e) {
        console.error('Failed to load gallery data:', e);
        var grid = document.querySelector('.gallery-grid');
        if (grid) {
            grid.innerHTML = '<p style="text-align:center;padding:60px 20px;color:#888;">作品数据加载失败，请稍后刷新。</p>';
        }
        return;
    }
    renderGallery();
    bindFilterChips();
}

// Scroll shadow（与主站一致）
window.addEventListener('scroll', function() {
    var nav = document.getElementById('navBar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
});

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}
