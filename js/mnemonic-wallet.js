// js/mnemonic-wallet.js
//
// Adds a native-feeling "HD Wallet" account type (mnemonic phrase -> NEM
// private key, BIP-39 + SLIP-10 ed25519) to the NanoWallet "create account"
// screen, without modifying the bundled app (main.js).
//
// DESIGN NOTES (read this before reviewing further)
// ---------------------------------------------------------------------------
// This file is a standalone script injected via <script> in start.html. It
// waits for the Angular injector, detects the "app.signup" state, and then
// patches the rendered DOM / reads $ctrl (SignupCtrl, controllerAs) via
// scope introspection. It never touches main.js.
//
// This approach is deliberately conservative for a browser-only prototype:
// if anything about the native template changes, the relevant selector
// simply won't match and this feature silently disables itself instead of
// breaking the rest of the app.
//
// Once created, an HD wallet is stored exactly like a private-key wallet
// (createPrivateKeyWallet() is reused as-is) — the mnemonic only matters at
// creation/restore time to deterministically re-derive the same private key.
// There is intentionally no separate "HD wallet" type persisted anywhere.

(function () {
  'use strict';

  // Guard against this entire script running more than once on the same
  // page (e.g. start.html accidentally including the <script> tag twice,
  // or some other re-injection). Without this, a second execution would
  // have its own independent sdkLoadPromise/sdkCore and would fetch +
  // dynamically import() a SECOND, separate copy of symbol-sdk from the
  // CDN -- and because each dynamic import() of a freshly created Blob
  // URL is treated by the browser as a distinct module instance (even
  // for identical source), this is exactly the kind of situation that
  // trips a "more than one instance of X found" guard somewhere in the
  // SDK's own dependency graph. Keeping initialization to a single run
  // is a cheap, safe way to rule this out entirely, regardless of the
  // exact library or mechanism responsible.
  if (window.__mnemonicWalletLoaded__) {
    console.warn('[mnemonic-wallet] script already initialized on this page; skipping duplicate run.');
    return;
  }
  window.__mnemonicWalletLoaded__ = true;

  var SDK_VERSION = '3.3.2';
  var SDK_URL = 'https://unpkg.com/symbol-sdk@' + SDK_VERSION + '/dist/bundle.web.js';
  var BIP39_WORDLIST_URL = 'https://unpkg.com/bip39@3.1.0/src/wordlists/english.json';

  // $ctrl._selectedType.type values. 1/2/3 are used natively (simple / brain
  // / private key); 4/5 are free and used here for the two HD wallet flows.
  var HD_CREATE_TYPE = 4;
  var HD_RESTORE_TYPE = 5;

  var INJECTOR_POLL_MS = 200;
  var INJECTOR_POLL_MAX = 50;

  var sdkCore = null;
  var NemFacade = null;
  var sdkLoadPromise = null;

  var wordlistCache = null;
  var wordlistLoadPromise = null;

  /* ============================================================
     i18n
     ------------------------------------------------------------
     NanoWallet ships 11 UI languages via $translateProvider
     (cn/de/en/es/it/jp/nl/pl/ptbr/ru/uk). This file only ships
     accurate strings for 'en' and 'jp' (the two languages the
     implementer can vouch for); every other language falls back
     to English until a native speaker contributes a translation.
  ============================================================ */
  var STRINGS = {
    en: {
      hd_create_button: 'HD Wallet (Create New)',
      hd_restore_button: 'HD Wallet (Restore)',
      info_create_p1: 'Derives keys from a BIP-39 mnemonic phrase to create your account. As long as you keep the mnemonic safe, you can restore the same account from it at any time.',
      info_create_p2: 'Your mnemonic is as sensitive as a private key. Avoid recording or sharing it on screen \u2014 write it down and keep it somewhere safe and offline.',
      info_restore_p1: 'Enter your existing mnemonic phrase to restore your account.',
      info_restore_p2: 'Your mnemonic is as sensitive as a private key. Only enter it in a safe environment.',
      title_create: 'Create HD Wallet',
      title_restore: 'Restore HD Wallet',
      back: 'Back',
      next: 'Next',
      create_button_final: 'Create',
      entropy_info: 'Move your mouse cursor to add extra "entropy" (randomness). The data collected is used only to generate your 24-word mnemonic.',
      entropy_start: 'Start',
      entropy_done: 'Done!',
      backup_warning: 'Do not show this word list to anyone. Write it down and keep it somewhere safe and offline.',
      passphrase_placeholder: 'BIP-39 passphrase (optional, advanced, usually left blank)',
      passphrase_label: 'Passphrase: ',
      account_index_label: 'Account index: ',
      address_preview_label: 'Address generated from this account index',
      restore_header: 'Enter your existing mnemonic',
      mnemonic_placeholder_create: 'Generated automatically after the entropy step below (you may overwrite it manually)',
      mnemonic_placeholder_restore: 'Enter your mnemonic (12\u201324 words)',
      step8_hd_warning: 'After confirming that your mnemonic has been backed up, you may send funds to your account at your own risk.',
      error_network_unsupported: 'HD wallets are not supported on this network (mainnet / testnet only)',
      error_mnemonic_generate_failed: 'Failed to generate a mnemonic: ',
      error_mnemonic_load_failed: 'Failed to read the mnemonic: '
    },
    jp: {
      hd_create_button: 'HD\u30a6\u30a9\u30ec\u30c3\u30c8(\u65b0\u898f\u4f5c\u6210)',
      hd_restore_button: 'HD\u30a6\u30a9\u30ec\u30c3\u30c8(\u5fa9\u5143)',
      info_create_p1: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af(BIP-39)\u30d5\u30ec\u30fc\u30ba\u304b\u3089\u9375\u3092\u5c0e\u51fa\u3057\u3066\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u4f5c\u6210\u3057\u307e\u3059\u3002\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u3055\u3048\u63a7\u3048\u3066\u304a\u3051\u3070\u3001\u540c\u3058\u5358\u8a9e\u5217\u304b\u3089\u4f55\u5ea6\u3067\u3082\u540c\u3058\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u5fa9\u5143\u3067\u304d\u307e\u3059\u3002',
      info_create_p2: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u306f\u79d8\u5bc6\u9375\u3068\u540c\u3058\u304f\u3089\u3044\u91cd\u8981\u3067\u3059\u3002\u753b\u9762\u306e\u8a18\u9332\u30fb\u5171\u6709\u306f\u907f\u3051\u3001\u7d19\u306a\u3069\u30aa\u30d5\u30e9\u30a4\u30f3\u306e\u5b89\u5168\u306a\u5834\u6240\u306b\u63a7\u3048\u3066\u304f\u3060\u3055\u3044\u3002',
      info_restore_p1: '\u304a\u6301\u3061\u306e\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u30d5\u30ec\u30fc\u30ba\u3092\u5165\u529b\u3057\u3066\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u5fa9\u5143\u3057\u307e\u3059\u3002',
      info_restore_p2: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u306f\u79d8\u5bc6\u9375\u3068\u540c\u3058\u304f\u3089\u3044\u91cd\u8981\u3067\u3059\u3002\u5165\u529b\u306f\u5b89\u5168\u306a\u74b0\u5883\u3067\u884c\u3063\u3066\u304f\u3060\u3055\u3044\u3002',
      title_create: 'HD\u30a6\u30a9\u30ec\u30c3\u30c8\u3092\u4f5c\u6210',
      title_restore: 'HD\u30a6\u30a9\u30ec\u30c3\u30c8\u3092\u5fa9\u5143',
      back: '\u623b\u308b',
      next: '\u6b21\u3078',
      create_button_final: '\u4f5c\u6210',
      entropy_info: '\u30de\u30a6\u30b9\u30ab\u30fc\u30bd\u30eb\u3092\u52d5\u304b\u3057\u3066\u3001\u4e71\u6570\u306e\u5143\u3068\u306a\u308b\u300c\u30a8\u30f3\u30c8\u30ed\u30d4\u30fc\u300d\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8ffd\u52a0\u3057\u305f\u60c5\u5831\u306f\u3001\u3042\u306a\u305f\u306e\u30cb\u30fc\u30e2\u30cb\u30c3\u30af(24\u5358\u8a9e)\u306e\u751f\u6210\u306b\u306e\u307f\u4f7f\u308f\u308c\u307e\u3059\u3002',
      entropy_start: '\u958b\u59cb',
      entropy_done: 'Done!',
      backup_warning: '\u751f\u6210\u3057\u305f\u5358\u8a9e\u5217\u306f\u8ab0\u306b\u3082\u898b\u305b\u305a\u3001\u7d19\u306a\u3069\u30aa\u30d5\u30e9\u30a4\u30f3\u306e\u5b89\u5168\u306a\u5834\u6240\u306b\u66f8\u304d\u7559\u3081\u3066\u304f\u3060\u3055\u3044\u3002',
      passphrase_placeholder: 'BIP39\u30d1\u30b9\u30d5\u30ec\u30fc\u30ba(\u4efb\u610f\u30fb\u4e0a\u7d1a\u8005\u5411\u3051\u30fb\u901a\u5e38\u306f\u7a7a\u6b04)',
      passphrase_label: '\u30d1\u30b9\u30d5\u30ec\u30fc\u30ba: ',
      account_index_label: '\u30a2\u30ab\u30a6\u30f3\u30c8\u756a\u53f7: ',
      address_preview_label: '\u3053\u306e\u30a2\u30ab\u30a6\u30f3\u30c8\u756a\u53f7\u304b\u3089\u751f\u6210\u3055\u308c\u308b\u30a2\u30c9\u30ec\u30b9',
      restore_header: '\u304a\u6301\u3061\u306e\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044',
      mnemonic_placeholder_create: '\u4e0b\u306e\u30a8\u30f3\u30c8\u30ed\u30d4\u30fc\u53ce\u96c6\u5f8c\u306b\u81ea\u52d5\u751f\u6210\u3055\u308c\u307e\u3059(\u624b\u5165\u529b\u3067\u4e0a\u66f8\u304d\u3059\u308b\u3053\u3068\u3082\u3067\u304d\u307e\u3059)',
      mnemonic_placeholder_restore: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af(12\u301c24\u5358\u8a9e)\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044',
      step8_hd_warning: '\u3042\u306a\u305f\u306e\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u304c\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u3055\u308c\u3066\u3044\u308b\u3053\u3068\u3092\u78ba\u8a8d\u3057\u305f\u5f8c\u306b\u3001\u3042\u306a\u305f\u306e\u30a2\u30ab\u30a6\u30f3\u30c8\u306b\u81ea\u5df1\u306e\u8cac\u4efb\u306b\u304a\u3044\u3066\u8cc7\u91d1\u3092\u9001\u91d1\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
      error_network_unsupported: '\u3053\u306e\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3067\u306fHD\u30a6\u30a9\u30ec\u30c3\u30c8\u306e\u4f5c\u6210\u306b\u5bfe\u5fdc\u3057\u3066\u3044\u307e\u305b\u3093(Mainnet / Testnet\u306e\u307f)',
      error_mnemonic_generate_failed: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u306e\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f: ',
      error_mnemonic_load_failed: '\u30cb\u30fc\u30e2\u30cb\u30c3\u30af\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f: '
    }
  };

  var CURRENT_LANG = 'en';
  var i18nAppliers = []; // functions to re-run whenever CURRENT_LANG changes

  function t(key) {
    var table = STRINGS[CURRENT_LANG] || STRINGS.en;
    return (table && table[key]) || STRINGS.en[key] || key;
  }

  function registerI18n(applyFn) {
    applyFn();
    i18nAppliers.push(applyFn);
  }

  function applyLanguage(lang) {
    CURRENT_LANG = STRINGS[lang] ? lang : 'en';
    i18nAppliers.forEach(function (fn) {
      try { fn(); } catch (e) { /* a stray DOM node was removed: ignore */ }
    });
  }

  /**
   * Reads NanoWallet's current angular-translate language and keeps our
   * own STRINGS table in sync with it, including live switching.
   */
  function bindToNativeLanguage(injector, ngScope) {
    var initial = 'en';
    try {
      var $translate = injector.get('$translate');
      initial = $translate.use() || $translate.preferredLanguage() || 'en';
    } catch (e) {
      /* $translate not available: default to English */
    }
    applyLanguage(initial);
    try {
      ngScope.$on('$translateChangeSuccess', function (evt, data) {
        applyLanguage((data && data.language) || initial);
      });
    } catch (e) {
      /* no-op: language will just stay at its initial value */
    }
  }

  /* ============================================================
     Small DOM helpers
  ============================================================ */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'text') node.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (!c) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function iconSpan(iconClass) {
    return el('span', { class: iconClass, 'aria-hidden': 'true' });
  }

  /** A text node whose content is re-applied whenever the language changes. */
  function i18nTextNode(key, transform) {
    var node = document.createTextNode('');
    registerI18n(function () {
      var s = t(key);
      node.textContent = transform ? transform(s) : s;
    });
    return node;
  }

  /** A plain element (e.g. <p>) whose textContent tracks a translation key. */
  function i18nText(tag, attrs, key) {
    var node = el(tag, attrs);
    registerI18n(function () { node.textContent = t(key); });
    return node;
  }

  /** A paragraph made of "<icon> <translated text>", both parts language-aware. */
  function i18nIconParagraph(iconClass, key) {
    var p = el('p', {});
    p.appendChild(iconSpan(iconClass));
    p.appendChild(document.createTextNode(' '));
    p.appendChild(i18nTextNode(key));
    return p;
  }

  /** Sets/updates the placeholder attribute of an input/textarea from a key. */
  function i18nPlaceholder(node, key) {
    registerI18n(function () { node.setAttribute('placeholder', t(key)); });
    return node;
  }

  /**
   * A button whose visible label is "<icon> text" or "text <icon>", built
   * from DOM nodes (never innerHTML), so the translated string itself never
   * has to carry markup.
   */
  function iconTextButton(cls, key, iconClass, iconPosition, extraAttrs) {
    var attrs = Object.assign({ type: 'button', class: cls }, extraAttrs || {});
    var btn = el('button', attrs);
    var textNode = i18nTextNode(key);
    if (iconPosition === 'before') {
      btn.appendChild(iconSpan(iconClass));
      btn.appendChild(document.createTextNode(' '));
      btn.appendChild(textNode);
    } else {
      btn.appendChild(textNode);
      btn.appendChild(document.createTextNode(' '));
      btn.appendChild(iconSpan(iconClass));
    }
    return btn;
  }

  function backButton(onClick) {
    var btn = iconTextButton('btn btn-dark', 'back', 'fa fa-chevron-left', 'before', { style: 'width:auto;' });
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** A button with no icon, just a translated label. */
  function textButton(cls, key, extraAttrs) {
    var attrs = Object.assign({ type: 'button', class: cls }, extraAttrs || {});
    var btn = el('button', attrs);
    btn.appendChild(i18nTextNode(key));
    return btn;
  }

  /** The recurring "[back] .......... [primary action]" row used by every step. */
  function actionRow(back, primary, hidden) {
    return el(
      'div',
      { class: 'row form-group', style: hidden ? 'display:none;' : '' },
      el('div', { class: 'col-md-2 col-sm-6' }, back),
      el('div', { class: 'col-md-10 col-sm-6' }, primary)
    );
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  /* ============================================================
     symbol-sdk lazy loading (only needed once step 4 is reached)
     ------------------------------------------------------------
     NOTE: this loads the crypto library from a public CDN at runtime,
     with no integrity pinning.

     Earlier version of this function fetched the source as text and
     wrapped it in a Blob URL before import()-ing it, specifically so a
     SHA-256 hash could be checked before the code ever ran. That broke
     in practice: symbol-sdk's bundle.web.js loads an additional
     WebAssembly chunk at runtime, resolved relative to the URL the
     module itself was loaded from. A blob: URL has no real "directory"
     for that resolution to work against, and under a file:// page
     origin (this app's normal "just open start.html" mode) it produced
     a bogus local file:// path that the browser then refused to fetch
     (CORS: "origin 'null' ... blocked"). Importing the real CDN URL
     directly avoids that, at the cost of no longer being able to
     hash-check the source before executing it. If that protection is
     needed again, the right fix is to self-host (vendor) the SDK's
     dist/ folder -- including its .wasm chunk -- alongside this file
     instead of pulling it live from a CDN at all; that also removes the
     runtime dependency on unpkg being reachable.
  ============================================================ */
  function loadSdk() {
    if (sdkCore && NemFacade) return Promise.resolve();
    if (sdkLoadPromise) return sdkLoadPromise;

    sdkLoadPromise = import(/* webpackIgnore: true */ SDK_URL)
      .then(function (sdk) {
        if (!sdk || !sdk.core || !sdk.core.Bip32 || !sdk.nem || !sdk.nem.NemFacade) {
          throw new Error('Failed to load symbol-sdk (Bip32 or NemFacade not found)');
        }
        if (!sdk.nem.NemFacade.BIP32_CURVE_NAME) {
          throw new Error('This symbol-sdk version has no NemFacade.BIP32_CURVE_NAME; check SDK_VERSION');
        }
        sdkCore = sdk.core;
        NemFacade = sdk.nem.NemFacade;
      })
      .catch(function (e) {
        sdkLoadPromise = null; // allow retrying on the next call
        throw wrapKnownSdkLoadError(e);
      });

    return sdkLoadPromise;
  }

  /**
   * Turns a couple of known, confusing symbol-sdk load failures into a
   * message that points at the actual cause instead of looking like a
   * bug in the mnemonic/derivation code.
   */
  function wrapKnownSdkLoadError(e) {
    var msg = e && e.message ? e.message : String(e);

    if (msg.indexOf('More than one instance of bitcore-lib found') !== -1) {
      return new Error(
        '[mnemonic-wallet] symbol-sdk failed to load because a second, ' +
        'conflicting copy of bitcore-lib is already present on this page. ' +
        'This is a build/dependency duplication issue (or the script ' +
        'running twice on the page), not a problem with the mnemonic ' +
        'itself. Original error: ' + msg
      );
    }

    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1) {
      return new Error(
        '[mnemonic-wallet] Could not load the HD wallet crypto library ' +
        'from ' + SDK_URL + '. This normally means either (a) there is ' +
        'no internet connection right now, or (b) the app is open via a ' +
        'file:// URL and the browser blocked a follow-up request the ' +
        'library needed to make (symbol-sdk loads an extra .wasm file ' +
        'at runtime; some browsers restrict what file:// pages can ' +
        'fetch). Opening this app via a local http:// server instead of ' +
        'double-clicking start.html avoids that restriction. Original ' +
        'error: ' + msg
      );
    }

    return e;
  }

  /* ============================================================
     BIP-39 English wordlist lazy loading (only needed for "generate new")
     NOTE: same CDN caveat as loadSdk() above.
  ============================================================ */
  function loadWordlist() {
    if (wordlistCache) return Promise.resolve(wordlistCache);
    if (wordlistLoadPromise) return wordlistLoadPromise;

    wordlistLoadPromise = fetch(BIP39_WORDLIST_URL, { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('wordlist http ' + res.status);
        return res.json();
      })
      .then(function (list) {
        if (!Array.isArray(list) || list.length !== 2048) {
          throw new Error('Unexpected wordlist format (expected 2048 entries)');
        }
        wordlistCache = list;
        return list;
      })
      .catch(function (e) {
        wordlistLoadPromise = null;
        throw e;
      });

    return wordlistLoadPromise;
  }

  /* ============================================================
     BIP-39 mnemonic generation (standard algorithm, 256 bits / 24
     words by default): entropy -> SHA-256 checksum -> 11-bit chunks
     mapped to wordlist indices.

     entropyToMnemonic() is a pure function (no randomness, no I/O)
     so it can be unit-tested directly against the official BIP-39
     test vectors — see mnemonic-wallet.spec.js.
  ============================================================ */
  function bytesToBinary(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) {
      bin += bytes[i].toString(2).padStart(8, '0');
    }
    return bin;
  }

  function entropyToMnemonic(entropyBytes, wordlist) {
    var strengthBits = entropyBytes.length * 8;
    return crypto.subtle.digest('SHA-256', entropyBytes).then(function (hashBuf) {
      var hashBytes = new Uint8Array(hashBuf);
      var entropyBits = bytesToBinary(entropyBytes);
      var checksumBitLength = strengthBits / 32;
      var checksumBits = bytesToBinary(hashBytes).slice(0, checksumBitLength);
      var bits = entropyBits + checksumBits;

      var words = [];
      for (var i = 0; i < bits.length; i += 11) {
        var idx = parseInt(bits.slice(i, i + 11), 2);
        words.push(wordlist[idx]);
      }
      return words.join(' ');
    });
  }

  /* ------------------------------------------------------------
     Stretches extra entropy (e.g. collected from mouse movement)
     to the required byte length via repeated SHA-256 (a minimal,
     ad hoc KDF — good enough since it is only ever XORed with an
     independent CSPRNG output, never used on its own).
  ------------------------------------------------------------ */
  function expandEntropyBytes(str, byteLen) {
    var enc = new TextEncoder();
    var chunks = [];

    function next() {
      var have = chunks.reduce(function (n, c) { return n + c.length; }, 0);
      if (have >= byteLen) {
        var out = new Uint8Array(byteLen);
        var offset = 0;
        for (var i = 0; i < chunks.length && offset < byteLen; i++) {
          var c = chunks[i];
          var n = Math.min(c.length, byteLen - offset);
          out.set(c.subarray(0, n), offset);
          offset += n;
        }
        return Promise.resolve(out);
      }
      var data = enc.encode(str + '|' + chunks.length);
      return crypto.subtle.digest('SHA-256', data).then(function (buf) {
        chunks.push(new Uint8Array(buf));
        return next();
      });
    }

    return next();
  }

  /* ------------------------------------------------------------
     Collects extra entropy from mouse movement, matching the look
     and feel of the native simple-wallet creation flow. Calls
     onDone(entropyString) once the progress bar reaches 100%.
     Returns a cancel() function to stop listening early.
  ------------------------------------------------------------ */
  function collectEntropy(barFillEl, onDone) {
    var width = 0;
    var entropy = '';
    function handler(e) {
      if (width >= 100) return;
      entropy += e.pageX + '' + e.pageY;
      width += 0.15;
      if (width > 100) width = 100;
      barFillEl.style.width = width + '%';
      barFillEl.textContent = Math.round(width) + '%';
      if (width >= 100) {
        document.removeEventListener('mousemove', handler);
        barFillEl.innerHTML = '<span class="fa fa-check-circle" aria-hidden="true"></span> ' + t('entropy_done');
        onDone(entropy);
      }
    }
    document.addEventListener('mousemove', handler);
    return function cancel() {
      document.removeEventListener('mousemove', handler);
    };
  }

  function generateMnemonicWords(strengthBits, extraEntropy) {
    strengthBits = strengthBits || 256;
    var byteLen = strengthBits / 8;
    return loadWordlist().then(function (wordlist) {
      var randomBytes = crypto.getRandomValues(new Uint8Array(byteLen));
      var entropyBytesPromise = extraEntropy
        ? expandEntropyBytes(extraEntropy, byteLen).then(function (extraBytes) {
            // XOR-combine the mouse-derived entropy with the CSPRNG output.
            // XORing with independent randomness can only add entropy, never
            // remove it, so this is safe even if extraEntropy were low quality.
            var mixed = new Uint8Array(byteLen);
            for (var i = 0; i < byteLen; i++) mixed[i] = randomBytes[i] ^ extraBytes[i];
            return mixed;
          })
        : Promise.resolve(randomBytes);

      return entropyBytesPromise.then(function (entropyBytes) {
        return entropyToMnemonic(entropyBytes, wordlist);
      });
    });
  }

  /* ============================================================
     Mnemonic -> NEM private key derivation

     Notes on symbol-sdk v3's actual API (worth double-checking on
     every SDK_VERSION bump, since this was not obvious from the docs):
       - bip32Path(accountIndex) is an instance method on a Facade,
         not a static/class method (e.g. facade.bip32Path(0)).
       - There is no bip32NodeToKeyPair() helper; derivePath(...)
         returns a node and you read its .privateKey directly.
       - Bip32's constructor takes (curveName, language); curveName
         comes from the Facade class's static BIP32_CURVE_NAME.
       - Getting an address/public key from a private key requires
         facade.createAccount(privateKey).
       - bip32Path()'s result does not depend on network type
         (mainnet/testnet), so a throwaway mainnet Facade is fine
         to use purely for computing the derivation path.
  ============================================================ */
  function derivePrivateKeyFromMnemonic(mnemonic, passphrase, accountIndex) {
    var normalized = mnemonic.trim().replace(/\s+/g, ' ');

    var bip32 = new sdkCore.Bip32(NemFacade.BIP32_CURVE_NAME, 'english');
    var root = bip32.fromMnemonic(normalized, passphrase || '');

    var tmpFacade = new NemFacade('mainnet');
    var childNode = root.derivePath(tmpFacade.bip32Path(accountIndex));

    return childNode.privateKey; // a PrivateKey instance
  }

  function deriveAccountInfo(privateKey, isTestnet) {
    var identifier = isTestnet ? 'testnet' : 'mainnet';
    var facade = new NemFacade(identifier);
    var account = facade.createAccount(privateKey);

    return {
      privateKey: privateKey.toString(),
      publicKey: account.publicKey.toString(),
      address: account.address.toString()
    };
  }

  /* ============================================================
     Test-only hook, exposed here so mnemonic-wallet.spec.js can reach
     the pure, side-effect-free pieces of this file without a bundler.
  ============================================================ */
  window.__mnemonicWalletInternal__ = {
    entropyToMnemonic: entropyToMnemonic,
    bytesToBinary: bytesToBinary,
    expandEntropyBytes: expandEntropyBytes
  };

  /* ============================================================
     Wait for the Angular injector, then detect the "app.signup" state
  ============================================================ */
  function waitForInjector(attempt) {
    var injector = null;
    try {
      injector = window.angular && window.angular.element(document).injector();
    } catch (e) {
      injector = null;
    }
    if (injector) { onInjectorReady(injector); return; }
    if (attempt >= INJECTOR_POLL_MAX) return;
    setTimeout(function () { waitForInjector(attempt + 1); }, INJECTOR_POLL_MS);
  }

  function onInjectorReady(injector) {
    var $transitions, $state, $timeout;
    try {
      $transitions = injector.get('$transitions');
      $state = injector.get('$state');
      $timeout = injector.get('$timeout');
    } catch (e) {
      return; // required services missing in this app version: disable
    }

    function tryMount() {
      $timeout(function () {
        try {
          var signupPageEl = document.querySelector('.signup-page');
          if (signupPageEl) mountHdWalletFeature(signupPageEl, injector);
        } catch (e) {
          console.warn('[mnemonic-wallet] failed to integrate with the signup screen:', e);
        }
      }, 50);
    }

    try {
      $transitions.onSuccess({ to: 'app.signup' }, function () { tryMount(); });
    } catch (e) {
      return; // $transitions missing/different signature: give up cleanly
    }

    // Also handle the case where the script loads while already on the
    // signup screen (e.g. a hard refresh).
    try {
      if ($state.current && $state.current.name === 'app.signup') tryMount();
    } catch (e) {}
  }

  /* ============================================================
     Main integration: wires the HD wallet flows into the rendered
     "create account" screen.
  ============================================================ */
  function mountHdWalletFeature(signupPageEl, injector) {
    if (signupPageEl.__mnwMounted) return;
    signupPageEl.__mnwMounted = true;

    var ngScope;
    try {
      ngScope = window.angular.element(signupPageEl).scope();
    } catch (e) {
      return;
    }
    var $ctrl = ngScope && ngScope.$ctrl;
    if (
      !$ctrl ||
      typeof $ctrl.createPrivateKeyWallet !== 'function' ||
      typeof $ctrl.checkPasswordsMatch !== 'function' ||
      typeof $ctrl.hideAllSteps !== 'function' ||
      !$ctrl.formData
    ) {
      // The controller doesn't look like what we expect: bail out quietly,
      // main.js keeps working exactly as it did before this script loaded.
      return;
    }

    i18nAppliers = []; // fresh set of bindings for this mount
    bindToNativeLanguage(injector, ngScope);

    function apply(fn) {
      try {
        if (ngScope.$root.$$phase) fn();
        else ngScope.$apply(fn);
      } catch (e) {
        console.warn('[mnemonic-wallet] internal error:', e);
      }
    }

    // signup.html has two divs with ng-show="!$ctrl._selectedType": in
    // document order, the first holds the type-selection buttons and the
    // second holds the (on-hover) type description panels.
    var typeSelectDivs = signupPageEl.querySelectorAll('div[ng-show="!$ctrl._selectedType"]');
    var buttonsContainer = typeSelectDivs[0];
    var infoContainer = typeSelectDivs[1];
    if (!buttonsContainer) return;

    var simpleBtn = buttonsContainer.querySelector('button[ng-click*="changeWalletType(1)"]');
    if (!simpleBtn) return;
    var privateKeyBtn = buttonsContainer.querySelector('button[ng-click*="changeWalletType(3)"]');

    /* ---- 0. Arrange the four type buttons into a 2x2 grid:
       [HD create]     [HD restore]
       [simple]        [private key]
    ---- */
    var hdCreateBtn = textButton('btn btn-primary', 'hd_create_button');
    hdCreateBtn.addEventListener('mouseover', function () {
      apply(function () { $ctrl.showInfo = HD_CREATE_TYPE; });
    });
    hdCreateBtn.addEventListener('click', function () {
      apply(function () {
        $ctrl._selectedType = { type: HD_CREATE_TYPE };
        $ctrl.start = true;
      });
    });

    var hdRestoreBtn = textButton('btn btn-primary', 'hd_restore_button');
    hdRestoreBtn.addEventListener('mouseover', function () {
      apply(function () { $ctrl.showInfo = HD_RESTORE_TYPE; });
    });
    hdRestoreBtn.addEventListener('click', function () {
      apply(function () {
        $ctrl._selectedType = { type: HD_RESTORE_TYPE };
        $ctrl.start = true;
      });
    });

    var typeButtonsRow1 = el('div', {
      style: 'display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;'
    });
    var typeButtonsRow2 = el('div', {
      style: 'display:flex;justify-content:center;flex-wrap:wrap;gap:12px;'
    });
    buttonsContainer.insertBefore(typeButtonsRow1, simpleBtn);
    buttonsContainer.insertBefore(typeButtonsRow2, simpleBtn);

    typeButtonsRow1.appendChild(hdCreateBtn);
    typeButtonsRow1.appendChild(hdRestoreBtn);
    typeButtonsRow2.appendChild(simpleBtn); // moved from its original position
    if (privateKeyBtn) typeButtonsRow2.appendChild(privateKeyBtn); // moved likewise

    /* ---- Type description panels (shown on hover, native pattern) ---- */
    if (infoContainer) {
      var infoCreateDiv = el(
        'div',
        { style: 'display:none;' },
        i18nIconParagraph('fa fa-info-circle', 'info_create_p1'),
        i18nIconParagraph('fa fa-exclamation-triangle', 'info_create_p2')
      );
      var infoRestoreDiv = el(
        'div',
        { style: 'display:none;' },
        i18nIconParagraph('fa fa-info-circle', 'info_restore_p1'),
        i18nIconParagraph('fa fa-exclamation-triangle', 'info_restore_p2')
      );
      infoContainer.appendChild(infoCreateDiv);
      infoContainer.appendChild(infoRestoreDiv);
      ngScope.$watch(
        function () { return $ctrl.showInfo; },
        function (v) {
          infoCreateDiv.style.display = v === HD_CREATE_TYPE ? '' : 'none';
          infoRestoreDiv.style.display = v === HD_RESTORE_TYPE ? '' : 'none';
        }
      );
    }

    /* ---- Step title (native titles are hardcoded for types 1/2/3 only) ---- */
    var titleHost = signupPageEl.querySelector('.form-group.text-center');
    if (titleHost) {
      var titleEl = el('h4', { style: 'display:none;' });
      titleHost.appendChild(titleEl);
      registerI18n(function () {
        var type = $ctrl._selectedType && $ctrl._selectedType.type;
        if (type === HD_CREATE_TYPE) titleEl.textContent = t('title_create');
        else if (type === HD_RESTORE_TYPE) titleEl.textContent = t('title_restore');
      });
      ngScope.$watch(
        function () { return $ctrl._selectedType && $ctrl._selectedType.type; },
        function (type) {
          if (type === HD_CREATE_TYPE) titleEl.textContent = t('title_create');
          else if (type === HD_RESTORE_TYPE) titleEl.textContent = t('title_restore');
        }
      );
      ngScope.$watch(
        function () {
          return !!(
            $ctrl._selectedType &&
            (
              $ctrl._selectedType.type === HD_CREATE_TYPE ||
              $ctrl._selectedType.type === HD_RESTORE_TYPE
            ) &&
            !($ctrl.step5 || $ctrl.step6 || $ctrl.step7 || $ctrl.step8)
          );
        },
        function (show) { titleEl.style.display = show ? '' : 'none'; }
      );
    }

    /* ---- Step 3 (password) "Next" button ----
       The native "Next" button is ng-show'd for types 1/3 only, so it
       never appears for type 4/5 (HD). Add an equivalent one. */
    var step3Container = signupPageEl.querySelector('[ng-show="$ctrl.step3"]');
    if (step3Container) {
      var step3Row = step3Container.querySelector('.row.form-group');
      if (step3Row) {
        var step3NextBtn = iconTextButton('btn btn-primary', 'next', 'fa fa-chevron-right', 'after', { style: 'width:100%;' });
        step3NextBtn.addEventListener('click', function () {
          apply(function () {
            if ($ctrl.okPressed) return;
            if (!$ctrl.formData.password || !$ctrl.formData.confirmPassword) return;
            if (!$ctrl.checkPasswordsMatch()) return;
            $ctrl.step3 = false;
            $ctrl.step4 = true;
          });
        });
        var step3NextCol = el('div', { class: 'col-md-10 col-sm-6', style: 'display:none;' }, step3NextBtn);
        step3Row.appendChild(step3NextCol);

        ngScope.$watch(
          function () {
            return !!(
              $ctrl.step3 &&
              $ctrl._selectedType &&
              ($ctrl._selectedType.type === HD_CREATE_TYPE || $ctrl._selectedType.type === HD_RESTORE_TYPE)
            );
          },
          function (show) { step3NextCol.style.display = show ? '' : 'none'; }
        );
        ngScope.$watch(
          function () {
            return !!($ctrl.formData.password && $ctrl.formData.confirmPassword) && !$ctrl.okPressed;
          },
          function (enabled) { step3NextBtn.disabled = !enabled; }
        );
      }
    }

    function isHdType(type) {
      return type === HD_CREATE_TYPE || type === HD_RESTORE_TYPE;
    }

    /* ---- Skip step 7 (private key display) for HD wallets ----
       The mnemonic (already backed up in step 4) is the real backup;
       showing the raw private key again adds nothing. For HD types only,
       wire step6 <-> step8 directly, bypassing step7. */
    var step6Container = signupPageEl.querySelector('[ng-show="$ctrl.step6"]');
    if (step6Container) {
      var step6ConfirmBtn = step6Container.querySelector('button[ng-click*="step7 = true"]');
      if (step6ConfirmBtn) {
        step6ConfirmBtn.addEventListener('click', function () {
          apply(function () {
            if (isHdType($ctrl._selectedType && $ctrl._selectedType.type) && $ctrl.step7) {
              $ctrl.step7 = false;
              $ctrl.step8 = true;
            }
          });
        });
      }
    }
    var step8Container = signupPageEl.querySelector('[ng-show="$ctrl.step8"]');
    if (step8Container) {
      var step8BackBtn = step8Container.querySelector('button[ng-click*="step7 = true"]');
      if (step8BackBtn) {
        step8BackBtn.addEventListener('click', function () {
          apply(function () {
            if (isHdType($ctrl._selectedType && $ctrl._selectedType.type) && $ctrl.step6) {
              $ctrl.step6 = true;
              $ctrl.step8 = false;
            }
          });
        });
      }

      /* ---- Step 8 warning text: swap "private key" wording for "mnemonic" (HD only) ---- */
      var step8WarningP = step8Container.querySelector('.form-group p');
      if (step8WarningP) {
        var step8OverlayP = el('p', { style: 'display:none;' });
        var overlayBold = el('b', {});
        overlayBold.appendChild(iconSpan('fa fa-exclamation-triangle'));
        overlayBold.appendChild(document.createTextNode(' '));
        overlayBold.appendChild(i18nTextNode('step8_hd_warning'));
        step8OverlayP.appendChild(overlayBold);
        step8WarningP.parentNode.insertBefore(step8OverlayP, step8WarningP.nextSibling);
        ngScope.$watch(
          function () { return isHdType($ctrl._selectedType && $ctrl._selectedType.type); },
          function (isHd) {
            step8WarningP.style.display = isHd ? 'none' : '';
            step8OverlayP.style.display = isHd ? '' : 'none';
          }
        );
      }
    }

    /* ---- Step 4: mnemonic entry panel (create and restore) ---- */
    buildStep4Panel(signupPageEl, ngScope, $ctrl, apply, {
      type: HD_CREATE_TYPE,
      showGenerateButton: true,
      showPassphrase: false,
      showAddressPreview: true,
      headerKey: null,
      mnemonicPlaceholderKey: 'mnemonic_placeholder_create',
      finalButtonKey: 'create_button_final'
    });
    buildStep4Panel(signupPageEl, ngScope, $ctrl, apply, {
      type: HD_RESTORE_TYPE,
      showGenerateButton: false,
      showPassphrase: false,
      showAddressPreview: true,
      headerKey: 'restore_header',
      mnemonicPlaceholderKey: 'mnemonic_placeholder_restore',
      finalButtonKey: 'next'
    });
  }

  function buildStep4Panel(signupPageEl, ngScope, $ctrl, apply, opts) {
    // Insert our own step-4 panel right after the native type-3 (private
    // key) one, since ours is closest to it in shape and purpose.
    var privKeyStep4 = signupPageEl.querySelector(
      '[ng-show="$ctrl.step4 && $ctrl._selectedType.type === 3"]'
    );
    var host = privKeyStep4 ? privKeyStep4.parentNode : signupPageEl.querySelector('.container');
    if (!host) return;

    var deriveState = { privateKeyHex: null };
    // Plays the same role as the native $ctrl.formData.entropy /
    // $ctrl.progressBar / $ctrl.entropyDone, but scoped to this panel only.
    var entropyState = { value: null, cancel: null };

    var mnemonicInput = i18nPlaceholder(
      el('textarea', {
        class: 'form-control',
        rows: opts.showGenerateButton ? '3' : '2',
        wrap: 'soft',
        style: 'width:100%;max-width:100%;white-space:pre-wrap;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;box-sizing:border-box;resize:vertical;'
      }),
      opts.mnemonicPlaceholderKey
    );
    var passphraseInput = opts.showPassphrase
      ? i18nPlaceholder(el('input', { class: 'form-control', type: 'text' }), 'passphrase_placeholder')
      : null;
    var indexInput = el('input', { class: 'form-control', type: 'number', min: '0', value: '0' });

    var addressPreviewValue = el('b', { text: '' });
    var previewFieldset = opts.showAddressPreview
      ? el(
          'fieldset',
          { class: 'form-group', style: 'display:none;' },
          i18nText('p', { class: 'text-center' }, 'address_preview_label'),
          el('div', { class: 'form-control' }, el('p', { style: 'font-size:15px;' }, addressPreviewValue))
        )
      : null;

    var errorText = el('p', { class: 'text-center', style: 'color:#a94442;' });
    var errorBox = el('div', { class: 'form-group', style: 'display:none;' }, errorText);

    var finalBtn = iconTextButton('btn btn-primary', opts.finalButtonKey, 'fa fa-chevron-right', 'after', {
      style: 'width:100%;',
      disabled: 'disabled'
    });
    var backBtn = backButton(goToTypeSelect);

    function goToTypeSelect() {
      apply(function () {
        $ctrl._selectedType = undefined;
        $ctrl.hideAllSteps();
      });
    }

    function showError(prefixKey, detail) {
      errorText.textContent = t(prefixKey) + (detail ? detail : '');
      errorBox.style.display = '';
      if (previewFieldset) previewFieldset.style.display = 'none';
      finalBtn.disabled = true;
      deriveState.privateKeyHex = null;
    }

    function currentNetworkKey() {
      if ($ctrl.network === 104) return 'mainnet';
      if ($ctrl.network === -104) return 'testnet';
      return null; // e.g. mijin, which symbol-sdk's NemFacade does not support
    }

    var updatePreview = debounce(function () {
      errorBox.style.display = 'none';
      if (previewFieldset) previewFieldset.style.display = 'none';
      finalBtn.disabled = true;
      deriveState.privateKeyHex = null;

      var mnemonic = mnemonicInput.value.trim();
      if (!mnemonic) return;

      var netKey = currentNetworkKey();
      if (!netKey) {
        showError('error_network_unsupported');
        return;
      }

      loadSdk()
        .then(function () {
          var idx = parseInt(indexInput.value, 10);
          if (!(idx >= 0)) idx = 0;
          var passphrase = passphraseInput ? passphraseInput.value : '';
          var privateKey = derivePrivateKeyFromMnemonic(mnemonic, passphrase, idx);
          var info = deriveAccountInfo(privateKey, netKey === 'testnet');
          deriveState.privateKeyHex = info.privateKey;
          addressPreviewValue.textContent = info.address;
          if (previewFieldset) previewFieldset.style.display = '';
          finalBtn.disabled = false;
        })
        .catch(function (e) {
          showError('error_mnemonic_load_failed', e && e.message ? e.message : String(e));
        });
    }, 400);

    mnemonicInput.addEventListener('input', updatePreview);
    if (passphraseInput) passphraseInput.addEventListener('input', updatePreview);
    indexInput.addEventListener('input', updatePreview);

    finalBtn.addEventListener('click', function () {
      if (!deriveState.privateKeyHex || finalBtn.disabled) return;
      apply(function () {
        // Everything past this point (encrypted storage, the safety
        // confirmation screens, adding to local storage) reuses the
        // native private-key wallet creation flow as-is.
        $ctrl.formData.privateKey = deriveState.privateKeyHex;
        $ctrl.createPrivateKeyWallet();
      });
    });

    /* ----------------------------------------------------------
       Entropy collection step. Reproduces the native simple-wallet
       creation flow (ng-show="$ctrl.step4 && $ctrl._selectedType.type
       === 1") exactly: info text -> "Start" -> progress bar -> "Next".
       Shown before the mnemonic panel, and only for the create flow.
    ---------------------------------------------------------- */
    var entropyPanel = null;
    var showPhase = null;

    if (opts.showGenerateButton) {
      var entropyInfoP = i18nText('p', { class: 'text-center' }, 'entropy_info');

      var entropyStartBtn = iconTextButton('btn btn-primary', 'entropy_start', 'fa fa-play-circle-o', 'before', { style: 'width:100%;' });
      var entropyStartRow = el(
        'div',
        { class: 'form-group' },
        el('hr', { style: 'border-color:#444;' }),
        el(
          'div',
          { class: 'row' },
          el('div', { class: 'col-md-2 col-sm-6' }, backButton(goToTypeSelect)),
          el('div', { class: 'col-md-10 col-sm-6' }, entropyStartBtn)
        )
      );

      var entropyBarFill = el('div', {
        style: 'height:20px;line-height:20px;color:#fff;text-align:center;font-size:12px;background-color:#5cb85c;width:0%;transition:width .15s linear;'
      });
      var entropyProgressRow = el(
        'div',
        { class: 'form-group', style: 'display:none;' },
        el('div', { class: 'progressBar', style: 'background:#222;border-radius:2px;overflow:hidden;' }, entropyBarFill),
        el('hr', { style: 'border-color:#444;' })
      );

      var entropyNextBtn = iconTextButton('btn btn-primary', 'next', 'fa fa-chevron-right', 'after', {
        style: 'width:100%;',
        disabled: 'disabled'
      });
      var entropyNextRow = actionRow(backButton(goToTypeSelect), entropyNextBtn, true);

      entropyStartBtn.addEventListener('click', function () {
        entropyStartRow.style.display = 'none';
        entropyProgressRow.style.display = '';
        entropyBarFill.style.width = '0%';
        entropyBarFill.textContent = '0%';
        entropyState.cancel = collectEntropy(entropyBarFill, function (extraEntropy) {
          entropyState.cancel = null;
          entropyState.value = extraEntropy;
          entropyNextRow.style.display = '';
          entropyNextBtn.disabled = false;
        });
      });

      entropyNextBtn.addEventListener('click', function () {
        if (!entropyState.value || entropyNextBtn.disabled) return;
        entropyNextBtn.disabled = true;
        generateMnemonicWords(256, entropyState.value)
          .then(function (words) {
            mnemonicInput.value = words;
            updatePreview();
            showPhase('mnemonic');
          })
          .catch(function (e) {
            showPhase('mnemonic');
            showError('error_mnemonic_generate_failed', e && e.message ? e.message : String(e));
          })
          .then(function () { entropyNextBtn.disabled = false; });
      });

      entropyPanel = el(
        'div',
        {},
        el('div', { class: 'form-group' }, entropyInfoP),
        entropyStartRow,
        entropyProgressRow,
        entropyNextRow
      );
    }

    function resetEntropyPhaseUi() {
      if (entropyState.cancel) {
        entropyState.cancel();
        entropyState.cancel = null;
      }
      entropyState.value = null;
      if (!opts.showGenerateButton) return;
      entropyStartRow.style.display = '';
      entropyProgressRow.style.display = 'none';
      entropyNextRow.style.display = 'none';
      entropyNextBtn.disabled = true;
      entropyBarFill.style.width = '0%';
      entropyBarFill.textContent = '0%';
    }

    var mnemonicFieldset = el(
      'div',
      {},
      el(
        'fieldset',
        { class: 'form-group' },
        opts.headerKey ? i18nText('p', { class: 'text-center' }, opts.headerKey) : null,
        mnemonicInput
      ),
      opts.showGenerateButton ? i18nIconParagraph('fa fa-exclamation-triangle', 'backup_warning') : null,
      passphraseInput
        ? el(
            'fieldset',
            { class: 'form-group' },
            el(
              'div',
              { class: 'input-group' },
              el('span', { class: 'input-group-btn' }, i18nText('label', {}, 'passphrase_label')),
              passphraseInput
            )
          )
        : null,
      el(
        'fieldset',
        { class: 'form-group' },
        el(
          'div',
          { class: 'input-group' },
          el('span', { class: 'input-group-btn' }, i18nText('label', {}, 'account_index_label')),
          indexInput
        )
      ),
      previewFieldset,
      errorBox,
      actionRow(backBtn, finalBtn, false)
    );

    var panel = el('div', { class: 'col-md-offset-3 col-md-6', style: 'display:none;' }, entropyPanel, mnemonicFieldset);

    showPhase = function (phase) {
      if (entropyPanel) entropyPanel.style.display = phase === 'entropy' ? '' : 'none';
      mnemonicFieldset.style.display = phase === 'mnemonic' ? '' : 'none';
    };
    // Create: start at the entropy step. Restore: go straight to mnemonic entry.
    showPhase(opts.showGenerateButton ? 'entropy' : 'mnemonic');

    host.insertBefore(panel, privKeyStep4 ? privKeyStep4.nextSibling : null);

    ngScope.$watch(
      function () {
        return !!($ctrl.step4 && $ctrl._selectedType && $ctrl._selectedType.type === opts.type);
      },
      function (show) {
        panel.style.display = show ? '' : 'none';
        if (!show) {
          // Leaving the step: don't leave the mnemonic sitting in the DOM.
          mnemonicInput.value = '';
          if (passphraseInput) passphraseInput.value = '';
          indexInput.value = '0';
          deriveState.privateKeyHex = null;
          errorBox.style.display = 'none';
          if (previewFieldset) previewFieldset.style.display = 'none';
          finalBtn.disabled = true;
          resetEntropyPhaseUi();
          showPhase(opts.showGenerateButton ? 'entropy' : 'mnemonic');
        }
      }
    );

    ngScope.$watch(function () { return $ctrl.network; }, function () { updatePreview(); });
  }

  /* ============================================================
     Entry point. Wrapped in try/catch so a failure here can never
     take down the rest of the app.
  ============================================================ */
  function init() {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        console.warn('[mnemonic-wallet] Web Crypto API unavailable; disabling this feature');
        return;
      }
      waitForInjector(0);
    } catch (e) {
      console.warn('[mnemonic-wallet] initialization failed; disabling this feature:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
