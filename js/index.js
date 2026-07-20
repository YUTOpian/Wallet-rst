// index.js
// 画面遷移の統括と、各chain adapterへの getBalance / getRecentTx 呼び出し配線。
//
// SSS Extension連携は廃止済み。ログイン方式はニーモニックのみ。
// 通貨ごとの個別分岐（if (chainId === "xym") ...）はここには書かず、
// registry.js のメタ情報 + chains/<family>/index.js の ChainAdapter 経由で統一的に扱う。

import { CHAINS, getChainMeta } from "./chains/registry.js";
import { loadAdapter } from "./chains/common/adapter.js";
import { walletState, getWallet, resetWalletState } from "./walletState.js";
import { renderWalletList, updateChainCard, updateWalletTotal } from "./walletListPage.js";
import { setupAccountPage, wireAccountTabs } from "./accountPage.js";
import { renderTxList } from "./txList.js";
import { setText } from "./ui.js";
import { showPopup } from "./utils.js";

window.addEventListener("load", async () => {
  // ============================
  // ページ取得
  // ============================
  const connectPage = document.getElementById("connect-page");
  const walletListPage = document.getElementById("wallet-list-page");
  const accountPage = document.getElementById("account-page");
  const sendPage = document.getElementById("send-page");
  const transferPage = document.getElementById("transfer-page");
  const receivePage = document.getElementById("receive-page");
  const harvestPage = document.getElementById("harvest-page");

  // ============================
  // ページ切替
  // ============================
  function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    page.classList.add("active");
  }

  wireAccountTabs();

  // ============================================================
  // ログイン成功後：全通貨の鍵導出 → 残高取得 → 通貨選択画面へ
  // ============================================================
  async function onConnected() {
    showPage(walletListPage);
    renderWalletList(onSelectChain); // 先にカードの器だけ出し、各カードは isLoading 状態で表示
    await deriveAllWallets();
    updateWalletTotal();
  }

  /**
   * walletState.seed を元に、registry.js の全通貨分の鍵を導出し、
   * 導出できたものから順次 getBalance を叩いて walletState.wallets[chainId] を更新する。
   *
   * 1通貨のアダプタが未実装/失敗でも他の通貨の処理は止めない
   * （btc/evm/xrp/solは現状スタブのため、実装が揃うまではエラー表示になる想定）。
   */
  async function deriveAllWallets() {
    await Promise.all(
      CHAINS.map(async (meta) => {
        const wallet = getWallet(meta.id);
        wallet.isLoading = true;
        wallet.error = null;
        syncChainCard(meta.id);

        try {
          const adapter = await loadAdapter(meta);
          await adapter.init?.();

          const account = await adapter.deriveAccount(walletState.seed, walletState.accountIndex);
          wallet.address = account.address;
          wallet.publicKey = account.publicKey;
          wallet.keyMaterial = account.keyMaterial;

          await refreshWalletBalance(meta.id, adapter);
        } catch (e) {
          console.warn(`[${meta.id}] 鍵導出に失敗:`, e);
          wallet.error = e.message;
          wallet.isLoading = false;
          syncChainCard(meta.id);
        }
      })
    );
  }

  /**
   * 指定チェーンの残高を取得して walletState を更新する。
   * 通貨選択画面のカード・account-page（表示中の場合）の両方に反映する。
   *
   * @param {string} chainId
   * @param {import("./chains/common/adapter.js").ChainAdapter} [adapterOverride] 既にloadAdapter済みなら再利用
   */
  async function refreshWalletBalance(chainId, adapterOverride) {
    const meta = getChainMeta(chainId);
    const wallet = getWallet(chainId);
    if (!wallet.address) return;

    wallet.isLoading = true;
    wallet.error = null;

    try {
      const adapter = adapterOverride ?? (await loadAdapter(meta));
      const balanceInfo = await adapter.getBalance(wallet.address);
      wallet.balance = `${balanceInfo.balance} ${meta.symbol}`;
    } catch (e) {
      console.warn(`[${chainId}] getBalance失敗:`, e);
      wallet.error = e.message;
    } finally {
      wallet.isLoading = false;
    }

    syncChainCard(chainId);
    if (walletState.activeChain === chainId) {
      renderAccountBalance(chainId);
    }
  }

  /**
   * 指定チェーンの直近取引を取得し、account-page表示中ならDOMへ描画する。
   * @param {string} chainId
   */
  async function refreshWalletTx(chainId) {
    const meta = getChainMeta(chainId);
    const wallet = getWallet(chainId);
    if (!wallet.address) return;

    const txListEl = document.getElementById("tx-list");
    if (walletState.activeChain === chainId && txListEl) {
      txListEl.textContent = "読み込み中…";
    }

    try {
      const adapter = await loadAdapter(meta);
      const txList = await adapter.getRecentTx(wallet.address, 10);
      wallet.txList = txList;

      if (walletState.activeChain === chainId && txListEl) {
        renderTxList(txListEl, txList, meta);
      }
    } catch (e) {
      console.warn(`[${chainId}] getRecentTx失敗:`, e);
      if (walletState.activeChain === chainId && txListEl) {
        txListEl.textContent = "取引履歴の取得に失敗しました";
      }
    }
  }

  /** 通貨選択画面上の該当カードが今DOMに存在すれば表示を同期する */
  function syncChainCard(chainId) {
    const card = document.querySelector(`.chain-card[data-chain="${chainId}"]`);
    if (card) updateChainCard(card, chainId);
  }

  /** account-page上の残高・アドレス表示を更新する */
  function renderAccountBalance(chainId) {
    const wallet = getWallet(chainId);
    setText("account-address", wallet.address ?? "---");
    setText("account-balance", wallet.error ? "取得失敗" : wallet.balance ?? "取得中…");
  }

  // ============================================================
  // 通貨カード選択 → アカウント画面へ
  // ============================================================
  async function onSelectChain(chainId) {
    walletState.activeChain = chainId;

    setupAccountPage(chainId);
    renderAccountBalance(chainId);
    showPage(accountPage);

    // 画面を切り替えた時点の最新値を取り直す（連打・タイミングずれ対策）
    await Promise.all([refreshWalletBalance(chainId), refreshWalletTx(chainId)]);
  }

  document.getElementById("back-wallet-list")?.addEventListener("click", () => {
    showPage(walletListPage);
  });

  // ============================================================
  // ログアウト
  // ============================================================
  document.getElementById("wallet-logout-btn")?.addEventListener("click", () => {
    if (!confirm("ログアウトします。よろしいですか？")) return;
    resetWalletState();
    showPage(connectPage);
  });

  // ============================================================
  // ニーモニックログイン
  // ------------------------------------------------------------
  // mnemonic.js は現状Symbol専用実装（BIP39シード生成部分と、
  // Symbol固有の鍵導出・アカウント接続処理が未分離）のため、
  // チェーン非依存のシード生成/暗号化保存への切り出しは別タスクとする。
  //
  // ここでは「walletState.seed が確定した後」のマルチチェーン初期化
  // （onConnected）だけを配線し、ログインボタン自体の実処理は
  // mnemonic.js 汎用化タスクの完了後につなぎ込む。
  // ============================================================
  document.getElementById("mnemonic-unlock-btn")?.addEventListener("click", async () => {
    showPopup("⚠️ ニーモニックログインは汎用化対応中です（mnemonic.js未接続）", true);
    // TODO: const seed = await unlockStoredMnemonic(password);
    //       walletState.seed = seed; walletState.isUnlocked = true; await onConnected();
  });

  document.getElementById("mnemonic-import-btn")?.addEventListener("click", async () => {
    showPopup("⚠️ ニーモニックログインは汎用化対応中です（mnemonic.js未接続）", true);
    // TODO: const seed = await importMnemonic(mnemonic, opts);
    //       walletState.seed = seed; walletState.isUnlocked = true; await onConnected();
  });

  // ============================================================
  // 送金画面（現行のモザイク選択UIはXYM専用。汎用化は別タスク）
  // ============================================================
  document.getElementById("send-btn")?.addEventListener("click", () => {
    showPage(sendPage);
  });

  document.getElementById("btn-transfer")?.addEventListener("click", () => {
    showPopup("⚠️ 送金処理は汎用化対応中です（chain adapterのbuildSendTx/signTx未接続）", true);
    // TODO: 各chain adapterの buildSendTx → signer.requestSign → broadcast を接続する
  });

  // ============================================================
  // 受取画面
  // ============================================================
  document.getElementById("receive-btn")?.addEventListener("click", () => {
    const wallet = getWallet(walletState.activeChain);
    showPage(receivePage);
    setText("receive-address", wallet.address ?? "---");
    // QRコード生成は通貨ごとに方式が異なる（Symbol系はsymbol-qr-library等）ため別タスクで対応
  });

  document.getElementById("copy-receive-address")?.addEventListener("click", () => {
    const wallet = getWallet(walletState.activeChain);
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    showPopup("アドレスをコピーしました");
  });

  document.getElementById("copy-address-btn")?.addEventListener("click", () => {
    const wallet = getWallet(walletState.activeChain);
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    showPopup("アドレスをコピーしました");
  });

  // ============================================================
  // ステーキング画面（XYM専用。meta.harvest===trueのときだけボタンが見える前提）
  // ============================================================
  document.getElementById("harvest-btn")?.addEventListener("click", () => {
    showPage(harvestPage);
    setText("harvest-address", getWallet("xym").address ?? "---");
    // checkHarvestStatus / loadHarvestNodeCandidates は harvest.js のsymbolFamily移植後に接続する
  });

  // ============================================================
  // 戻る系
  // ============================================================
  document.getElementById("back-send")?.addEventListener("click", () => showPage(sendPage));
  document.getElementById("back-account-receive")?.addEventListener("click", () => showPage(accountPage));
  document.getElementById("back-account-harvest")?.addEventListener("click", () => showPage(accountPage));
});
