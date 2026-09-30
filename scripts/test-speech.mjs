/**
 * jsdom regression tests for the Listen (device TTS) feature.
 *
 *   npm install --save-dev jsdom
 *   node scripts/test-speech.mjs
 *
 * The mock engine reproduces the real-world failure modes that shipped
 * builds hit but naive mocks miss, as switchable personas:
 *
 *  - default       — well-behaved engine (plus Chrome's late
 *                    onerror("interrupted") after cancel()).
 *  - chromeDrop    — Chrome silently drops a speak() issued in the same
 *                    tick as cancel(); the app must detect and retry.
 *  - voiceError    — getVoices() reports a Tamil voice but the engine
 *                    rejects it at play time; the app must self-heal by
 *                    reading the transliteration.
 *  - notAllowed    — the engine refuses playback ("not-allowed").
 *  - deadEngine    — the engine dies without firing onend; the app must
 *                    recover instead of "stopping silence" forever.
 *
 * Covered behaviours: start/stop toggle, one-click switching, stale
 * callback guard, re-render keeping Stop state, natural end, focus-dialog
 * mirroring, Tamil voice selection, late-arriving voices, transliteration
 * fallback on devices without a Tamil voice (with a one-time explanation
 * toast), dropped-speak recovery, error mapping, and unsupported browsers.
 *
 * jsdom boots of the full app are expensive, so scenarios share windows:
 * one window with a Tamil voice (personas flipped between scenarios), one
 * English-only window (transliteration fallback), one without TTS at all.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    failed++;
  } else {
    console.log("  ✓", msg);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TA_VOICES = [{ name: "Tamil India", lang: "ta-IN" }];
const EN_VOICES = [{ name: "Microsoft David", lang: "en-US" }];

/**
 * Install a controllable mock speech engine on a jsdom window *before*
 * js/app.js loads, so the app sees it at boot.
 */
function installSpeechMock(window, persona = {}) {
  const state = {
    speaking: false,
    pending: false,
    calls: [], // { type: "speak"|"speak-dropped"|"cancel", utterance? }
    utterances: [],
    voices: [],
    persona,
  };
  const voicesChangedListeners = [];
  let dropNextSpeak = false; // chromeDrop: the first speak() after cancel() is lost

  class MockUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
      state.utterances.push(this);
    }
  }

  const fireLater = (utterance, error, delay) =>
    window.setTimeout(() => {
      if (utterance.onerror) utterance.onerror({ error });
    }, delay);

  const synth = {
    get speaking() {
      return state.speaking;
    },
    get pending() {
      return state.pending;
    },
    getVoices() {
      return state.voices;
    },
    addEventListener(type, cb) {
      if (type === "voiceschanged") voicesChangedListeners.push(cb);
    },
    removeEventListener() {},
    set onvoiceschanged(cb) {
      state.onVoicesProp = cb;
    },
    get onvoiceschanged() {
      return state.onVoicesProp || null;
    },
    speak(utterance) {
      // Chrome can drop a speak() issued in the same tick as cancel().
      // State-based (not wall-clock) so slow jsdom timers can't skew it:
      // the first speak after a cancel is dropped, the next one accepted.
      if (persona.chromeDrop && dropNextSpeak) {
        dropNextSpeak = false;
        state.calls.push({ type: "speak-dropped", utterance });
        return;
      }
      state.calls.push({ type: "speak", utterance });
      state.speaking = true;
      state.pending = false;
      if (persona.notAllowed) fireLater(utterance, "not-allowed", 10);
      else if (
        persona.voiceError &&
        utterance.voice &&
        String(utterance.voice.lang || "").toLowerCase().indexOf("ta") === 0
      ) {
        // Engine advertised the Tamil voice but can't use it at play time.
        fireLater(utterance, "language-not-supported", 10);
      } else if (persona.deadEngine) {
        // Engine dies without delivering onend — every time it speaks.
        window.setTimeout(() => {
          state.speaking = false;
        }, 20);
      }
    },
    cancel() {
      state.calls.push({ type: "cancel" });
      const current = state.utterances[state.utterances.length - 1];
      state.speaking = false;
      state.pending = false;
      dropNextSpeak = true;
      // Chrome fires a late asynchronous interrupted-error for cancelled
      // utterances; emulate it so the stale-callback guard is exercised.
      if (current) {
        window.setTimeout(() => {
          if (current.onerror) current.onerror({ error: "interrupted" });
        }, 10);
      }
    },
    resume() {},
    pause() {},
  };

  window.SpeechSynthesisUtterance = MockUtterance;
  window.speechSynthesis = synth;
  state.fireVoicesChanged = () => {
    voicesChangedListeners.forEach((cb) => cb());
    if (typeof state.onVoicesProp === "function") state.onVoicesProp();
  };
  return state;
}

function boot({ voices = [], persona = {}, withSpeech = true } = {}) {
  const html = read("index.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:8000/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // Keep the speech suite representative of a browser and avoid rendering all
  // 1,330 cards in jsdom when the optional observer API is absent.
  window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
  let speechState = null;
  if (withSpeech) {
    speechState = installSpeechMock(window, persona);
    speechState.voices = voices;
  }
  for (const rel of ["data/kurals.js", "js/app.js"]) {
    const script = window.document.createElement("script");
    script.textContent = read(rel);
    window.document.body.appendChild(script);
  }
  return { window, dom, speechState };
}

function listenBtn(document, n) {
  return document.querySelector(
    `#kural-list [data-app-action="listen"][data-kural="${n}"]`
  );
}

function labelOf(btn) {
  const el = btn && btn.querySelector(".listen-label");
  return el ? el.textContent.trim() : null;
}

function toastText(document) {
  const toast = document.getElementById("app-status");
  return toast && !toast.hidden ? toast.textContent.trim() : "";
}

function speakCount(speechState) {
  return speechState.calls.filter((c) => c.type === "speak").length;
}

/** Window shared by the Tamil-voice scenarios; personas flip between them. */
async function tamilVoiceWindowTests() {
  const { window, speechState } = boot({ voices: TA_VOICES });
  const { document } = window;

  console.log("\nspeech [tamil voice]: start / stop toggle:");
  const btn1 = listenBtn(document, 1);
  assert(!!btn1, "kural-1 card renders a Listen button");
  assert(labelOf(btn1) === "Listen", "initial label is Listen");

  btn1.click();
  const first = speechState.utterances[0];
  assert(speakCount(speechState) === 1, "click calls speechSynthesis.speak()");
  assert(first.text.includes("அகர முதல எழுத்தெல்லாம்"), "utterance text is the kural's Tamil couplet");
  assert(first.lang === "ta-IN", "utterance lang is ta-IN");
  assert(first.voice && first.voice.name === "Tamil India", "picks the ta-IN voice when available");
  assert(labelOf(btn1) === "Stop", "label flips to Stop while playing");
  assert(btn1.classList.contains("is-speaking"), "button gets is-speaking class");

  btn1.click(); // toggle off while engine reports speaking
  assert(speechState.calls.some((c) => c.type === "cancel"), "second click cancels playback");
  await sleep(30); // let the mock's late interrupted-error fire
  assert(labelOf(btn1) === "Listen", "label returns to Listen after stop");
  assert(!btn1.classList.contains("is-speaking"), "is-speaking class removed");

  console.log("\nspeech [tamil voice]: switching kural while playing:");
  listenBtn(document, 1).click();
  const btn2 = listenBtn(document, 2);
  btn2.click();
  await sleep(200); // includes any recovery window + late errors
  const speakCalls = speechState.calls.filter((c) => c.type === "speak");
  assert(speakCalls.length >= 2, "switching calls speak() for the second kural");
  assert(
    speakCalls[speakCalls.length - 1].utterance.text.includes("கற்றதனால்"),
    "second utterance is kural 2's text"
  );
  assert(labelOf(listenBtn(document, 1)) === "Listen", "old card label back to Listen");
  assert(
    labelOf(listenBtn(document, 2)) === "Stop",
    "new card label is Stop (stale interrupted-error ignored)"
  );

  console.log("\nspeech [tamil voice]: re-render mid-playback keeps Stop state:");
  const search = document.getElementById("search");
  search.value = "கற்றதனால்";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await sleep(200); // 120ms debounce + render
  const rendered = listenBtn(document, 2);
  assert(!!rendered, "filter still shows kural-2 card");
  assert(labelOf(rendered) === "Stop", "re-rendered card still shows Stop");
  assert(rendered.classList.contains("is-speaking"), "re-rendered card keeps is-speaking");

  console.log("\nspeech [tamil voice]: natural end resets every control:");
  const current = speechState.utterances[speechState.utterances.length - 1];
  speechState.speaking = false;
  if (current.onend) current.onend();
  assert(labelOf(listenBtn(document, 2)) === "Listen", "card label reset on onend");

  console.log("\nspeech [tamil voice]: focus-dialog button mirrors playback:");
  const clear = document.getElementById("clear-filters");
  if (clear && !clear.hidden) clear.click();
  const focusTrigger = document.querySelector(
    '#kural-list [data-app-action="focus"][data-kural="3"]'
  );
  if (focusTrigger) focusTrigger.click();
  const focusBtn = document.getElementById("focus-listen");
  assert(!!focusBtn, "focus dialog has a Listen button");
  focusBtn.click();
  const speaks = speechState.calls.filter((c) => c.type === "speak");
  assert(
    speaks.length > 0 &&
      speaks[speaks.length - 1].utterance.text.includes("மலர்மிசை ஏகினான்"),
    "focus Listen speaks kural 3"
  );
  const focusLabel = focusBtn.querySelector("span:last-child");
  assert(focusLabel.textContent.trim() === "Stop", "focus button label flips to Stop");
  focusBtn.click(); // toggle off
  await sleep(30);
  assert(focusLabel.textContent.trim() === "Listen", "focus button label returns to Listen");

  console.log("\nspeech [chrome drop]: same-tick cancel+speak is detected and retried:");
  speechState.persona.chromeDrop = true;
  listenBtn(document, 1).click(); // warm-up start; a cancel preceded it, so the
  await sleep(500); // first speak may be dropped and recovered by the app
  listenBtn(document, 2).click(); // switch: cancel() then same-tick speak() → dropped
  assert(
    speechState.calls.some((c) => c.type === "speak-dropped"),
    "mock dropped the same-tick speak() like Chrome"
  );
  await sleep(800); // recovery check runs at +150ms; jsdom timers drift
  const accepted = speechState.calls.filter((c) => c.type === "speak");
  const lastAccepted = accepted[accepted.length - 1].utterance;
  assert(lastAccepted.text.includes("கற்றதனால்"), "kural 2 plays after recovery");
  assert(labelOf(listenBtn(document, 2)) === "Stop", "Stop label restored after recovery");
  assert(speechState.speaking === true, "engine really is playing after recovery");

  console.log("\nspeech [voice error]: engine rejecting its Tamil voice self-heals:");
  speechState.persona.chromeDrop = false;
  speechState.persona.voiceError = true;
  listenBtn(document, 2).click(); // stop kural 2
  await sleep(30);
  const beforeHeal = speakCount(speechState);
  listenBtn(document, 1).click(); // Tamil voice is reported, then rejected
  await sleep(250); // error fires at +10ms, transliteration retry starts
  assert(speakCount(speechState) >= beforeHeal + 2, "app retried after language-not-supported");
  const heal = speechState.calls.filter((c) => c.type === "speak").pop().utterance;
  assert(
    heal.text.includes("Akara Muthala Ezhuthellaam Aathi"),
    "retry utterance is the transliteration"
  );
  assert(labelOf(listenBtn(document, 1)) === "Stop", "playback continues — label stays Stop");
  assert(
    !toastText(document).toLowerCase().includes("couldn't"),
    "no failure toast when the self-heal succeeded"
  );

  console.log("\nspeech [not-allowed]: blocked playback tells the reader what to do:");
  speechState.persona.voiceError = false;
  speechState.persona.notAllowed = true;
  listenBtn(document, 1).click(); // stop
  await sleep(30);
  listenBtn(document, 1).click(); // start → engine refuses
  await sleep(50);
  assert(labelOf(listenBtn(document, 1)) === "Listen", "label resets after not-allowed");
  assert(
    toastText(document).toLowerCase().includes("blocked") ||
      toastText(document).includes("தடுக்கப்பட்டது"),
    "blocked toast is shown"
  );

  console.log("\nspeech [dead engine]: silent engine death recovers on the next click:");
  speechState.persona.notAllowed = false;
  speechState.persona.deadEngine = true;
  listenBtn(document, 1).click(); // stop
  await sleep(30);
  listenBtn(document, 1).click(); // start → engine dies at +20ms
  await sleep(500); // death + the app's own recovery window
  assert(speechState.speaking === false, "engine is idle after dying");
  const beforeRestart = speakCount(speechState);
  listenBtn(document, 1).click(); // must restart, not "stop silence"
  assert(speakCount(speechState) > beforeRestart, "click on a dead engine restarts playback");
  assert(labelOf(listenBtn(document, 1)) === "Stop", "label shows Stop for the new attempt");
  window.close();
}

/** English-only device: transliteration fallback + late Tamil voice upgrade. */
async function transliterationFallbackTests() {
  console.log("\nspeech [no tamil voice]: transliteration fallback (Windows/iOS-like device):");
  const { window, speechState } = boot({ voices: EN_VOICES });
  const { document } = window;
  listenBtn(document, 1).click();
  const first = speechState.utterances[0];
  assert(
    first.text.includes("Akara Muthala Ezhuthellaam Aathi"),
    "no Tamil voice → utterance is the transliterated couplet"
  );
  assert(first.voice && first.voice.name === "Microsoft David", "fallback uses the English voice");
  assert(first.lang === "en-US", "fallback utterance lang matches the voice");
  assert(
    toastText(document).toLowerCase().includes("transliteration"),
    "one-time toast explains the transliteration fallback"
  );
  assert(labelOf(listenBtn(document, 1)) === "Stop", "label flips to Stop during fallback playback");

  console.log("\nspeech [no tamil voice]: late-arriving Tamil voice upgrades playback:");
  speechState.voices = TA_VOICES;
  speechState.fireVoicesChanged();
  listenBtn(document, 1).click(); // stop the playing transliteration
  await sleep(60);
  listenBtn(document, 1).click(); // start again — Tamil voice has arrived
  await sleep(220);
  const latest = speechState.calls.filter((c) => c.type === "speak").pop().utterance;
  assert(
    latest.text.includes("அகர முதல எழுத்தெல்லாம்"),
    "after voiceschanged, the Tamil couplet is spoken"
  );
  assert(latest.voice && latest.voice.name === "Tamil India", "Tamil voice now selected");
  window.close();
}

/** Engine that reports no voices at all — must still never be silent. */
async function bareEngineTests() {
  console.log("\nspeech [empty voice list]: fallback still speaks something:");
  const { window, speechState } = boot({ voices: [] });
  const { document } = window;
  listenBtn(document, 1).click();
  const bareUtt = speechState.utterances[0];
  assert(
    bareUtt.text.includes("Akara Muthala"),
    "empty engine voice list → transliteration, never silence"
  );
  assert(bareUtt.lang === "en-IN", "default fallback lang is en-IN");
  window.close();
}

async function withoutSpeechTests() {
  console.log("\nspeech: unsupported browser path:");
  const { window } = boot({ withSpeech: false });
  const { document } = window;
  const btn = listenBtn(document, 1);
  assert(!!btn, "button still renders without speechSynthesis");
  btn.click(); // must not throw
  const toast = document.getElementById("app-status");
  assert(!toast.hidden, "unsupported toast is shown");
  assert(
    toast.textContent.includes("Audio is not available"),
    "toast carries the unsupported message"
  );
  assert(labelOf(btn) === "Listen", "label stays Listen when unsupported");
  window.close();
}

try {
  await tamilVoiceWindowTests();
  await transliterationFallbackTests();
  await bareEngineTests();
  await withoutSpeechTests();
} catch (err) {
  console.error("  ✗ UNEXPECTED ERROR:", err);
  failed++;
}

console.log(
  failed === 0 ? "\nAll speech tests passed." : `\n${failed} speech test(s) failed.`
);
process.exit(failed === 0 ? 0 : 1);
