/* Tamil Stoic — Thirukkural page behaviour
 * Renders the complete Thirukkural (1,330 couplets) with:
 *   1. Tamil couplet (+ transliteration)
 *   2. Classic English translation (G. U. Pope, 1886)
 *   3. Simple-English meaning
 * Features: search (number / Tamil / English), mutually exclusive theme/chapter
 * filters (picking one clears the other), clear button, has-value styling,
 * chapter browser, lazy rendering (24 cards per batch), deep links (#kural-151).
 */
(function () {
  "use strict";

  var KURALS = window.KURALS || [];
  var CHAPTERS = window.CHAPTERS || [];
  var SECTIONS = window.SECTIONS || [];
  var THEMES = window.THEMES || [];

  var PAGE_SIZE = 24;

  var listEl = document.getElementById("kural-list");
  var chipsEl = document.getElementById("chips");
  var searchEl = document.getElementById("search");
  var chapterEl = document.getElementById("chapter");
  var clearBtn = document.getElementById("clear-filters");
  var countEl = document.getElementById("result-count");
  var rangeEl = document.getElementById("result-range");
  var sentinelEl = document.getElementById("sentinel");
  var debounce;

  // Defensive: auto-create sentinel if HTML is outdated
  if (!sentinelEl && listEl && listEl.parentNode) {
    sentinelEl = document.createElement("div");
    sentinelEl.id = "sentinel";
    sentinelEl.className = "sentinel";
    sentinelEl.innerHTML = '<div class="spinner"></div><span>Loading more…</span>';
    listEl.parentNode.appendChild(sentinelEl);
  }

  var state = { theme: "all", chapter: "all", query: "", shown: PAGE_SIZE };

  /* ---------- lookups ---------- */

  var chById = {};
  CHAPTERS.forEach(function (c) { chById[c.n] = c; });

  var secById = {};
  SECTIONS.forEach(function (s) { secById[s.id] = s; });

  var themeById = {};
  THEMES.forEach(function (t) { themeById[t.id] = t; });

  function themeLabel(id) {
    return themeById[id] ? themeById[id].en : id;
  }

  /* ---------- helpers ---------- */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function pad(n) {
    return n < 100 ? (n < 10 ? "00" + n : "0" + n) : String(n);
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

  /* ---------- matching ---------- */

  function matches(k) {
    // Theme and chapter are mutually exclusive. A selected chapter wins, so
    // chapter 16 always yields kurals 151–160 even if a theme chip was active.
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

  /* ---------- rendering ---------- */

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
          '<span class="kural-num">#' + pad(k.n) + "</span>" +
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
          '<span class="section-tag">' + escapeHtml(sec ? sec.ta : "") + " · " + escapeHtml(sec ? sec.en : "") + "</span>" +
          "<span>திருக்குறள் " + pad(k.n) + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function syncFilterChrome() {
    var chapterActive = state.chapter !== "all";
    var queryActive = !!state.query.trim();
    var themeActive = state.theme !== "all";

    if (chapterEl) {
      chapterEl.classList.toggle("has-value", chapterActive);
      if (chapterEl.value !== String(state.chapter)) chapterEl.value = String(state.chapter);
    }
    if (searchEl) searchEl.classList.toggle("has-value", queryActive);
    if (clearBtn) clearBtn.hidden = !(chapterActive || queryActive || themeActive);
  }

  function render() {
    syncFilterChrome();
    if (!listEl) return;
    var results = KURALS.filter(matches);
    var visible = results.slice(0, state.shown);

    if (countEl) {
      countEl.textContent =
        "Showing " + visible.length + " of " + results.length + " kurals" +
        (results.length !== KURALS.length ? " (filtered from " + KURALS.length + ")" : "");
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
          "<p>Nothing found. Try a kural number (e.g. <b>151</b>) or another word.</p>" +
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

  /* ---------- events ---------- */

  if (chipsEl) {
    chipsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var next = btn.getAttribute("data-theme");
      state.theme = next;
      // A specific theme clears the chapter so the two filters never intersect to empty.
      if (next !== "all") state.chapter = "all";
      state.shown = PAGE_SIZE;
      renderChips();
      render();
    });
  }

  if (chapterEl) {
    chapterEl.addEventListener("change", function () {
      state.chapter = chapterEl.value || "all";
      // A specific chapter clears the theme (chapter 16 → kurals 151–160).
      if (state.chapter !== "all") state.theme = "all";
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
      state.query = "";
      state.shown = PAGE_SIZE;
      if (searchEl) searchEl.value = "";
      if (chapterEl) chapterEl.value = "all";
      renderChips();
      render();
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
    // very old browsers: show everything
    state.shown = KURALS.length;
  }

  /* ---------- init ---------- */

  renderChapterOptions();
  renderChips();
  render();

  // deep link: #kural-151
  var m = (location.hash || "").match(/^#kural-(\d+)$/);
  if (m) {
    var target = parseInt(m[1], 10);
    var idx = KURALS.findIndex(function (k) { return k.n === target; });
    if (idx >= 0) {
      state.shown = Math.max(PAGE_SIZE, idx + 1 + Math.floor(PAGE_SIZE / 2));
      render();
      var el = document.getElementById("kural-" + target);
      if (el) el.scrollIntoView({ block: "start" });
    }
  }
})();
