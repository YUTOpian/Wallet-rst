import { appState } from "./config.js";

console.log("index.js loaded");


import { autoConnectSSS } from "./sss.js";
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";



window.addEventListener("load", async () => {


  // SSS初期化待ち
  await new Promise(resolve =>
    setTimeout(resolve,1000)
  );



  // SSS接続

  await autoConnectSSS();




  if(
    !window.SSS ||
    !window.SSS.activePublicKey
  ){

    showPopup(
      "⚠️ SSS Extension とリンクしてください",
      true
    );

    return;

  }


  // SDK初期化

  await initSdk();


  // アカウント情報取得

  await refreshAccount();




  // ============================
  // ページ取得
  // ============================


  const accountPage =
    document.getElementById(
      "account-page"
    );


  const sendPage =
    document.getElementById(
      "send-page"
    );


  const transferPage =
    document.getElementById(
      "transfer-page"
    );


  const receivePage =
    document.getElementById(
      "receive-page"
    );



  // ============================
  // ページ切替関数
  // ============================


  function showPage(page){


    document
    .querySelectorAll(".page")
    .forEach(
      p=>{
        p.classList.remove("active");
      }
    );


    page.classList.add("active");


  }



  // ============================
  // 送金ボタン
  // account → mosaic選択
  // ============================


  document
  .getElementById("send-btn")
  ?.addEventListener(
    "click",
    ()=>{


      showPage(sendPage);


      const sendList =
        document.getElementById(
          "send-mosaic-list"
        );


      const mosaicList =
        document.getElementById(
          "mosaic-list"
        );



      // 保有モザイクをコピー

      sendList.innerHTML =
        mosaicList.innerHTML;

console.log(
  "送金一覧HTML:",
  sendList.innerHTML
);


console.log(
  "mosaic item数:",
  sendList.querySelectorAll(".mosaic-item").length
);

      

      // モザイク選択

      sendList
      .querySelectorAll(
        ".mosaic-item"
      )
      .forEach(
        item=>{

console.log(
  "送金一覧件数:",
  sendList.querySelectorAll(".mosaic-item").length
);
          item.addEventListener(
            "click",
            ()=>{


              const name =
                item
                .querySelector(
                  ".mosaic-name"
                )
                ?.textContent;



              const id =
                item
                .querySelector(
                  ".mosaic-id"
                )
                ?.textContent;



              const amount =
                item
                .querySelector(
                  ".mosaic-amount"
                )
                ?.textContent;






              document
              .getElementById(
                "selected-mosaic-name"
              )
              .textContent =
                name;



              document
              .getElementById(
                "selected-mosaic-id"
              )
              .value =
                id;



              document
              .getElementById(
                "selected-mosaic-balance"
              )
              .textContent =
                amount;





              // mosaic選択
              // → 送金画面

              showPage(
                transferPage
              );



            }
          );


        }
      );



    }
  );









  // ============================
  // 戻る
  // mosaic → account
  // ============================


  document
  .getElementById(
    "back-account"
  )
  ?.addEventListener(
    "click",
    ()=>{


      showPage(
        accountPage
      );


    }
  );







  // ============================
  // 戻る
  // transfer → mosaic
  // ============================


  document
  .getElementById(
    "back-send"
  )
  ?.addEventListener(
    "click",
    ()=>{


      showPage(
        sendPage
      );


    }
  );









  // ============================
  // 送金実行
  // ============================


  document
  .getElementById(
    "btn-transfer"
  )
  ?.addEventListener(
    "click",
    sendTx
  );









  // ============================
  // 受取画面
  // ============================


  document
  .getElementById(
    "receive-btn"
  )
  ?.addEventListener(
    "click",
    ()=>{


      showPage(
        receivePage
      );


    }
  );








  // ============================
  // アドレスコピー
  // ============================


  document
  .getElementById(
    "copy-address-btn"
  )
  ?.addEventListener(
    "click",
    ()=>{


      const addr =
        document
        .getElementById(
          "account-address"
        )
        .textContent;



      navigator.clipboard
      .writeText(addr)
      .then(()=>{


        showPopup(
          "アドレスをコピーしました"
        );


      });


    }
  );









  // ============================
  // TX読み込み
  // ============================


  await loadRecentTx();



  initWebSocket(
    appState.currentAddress
    .toString()
  );



  initLiveTx(
    appState.currentAddress
    .toString()
  );



});
