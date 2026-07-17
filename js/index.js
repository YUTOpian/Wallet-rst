import { appState } from "./config.js";
import { autoConnectSSS } from "./sss.js";
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";



window.addEventListener(
"load",
async()=>{


  // ============================
  // SSS初期化
  // ============================


  await new Promise(
    resolve =>
      setTimeout(resolve,1000)
  );



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





  // ============================
  // SDK初期化
  // ============================


  await initSdk();



  // アカウント取得

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
  // ページ切替
  // ============================


  function showPage(page){


    document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      p=>{

        p.classList.remove(
          "active"
        );

      }
    );



    page.classList.add(
      "active"
    );


  }




  // ============================
  // 送金ボタン
  // account
  // ↓
  // mosaic選択
  // ============================


  document
  .getElementById(
    "send-btn"
  )
  ?.addEventListener(
    "click",
    ()=>{


      console.log(
        "送金画面へ"
      );



      showPage(
        sendPage
      );




      const sendList =
        document.getElementById(
          "send-mosaic-list"
        );



      const mosaicList =
        document.getElementById(
          "mosaic-list"
        );



      if(
        !sendList ||
        !mosaicList
      ){

        console.log(
          "モザイク一覧取得失敗"
        );

        return;

      }





      // 保有モザイク一覧コピー

      sendList.innerHTML =
        mosaicList.innerHTML;



      console.log(
        "送金一覧件数:",
        sendList
        .querySelectorAll(
          ".mosaic-item"
        )
        .length
      );



    }
  );









  // ============================
  // モザイク選択
  // mosaic
  // ↓
  // transfer
  // ============================


 const sendMosaicList =
  document.getElementById(
    "send-mosaic-list"
  );


sendMosaicList.onclick =
function(e){


  const item =
    e.target.closest(
      ".mosaic-item"
    );


  if(!item){

    return;

  }


  console.log(
    "モザイククリック",
    item
  );


  const name =
    item
    .querySelector(
      ".mosaic-name"
    )
    ?.textContent
    .trim();


  const id =
    item
    .querySelector(
      ".mosaic-id"
    )
    ?.textContent
    .trim();


  const amount =
    item
    .querySelector(
      ".mosaic-amount"
    )
    ?.textContent
    .trim();


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


  console.log(
    "送金対象:",
    name,
    id,
    amount
  );


  showPage(
    transferPage
  );


};








  // ============================
  // 戻る
  // mosaic
  // ↓
  // account
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
  // transfer
  // ↓
  // mosaic
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
// 受け取り
// ============================


document
.getElementById(
  "receive-btn"
)
?.addEventListener(
  "click",
  ()=>{


    console.log(
      "受取画面"
    );



    showPage(
      receivePage
    );



    const address =
      document
      .getElementById(
        "account-address"
      )
      .textContent
      .trim();



    // アドレス表示

    document
    .getElementById(
      "receive-address"
    )
    .textContent =
      address;




    // QRコード生成

    const qr =
      document
      .getElementById(
        "receive-qrcode"
      );


    qr.innerHTML = "";



    new QRCode(
      qr,
      {
        text: address,
        width: 200,
        height: 200
      }
    );


  }
);


// ============================
// 受取画面 → アカウントへ戻る
// ============================


document
.getElementById(
  "back-account-receive"
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
        .textContent
        .trim();




      navigator.clipboard
      .writeText(addr)
      .then(
        ()=>{


          showPopup(
            "アドレスをコピーしました"
          );


        }
      );


    }
  );









  // ============================
  // TX読み込み
  // ============================


  await loadRecentTx();




  if(
    appState.currentAddress
  ){

    initWebSocket(
      appState.currentAddress
      .toString()
    );



    initLiveTx(
      appState.currentAddress
      .toString()
    );

  }




});
