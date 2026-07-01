/****************************************************************
 *  MADHUSRI JEWELLERS POS  —  Google Apps Script Backend
 *  ------------------------------------------------------------
 *  ONE script per shop. Bound to that shop's own Google Sheet.
 *  Stores every bill as a row and serves history + next bill no.
 *
 *  SETUP (do this once per shop):
 *   1. Create a new Google Sheet (this becomes the shop's DB).
 *   2. Extensions ▸ Apps Script.
 *   3. Delete any code, paste THIS whole file, Save.
 *   4. Deploy ▸ New deployment ▸ type "Web app".
 *        - Execute as:  Me
 *        - Who has access:  Anyone
 *   5. Copy the Web app URL.
 *   6. Paste that URL into index.html → CONFIG.GOOGLE_SCRIPT_URL
 *
 *  The website talks to this using Content-Type text/plain so the
 *  browser does NOT send a CORS preflight (which Apps Script can't
 *  answer). We still return JSON that the site can read.
 ****************************************************************/

var SHEET_NAME = "Bills";

var HEADERS = [
  "BillNo","Bill","Name","Phone","Item",
  "Weight","Rate","Wastage%","WastageAmt","Making",
  "GST%","GSTAmt","MetalValue","Total","Date","Time",
  "Timestamp","ShopId"
];

/* ---------- helpers ---------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function nextBillNo_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;                 // only header row
  var nums = sh.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < nums.length; i++) {
    var n = parseInt(nums[i][0], 10);
    if (isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function readBills_(sh, shopId) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (shopId && r[17] && String(r[17]) !== String(shopId)) continue;
    out.push({
      billNo:   Number(r[0]),
      billLabel:String(r[1]),
      name:     String(r[2]),
      phone:    String(r[3]),
      item:     String(r[4]),
      weight:   Number(r[5]),
      rate:     Number(r[6]),
      wastPct:  Number(r[7]),
      wastAmt:  Number(r[8]),
      making:   Number(r[9]),
      gstPct:   Number(r[10]),
      gstAmt:   Number(r[11]),
      metal:    Number(r[12]),
      total:    Number(r[13]),
      date:     String(r[14]),
      time:     String(r[15]),
      iso:      String(r[16])
    });
  }
  // newest first
  out.sort(function(a, b){ return b.billNo - a.billNo; });
  return out;
}

function rowForBill_(b, shopId) {
  var billNo = Number(b.billNo) || 0;
  var label = b.billLabel || ("MJ-" + ("000" + billNo).slice(-4));
  return [
    billNo, label, b.name || "", b.phone || "", b.item || "",
    Number(b.weight) || 0, Number(b.rate) || 0,
    Number(b.wastPct) || 0, Number(b.wastAmt) || 0, Number(b.making) || 0,
    Number(b.gstPct) || 0, Number(b.gstAmt) || 0,
    Number(b.metal) || 0, Number(b.total) || 0,
    b.date || "", b.time || "", b.iso || new Date().toISOString(),
    shopId
  ];
}

function findRow_(sh, billNo, shopId) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var data = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === Number(billNo)) {
      if (!shopId || !data[i][17] || String(data[i][17]) === String(shopId)) {
        return i + 2; // sheet row index (1-based, +header)
      }
    }
  }
  return -1;
}

/* ---------- POST: add a bill ---------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var b = body.bill || {};
    var shopId = body.shopId || "";
    var action = body.action || "add";
    var sh = getSheet_();

    // ---- UPDATE an existing bill ----
    if (action === "update") {
      var row = findRow_(sh, b.billNo, shopId);
      if (row === -1) {
        // not found -> fall through and add it instead
        sh.appendRow(rowForBill_(b, shopId));
        return json_({ ok:true, updated:false, added:true });
      }
      sh.getRange(row, 1, 1, HEADERS.length).setValues([ rowForBill_(b, shopId) ]);
      return json_({ ok:true, updated:true });
    }

    // ---- ADD a new bill ----
    // server decides the authoritative bill number to avoid clashes
    var serverNo = nextBillNo_(sh);
    var billNo = Number(b.billNo) || serverNo;
    if (billNo < serverNo) billNo = serverNo; // never reuse a number
    b.billNo = billNo;
    if (!b.billLabel) b.billLabel = "MJ-" + ("000" + billNo).slice(-4);

    sh.appendRow(rowForBill_(b, shopId));

    return json_({ ok:true, billNo:billNo, nextBillNo: billNo + 1 });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/* ---------- GET: list bills / next bill no ---------- */

function doGet(e) {
  try {
    var action = (e.parameter.action || "list");
    var shopId = e.parameter.shopId || "";
    var sh = getSheet_();

    if (action === "next") {
      return json_({ ok:true, nextBillNo: nextBillNo_(sh) });
    }

    // default: list
    var bills = readBills_(sh, shopId);
    return json_({ ok:true, nextBillNo: nextBillNo_(sh), count: bills.length, bills: bills });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}
