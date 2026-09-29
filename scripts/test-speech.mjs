/**
 * jsdom regression tests for the Listen (device TTS) feature.
 *
 *   npm install --no-save jsdom
 *   node scripts/test-speech.mjs
 *
 * Covers the defects fixed in the speech module:
 *  - Start/stop toggle on a kural card.
 *  - Switching to another kural while one is playing (the old code only
 *    stopped; the second click was swallowed).
 *  - A cancelled utterance's late "interrupted" error must not wipe the
 *    replacement utterance's Stop state (Chrome's async cancel behaviour).
 *  - Re-rendering the list mid-playback must keep the Stop label (innerHTML
 *    swaps used to drop it, so the next click silently stopped hidden audio).
 *  - Natural end resets every label, including the focus-dialog button.
 *  - Focus-dialog Listen button mirrors playback for the focused kural.
 *  - Browsers without speechSynthesis get the unsupported toast, no crash.
 *  - A Tamil voice is selected when the engine reports one.
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

/**
 * Install a controllable mock speech engine on a jsdom window *before*
 * js/app.js loads, so the app sees it at boot.
 */
function installSpeechMock(window) {
  const state = {
    speaking: false,
    pending: false,
    calls: [], // { type: "speak"|"cancel", utterance }
    utterances: [],
    voices: [],
  };

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

  const synth = {
    get speaking() { return state.speaking; },
    get pending() { return state.pending; },
    getVoices() { return state.voices; },
    addEventListener() { /* voiceschanged never fires in tests */ },
    removeEventListener() {},
    speak(utterance) {
      state.calls.push({ type: "speak", utterance });
      state.speaking = true;
      state.pending = false;
    },
    cancel() {
      state.calls.push({ type: "cancel" });
      const current = state.utterances[state.utterances.length - 1];
      state.speaking = false;
      state.pending = false;
      // Chrome fires a late asynchronous interrupted-error for cancelled
      // utterances; emulate it so the stale-callback guard is exercised.
      if (current) {
        window.setTimeout(() => {
          if (current.onerror) {
            current.onerror({ error: "interrupted" });
          }
        }, 10);
      }
    },
    resume() {},
    pause() {},
  };

  window.SpeechSynthesisUtterance = MockUtterance;
  window.speechSynthesis = synth;
  return state;
}

function boot({ withSpeech = true, voices = [] } = {}) {
  const html = read("index.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:8000/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  let speechState = null;
  if (withSpeech) {
    speechState = installSpeechMock(window);
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

function dailyBtn(document) {
  return document.querySelector('#daily-card [data-app-action="listen"]');
}

async function withSpeechTests() {
  console.log("\nspeech: start / stop toggle:");
  const { window, dom, speechState } = boot();
  const { document } = window;

  const btn1 = listenBtn(document, 1);
  assert(!!btn1, "kural-1 card renders a Listen button");
  assert(labelOf(btn1) === "Listen", "initial label is Listen");

  btn1.click();
  assert(speechState.calls.some((c) => c.type === "speak"), "click calls speechSynthesis.speak()");
  assert(
    speechState.utterances.length === 1 &&
      speechState.utterances[0].text.includes("அகர முதல எழுத்தெல்லாம்"),
    "utterance text is the kural's Tamil couplet"
  );
  assert(speechState.utterances[0].lang === "ta-IN", "utterance lang is ta-IN");
  assert(labelOf(btn1) === "Stop", "label flips to Stop while playing");
  assert(btn1.classList.contains("is-speaking"), "button gets is-speaking class");

  btn1.click(); // toggle off while engine reports speaking
  assert(
    speechState.calls.some((c) => c.type === "cancel"),
    "second click cancels playback"
  );
  await sleep(30); // let the mock's late interrupted-error fire
  assert(labelOf(btn1) === "Listen", "label returns to Listen after stop");
  assert(!btn1.classList.contains("is-speaking"), "is-speaking class removed");

  console.log("\nspeech: switching kural while playing:");
  // Restart kural 1, then click kural 2 — old code swallowed this click.
  listenBtn(document, 1).click();
  const btn2 = listenBtn(document, 2);
  btn2.click();
  await sleep(150); // includes the post-cancel speak() delay + late errors
  const speakCalls = speechState.calls.filter((c) => c.type === "speak");
  assert(speakCalls.length >= 2, "switching calls speak() for the second kural");
  assert(
    speakCalls[speakCalls.length - 1].utterance.text.includes("கற்றதனால்"),
    "second utterance is kural 2's text"
  );
  assert(labelOf(listenBtn(document, 1)) === "Listen", "old card label back to Listen");
  assert(labelOf(listenBtn(document, 2)) === "Stop", "new card label is Stop (stale interrupted-error ignored)");

  console.log("\nspeech: re-render mid-playback keeps Stop state:");
  const search = document.getElementById("search");
  search.value = "கற்றதனால்";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await sleep(200); // 120ms debounce + render
  const rendered = listenBtn(document, 2);
  assert(!!rendered, "filter still shows kural-2 card");
  assert(labelOf(rendered) === "Stop", "re-rendered card still shows Stop");
  assert(rendered.classList.contains("is-speaking"), "re-rendered card keeps is-speaking");

  console.log("\nspeech: natural end resets every control:");
  const current = speechState.utterances[speechState.utterances.length - 1];
  speechState.speaking = false;
  if (current.onend) current.onend();
  assert(labelOf(listenBtn(document, 2)) === "Listen", "card label reset on onend");

  console.log("\nspeech: focus-dialog button mirrors playback:");
  // Open focus mode for kural 3 via its card action, then play from the dialog.
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

  console.log("\nspeech: Tamil voice selection:");
  const withVoices = boot({
    voices: [
      { name: "English US", lang: "en-US" },
      { name: "Tamil India", lang: "ta-IN" },
    ],
  });
  const b = listenBtn(withVoices.window.document, 1);
  b.click();
  const utt = withVoices.speechState.utterances[0];
  assert(utt.voice && utt.voice.name === "Tamil India", "picks the ta-IN voice when available");
  withVoices.window.close();

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
  await withSpeechTests();
  await withoutSpeechTests();
} catch (err) {
  console.error("  ✗ UNEXPECTED ERROR:", err);
  failed++;
}

console.log(failed === 0 ? "\nAll speech tests passed." : `\n${failed} speech test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
