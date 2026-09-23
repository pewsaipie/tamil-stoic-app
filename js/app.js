/* Tamil Stoic — Thirukkural page behaviour
 *
 * Sections:
 *   • Today's Kural (deterministic pick from today's date; "Another" for a new one)
 *   • Three books (அறம் / பொருள் / காமம்) — filter by section
 *   • Situation doors — life-situation shortcuts that map to themes
 *   • Browse — search + chapter + theme chips (chapter & theme mutually exclusive)
 *   • Chapter map — 133-chapter grid grouped by book
 *
 * Reader is intentionally quiet: large Tamil, muted chrome, generous line-height,
 * focus pulls to the couplet itself.
 */
(function () {
  "use strict";

  var KURALS = window.KURALS || [];
  var CHAPTERS = window.CHAPTERS || [];
  var SECTIONS = window.SECTIONS || [];
  var THEMES = window.THEMES || [];

  // ---------- Situation doors (English + Tamil, mapped to a theme or chapter) ----------
  var SITUATIONS = [
    { id: "anger",     ta: "கோபம் வந்தபோது",     en: "When I'm angry",        theme: "anger" },
    { id: "patience",  ta: "பொறுமை தேவை",        en: "When I need patience",  theme: "patience" },
    { id: "grief",     ta: "துன்பத்தில்",         en: "When I'm grieving",     theme: "impermanence" },
    { id: "fear",      ta: "பயம் வருகிறது",       en: "When I'm afraid",       theme: "calm" },
    { id: "starting",  ta: "புதிதாக தொடங்கும்போது", en: "When I'm starting something", theme: "effort" },
    { id: "friends",   ta: "நட்பை நினைக்கும்போது",  en: "Thinking of friends",   theme: "friendship" },
    { id: "family",    ta: "குடும்பத்தில்",       en: "With family",           theme: "family" },
    { id: "wealth",    ta: "பொருள் தேடும்போது",    en: "About money & work",    theme: "wealth" },
    { id: "words",     ta: "பேசும் முன்",          en: "Before I speak",        theme: "truth" },
    { id: "love",      ta: "காதலில்",              en: "In love",               theme: "love" },
    { id: "learning",  ta: "கற்கும்போது",          en: "When I'm learning",     theme: "learning" },
    { id: "wisdom",    ta: "ஞானம் தேடி",           en: "Looking for wisdom",    theme: "wisdom" },
  ];

  var PAGE_SIZE = 12; // quieter — fewer cards on screen at once

  // ---------- DOM ----------
  var listEl = document.getElementById("kural-list");
  var chipsEl = document.getElementById("chips");
  var searchEl = document.getElementById("search");
  var chapterEl = document.getElementById("chapter");
  var clearBtn = document.getElementById("clear-filters");
  var countEl = document.getElementById("result-count");
  var rangeEl = document.getElementById("result-range");
  var sentinelEl = document.getElementById("sentinel");
  var dailyCardEl = document.getElementById("daily-card");
  var dailyDateEl = document.getElementById("daily-date");
  var dailyShuffleEl = document.getElementById("daily-shuffle");
  var booksGridEl = document.getElementById("books-grid");
  var situationsGridEl = document.getElementById("situations-grid");
  var chapterMapBodyEl = document.getElementById("chapter-map-body");

  var debounce;

  // Defensive: auto-create sentinel if HTML is outdated
  if (!sentinelEl && listEl && listEl.parentNode) {
    sentinelEl = document.createElement("div");
    sentinelEl.id = "sentinel";
    sentinelEl.className = "sentinel";
    sentinelEl.innerHTML = '<div class="spinner"></div><span>Loading more…</span>';
    listEl.parentNode.appendChild(sentinelEl);
  }

  // state includes book (section id or 'all') and situation id (or null)
  var state = {
    theme: "all",
    chapter: "all",
    book: "all",
    situation: null,
    query: "",
    shown: PAGE_SIZE,
    dailyIndex: todayIndex(),
  };

  // ---------- lookups ----------
  var chById = {};
  CHAPTERS.forEach(function (c) { chById[c.n] = c; });

  var secById = {};
  SECTIONS.forEach(function (s) { secById[s.id] = s; });

  var themeById = {};
  THEMES.forEach(function (t) { themeById[t.id] = t; });

  function themeLabel(id) {
    return themeById[id] ? themeById[id].en : id;
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad(n) {
    return n < 100 ? (n < 10 ? "00" + n : "0" + n) : String(n);
  }

  function todayIndex() {
    var d = new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    var dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % Math.max(1, KURALS.length);
  }

  function formatDate(d) {
    try {
      return d.toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch (e) {
      return d.toDateString();
    }
  }

  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    try {
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (e) {
      return safe;
    }
  }

  function countForTheme(id) {
    if (id === "all") return KURALS.length;
    var c = 0;
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].th === id) c++;
    return c;
  }

  function countForSection(id) {
    if (id === "all") return KURALS.length;
    var c = 0;
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].sec === id) c++;
    return c;
  }

  function findKural(n) {
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].n === n) return KURALS[i];
    return null;
  }

  function safeScrollTo(el, opts) {
    if (el && typeof el.scrollIntoView === "function") {
      try { el.scrollIntoView(opts || { block: "start" }); } catch (e) { /* ignore */ }
    }
  }

  // ---------- matching ----------
  function matches(k) {
    // Book filter
    if (state.book !== "all" && k.sec !== state.book) return false;

    // Chapter is the most specific filter. If set, it wins over theme/situation.
    if (state.chapter !== "all") {
      if (String(k.ch) !== String(state.chapter)) return false;
    } else if (state.theme !== "all" && k.th !== state.theme) {
      return false;
    }

    var q = state.query.trim().toLowerCase();
    if (!q) return true;

    if (/^\d+$/.test(q)) return String(k.n) === String(parseInt(q, 10));

    var ch = chById[k.ch];
    var sec = secById[k.sec];
    var th = themeById[k.th];
    var haystack = [
      k.ta[0], k.ta[1],
      k.tr[0], k.tr[1],
      k.en[0], k.en[1],
      k.s,
      ch ? ch.ta : "", ch ? ch.en : "",
      sec ? sec.ta : "", sec ? sec.en : "",
      th ? th.ta + " " + th.en : ""
    ].join(" \n ").toLowerCase();

    var words = q.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if (haystack.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  // ---------- rendering ----------
  function cardHtml(k) {
    var q = state.query.trim();
    var showQ = q && !/^\d+$/.test(q) ? q : "";
    var ch = chById[k.ch];
    var sec = secById[k.sec];

    var enLines =
      '<span class="line">' + escapeHtml(k.en[0]) + "</span>" +
      (k.en[1] ? '<span class="line">' + escapeHtml(k.en[1]) + "</span>" : "");

    return (
      '<article class="kural-card" id="kural-' + k.n + '">' +
        '<div class="kural-meta">' +
          '<a class="kural-num" href="#kural-' + k.n + '" title="Link to this kural">#' + pad(k.n) + "</a>" +
          '<span class="kural-chapter">' + escapeHtml(ch ? ch.ta : "") +
            '<span class="ch-en">· ' + escapeHtml(ch ? ch.en : "") + "</span></span>" +
          '<span class="kural-theme">' + escapeHtml(themeLabel(k.th)) + "</span>" +
        "</div>" +

        '<p class="kural-ta">' +
          '<span class="line">' + highlight(k.ta[0], showQ) + "</span>" +
          '<span class="line">' + highlight(k.ta[1], showQ) + "</span>" +
        "</p>" +
        '<p class="kural-translit">' +
          escapeHtml(k.tr[0]) + " —<br/>" + escapeHtml(k.tr[1]) +
        "</p>" +

        '<hr class="kural-divider" />' +

        '<div class="block-label">English translation</div>' +
        '<blockquote class="kural-en">' + enLines +
          '<span class="source">— G. U. Pope (1886)</span>' +
        "</blockquote>" +

        '<div class="block-label" style="margin-top:16px;">Simple meaning</div>' +
        '<div class="kural-simple">' + highlight(k.s, showQ) + "</div>" +

        '<div class="kural-foot">' +
          '<span class="section-tag">' +
            escapeHtml(sec ? sec.ta : "") + " · " + escapeHtml(sec ? sec.en : "") +
          "</span>" +
          "<span>திருக்குறள் " + pad(k.n) + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function dailyCardHtml(k) {
    var ch = chById[k.ch];
    var sec = secById[k.sec];
    return (
      '<div class="daily-meta">' +
        '<span class="daily-num">#' + pad(k.n) + "</span>" +
        '<span class="kural-chapter">' + escapeHtml(ch ? ch.ta : "") +
          '<span class="ch-en">· ' + escapeHtml(ch ? ch.en : "") + "</span></span>" +
        '<span class="section-tag">' +
          escapeHtml(sec ? sec.ta : "") + " · " + escapeHtml(sec ? sec.en : "") +
        "</span>" +
      "</div>" +
      '<p class="kural-ta daily-ta">' +
        '<span class="line">' + escapeHtml(k.ta[0]) + "</span>" +
        '<span class="line">' + escapeHtml(k.ta[1]) + "</span>" +
      "</p>" +
      '<p class="kural-translit">' + escapeHtml(k.tr[0]) + " —<br/>" + escapeHtml(k.tr[1]) + "</p>" +
      '<hr class="kural-divider" />' +
      '<div class="block-label">Simple meaning</div>' +
      '<div class="kural-simple">' + escapeHtml(k.s) + "</div>"
    );
  }

  function syncFilterChrome() {
    var chapterActive = state.chapter !== "all";
    var bookActive = state.book !== "all";
    var situationActive = !!state.situation;
    var queryActive = !!state.query.trim();
    var themeActive = state.theme !== "all";
    var anyFilter = chapterActive || bookActive || situationActive || queryActive || themeActive;

    if (chapterEl) {
      chapterEl.classList.toggle("has-value", chapterActive);
      if (chapterEl.value !== String(state.chapter)) chapterEl.value = String(state.chapter);
    }
    if (searchEl) searchEl.classList.toggle("has-value", queryActive);
    if (clearBtn) clearBtn.hidden = !anyFilter;

    // book cards + situation doors active state
    if (booksGridEl) {
      Array.prototype.forEach.call(booksGridEl.querySelectorAll(".book-card"), function (el) {
        var id = el.getAttribute("data-book");
        var match = state.book === "all" ? id === "all" : String(state.book) === id;
        el.classList.toggle("active", match);
      });
    }
    if (situationsGridEl) {
      Array.prototype.forEach.call(situationsGridEl.querySelectorAll(".situation"), function (el) {
        el.classList.toggle("active", el.getAttribute("data-situation") === state.situation);
      });
    }
  }

  function render() {
    syncFilterChrome();
    if (!listEl) return;
    var results = KURALS.filter(matches);
    var visible = results.slice(0, state.shown);

    if (countEl) {
      var totalLabel = KURALS.length;
      countEl.textContent =
        "Showing " + visible.length + " of " + results.length + " kurals" +
        (results.length !== totalLabel ? " (filtered from " + totalLabel + ")" : "");
    }
    if (rangeEl) {
      rangeEl.textContent =
        results.length > 0
          ? "#" + pad(results[0].n) + " – #" + pad(results[results.length - 1].n)
          : "";
    }

    if (results.length === 0) {
      listEl.innerHTML =
        '<div class="empty">' +
          '<p class="kural-ta">தேடலில் எதுவும் கிடைக்கவில்லை</p>' +
          "<p>Nothing found. Try a kural number (e.g. <b>151</b>) or another word, or press Clear.</p>" +
        "</div>";
      if (sentinelEl) sentinelEl.style.display = "none";
      return;
    }

    listEl.innerHTML = visible.map(cardHtml).join("");
    if (sentinelEl) sentinelEl.style.display = results.length > visible.length ? "" : "none";
  }

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = THEMES.map(function (t) {
      var active = state.theme === t.id ? " active" : "";
      return (
        '<button class="chip' + active + '" data-theme="' + t.id + '" role="tab" aria-selected="' +
        (state.theme === t.id) + '">' +
          '<span class="chip-ta">' + escapeHtml(t.ta) + "</span>" + escapeHtml(t.en) +
          '<span class="count">' + countForTheme(t.id) + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderChapterOptions() {
    if (!chapterEl) return;
    var html = '<option value="all">அனைத்து அதிகாரங்கள் · All 133 chapters</option>';
    SECTIONS.forEach(function (s) {
      html += '<optgroup label="' + escapeHtml(s.ta + " · " + s.en) + '">';
      CHAPTERS.filter(function (c) { return c.sec === s.id; }).forEach(function (c) {
        html +=
          '<option value="' + c.n + '">' + c.n + ". " + escapeHtml(c.ta) +
          " — " + escapeHtml(c.en) + "</option>";
      });
      html += "</optgroup>";
    });
    chapterEl.innerHTML = html;
    chapterEl.value = state.chapter;
  }

  function renderBooks() {
    if (!booksGridEl) return;
    // An "All" card + one per section
    var cards = [
      {
        id: "all",
        ta: "முப்பாலும்",
        en: "All three books",
        desc: "Walk the whole path — all 1,330 couplets.",
        count: KURALS.length,
        cls: "book-all",
      },
    ];
    SECTIONS.forEach(function (s) {
      var icons = { 1: "◈", 2: "❖", 3: "✿" };
      cards.push({
        id: String(s.id),
        ta: s.ta,
        en: s.en,
        desc: s.en === "Virtue"
          ? "On virtue, right conduct, and the inner life. (அறம்)"
          : s.en === "Wealth"
          ? "On kingship, wealth, work, friendship, and the world. (பொருள்)"
          : "On love, longing, and the life of the heart. (காமம்)",
        count: countForSection(s.id),
        cls: "book-" + s.id,
        icon: icons[s.id] || "◇",
      });
    });

    booksGridEl.innerHTML = cards.map(function (c) {
      return (
        '<button type="button" class="book-card ' + c.cls + '" data-book="' + c.id + '" aria-pressed="false">' +
          '<span class="book-icon">' + (c.icon || "✺") + "</span>" +
          '<span class="book-ta">' + escapeHtml(c.ta) + "</span>" +
          '<span class="book-en">' + escapeHtml(c.en) + "</span>" +
          '<span class="book-desc">' + escapeHtml(c.desc) + "</span>" +
          '<span class="book-count">' + c.count + " kurals</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderSituations() {
    if (!situationsGridEl) return;
    situationsGridEl.innerHTML = SITUATIONS.map(function (s) {
      var t = themeById[s.theme];
      return (
        '<button type="button" class="situation" data-situation="' + s.id + '" data-theme="' + s.theme + '" aria-pressed="false">' +
          '<span class="situation-ta">' + escapeHtml(s.ta) + "</span>" +
          '<span class="situation-en">' + escapeHtml(s.en) + "</span>" +
          '<span class="situation-theme">' +
            (t ? escapeHtml(t.ta) + " · " + escapeHtml(t.en) : "") +
          "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderChapterMap() {
    if (!chapterMapBodyEl) return;
    var html = "";
    SECTIONS.forEach(function (s) {
      var chs = CHAPTERS.filter(function (c) { return c.sec === s.id; });
      html +=
        '<div class="map-section">' +
          '<h4 class="map-section-title">' +
            '<span class="map-section-ta">' + escapeHtml(s.ta) + "</span>" +
            '<span class="map-section-en">' + escapeHtml(s.en) + " · " + chs.length + " chapters</span>" +
          "</h4>" +
          '<div class="map-grid">';
      chs.forEach(function (c) {
        html +=
          '<button type="button" class="map-cell" data-chapter="' + c.n + '" title="' +
            escapeHtml(c.ta) + " — " + escapeHtml(c.en) + '">' +
            '<span class="map-num">' + c.n + ".</span>" +
            '<span class="map-ta">' + escapeHtml(c.ta) + "</span>" +
          "</button>";
      });
      html += "</div></div>";
    });
    chapterMapBodyEl.innerHTML = html;
  }

  function renderDaily() {
    if (!dailyCardEl) return;
    var idx = state.dailyIndex % KURALS.length;
    if (idx < 0) idx += KURALS.length;
    var k = KURALS[idx];
    dailyCardEl.innerHTML = dailyCardHtml(k);
    if (dailyDateEl) dailyDateEl.textContent = formatDate(new Date());
  }

  // ---------- events ----------
  if (chipsEl) {
    chipsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var next = btn.getAttribute("data-theme");
      state.theme = next;
      state.situation = null; // chip click clears situation highlight
      if (next !== "all") {
        state.chapter = "all";
      }
      state.shown = PAGE_SIZE;
      renderChips();
      render();
    });
  }

  if (chapterEl) {
    chapterEl.addEventListener("change", function () {
      state.chapter = chapterEl.value || "all";
      if (state.chapter !== "all") {
        state.theme = "all";
        state.situation = null;
      }
      state.shown = PAGE_SIZE;
      renderChips();
      render();
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        state.query = searchEl.value;
        state.shown = PAGE_SIZE;
        render();
      }, 120);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearTimeout(debounce);
      state.theme = "all";
      state.chapter = "all";
      state.book = "all";
      state.situation = null;
      state.query = "";
      state.shown = PAGE_SIZE;
      if (searchEl) searchEl.value = "";
      if (chapterEl) chapterEl.value = "all";
      renderChips();
      render();
      // scroll user back to browse top so they see the reset
      var browse = document.getElementById("browse");
      safeScrollTo(browse, { block: "start", behavior: "smooth" });
    });
  }

  if (booksGridEl) {
    booksGridEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".book-card");
      if (!btn) return;
      var id = btn.getAttribute("data-book");
      state.book = id === "all" ? "all" : parseInt(id, 10);
      state.chapter = "all";
      state.theme = "all";
      state.situation = null;
      state.shown = PAGE_SIZE;
      if (chapterEl) chapterEl.value = "all";
      renderChips();
      render();
      var browse = document.getElementById("browse");
      safeScrollTo(browse, { block: "start", behavior: "smooth" });
    });
  }

  if (situationsGridEl) {
    situationsGridEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".situation");
      if (!btn) return;
      var id = btn.getAttribute("data-situation");
      var theme = btn.getAttribute("data-theme");
      // Toggling: click the same door again to deselect
      if (state.situation === id) {
        state.situation = null;
        state.theme = "all";
      } else {
        state.situation = id;
        state.theme = theme || "all";
        state.chapter = "all";
        state.book = "all";
        if (chapterEl) chapterEl.value = "all";
      }
      state.shown = PAGE_SIZE;
      renderChips();
      render();
      var browse = document.getElementById("browse");
      safeScrollTo(browse, { block: "start", behavior: "smooth" });
    });
  }

  if (chapterMapBodyEl) {
    chapterMapBodyEl.addEventListener("click", function (e) {
      var cell = e.target.closest(".map-cell");
      if (!cell) return;
      var n = cell.getAttribute("data-chapter");
      state.chapter = n;
      state.theme = "all";
      state.situation = null;
      state.shown = PAGE_SIZE;
      if (chapterEl) chapterEl.value = n;
      renderChips();
      render();
      var listTop = document.getElementById("kural-list");
      safeScrollTo(listTop, { block: "start", behavior: "smooth" });
    });
  }

  if (dailyShuffleEl) {
    dailyShuffleEl.addEventListener("click", function () {
      // Pick a *different* random kural
      var next = Math.floor(Math.random() * KURALS.length);
      if (KURALS.length > 1 && next === state.dailyIndex) next = (next + 1) % KURALS.length;
      state.dailyIndex = next;
      renderDaily();
    });
  }

  if (sentinelEl && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && sentinelEl.style.display !== "none") {
          state.shown += PAGE_SIZE;
          render();
        }
      },
      { rootMargin: "700px 0px" }
    );
    io.observe(sentinelEl);
  } else if (!("IntersectionObserver" in window)) {
    state.shown = KURALS.length;
  }

  // ---------- init ----------
  renderChapterOptions();
  renderChips();
  renderBooks();
  renderSituations();
  renderChapterMap();
  renderDaily();
  render();

  // deep link: #kural-151 or #book-1, #chapter-16, #situation-anger
  var hash = location.hash || "";
  var m;
  if ((m = hash.match(/^#kural-(\d+)$/))) {
    var target = parseInt(m[1], 10);
    var idx = KURALS.findIndex(function (k) { return k.n === target; });
    if (idx >= 0) {
      state.shown = Math.max(PAGE_SIZE, idx + 1 + Math.floor(PAGE_SIZE / 2));
      render();
      var el = document.getElementById("kural-" + target);
      safeScrollTo(el, { block: "start" });
    }
  } else if ((m = hash.match(/^#chapter-(\d+)$/))) {
    state.chapter = m[1];
    state.theme = "all";
    state.shown = KURALS.length;
    renderChips();
    render();
    safeScrollTo(document.getElementById("browse"), { block: "start" });
  } else if ((m = hash.match(/^#book-(\d+|all)$/))) {
    state.book = m[1] === "all" ? "all" : parseInt(m[1], 10);
    state.shown = PAGE_SIZE;
    render();
    safeScrollTo(document.getElementById("browse"), { block: "start" });
  } else if ((m = hash.match(/^#situation-([a-z]+)$/))) {
    var sit = null;
    for (var i = 0; i < SITUATIONS.length; i++) {
      if (SITUATIONS[i].id === m[1]) { sit = SITUATIONS[i]; break; }
    }
    if (sit) {
      state.situation = sit.id;
      state.theme = sit.theme;
      state.chapter = "all";
      state.book = "all";
      state.shown = PAGE_SIZE;
      renderChips();
      render();
      safeScrollTo(document.getElementById("browse"), { block: "start" });
    }
  }
})();
