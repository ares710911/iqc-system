function doPost(e) {
  try {
    console.log("1. 開始處理請求，收到參數數量：" + Object.keys(e.parameter).length);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    console.log("2. 成功取得試算表：" + sheet.getName());
    
    const data = e.parameter;
    let poPhotoUrl = '';
    let physicalPhotoUrl = '';

    console.log("3. 準備處理圖片上傳...");
    if (data.poPhotoBase64) {
      console.log("發現 PO 圖片，長度：" + data.poPhotoBase64.length);
      poPhotoUrl = saveImageToDrive(data.poPhotoBase64, `PO_${data.poNumber}_${new Date().getTime()}.jpg`);
      console.log("PO 圖片上傳結果：" + poPhotoUrl);
    }
    
    if (data.physicalPhotoBase64) {
      console.log("發現 PH 圖片，長度：" + data.physicalPhotoBase64.length);
      physicalPhotoUrl = saveImageToDrive(data.physicalPhotoBase64, `PH_${data.partNumber}_${new Date().getTime()}.jpg`);
      console.log("PH 圖片上傳結果：" + physicalPhotoUrl);
    }

    const rowData = [
      data.uploadDate, data.personnel, data.poNumber, data.partNumber, data.partName,
      data.receiptQty, data.vendor, data.inspectionMethod, data.appearance, data.dimensions,
      data.characteristics, data.sampleA || '', data.sampleB || '', data.sampleC || '',
      data.sampleD || '', data.sampleE || '', data.sampleF || '', data.result,
      poPhotoUrl, physicalPhotoUrl
    ];

    console.log("4. 準備寫入試算表，資料：" + JSON.stringify(rowData));
    sheet.appendRow(rowData);
    console.log("5. 寫入成功！");

    return HtmlService.createHtmlOutput('Success');
  } catch (error) {
    // 把真正的錯誤訊息印到監控日誌裡面！
    console.error("★★★發生致命錯誤★★★", error.toString(), error.stack);
    return HtmlService.createHtmlOutput('Error: ' + error.toString());
  }
}

function saveImageToDrive(base64Data, filename) {
  if (!base64Data) return '';
  try {
    // 有時候前端傳過來的字串加號會被吃掉變成空白，這裡我們做個保險替換回來
    const safeBase64 = base64Data.replace(/ /g, '+');
    const blob = Utilities.newBlob(Utilities.base64Decode(safeBase64), 'image/jpeg', filename);
    const file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    console.error("圖片上傳失敗：", e.toString());
    return 'Upload Failed';
  }
}
