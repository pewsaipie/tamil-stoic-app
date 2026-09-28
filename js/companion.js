/* Tamil Stoic — installable companion features
 *
 * Adds a deliberately calm layer around the existing reader:
 *  - install / offline update guidance for the static PWA
 *  - device-private saved Kurals and short reflections
 *  - native sharing, exact deep links, and bilingual PNG cards
 *  - reader comfort and accessibility preferences
 */
(function () {
  "use strict";

  var KURALS = window.KURALS || [];
  var CHAPTERS = window.CHAPTERS || [];
  var store = window.TamilStoicStore;
  var preferenceKey = "tamil-stoic-reader-preferences-v1";
  var installDismissKey = "tamil-stoic-install-dismissed-v1";
  var savedByNumber = {};
  var activeReflectionNumber = null;
  var deferredInstallPrompt = null;
  var registration = null;
  var toastTimer = null;
  var refreshOnControllerChange = false;
  var lastDialogTrigger = null;

  var defaults = {
    fontSize: "standard",
    lineSpacing: "comfortable",
    colorScheme: "system",
    uiLanguage: "en",
    showTamil: true,
    showTransliteration: true,
    showTranslation: true,
    showSimple: true,
    reduceMotion: false,
  };
  var preferences = readPreferences();
  var schemeListener = null;
  var storageWarned = false;

  // The i18n dictionary lives in app.js (it owns the strings it renders).
  // Companion falls back to its English literals when it runs standalone.
  function T(key, fallback) {
    var i18n = window.TamilStoicI18n;
    return i18n && typeof i18n.t === "function" ? i18n.t(key, fallback) : fallback;
  }

  function TF(key, fallback, vars) {
    var i18n = window.TamilStoicI18n;
    if (i18n && typeof i18n.tf === "function") return i18n.tf(key, fallback, vars);
    return String(fallback).replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    });
  }

  function resolvedColorScheme() {
    if (preferences.colorScheme !== "system") return preferences.colorScheme;
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (error) { /* ignore */ }
    return "light";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function safeJson(value, fallback) {
    try { return JSON.parse(value); } catch (error) { return fallback; }
  }

  function safeGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (error) { /* private browsing fallback */ }
  }

  function readPreferences() {
    var stored = safeJson(safeGet(preferenceKey) || "{}", {});
    var result = {};
    Object.keys(defaults).forEach(function (key) {
      result[key] = Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : defaults[key];
    });
    // Never allow a preference migration or malformed local value to hide every
    // reading layer at once.
    if (!result.showTamil && !result.showTransliteration && !result.showTranslation && !result.showSimple) {
      result.showSimple = true;
    }
    return result;
  }

  function savePreferences() {
    safeSet(preferenceKey, JSON.stringify(preferences));
  }

  function normaliseBoolean(value) {
    return value === true || value === "true";
  }

  function applyPreferences() {
    var body = document.body;
    if (!body) return;
    body.dataset.fontSize = preferences.fontSize;
    body.dataset.lineSpacing = preferences.lineSpacing;
    body.dataset.colorScheme = resolvedColorScheme();
    body.dataset.schemePreference = preferences.colorScheme;
    body.dataset.showTamil = String(normaliseBoolean(preferences.showTamil));
    body.dataset.showTransliteration = String(normaliseBoolean(preferences.showTransliteration));
    body.dataset.showTranslation = String(normaliseBoolean(preferences.showTranslation));
    body.dataset.showSimple = String(normaliseBoolean(preferences.showSimple));
    body.dataset.reduceMotion = String(normaliseBoolean(preferences.reduceMotion));

    // Markup uses kebab-case names ("font-size"); stored keys are camelCase.
    // (The old code compared them directly, so buttons never announced
    // aria-pressed="true" even when their preference was active.)
    var aliases = {
      "font-size": "fontSize",
      "line-spacing": "lineSpacing",
      "color-scheme": "colorScheme",
      "ui-language": "uiLanguage",
    };
    Array.prototype.forEach.call(document.querySelectorAll("[data-preference]"), function (button) {
      var key = button.getAttribute("data-preference");
      var value = button.getAttribute("data-value");
      var storedKey = aliases[key] || key;
      var active = String(preferences[storedKey]) === value;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
    });

    var toggles = [
      ["pref-show-tamil", "showTamil"],
      ["pref-show-transliteration", "showTransliteration"],
      ["pref-show-translation", "showTranslation"],
      ["pref-show-simple", "showSimple"],
      ["pref-reduce-motion", "reduceMotion"],
    ];
    toggles.forEach(function (pair) {
      var input = byId(pair[0]);
      if (input) input.checked = normaliseBoolean(preferences[pair[1]]);
    });

    // Interface language follows the preference; setLanguage is a no-op when
    // the language is already the active one.
    if (window.TamilStoicI18n && typeof window.TamilStoicI18n.setLanguage === "function" &&
        window.TamilStoicI18n.getLanguage() !== preferences.uiLanguage) {
      window.TamilStoicI18n.setLanguage(preferences.uiLanguage);
    }

    // "Follow system" reacts to OS theme changes while the page is open.
    if (!schemeListener) {
      try {
        if (window.matchMedia) {
          var mq = window.matchMedia("(prefers-color-scheme: dark)");
          schemeListener = function () {
            if (preferences.colorScheme === "system") applyPreferences();
          };
          if (typeof mq.addEventListener === "function") mq.addEventListener("change", schemeListener);
          else if (typeof mq.addListener === "function") mq.addListener(schemeListener);
          else schemeListener = null;
        }
      } catch (error) { schemeListener = null; }
    }
  }

  function setPreference(key, value) {
    // Markup uses readable kebab-case names; stored preferences stay camelCase
    // so a future sync adapter has stable JavaScript keys.
    var aliases = {
      "font-size": "fontSize",
      "line-spacing": "lineSpacing",
      "color-scheme": "colorScheme",
      "ui-language": "uiLanguage",
    };
    key = aliases[key] || key;
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) return;
    preferences[key] = value;
    savePreferences();
    applyPreferences();
  }

  function setLayerPreference(key, value) {
    var proposed = {
      showTamil: normaliseBoolean(preferences.showTamil),
      showTransliteration: normaliseBoolean(preferences.showTransliteration),
      showTranslation: normaliseBoolean(preferences.showTranslation),
      showSimple: normaliseBoolean(preferences.showSimple),
    };
    proposed[key] = value;
    if (!proposed.showTamil && !proposed.showTransliteration && !proposed.showTranslation && !proposed.showSimple) {
      showToast(T("toast.keepLayer", "Keep at least one reading layer visible."));
      applyPreferences();
      return;
    }
    setPreference(key, value);
  }

  function showToast(message) {
    var toast = byId("app-status");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 4200);
  }

  function chapterFor(kural) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].n === kural.ch) return CHAPTERS[i];
    }
    return null;
  }

  function kuralForNumber(n) {
    n = Number(n);
    for (var i = 0; i < KURALS.length; i++) {
      if (KURALS[i].n === n) return KURALS[i];
    }
    return null;
  }

  function pad(n) {
    return String(n).padStart(3, "0");
  }

  function getRecord(n) {
    return savedByNumber[String(Number(n))] || null;
  }

  function sortedRecords() {
    return Object.keys(savedByNumber)
      .map(function (key) { return savedByNumber[key]; })
      .sort(function (a, b) { return b.savedAt - a.savedAt; });
  }

  function getKuralNumber(card) {
    if (!card) return null;
    var match = (card.id || "").match(/^kural-(\d+)$/);
    if (match) return Number(match[1]);
    var dailyNumber = card.querySelector(".daily-num");
    if (dailyNumber) {
      var numberMatch = dailyNumber.textContent.match(/\d+/);
      if (numberMatch) return Number(numberMatch[0]);
    }
    return null;
  }

  function actionMarkup(n) {
    return (
      '<div class="companion-actions" data-kural="' + n + '" role="group" aria-label="' +
        T("actions.group", "Actions for Kural ") + pad(n) + '">' +
        '<button type="button" class="card-action save-action" data-kural-action="save" data-kural="' + n + '" aria-pressed="false">' +
          '<span class="action-symbol" aria-hidden="true">♡</span><span class="action-label">' +
          T("action.save", "Save") + "</span>" +
        "</button>" +
        '<button type="button" class="card-action" data-kural-action="reflect" data-kural="' + n + '">' +
          '<span class="action-symbol" aria-hidden="true">✎</span><span class="action-label">' +
          T("action.reflect", "Reflect") + "</span>" +
        "</button>" +
        '<details class="share-menu">' +
          '<summary class="card-action"><span class="action-symbol" aria-hidden="true">↗</span><span class="action-label">' +
          T("action.share", "Share") + "</span></summary>" +
          '<div class="share-menu-options" role="group" aria-label="' + T("actions.shareGroup", "Share Kural ") + pad(n) + '">' +
            '<button type="button" data-kural-action="share" data-kural="' + n + '">' + T("share.link", "Share link") + "</button>" +
            '<button type="button" data-kural-action="copy-link" data-kural="' + n + '">' + T("share.copy", "Copy link") + "</button>" +
            '<button type="button" data-kural-action="share-card" data-kural="' + n + '">' + T("share.card", "Create share card") + "</button>" +
          "</div>" +
        "</details>" +
      "</div>"
    );
  }

  function updateActionState() {
    Array.prototype.forEach.call(document.querySelectorAll(".companion-actions"), function (actions) {
      var n = Number(actions.getAttribute("data-kural"));
      var button = actions.querySelector('[data-kural-action="save"]');
      var isSaved = !!getRecord(n);
      if (button) {
        button.setAttribute("aria-pressed", String(isSaved));
        button.classList.toggle("is-saved", isSaved);
        button.innerHTML =
          '<span class="action-symbol" aria-hidden="true">' + (isSaved ? "♥" : "♡") + "</span>" +
          '<span class="action-label">' + (isSaved ? T("action.savedLabel", "Saved") : T("action.save", "Save")) + "</span>";
      }
    });
  }

  function decorateKuralCards() {
    var candidates = [];
    Array.prototype.forEach.call(document.querySelectorAll(".kural-card, #daily-card"), function (card) {
      if (candidates.indexOf(card) === -1) candidates.push(card);
    });

    candidates.forEach(function (card) {
      var n = getKuralNumber(card);
      if (!n || !kuralForNumber(n)) return;
      if (!card.querySelector(".companion-actions")) {
        card.insertAdjacentHTML("beforeend", actionMarkup(n));
      }
    });
    updateActionState();
  }

  function scheduleDecoration() {
    if (scheduleDecoration.pending) return;
    scheduleDecoration.pending = true;
    Promise.resolve().then(function () {
      scheduleDecoration.pending = false;
      decorateKuralCards();
    });
  }

  function observeReader() {
    if (!("MutationObserver" in window)) return;
    var observer = new MutationObserver(function () { scheduleDecoration(); });
    var list = byId("kural-list");
    var daily = byId("daily-card");
    if (list) observer.observe(list, { childList: true });
    if (daily) observer.observe(daily, { childList: true });
  }

  function renderSavedCollection() {
    var list = byId("saved-list");
    var empty = byId("saved-empty");
    var count = byId("saved-count");
    var openButton = byId("saved-open");
    if (!list || !empty) return;

    var records = sortedRecords();
    list.replaceChildren();
    empty.hidden = records.length !== 0;
    if (count) count.textContent = String(records.length);
    if (openButton) {
      openButton.setAttribute(
        "aria-label",
        records.length
          ? TF("action.openSavedN", "Open {n} saved Kurals", { n: records.length })
          : T("action.openSaved", "Open saved Kurals")
      );
    }

    records.forEach(function (record) {
      var kural = kuralForNumber(record.n);
      if (!kural) return;
      var chapter = chapterFor(kural);
      var item = document.createElement("article");
      item.className = "saved-item";
      item.setAttribute("data-saved-kural", String(record.n));

      var meta = document.createElement("p");
      meta.className = "saved-item-meta";
      meta.textContent = T("saved.metaPrefix", "Kural #") + pad(record.n) + (chapter ? " · " + chapter.ta : "");
      var verse = document.createElement("p");
      verse.className = "saved-item-verse";
      verse.textContent = kural.ta[0] + " " + kural.ta[1];
      var meaning = document.createElement("p");
      meaning.className = "saved-item-meaning";
      meaning.textContent = kural.s;
      item.appendChild(meta);
      item.appendChild(verse);
      item.appendChild(meaning);

      if (record.note) {
        var noteLabel = document.createElement("p");
        noteLabel.className = "saved-note-label";
        noteLabel.textContent = T("saved.noteLabel", "Private reflection");
        var note = document.createElement("p");
        note.className = "saved-note";
        note.textContent = record.note;
        item.appendChild(noteLabel);
        item.appendChild(note);
      }

      var actions = document.createElement("div");
      actions.className = "saved-item-actions";
      actions.innerHTML =
        '<button type="button" data-saved-action="reflect" data-kural="' + record.n + '">' + T("action.reflect", "Reflect") + "</button>" +
        '<button type="button" data-saved-action="share" data-kural="' + record.n + '">' + T("action.share", "Share") + "</button>" +
        '<button type="button" data-saved-action="remove" data-kural="' + record.n + '">' + T("action.remove", "Remove") + "</button>";
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  async function setSaved(n, shouldSave) {
    n = Number(n);
    var current = getRecord(n);
    if (shouldSave && !current) {
      var record = { n: n, note: "", savedAt: Date.now(), updatedAt: Date.now() };
      var saved = await store.put(record);
      savedByNumber[String(n)] = saved;
      showToast(T("toast.saved", "Saved privately on this device."));
      // one-shot foil shimmer on the control that was just pressed
      var foil = document.querySelector('.companion-actions[data-kural="' + n + '"] .save-action');
      if (foil) {
        foil.classList.add("just-saved");
        window.setTimeout(function () { foil.classList.remove("just-saved"); }, 700);
      }
    } else if (!shouldSave && current) {
      await store.remove(n);
      delete savedByNumber[String(n)];
      showToast(T("toast.removed", "Removed from your saved Kurals."));
    }
    renderSavedCollection();
    updateActionState();
  }

  async function toggleSaved(n) {
    return setSaved(n, !getRecord(n));
  }

  function openDialog(dialog, trigger) {
    if (!dialog) return;
    lastDialogTrigger = trigger || document.activeElement;
    dialog.__opener = lastDialogTrigger;
    try {
      if (typeof dialog.showModal === "function" && !dialog.hasAttribute("open")) {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } catch (error) {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    var opener = dialog.__opener || lastDialogTrigger;
    try {
      if (typeof dialog.close === "function" && dialog.hasAttribute("open")) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    } catch (error) {
      dialog.removeAttribute("open");
    }
    if (opener && typeof opener.focus === "function") {
      window.setTimeout(function () { opener.focus(); }, 0);
    }
  }

  function openReflection(n, trigger) {
    var kural = kuralForNumber(n);
    if (!kural) return;
    activeReflectionNumber = Number(n);
    var record = getRecord(n);
    var label = byId("reflection-kural-label");
    var verse = byId("reflection-verse");
    var input = byId("reflection-input");
    if (label) label.textContent = T("reflection.metaPrefix", "Kural #") + pad(n);
    if (verse) verse.textContent = kural.ta[0] + " " + kural.ta[1];
    if (input) input.value = record ? record.note || "" : "";
    openDialog(byId("reflection-dialog"), trigger);
    if (input) window.setTimeout(function () { input.focus(); }, 0);
  }

  async function saveReflection() {
    var input = byId("reflection-input");
    if (!activeReflectionNumber || !input) return;
    var existing = getRecord(activeReflectionNumber);
    var record = {
      n: activeReflectionNumber,
      note: String(input.value || "").trim().slice(0, 500),
      savedAt: existing ? existing.savedAt : Date.now(),
      updatedAt: Date.now(),
    };
    var saved = await store.put(record);
    savedByNumber[String(record.n)] = saved;
    renderSavedCollection();
    updateActionState();
    closeDialog(byId("reflection-dialog"));
    showToast(record.note
      ? T("toast.reflectSaved", "Private reflection saved on this device.")
      : T("toast.kuralSaved", "Kural saved privately on this device."));
  }

  function kuralUrl(n) {
    var url = new URL(window.location.href);
    url.hash = "kural-" + Number(n);
    return url.href;
  }

  function shareText(kural) {
    return (
      "திருக்குறள் #" + pad(kural.n) + "\n\n" +
      kural.ta[0] + "\n" + kural.ta[1] + "\n\n" +
      "Simple meaning: " + kural.s + "\n\n" +
      "Read it in Tamil Stoic"
    );
  }

  async function copyText(text, message) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        var helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      showToast(message || T("toast.copied", "Copied to your clipboard."));
    } catch (error) {
      showToast(T("toast.copyFail", "Could not copy that link here. Please copy it from the address bar."));
    }
  }

  async function shareKural(n) {
    var kural = kuralForNumber(n);
    if (!kural) return;
    var payload = {
      title: "Thirukkural #" + pad(kural.n),
      text: shareText(kural),
      url: kuralUrl(kural.n),
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        showToast(T("toast.shareSheet", "Share sheet opened."));
      } catch (error) {
        if (error && error.name === "AbortError") return;
        await copyText(payload.url, T("toast.shareCopied", "Share link copied to your clipboard."));
      }
    } else {
      await copyText(payload.url, T("toast.shareCopied", "Share link copied to your clipboard."));
    }
  }

  function taNumeral(n) {
    var digits = "௦௧௨௩௪௫௬௭௮௯";
    return String(n).split("").map(function (d) { return digits[Number(d)] || d; }).join("");
  }

  // Lotus rosette drawn from dots — used on seals, corners and dividers.
  // Only uses canvas primitives available in the smallest browser/test shims.
  function drawRosette(ctx, cx, cy, r, color) {
    var previous = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r * 0.62, cy + Math.sin(angle) * r * 0.62, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = previous;
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawCanvasLines(ctx, lines, x, y, lineHeight) {
    lines.forEach(function (line, index) {
      ctx.fillText(line, x, y + index * lineHeight);
    });
    return y + lines.length * lineHeight;
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready.catch(function () { return undefined; });
    }
    return Promise.resolve();
  }

  function canvasBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Could not create an image"));
        }, "image/png");
        return;
      }
      try {
        var data = canvas.toDataURL("image/png");
        var base64 = data.split(",")[1];
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: "image/png" }));
      } catch (error) {
        reject(error);
      }
    });
  }

  async function createShareCard(n) {
    var kural = typeof n === "object" ? n : kuralForNumber(n);
    if (!kural) throw new Error("Kural not found");
    await waitForFonts();

    var canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    var ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot create a share image");

    var background = ctx.createLinearGradient(0, 0, 1080, 1920);
    background.addColorStop(0, "#f8f1e2");
    background.addColorStop(1, "#efe3c8");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // palm-leaf fibre grain, drawn in code so the card needs no assets
    ctx.fillStyle = "rgba(150, 120, 70, 0.05)";
    for (var fibre = 0; fibre < 46; fibre++) {
      ctx.fillRect(0, 60 + fibre * 41, 1080, 1.5);
    }

    ctx.fillStyle = "#26614f";
    ctx.fillRect(0, 0, 1080, 132);
    ctx.fillStyle = "#b48630";
    ctx.fillRect(0, 132, 1080, 12);
    ctx.fillStyle = "#a94f31";
    ctx.fillRect(0, 144, 18, 1640);

    // manuscript gold frame
    ctx.strokeStyle = "#b48630";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, 1012, 1852);

    ctx.fillStyle = "#fffdf7";
    ctx.beginPath();
    ctx.arc(924, 282, 116, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b48630";
    ctx.beginPath();
    ctx.arc(924, 282, 84, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#26614f";
    ctx.beginPath();
    ctx.arc(924, 282, 56, 0, Math.PI * 2);
    ctx.fill();
    drawRosette(ctx, 924, 282, 44, "#f4ead2");

    // corner rosettes, manuscript style
    drawRosette(ctx, 70, 1846, 24, "#b48630");
    drawRosette(ctx, 1010, 1846, 24, "#b48630");

    ctx.textAlign = "left";
    ctx.fillStyle = "#fffdf7";
    ctx.font = "600 34px Inter, Arial, sans-serif";
    ctx.fillText("TAMIL STOIC · திருக்குறள்", 76, 81);

    ctx.fillStyle = "#a94f31";
    ctx.font = "600 28px Inter, Arial, sans-serif";
    ctx.fillText("KURAL #" + pad(kural.n), 76, 246);

    // ghost Tamil-numeral watermark
    ctx.fillStyle = "rgba(169, 79, 49, 0.08)";
    ctx.font = "700 340px 'Noto Serif Tamil', serif";
    ctx.fillText(taNumeral(kural.n), 560, 1560);

    var y = 378;
    ctx.fillStyle = "#2a241f";
    ctx.font = "600 58px 'Noto Serif Tamil', serif";
    y = drawCanvasLines(ctx, wrapCanvasText(ctx, kural.ta[0], 820), 76, y, 88) + 18;
    y = drawCanvasLines(ctx, wrapCanvasText(ctx, kural.ta[1], 820), 76, y, 88) + 84;

    ctx.fillStyle = "#b48630";
    ctx.fillRect(76, y, 108, 4);
    drawRosette(ctx, 204, y + 2, 15, "#b48630");
    y += 92;
    ctx.fillStyle = "#5c5249";
    ctx.font = "600 24px Inter, Arial, sans-serif";
    ctx.fillText("SIMPLE MEANING", 76, y);
    y += 64;
    ctx.fillStyle = "#2a241f";
    ctx.font = "400 42px Georgia, serif";
    y = drawCanvasLines(ctx, wrapCanvasText(ctx, kural.s, 850), 76, y, 62);

    var chapter = chapterFor(kural);
    ctx.fillStyle = "#26614f";
    ctx.fillRect(76, 1670, 928, 1);
    ctx.fillStyle = "#5c5249";
    ctx.font = "italic 30px Georgia, serif";
    ctx.fillText(chapter ? chapter.ta + " · " + chapter.en : "Thirukkural", 76, 1740);
    ctx.fillStyle = "#26614f";
    ctx.font = "600 27px Inter, Arial, sans-serif";
    ctx.fillText("A calm corner for Tamil wisdom", 76, 1810);

    return canvasBlob(canvas);
  }

  async function shareCard(n) {
    var kural = kuralForNumber(n);
    if (!kural) return;
    showToast(T("toast.cardPreparing", "Preparing your bilingual share card…"));
    try {
      var blob = await createShareCard(kural);
      var filename = "thirukkural-" + pad(kural.n) + ".png";
      var canShareFiles = navigator.canShare && typeof window.File === "function";
      if (canShareFiles) {
        var file = new File([blob], filename, { type: "image/png" });
        var supportsThisFile = false;
        try {
          supportsThisFile = navigator.canShare({ files: [file] });
        } catch (error) {
          // Some browsers expose canShare but reject file payload checks. The
          // download fallback below remains the dependable path in that case.
          supportsThisFile = false;
        }
        if (supportsThisFile && navigator.share) {
          try {
            await navigator.share({
              title: "Thirukkural #" + pad(kural.n),
              text: "A Kural from Tamil Stoic",
              files: [file],
            });
            showToast(T("toast.cardSheet", "Share card ready in your share sheet."));
            return;
          } catch (error) {
            if (error && error.name === "AbortError") return;
          }
        }
      }
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast(T("toast.cardReady", "Your bilingual share card is ready to share."));
    } catch (error) {
      showToast(T("toast.cardFail", "Could not create a share card in this browser."));
    }
  }

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  }

  function showInstallCard(mode) {
    var card = byId("install-card");
    var message = byId("install-message");
    var action = byId("install-action");
    if (!card || !message || !action || isStandalone() || safeGet(installDismissKey)) return;
    if (mode === "ios") {
      message.innerHTML = T(
        "install.ios",
        "<strong>Install on iPhone or iPad:</strong> tap <b>Share</b>, then <b>Add to Home Screen</b> for a calm offline companion."
      );
      action.hidden = true;
    } else {
      message.textContent = T(
        "install.prompt",
        "Install Tamil Stoic for a calm, offline-friendly reading space on your phone."
      );
      action.hidden = false;
      action.textContent = T("install.action", "Install app");
    }
    card.hidden = false;
  }

  function hideInstallCard(remember) {
    var card = byId("install-card");
    if (card) card.hidden = true;
    if (remember) safeSet(installDismissKey, "1");
  }

  function initialiseInstallPrompt() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      showInstallCard("prompt");
    });
    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      hideInstallCard(false);
      showToast(T("toast.installDone", "Tamil Stoic is ready on your home screen."));
    });
    if (isIos() && !isStandalone()) showInstallCard("ios");

    var action = byId("install-action");
    if (action) {
      action.addEventListener("click", function () {
        if (!deferredInstallPrompt || typeof deferredInstallPrompt.prompt !== "function") return;
        var prompt = deferredInstallPrompt;
        prompt.prompt();
        Promise.resolve(prompt.userChoice).then(function (choice) {
          if (choice && choice.outcome === "accepted") {
            hideInstallCard(false);
          }
          deferredInstallPrompt = null;
        });
      });
    }
    var dismiss = byId("install-dismiss");
    if (dismiss) dismiss.addEventListener("click", function () { hideInstallCard(true); });
  }

  function showUpdateBanner() {
    var banner = byId("update-banner");
    if (banner) banner.hidden = false;
  }

  function initialiseServiceWorker() {
    var allowedProtocol = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!("serviceWorker" in navigator) || !allowedProtocol) return;

    navigator.serviceWorker.register("sw.js").then(function (nextRegistration) {
      registration = nextRegistration;
      if (registration.waiting && navigator.serviceWorker.controller) showUpdateBanner();
      if (registration.addEventListener) {
        registration.addEventListener("updatefound", function () {
          var installing = registration.installing;
          if (!installing || !installing.addEventListener) return;
          installing.addEventListener("statechange", function () {
            if (installing.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner();
          });
        });
      }
    }).catch(function () {
      // Reading works normally without a service worker, so avoid a disruptive
      // error message if a browser or restrictive network declines registration.
    });

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshOnControllerChange) return;
      refreshOnControllerChange = true;
      window.location.reload();
    });

    var update = byId("update-reload");
    if (update) update.addEventListener("click", function () {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
    var later = byId("update-later");
    if (later) later.addEventListener("click", function () {
      var banner = byId("update-banner");
      if (banner) banner.hidden = true;
    });
  }

  function bindUi() {
    document.addEventListener("click", function (event) {
      var action = event.target.closest("[data-kural-action]");
      if (action) {
        event.preventDefault();
        var n = Number(action.getAttribute("data-kural"));
        var type = action.getAttribute("data-kural-action");
        if (type === "save") toggleSaved(n);
        else if (type === "reflect") openReflection(n, action);
        else if (type === "share") shareKural(n);
        else if (type === "copy-link") copyText(kuralUrl(n), T("toast.shareCopied", "Share link copied to your clipboard."));
        else if (type === "share-card") shareCard(n);
        return;
      }

      // Close any open share disclosure when clicking or tapping elsewhere.
      Array.prototype.forEach.call(document.querySelectorAll(".share-menu[open]"), function (menu) {
        if (!event.target.closest || !event.target.closest(".share-menu")) menu.removeAttribute("open");
      });

      var savedAction = event.target.closest("[data-saved-action]");
      if (savedAction) {
        var savedN = Number(savedAction.getAttribute("data-kural"));
        var savedType = savedAction.getAttribute("data-saved-action");
        if (savedType === "remove") setSaved(savedN, false);
        else if (savedType === "reflect") openReflection(savedN, savedAction);
        else if (savedType === "share") shareKural(savedN);
        return;
      }

      if (event.target.closest("#saved-open")) {
        renderSavedCollection();
        openDialog(byId("saved-dialog"), event.target.closest("#saved-open"));
        return;
      }
      if (event.target.closest("#reader-settings-open")) {
        openDialog(byId("reader-settings-dialog"), event.target.closest("#reader-settings-open"));
        return;
      }
      var close = event.target.closest("[data-close-dialog]");
      if (close) {
        var dialog = close.closest("dialog");
        closeDialog(dialog);
        return;
      }
      var preferenceButton = event.target.closest("[data-preference]");
      if (preferenceButton) {
        setPreference(preferenceButton.getAttribute("data-preference"), preferenceButton.getAttribute("data-value"));
      }
    });

    document.addEventListener("change", function (event) {
      var target = event.target;
      var layerMap = {
        "pref-show-tamil": "showTamil",
        "pref-show-transliteration": "showTransliteration",
        "pref-show-translation": "showTranslation",
        "pref-show-simple": "showSimple",
      };
      if (layerMap[target.id]) {
        setLayerPreference(layerMap[target.id], target.checked);
      } else if (target.id === "pref-reduce-motion") {
        setPreference("reduceMotion", target.checked);
      }
    });

    var form = byId("reflection-form");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      saveReflection();
    });

    // Escape closes an open share disclosure without closing the page dialog
    // the reader may be working in (the dialog's own cancel handles that).
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      Array.prototype.forEach.call(document.querySelectorAll(".share-menu[open]"), function (menu) {
        menu.removeAttribute("open");
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("dialog"), function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        closeDialog(dialog);
      });
    });

    // Re-render companion surfaces whenever the interface language changes.
    if (window.TamilStoicI18n && typeof window.TamilStoicI18n.onChange === "function") {
      window.TamilStoicI18n.onChange(function () {
        renderSavedCollection();
        Array.prototype.forEach.call(document.querySelectorAll(".companion-actions[data-kural]"), function (actions) {
          var n = Number(actions.getAttribute("data-kural"));
          if (n) actions.outerHTML = actionMarkup(n);
        });
        updateActionState();
      });
    }

    // The storage adapter announces when even its localStorage fallback fails.
    window.addEventListener("tamil-stoic-storage-degraded", function () {
      if (storageWarned) return;
      storageWarned = true;
      showToast(T("toast.storage", "Local storage is unavailable — saves will last this session only."));
    });
  }

  // The daily card gains its own Share entry point (the browse cards keep the
  // calmer disclosure menu).
  function initialiseDailyShare() {
    var button = byId("daily-share");
    if (!button) return;
    button.hidden = false;
    button.addEventListener("click", function () {
      var seal = document.querySelector("#daily-card .daily-num");
      var n = seal ? Number(String(seal.textContent).replace(/\D/g, "")) : 0;
      if (n) shareKural(n);
    });
  }

  // A gentle, once-per-device tour card; never blocking the reader.
  var ONBOARDING_KEY = "tamil-stoic-onboarding-seen-v1";
  function initialiseOnboarding() {
    var card = byId("onboarding-card");
    var dialog = byId("onboarding-dialog");
    if (!card || !dialog) return;
    if (isStandalone() || safeGet(ONBOARDING_KEY)) return;
    card.hidden = false;

    var step = 1;
    function showStep(n) {
      step = Math.min(3, Math.max(1, n));
      Array.prototype.forEach.call(dialog.querySelectorAll(".onboarding-step"), function (s) {
        s.hidden = Number(s.getAttribute("data-step")) !== step;
      });
      Array.prototype.forEach.call(dialog.querySelectorAll(".onboarding-dots span"), function (d, i) {
        d.classList.toggle("dot-on", i === step - 1);
      });
      var back = byId("onboarding-back");
      var next = byId("onboarding-next");
      var done = byId("onboarding-done");
      if (back) back.hidden = step === 1;
      if (next) next.hidden = step === 3;
      if (done) done.hidden = step !== 3;
    }
    function markSeen() {
      safeSet(ONBOARDING_KEY, "1");
      card.hidden = true;
    }

    var start = byId("onboarding-start");
    if (start) start.addEventListener("click", function () { showStep(1); openDialog(dialog, start); });
    var dismiss = byId("onboarding-dismiss");
    if (dismiss) dismiss.addEventListener("click", markSeen);
    var back = byId("onboarding-back");
    var next = byId("onboarding-next");
    var done = byId("onboarding-done");
    if (back) back.addEventListener("click", function () { showStep(step - 1); });
    if (next) next.addEventListener("click", function () { showStep(step + 1); });
    if (done) done.addEventListener("click", function () { closeDialog(dialog); markSeen(); });
    dialog.addEventListener("close", markSeen);
  }

  function openSavedFromShortcut() {
    if (location.hash === "#saved") {
      window.setTimeout(function () {
        renderSavedCollection();
        openDialog(byId("saved-dialog"), byId("saved-open"));
      }, 0);
    }
  }

  var ready = (async function () {
    applyPreferences();
    bindUi();
    initialiseInstallPrompt();
    initialiseServiceWorker();
    decorateKuralCards();
    observeReader();
    try {
      var records = store && store.getAll ? await store.getAll() : [];
      records.forEach(function (record) { savedByNumber[String(record.n)] = record; });
    } catch (error) {
      // The storage adapter already has a fallback. This defensive branch means
      // a reader can still browse and share if every local storage option fails.
    }
    renderSavedCollection();
    decorateKuralCards();
    openSavedFromShortcut();
    initialiseDailyShare();
    initialiseOnboarding();
  })();

  window.addEventListener("hashchange", openSavedFromShortcut);
  window.TamilStoicApp = {
    whenReady: function () { return ready; },
    getSavedRecords: function () { return Promise.resolve(sortedRecords()); },
    getPreferences: function () { return Object.assign({}, preferences); },
    createShareCard: createShareCard,
  };
})();
