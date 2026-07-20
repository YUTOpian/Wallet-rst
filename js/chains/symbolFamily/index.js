// chains/symbolFamily/index.js
// XYM(Symbol) / XEM(NEM) 共通 ChainAdapter 実装（未実装スタブ）
//
// 両通貨とも symbol-sdk v3 を使う想定。
// 既存資産（旧 sdk.js / account.js / transfer.js / transactions.js / nodeSelector.js）を
// ここに移植する。harvest.js の中身（委任ハーベスト）はXYM専用のため、
// この共有アダプタとは別に symbolFamily/harvest.js として残し、
// meta.harvest === true (=XYMのみ) のときだけUI側から呼び出す。
//
// 要確認事項:
//  - symbol-sdk v3 が NIS1(NEM本家) のトランザクションフォーマット/REST APIを
//    どこまでカバーしているか（XYMとはネットワークが別物なので要検証）
//  - XEM用のノード選定方法（XYMはNodeWatchを使っているが、XEM/NIS1向けの
//    同等サービスがあるか要調査。無ければfallbackノード方式のみにする）

/**
 * @param {import("../registry.js").ChainMeta} meta  meta.id は "xym" または "xem"
 * @returns {import("../common/adapter.js").ChainAdapter}
 */
export function createAdapter(meta) {
  return {
    async init() {
      throw new Error(`[${meta.id}] init（SDK読み込み・facade初期化） 未実装`);
    },
    async deriveAccount(seed, accountIndex) {
      // 旧 mnemonic.js の deriveKeyPairFromMnemonic 相当をここに移植する
      throw new Error(`[${meta.id}] deriveAccount 未実装`);
    },
    async getBalance(address) {
      // 旧 account.js の refreshAccount 相当（残高部分のみ抽出）
      throw new Error(`[${meta.id}] getBalance 未実装`);
    },
    async getRecentTx(address, limit) {
      // 旧 transactions.js の loadRecentTx 相当
      throw new Error(`[${meta.id}] getRecentTx 未実装`);
    },
    async buildSendTx(params, fromAddress) {
      // 旧 transfer.js の sendTx 前半（Descriptor組み立て）相当
      throw new Error(`[${meta.id}] buildSendTx 未実装`);
    },
    async signTx(unsignedTx, keyMaterial) {
      // 旧 signer.js のニーモニック分岐相当
      throw new Error(`[${meta.id}] signTx 未実装`);
    },
    async broadcast(signedTx) {
      // 旧 transfer.js の sendTx 後半（PUT /transactions）相当
      throw new Error(`[${meta.id}] broadcast 未実装`);
    },
    subscribeLive(address, onEvent) {
      // 旧 ws.js の initLiveTx 相当（XYMのみ有効。XEMは要調査）
      throw new Error(`[${meta.id}] subscribeLive 未実装`);
    },
  };
}
