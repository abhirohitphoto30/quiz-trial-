/*
 * Template loader
 * ---------------
 * Original single-file app kept 4 huge templates (classroom CSS/JS and two video players)
 * inside the HTML itself (<script type="text/plain"> / <textarea>) and read them with
 * document.getElementById("...").textContent / .value.
 *
 * They now live in /templates/*. To keep every original function working EXACTLY as written,
 * this file makes document.getElementById() return a tiny stand-in object for those 4 ids:
 *   - templates are pre-fetched quietly in the background (after the page is idle),
 *   - if one is needed before that finishes, it is fetched synchronously on the spot.
 */
(function () {
    'use strict';
    var BASE = 'templates/';
    var MAP = {
        'css-template':           'classroom.css.txt',
        'js-template':            'classroom.js.txt',
        'new-video-template':     'video-classroom-player.html',
        'unigram-video-template': 'video-unigram.html'
    };
    var cache = {};

    function fetchSync(file) {
        try {
            var x = new XMLHttpRequest();
            x.open('GET', BASE + file, false);
            x.send(null);
            if (x.status >= 200 && x.status < 300) return x.responseText;
        } catch (e) { /* fall through */ }
        return null;
    }

    function stub(text) {
        return { textContent: text, value: text, innerHTML: text, innerText: text };
    }

    var nativeGetById = document.getElementById.bind(document);
    document.getElementById = function (id) {
        var el = nativeGetById(id);
        if (el || !MAP.hasOwnProperty(id)) return el;
        if (cache[id] == null) cache[id] = fetchSync(MAP[id]);
        return cache[id] == null ? null : stub(cache[id]);
    };

    function prefetchAll() {
        if (!window.fetch) return;
        Object.keys(MAP).forEach(function (id) {
            if (cache[id] != null) return;
            fetch(BASE + MAP[id]).then(function (r) { return r.ok ? r.text() : null; })
                .then(function (t) { if (t != null && cache[id] == null) cache[id] = t; })
                .catch(function () {});
        });
    }

    // html2pdf bundle is not used by the app code itself; load it only after everything else is idle.
    function loadHtml2PdfLater() {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.async = true;
        document.head.appendChild(s);
    }

    window.addEventListener('load', function () {
        var run = window.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
        run(function () { prefetchAll(); setTimeout(loadHtml2PdfLater, 2500); });
    });
})();
