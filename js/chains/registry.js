// chains/registry.js
// 対応通貨のメタ情報を1箇所に集約する。
// UI・walletState・各chainアダプタはここを参照して動的にループ処理する。
//
// 追加通貨を増やす場合は、この配列にエントリを足し、
// 対応する chains/<id>/index.js に ChainAdapter を実装するだけでよい設計にする。
// （個別の if 分岐を index.js やUI側にばら撒かない）

/**
 * @typedef {Object} ChainMeta
 * @property {string} id              内部識別子（walletState.wallets のキーにもなる）
 * @property {string} name            表示名
 * @property {string} symbol          ティッカー
 * @property {number} decimals        表示上の小数桁数（残高フォーマット用。実際の最小単位換算はadapter側で行う）
 * @property {string} derivationPath  BIP32/44派生パス。{i} はaccountIndexに置換される
 * @property {"secp256k1"|"ed25519"} curve
 * @property {boolean} harvest        ステーキング/ハーベスト機能をUIに出すか
 * @property {boolean} multiAsset     1アカウントで複数アセットを保有しうるか（true: 保有トークン一覧タブを出す）。
 *                                    現状XYMのみtrue。BTC/ETH等は1アドレス=1アセットなので不要。
 * @property {string} adapterFamily   chains/ 配下のどのアダプタ実装を使うか（evm系は3通貨で共有するため）
 * @property {number} [evmChainId]    EVM系のみ。chainId
 * @property {string} [sdkFamily]     "symbol" の場合 symbol-sdk v3 を共有利用（XYM/XEM）
 */

/** @type {ChainMeta[]} */
export const CHAINS = [
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    derivationPath: "m/84'/0'/0'/0/{i}",
    curve: "secp256k1",
    harvest: false,
    multiAsset: false,
    adapterFamily: "btc",
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    derivationPath: "m/44'/60'/0'/0/{i}",
    curve: "secp256k1",
    harvest: false,
    adapterFamily: "evm",
    evmChainId: 1,
    multiAsset: false,
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    decimals: 18,
    derivationPath: "m/44'/60'/0'/0/{i}",
    curve: "secp256k1",
    harvest: false,
    adapterFamily: "evm",
    evmChainId: 137,
    multiAsset: false,
  },
  {
    id: "kaia",
    name: "Kaia",
    symbol: "KAIA",
    decimals: 18,
    derivationPath: "m/44'/60'/0'/0/{i}",
    curve: "secp256k1",
    harvest: false,
    adapterFamily: "evm",
    evmChainId: 8217,
    multiAsset: false,
  },
  {
    id: "xrp",
    name: "XRP",
    symbol: "XRP",
    decimals: 6,
    derivationPath: "m/44'/144'/0'/0/{i}",
    curve: "secp256k1",
    harvest: false,
    multiAsset: false,
    adapterFamily: "xrp",
  },
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
    derivationPath: "m/44'/501'/{i}'/0'",
    curve: "ed25519",
    harvest: false,
    multiAsset: false,
    adapterFamily: "sol",
  },
  {
    id: "xym",
    name: "Symbol",
    symbol: "XYM",
    decimals: 6,
    derivationPath: "symbol-bip32",
    curve: "ed25519",
    harvest: true,
    multiAsset: true,
    adapterFamily: "symbolFamily",
    sdkFamily: "symbol",
  },
  {
    id: "xem",
    name: "NEM",
    symbol: "XEM",
    decimals: 6,
    derivationPath: "symbol-bip32",
    curve: "ed25519",
    harvest: false,
    multiAsset: false,
    adapterFamily: "symbolFamily",
    sdkFamily: "symbol",
  },
];

/**
 * id からメタ情報を取得
 * @param {string} chainId
 * @returns {ChainMeta}
 */
export function getChainMeta(chainId) {
  const meta = CHAINS.find((c) => c.id === chainId);
  if (!meta) {
    throw new Error(`未対応の通貨IDです: ${chainId}`);
  }
  return meta;
}

/**
 * ハーベスト対応チェーンのみ抽出（現状XYMのみ）
 * @returns {ChainMeta[]}
 */
export function getHarvestableChains() {
  return CHAINS.filter((c) => c.harvest);
}
