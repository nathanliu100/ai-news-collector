// ============================================================
// IDEAS LAB — JS
// Password gate + smooth reveal
// ============================================================

(function() {
    'use strict';

    var PIN = '9527';
    var STORAGE_KEY = 'ideas-lab-auth';
    var gate = document.getElementById('gate');
    var app = document.getElementById('app');
    var hint = document.getElementById('gateHint');
    var boxes = gate.querySelectorAll('.pin-box');

    // Check if already authed this session
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        gate.style.display = 'none';
        app.style.display = 'block';
        return;
    }

    // Focus first box
    setTimeout(function() { boxes[0].focus(); }, 200);

    // Input logic
    boxes.forEach(function(input, idx) {
        input.addEventListener('input', function() {
            var val = this.value;
            if (val.length > 1) this.value = val.slice(-1);
            this.classList.remove('error');

            if (this.value && idx < 3) {
                boxes[idx + 1].focus();
            }

            // Check if all 4 filled
            var code = '';
            boxes.forEach(function(d) { code += d.value; });
            if (code.length === 4) {
                if (code === PIN) {
                    boxes.forEach(function(d) { d.classList.add('success'); });
                    hint.textContent = '✅ Welcome';
                    hint.style.color = '#4A7C59';
                    sessionStorage.setItem(STORAGE_KEY, 'true');
                    setTimeout(function() {
                        gate.classList.add('unlocked');
                        setTimeout(function() {
                            gate.style.display = 'none';
                            app.style.display = 'block';
                            app.style.animation = 'fadeUp 0.5s ease';
                        }, 500);
                    }, 400);
                } else {
                    hint.textContent = '❌ Wrong PIN';
                    hint.style.color = '#C8402A';
                    boxes.forEach(function(d) { d.classList.add('error'); });
                    setTimeout(function() {
                        boxes.forEach(function(d) { d.value = ''; d.classList.remove('error'); });
                        hint.textContent = 'Enter PIN';
                        hint.style.color = '';
                        boxes[0].focus();
                    }, 800);
                }
            }
        });

        // Backspace jump back
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                boxes[idx - 1].focus();
                boxes[idx - 1].value = '';
            }
        });

        // Paste support
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{4}$/.test(pasted)) {
                boxes.forEach(function(d, i) { d.value = pasted[i]; });
                boxes[3].focus();
                boxes[3].dispatchEvent(new Event('input'));
            }
        });
    });

    // ESC to close (go back)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && gate.style.display !== 'none') {
            window.location.href = '../';
        }
    });

    // ============ SCROLL ANIMATIONS (after unlock) ============
    // Simple IntersectionObserver for fade-in-on-scroll
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    // Observe sections after app is visible
    var checkInterval = setInterval(function() {
        if (app.style.display === 'block') {
            clearInterval(checkInterval);
            document.querySelectorAll('.section').forEach(function(sec) {
                sec.classList.add('scroll-animate');
                observer.observe(sec);
            });
        }
    }, 200);
})();
