/*
 * DJ Spark Productions: wedding planning form enhancer for DJ Event Planner (DJEP).
 * Loaded from a Comment item in the planning form. Every answer is still stored in
 * DJEP's own form fields; this script only changes how the form is shown.
 * If anything here fails, the page falls back to DJEP's plain form.
 */
(function () {
  'use strict';

  var VERSION = '0.2.2';
  if (window.__djspPortal) return; // load once
  window.__djspPortal = VERSION;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  ready(function () {
    // Two DJEP layouts: the newer div layout (form preview) and the older table
    // layout used inside the logged-in client portal.
    var main = document.getElementById('form_maincontainer');
    var portal = false;
    if (!main) {
      var t = $('form table[id^="planning_form_table_"]');
      if (!t) return;
      main = t.closest('form');
      portal = true;
    }
    try {
      if (portal) normalizePortal(main);
      init(main);
    } catch (err) {
      // Fall back to DJEP's plain form.
      document.documentElement.classList.remove('djsp');
      if (window.console) console.warn('[djsp] disabled:', err);
    }
  });

  // Reshape the portal's table layout into the same classes the div layout uses,
  // so one set of styles and logic covers both. Inputs never leave the form.
  function normalizePortal(form) {
    $$('table[id^="planning_form_table_"]', form).forEach(function (table) {
      var wrap = el('div', 'djsp-ptable-wrap');
      wrap.id = 'djsp_' + table.id;
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
      wrap.setAttribute('data-djsp-section', '1');
      table.classList.add('djsp-ptable');
      var head = $('td.djep-form-sections', table);
      if (head) head.classList.add('new_tableheader');
      $$('tr[id^="question_row_id_"]', table).forEach(function (tr) {
        tr.classList.add('form-group');
        var cells = Array.prototype.filter.call(tr.children, function (c) { return c.tagName === 'TD'; });
        if (!tr.querySelector('input,select,textarea')) { tr.classList.add('djsp-comment'); return; }
        if (cells.length >= 2 && !cells[0].querySelector('input,select,textarea')) {
          cells[0].classList.add('questiontitle');
          return;
        }
        // Single cell: the title is the text before the first <br>.
        var td = cells[0];
        var p = el('p', 'questiontitle');
        while (td.firstChild && td.firstChild.nodeName !== 'BR' && td.firstChild.nodeName !== 'TABLE' &&
               !(td.firstChild.nodeType === 1 && td.firstChild.matches('input,select,textarea'))) {
          p.appendChild(td.firstChild);
        }
        if (td.firstChild && td.firstChild.nodeName === 'BR') td.removeChild(td.firstChild);
        while (td.firstChild && td.firstChild.nodeType === 3 && !td.firstChild.textContent.replace(/ /g, ' ').trim()) {
          td.removeChild(td.firstChild);
        }
        if (p.textContent.trim()) td.insertBefore(p, td.firstChild);
        // Radio/checkbox answers: wrap each control with its label text so they become tappable pills.
        $$('input[type="radio"],input[type="checkbox"]', td).forEach(function (inp) {
          if (inp.closest('label')) return;
          var label = el('label', 'djsp-choice');
          inp.parentNode.insertBefore(label, inp);
          label.appendChild(inp);
          var txt = label.nextSibling;
          if (txt && txt.nodeType === 3) {
            label.appendChild(document.createTextNode(' ' + txt.textContent.replace(/ /g, ' ').trim()));
            txt.parentNode.removeChild(txt);
          }
        });
      });
    });
  }

  function init(main) {
    // Phones: DJEP's form page has no viewport tag, so it renders zoomed out.
    if (!$('meta[name="viewport"]')) {
      var m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(m);
    }

    var form = main.closest('form') || document.forms[0];
    var eventInput = form && form.querySelector('input[name="eventid"]');
    var eventId = (eventInput && eventInput.value) || 'preview';
    var posKey = 'djsp-section-' + eventId;

    // ---- Sections -------------------------------------------------------
    var boxes = $$('[data-djsp-section]', main);
    if (!boxes.length) boxes = $$('div[id^="planning_form_table_"]', main);
    var sections = boxes.map(function (box, i) {
      var head = $('.new_tableheader', box);
      return {
        box: box,
        head: head,
        title: head ? head.textContent.trim() : 'Section ' + (i + 1),
        groups: $$('.form-group', box)
      };
    }).filter(function (s) {
      // Skip sections with nothing for the client (e.g. DJ-only notes).
      if (/^DJ (team|only)/i.test(s.title)) { s.box.classList.add('djsp-empty-section'); return false; }
      var hasInput = s.groups.some(function (g) { return g.querySelector('input,select,textarea'); });
      var bodyText = s.box.textContent.replace(s.title, '').trim();
      if (!hasInput && !bodyText) { s.box.classList.add('djsp-empty-section'); return false; }
      return true;
    });
    if (sections.length < 2) return;

    document.documentElement.classList.add('djsp');

    var formHeader = $('.formname_header', main);
    var titleBar = $('.djep-titlebar', main);
    var formTitle = formHeader ? formHeader.textContent.trim()
      : (titleBar && titleBar.lastChild && titleBar.lastChild.nodeType === 3 && titleBar.lastChild.textContent.trim()) || 'Your Wedding Plan';
    if (formHeader && formHeader.parentElement !== main) formHeader.parentElement.classList.add('djsp-empty-section');

    // ---- Top bar ----------------------------------------------------------
    var bar = el('div', 'djsp-bar');
    var barInner = el('div', 'djsp-bar-inner');
    var barTitle = el('div', 'djsp-bar-title', formTitle);
    var menuBtn = el('button', 'djsp-menu-btn', 'Sections');
    menuBtn.type = 'button';
    var saveState = el('span', 'djsp-save', '');
    var progWrap = el('div', 'djsp-prog');
    var progFill = el('i');
    progWrap.appendChild(progFill);
    var progText = el('div', 'djsp-prog-text', '');
    barInner.appendChild(barTitle);
    barInner.appendChild(saveState);
    barInner.appendChild(menuBtn);
    bar.appendChild(barInner);
    bar.appendChild(progWrap);
    bar.appendChild(progText);
    sections[0].box.parentNode.insertBefore(bar, sections[0].box);

    // ---- Section menu -----------------------------------------------------
    var menu = el('div', 'djsp-menu');
    var menuList = el('ol', 'djsp-menu-list');
    menu.appendChild(menuList);
    document.body.appendChild(menu);
    menuBtn.addEventListener('click', function () { menu.classList.toggle('open'); });
    menu.addEventListener('click', function (e) { if (e.target === menu) menu.classList.remove('open'); });

    sections.forEach(function (s, i) {
      var li = el('li', 'djsp-menu-item');
      var name = el('span', 'djsp-menu-name', s.title);
      var count = el('span', 'djsp-menu-count', '');
      li.appendChild(name);
      li.appendChild(count);
      li.addEventListener('click', function () { show(i); menu.classList.remove('open'); });
      menuList.appendChild(li);
      s.menuItem = li;
      s.menuCount = count;

      // Banner-style header and Prev/Next buttons per section.
      s.box.classList.add('djsp-section');
      if (s.head) {
        s.head.classList.add('djsp-banner');
        var step = el('div', 'djsp-step', 'Step ' + (i + 1) + ' of ' + sections.length);
        s.head.insertBefore(step, s.head.firstChild);
      }
      var nav = el('div', 'djsp-nav');
      if (i > 0) {
        var prev = el('button', 'djsp-btn djsp-btn-ghost', '← ' + sections[i - 1].title);
        prev.type = 'button';
        prev.addEventListener('click', function () { show(i - 1); });
        nav.appendChild(prev);
      } else {
        nav.appendChild(el('span'));
      }
      if (i < sections.length - 1) {
        var next = el('button', 'djsp-btn', (i === 0 ? 'Start planning' : 'Next: ' + sections[i + 1].title) + ' →');
        next.type = 'button';
        next.addEventListener('click', function () { show(i + 1); });
        nav.appendChild(next);
      } else {
        var done = el('div', 'djsp-done', 'You made it to the end! Save your answers, and Spark will follow up before your music planning session.');
        nav.appendChild(done);
      }
      s.box.appendChild(nav);
    });

    // ---- Grids: label every cell so they stack into cards on phones ------
    $$('.form-group table', main).forEach(function (table) {
      var rows = Array.prototype.slice.call(table.rows);
      if (!rows.length) return;
      table.classList.add('djsp-grid');
      var headers = Array.prototype.map.call(rows[0].cells, function (c) { return c.textContent.trim(); });
      // A column is "used" if any cell in it has an input or text (header row excluded).
      var used = headers.map(function (h, c) {
        return rows.slice(1).some(function (row) {
          var cell = row.cells[c];
          return cell && (cell.querySelector('input,textarea,select') || cell.textContent.trim());
        });
      });
      rows.forEach(function (row, r) {
        var rowTitle = '';
        Array.prototype.forEach.call(row.cells, function (cell, c) {
          var hasInput = cell.querySelector('input,textarea,select');
          var text = cell.textContent.trim();
          if (!used[c]) { cell.classList.add('djsp-cell-empty'); return; }
          if (r === 0) { cell.parentNode.classList.add('djsp-grid-head'); return; }
          if (!hasInput && !text) return;
          if (!hasInput) { rowTitle = text; cell.classList.add('djsp-cell-rowtitle'); return; }
          cell.setAttribute('data-label', headers[c] || '');
          var input = cell.querySelector('input,textarea');
          if (input && !input.placeholder) input.placeholder = headers[c] || rowTitle;
        });
        if (r > 0) row.setAttribute('data-row', rowTitle);
      });
    });

    // ---- Progress -----------------------------------------------------------
    function logicHidden(g, stop) {
      for (var n = g; n && n !== stop; n = n.parentElement) {
        if (n.style && n.style.display === 'none') return true;
      }
      return false;
    }
    function answered(g) {
      var fields = $$('input,select,textarea', g);
      return fields.some(function (f) {
        if (f.type === 'hidden' || f.type === 'button' || f.type === 'submit') return false;
        if (f.type === 'radio' || f.type === 'checkbox') return f.checked;
        if (f.tagName === 'SELECT') {
          var o = f.options[f.selectedIndex];
          return o && o.value && !/^\[?select\]?$/i.test(o.text.trim());
        }
        return f.value.trim().length > 0;
      });
    }
    function tally() {
      var total = 0, done = 0;
      sections.forEach(function (s) {
        var t = 0, d = 0;
        s.groups.forEach(function (g) {
          if (!g.querySelector('input,select,textarea')) return;
          if (logicHidden(g, s.box)) return;
          t++;
          if (answered(g)) d++;
        });
        s.total = t; s.done = d;
        total += t; done += d;
        s.menuCount.textContent = t ? d + '/' + t : '';
        s.menuItem.classList.toggle('complete', t > 0 && d === t);
      });
      var pct = total ? Math.round(done / total * 100) : 0;
      progFill.style.width = pct + '%';
      progText.textContent = pct + '% complete · ' + done + ' of ' + total + ' questions answered';
    }

    // ---- Show one section at a time ----------------------------------------
    var current = 0;
    function show(i, noScroll) {
      current = Math.max(0, Math.min(sections.length - 1, i));
      sections.forEach(function (s, j) {
        s.box.classList.toggle('djsp-off', j !== current);
        s.menuItem.classList.toggle('current', j === current);
      });
      store(posKey, String(current));
      tally();
      if (noScroll) return;
      saveNow();
      var top = bar.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, Math.max(0, top - 4));
    }

    // ---- Song links ---------------------------------------------------------
    var SONGY = /song|music|playlist|prelude|processional|recessional|dance|must-play|do-not-play|play/i;
    function classify(url) {
      var u = url.toLowerCase();
      if (/open\.spotify\.com\/(intl-[a-z]+\/)?track\//.test(u)) return { kind: 'song', src: 'Spotify' };
      if (/open\.spotify\.com\/(intl-[a-z]+\/)?(playlist|album)\//.test(u)) return { kind: 'list', src: 'Spotify' };
      if (/spotify\.link|spoti\.fi/.test(u)) return { kind: 'short', src: 'Spotify' };
      if (/music\.apple\.com\/.*[?&]i=/.test(u)) return { kind: 'song', src: 'Apple Music' };
      if (/music\.apple\.com\/.*\/(playlist|album)\//.test(u)) return { kind: 'list', src: 'Apple Music' };
      if (/music\.apple\.com\/.*\/song\//.test(u)) return { kind: 'song', src: 'Apple Music' };
      if (/[?&]list=/.test(u) && /youtu/.test(u)) return { kind: 'list', src: 'YouTube' };
      if (/youtube\.com\/watch|youtu\.be\/|music\.youtube\.com\/watch/.test(u)) return { kind: 'song', src: 'YouTube' };
      if (/soundcloud\.com\//.test(u)) return { kind: 'song', src: 'SoundCloud' };
      return { kind: 'other', src: 'Link' };
    }
    var titleCache = {};
    function lookupTitle(url, cb) {
      if (titleCache[url]) return cb(titleCache[url]);
      var endpoint = /spotify/.test(url)
        ? 'https://open.spotify.com/oembed?url=' + encodeURIComponent(url)
        : 'https://noembed.com/embed?url=' + encodeURIComponent(url);
      if (!window.fetch) return;
      fetch(endpoint).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (j && j.title) { titleCache[url] = j.title; cb(j.title); }
      }).catch(function () {});
    }
    function checkLinks(field, box, single) {
      box.innerHTML = '';
      var urls = field.value.match(/https?:\/\/[^\s,]+/g) || [];
      urls.slice(0, 25).forEach(function (url) {
        var info = classify(url);
        var chip = el('span', 'djsp-chip djsp-chip-' + info.kind);
        var label = info.src + (info.kind === 'list' ? ' playlist' : info.kind === 'song' ? ' song' : info.kind === 'short' ? ' link' : '');
        chip.textContent = label;
        box.appendChild(chip);
        if (single && info.kind === 'list') {
          box.appendChild(el('span', 'djsp-warn', 'This looks like a playlist. Please paste a single song here.'));
        }
        if (info.kind === 'song' || info.kind === 'list') {
          lookupTitle(url, function (t) { chip.textContent = label + ': ' + t; });
        }
      });
    }
    sections.forEach(function (s) {
      s.groups.forEach(function (g) {
        var q = $('.questiontitle', g);
        if (!q || !SONGY.test(q.textContent)) return;
        $$('input[type="text"],textarea', g).forEach(function (f) {
          if (f.closest('table.djsp-grid')) return; // grid cells stay plain text
          var single = f.tagName === 'INPUT';
          var box = el('div', 'djsp-links');
          f.parentNode.appendChild(box);
          var run = function () { checkLinks(f, box, single); };
          f.addEventListener('blur', run);
          f.addEventListener('change', run);
          if (f.value) run();
        });
      });
    });

    // ---- Save status --------------------------------------------------------
    var dirty = false;
    function setSave(text, cls) {
      saveState.textContent = text;
      saveState.className = 'djsp-save ' + (cls || '');
    }
    function markDirty() {
      if (!dirty) { dirty = true; setSave('Unsaved changes', 'dirty'); }
      tally();
    }
    main.addEventListener('input', markDirty);
    main.addEventListener('change', markDirty);
    function stamp() {
      var d = new Date();
      var h = d.getHours(), m = d.getMinutes();
      return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' am' : ' pm');
    }
    function onSaved() {
      dirty = false;
      setSave('Saved ' + stamp(), 'saved');
      // Answers are on the server now, so skip DJEP's "leave page?" warning.
      try { window.needToConfirm = false; } catch (e) {}
    }
    // Watch DJEP's own saves (auto-save and the Save button use background requests).
    (function watchXHR() {
      var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__djspPost = /post/i.test(method) && /plan|form|save/i.test(String(url));
        return XO.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this.__djspPost) {
          var x = this;
          setSave('Saving…', 'saving');
          x.addEventListener('load', function () { if (x.status >= 200 && x.status < 300) onSaved(); else setSave('Not saved. Try Save again.', 'dirty'); });
        }
        return XS.apply(this, arguments);
      };
    })();
    if (form) form.addEventListener('submit', function () { setSave('Saving…', 'saving'); });

    // Save whenever the couple moves between sections, using DJEP's own auto-save.
    var autoArgs = (function () {
      var src = $$('script').map(function (s) { return s.src ? '' : s.textContent; }).join('\n');
      var m = src.match(/autosave\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
      return m ? [m[1], m[2]] : null;
    })();
    function saveNow() {
      if (!dirty || typeof window.autosave !== 'function' || !autoArgs) return;
      try {
        window.formisdirty = true;
        window.autosave(autoArgs[0], autoArgs[1]);
      } catch (e) { /* DJEP's timer will still save */ }
    }
    window.addEventListener('beforeunload', function () { store(posKey, String(current)); });

    // ---- Start ---------------------------------------------------------------
    var saved = parseInt(store(posKey), 10);
    show(isNaN(saved) ? 0 : saved, true);
    // DJEP applies its own show/hide logic after load; recount once it settles.
    setTimeout(tally, 600);
    setInterval(tally, 4000);
  }
})();
