```javascript
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


  // ============================
  // SSS初期化
  // ============================

  await new Promise(resolve =>
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
  // SDK
  // ============================

  await initSdk();



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


console.log("送金画面へ");


showPage(sendPage);



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




// 保有モザイク一覧をコピー

sendList.innerHTML =
mosaicList.innerHTML;



console.log(
"コピー完了:",
sendList.querySelectorAll(".mosaic-item").length
);






// コピー後にクリックイベント登録

sendList
.querySelectorAll(".mosaic-item")
.forEach(
(item)=>{


item.onclick = ()=>{


console.log(
"モザイククリック:",
item
);



const name =
item
.querySelector(
".mosaic-name"
)
.textContent;



const id =
item
.querySelector(
".mosaic-id"
)
.textContent;



const amount =
item
.querySelector(
".mosaic-amount"
)
.textContent;





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





// 送金入力画面へ

showPage(
transferPage
);



};


});


});









  // ============================
  // モザイク選択
  // mosaic → transfer
  // ============================


  document
  .getElementById(
    "send-mosaic-list"
  )
  ?.addEventListener(
    "click",
    (e)=>{


      const item =
        e.target.closest(
          ".mosaic-item"
        );



      if(!item){

        return;

      }





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





      console.log(
        "選択:",
        name,
        id,
        amount
      );






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





      showPage(
        transferPage
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
  // 受取
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
  // コピー
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
  // TX
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
```

