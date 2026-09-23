/* Tamil Stoic — Thirukkural page behaviour
 * Renders the curated kural collection with:
 *   1. Tamil couplet (+ transliteration)
 *   2. Classic English translation (G. U. Pope)
 *   3. Simple-English meaning
 * Supports search (number / Tamil / English) and theme filters.
 */
(function () {
  "use strict";

  var KURALS = window.KURALS || [];
  var THEMES = window.THEMES || [];

  var listEl = document.getElementById("kural-list");
  var chipsEl = document.getElementById("chips");
  var searchEl = document.getElementById("search");
  var countEl = document.getElementById("result-count");
  var rangeEl = document.getElementById("result-range");

  var state = { theme: "all", query: "" };

  /* ---------- helpers ---------- */

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

  function themeLabel(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i].en;
    }
    return id;
  }

  function countForTheme(id) {
    if (id === "all") return KURALS.length;
    return KURALS.filter(function (k) { return k.theme === id; }).length;
  }

  /* ---------- matching ---------- */

  function matches(k) {
    if (state.theme !== "all" && k.theme !== state.theme) return false;
    var q = state.query.trim().toLowerCase();
    if (!q) return true;

    if (/^\d+$/.test(q)) return String(k.number) === String(parseInt(q, 10));

    var haystack = [
      k.ta[0], k.ta[1],
      k.translit[0], k.translit[1],
      k.en[0], k.en[1],
      k.simple,
      k.chapterTa, k.chapterEn,
      k.sectionTa, k.sectionEn,
      themeLabel(k.theme)
    ].join(" \n ").toLowerCase();

    return q.split(/\s+/).every(function (w) { return haystack.indexOf(w) !== -1; });
  }

  /* ---------- rendering ---------- */

  function cardHtml(k) {
    var q = state.query.trim();
    var showQ = q && !/^\d+$/.test(q) ? q : "";
    var num = pad(k.number);

    return (
      '<article class="kural-card" id="kural-' + k.number + '">' +
        '<div class="kural-meta">' +
          '<span class="kural-num">#' + num + '</span>' +
          '<span class="kural-chapter">' + escapeHtml(k.chapterTa) +
            '<span class="ch-en">· ' + escapeHtml(k.chapterEn) + '</span></span>' +
          '<span class="kural-theme">' + escapeHtml(themeLabel(k.theme)) + '</span>' +
        '</div>' +

        '<p class="kural-ta">' +
          '<span class="line">' + highlight(k.ta[0], showQ) + '</span>' +
          '<span class="line">' + highlight(k.ta[1], showQ) + '</span>' +
        '</p>' +
        '<p class="kural-translit">' +
          escapeHtml(k.translit[0]) + ' —<br/>' + escapeHtml(k.translit[1]) +
        '</p>' +

        '<hr class="kural-divider" />' +

        '<div class="block-label">English translation</div>' +
        '<blockquote class="kural-en">' +
          '<span class="line">' + escapeHtml(k.en[0]) + '</span>' +
          '<span class="line">' + escapeHtml(k.en[1]) + '</span>' +
          '<span class="source">— G. U. Pope (1886)</span>' +
        '</blockquote>' +

        '<div class="block-label" style="margin-top:16px;">Simple meaning</div>' +
        '<div class="kural-simple">' + highlight(k.simple, showQ) + '</div>' +

        '<div class="kural-foot">' +
          '<span class="section-tag">' + escapeHtml(k.sectionTa) + ' · ' + escapeHtml(k.sectionEn) + '</span>' +
          '<span>திருக்குறள் ' + num + '</span>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var results = KURALS.filter(matches);

    countEl.textContent = results.length + " of " + KURALS.length + " kurals";
    rangeEl.textContent =
      results.length > 0
        ? "#" + pad(results[0].number) + " – #" + pad(results[results.length - 1].number)
        : "";

    if (results.length === 0) {
      listEl.innerHTML =
        '<div class="empty">' +
          '<p class="kural-ta">தேடலில் எதுவும் கிடைக்கவில்லை</p>' +
          '<p>Nothing found. Try a kural number (e.g. <b>151</b>) or another word.</p>' +
        '</div>';
      return;
    }

    listEl.innerHTML = results.map(cardHtml).join("");
  }

  function renderChips() {
    chipsEl.innerHTML = THEMES.map(function (t) {
      var active = state.theme === t.id ? " active" : "";
      return (
        '<button class="chip' + active + '" data-theme="' + t.id + '" role="tab" aria-selected="' +
        (state.theme === t.id) + '">' +
          '<span class="chip-ta">' + escapeHtml(t.ta) + '</span>' + escapeHtml(t.en) +
          '<span class="count">' + countForTheme(t.id) + '</span>' +
        '</button>'
      );
    }).join("");
  }

  /* ---------- events ---------- */

  chipsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    state.theme = btn.getAttribute("data-theme");
    renderChips();
    render();
  });

  var debounce;
  searchEl.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.query = searchEl.value;
      render();
    }, 120);
  });

  /* ---------- init ---------- */

  renderChips();
  render();
})();
