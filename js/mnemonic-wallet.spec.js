// tests/mnemonic-wallet.spec.js
//
// Verifies entropyToMnemonic() (the pure BIP-39 entropy -> mnemonic function
// in js/mnemonic-wallet.js) against a subset of the official BIP-39 test
// vectors (trezor/python-mnemonic, English wordlist, public domain).
//
// This reaches through window.__mnemonicWalletInternal__ because the file
// under test is currently loaded as a standalone <script>, outside the
// app's module system — see the comment above that export in
// mnemonic-wallet.js.

describe('mnemonic-wallet: entropyToMnemonic (BIP-39)', function () {
  var entropyToMnemonic;
  var wordlist;

  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  beforeAll(function (done) {
    entropyToMnemonic = window.__mnemonicWalletInternal__.entropyToMnemonic;
    // Test-only wordlist load; the app itself fetches this from a CDN today
    // (see the TODO on loadWordlist() in mnemonic-wallet.js).
    fetch('https://unpkg.com/bip39@3.1.0/src/wordlists/english.json')
      .then(function (res) { return res.json(); })
      .then(function (list) { wordlist = list; done(); })
      .catch(done.fail);
  });

  // A representative subset of the official BIP-39 vectors, covering the
  // 128-bit (12-word) and 256-bit (24-word) strengths this app uses.
  var VECTORS = [
    {
      entropyHex: '00000000000000000000000000000000000000000000000000000000000000'.slice(0, 32),
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    },
    {
      entropyHex: 'ffffffffffffffffffffffffffffffff',
      mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
    },
    {
      entropyHex: '0000000000000000000000000000000000000000000000000000000000000000000000000000'.slice(0, 64),
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    },
    {
      entropyHex: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'
    }
  ];

  VECTORS.forEach(function (vector) {
    it('derives the correct mnemonic for entropy ' + vector.entropyHex, function (done) {
      entropyToMnemonic(hexToBytes(vector.entropyHex), wordlist)
        .then(function (mnemonic) {
          expect(mnemonic).toEqual(vector.mnemonic);
          done();
        })
        .catch(done.fail);
    });
  });

  it('produces a 24-word mnemonic for 256 bits of entropy', function (done) {
    var entropy = new Uint8Array(32); // 256 bits, all zero for determinism
    entropyToMnemonic(entropy, wordlist)
      .then(function (mnemonic) {
        expect(mnemonic.split(' ').length).toEqual(24);
        done();
      })
      .catch(done.fail);
  });
});
