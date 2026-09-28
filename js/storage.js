/* Tamil Stoic — private reader storage
 *
 * This small adapter keeps saved Kurals and reflections on the reader's device.
 * IndexedDB is used when available; a localStorage + in-memory fallback keeps
 * the feature useful in restrictive/private browsing contexts. Keeping a
 * single async interface makes optional cloud sync possible later without
 * coupling the reader UI to an account provider.
 */
(function (global) {
  "use strict";

  var DB_NAME = "tamil-stoic-reader";
  var DB_VERSION = 1;
  var STORE_NAME = "saved-kurals";
  var FALLBACK_KEY = "tamil-stoic-saved-v1";
  var dbPromise = null;
  var memoryFallback = {};

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalise(record) {
    var n = Number(record && record.n);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("A saved Kural needs a valid number.");
    }
    var now = Date.now();
    return {
      n: n,
      note: String(record && record.note ? record.note : "").slice(0, 500),
      savedAt: Number(record && record.savedAt) || now,
      updatedAt: Number(record && record.updatedAt) || now,
    };
  }

  function readFallback() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(FALLBACK_KEY);
      if (!raw) return clone(memoryFallback);
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : clone(memoryFallback);
    } catch (error) {
      return clone(memoryFallback);
    }
  }

  function writeFallback(records) {
    memoryFallback = clone(records);
    try {
      if (global.localStorage) global.localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
    } catch (error) {
      // Browsers can deny localStorage in private contexts. The in-memory copy
      // still lets the current reading session remain calm and functional.
    }
  }

  function openDatabase() {
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB unavailable"));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var request;
      try {
        request = global.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "n" });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Unable to open reader storage")); };
      request.onblocked = function () { reject(new Error("Reader storage is blocked")); };
    });

    return dbPromise;
  }

  function usingDatabase(operation, fallback) {
    return openDatabase().then(operation).catch(function () {
      return fallback();
    });
  }

  function requestResult(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Reader storage request failed")); };
    });
  }

  var store = {
    getAll: function () {
      return usingDatabase(function (db) {
        var transaction = db.transaction(STORE_NAME, "readonly");
        return requestResult(transaction.objectStore(STORE_NAME).getAll()).then(function (records) {
          return records.map(normalise);
        });
      }, function () {
        var records = readFallback();
        return Object.keys(records).map(function (key) { return normalise(records[key]); });
      });
    },

    put: function (record) {
      var clean = normalise(record);
      return usingDatabase(function (db) {
        var transaction = db.transaction(STORE_NAME, "readwrite");
        return requestResult(transaction.objectStore(STORE_NAME).put(clean)).then(function () {
          return clean;
        });
      }, function () {
        var records = readFallback();
        records[String(clean.n)] = clean;
        writeFallback(records);
        return clean;
      });
    },

    remove: function (n) {
      n = Number(n);
      if (!Number.isInteger(n) || n < 1) return Promise.resolve();
      return usingDatabase(function (db) {
        var transaction = db.transaction(STORE_NAME, "readwrite");
        return requestResult(transaction.objectStore(STORE_NAME).delete(n)).then(function () {
          return undefined;
        });
      }, function () {
        var records = readFallback();
        delete records[String(n)];
        writeFallback(records);
      });
    },
  };

  global.TamilStoicStore = store;
})(window);
