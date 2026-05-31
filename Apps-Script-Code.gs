/*****************************************************************
 *  NEW LIFE CHURCH — MATRIMONY  ·  Apps Script backend
 *  ------------------------------------------------------------
 *  This ONE script does two jobs:
 *    1) setup()  -> builds the Google Form + Sheet automatically
 *    2) doGet()  -> serves the profile data to the search page,
 *                   but only when the correct PIN is supplied.
 *
 *  ⚠️  Do all of this while logged in as
 *      newlifekids.elearning@gmail.com  (so the Form, Sheet and
 *      photos all live in that account's Drive).
 *
 *  HOW TO USE  (see SETUP-GUIDE.md for full steps):
 *    1. Go to  https://script.google.com  ->  New project
 *    2. Delete the sample code, paste ALL of this file.
 *    3. Change the PIN below to your own.
 *    4. Run ->  setup   (click Authorize the first time).
 *    5. Open  View -> Logs  and copy the 3 links it prints.
 *    6. Open the FORM edit link, add ONE "File upload" question
 *       titled  Photo  (Google won't let a script add this).
 *    7. Deploy -> New deployment -> Web app
 *         · Execute as: Me
 *         · Who has access: Anyone
 *       Copy the Web app URL and send it to finish the page.
 *****************************************************************/

const PIN = 'nlcmat';   // <-- CHANGE THIS to a PIN of your choice

/* ---------- 1) Run this ONCE to build everything ---------- */
function setup() {
  const form = FormApp.create('New Life Church — Matrimony Profile');
  form.setDescription(
    'Please submit a profile for marriage. Attach a clear, recent photo. ' +
    'Your details are kept privately by the church.'
  );

  // NOTE: the "Photo" file-upload question is added by hand (step 6).
  form.addTextItem().setTitle('Full Name').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Gender')
      .setChoiceValues(['Male / Groom', 'Female / Bride']).setRequired(true);
  form.addDateItem().setTitle('Date of Birth').setRequired(true);
  form.addTextItem().setTitle('Height').setHelpText('e.g. 5 ft 6 in / 168 cm').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Marital Status')
      .setChoiceValues(['Never married', 'Divorced', 'Widowed']).setRequired(true);
  form.addTextItem().setTitle('Education / Qualification').setRequired(true);
  form.addTextItem().setTitle('Occupation / Job').setRequired(true);
  form.addTextItem().setTitle('Working Location').setHelpText('City / country');
  form.addTextItem().setTitle('Native Place');
  form.addTextItem().setTitle('Church / Denomination');
  form.addTextItem().setTitle('Father — name & occupation');
  form.addTextItem().setTitle('Mother — name & occupation');
  form.addTextItem().setTitle('Contact Person (relationship)').setRequired(true);
  form.addTextItem().setTitle('Contact Phone (with country code)').setRequired(true);
  form.addParagraphTextItem().setTitle('Partner Expectations');
  form.addParagraphTextItem().setTitle('Additional Notes');

  // Create the database spreadsheet and link the form to it
  const ss = SpreadsheetApp.create('Matrimony Database');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  // Tidy up the empty default sheet that comes with a new spreadsheet
  try {
    const blank = ss.getSheetByName('Sheet1');
    if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  } catch (e) {}

  Logger.log('==================  COPY THESE  ==================');
  Logger.log('1) FORM — open this to ADD the Photo question:\n   ' + form.getEditUrl());
  Logger.log('2) FORM — share THIS link with families to submit:\n   ' + form.getPublishedUrl());
  Logger.log('3) SHEET — your database:\n   ' + ss.getUrl());
  Logger.log('=================================================');
  Logger.log('Next: add the Photo question, then Deploy -> Web app.');
}

/* ---------- Run ONCE to allow the "Remove" button to delete photos ----------
   (Grants the Drive permission. Does nothing else — safe to run.)          */
function authorize() {
  DriveApp.getRootFolder();
  Logger.log('✅ Authorized. The Remove button can now delete photos. Now redeploy a New version.');
}

/* ---------- FIX: re-point the script to the correct database ----------
   Run this if the page shows no entries after `setup` was run twice.
   It scans your Drive for the "Matrimony Database" that actually has a
   Photo column + real entries, and points the web app back at it.      */
function autoFixSheet() {
  const files = DriveApp.getFilesByName('Matrimony Database');
  let chosen = null, chosenScore = -1;
  while (files.hasNext()) {
    const f = files.next();
    try {
      const ss = SpreadsheetApp.openById(f.getId());
      let resp = null, respRows = -1;
      ss.getSheets().forEach(sh => {
        const head = sh.getLastRow() ? String(sh.getRange(1, 1, 1, 1).getValue()).toLowerCase() : '';
        if (head.indexOf('timestamp') !== -1 && sh.getLastRow() > respRows) { respRows = sh.getLastRow(); resp = sh; }
      });
      if (!resp) continue;
      const header = resp.getRange(1, 1, 1, resp.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase());
      const hasPhoto = header.some(h => h.indexOf('photo') !== -1);
      const dataRows = resp.getLastRow() - 1;
      const score = (hasPhoto ? 100000 : 0) + dataRows;     // prefer the one WITH a Photo column + most entries
      if (score > chosenScore) { chosenScore = score; chosen = ss; }
    } catch (e) {}
  }
  if (!chosen) { Logger.log('⚠️ No "Matrimony Database" found.'); return; }
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', chosen.getId());
  Logger.log('✅ Now using the correct database:\n   ' + chosen.getName() + '\n   ' + chosen.getUrl());
}

/* ---------- Re-print the sheet link anytime ---------- */
function showLinks() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) { Logger.log('Run setup() first.'); return; }
  Logger.log('SHEET: ' + SpreadsheetApp.openById(id).getUrl());
}

/* ---------- 2) Serves data to the search page (PIN-gated) ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const reply = (obj) => ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);

  if (String(p.pin || '') !== String(PIN)) return reply({ error: 'unauthorized' });

  try {
    if (String(p.action || '') === 'delete') return reply(deleteProfile(p.ts));
    return reply({ table: readTable() });
  } catch (err) {
    return reply({ error: String(err) });
  }
}

/* Finds the sheet that holds the form responses (header contains "Timestamp"),
   else falls back to the sheet with the most rows. */
function responsesSheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) return null;
  const ss = SpreadsheetApp.openById(id);
  let sheet = null, best = -1;
  ss.getSheets().forEach(sh => {
    const rows = sh.getLastRow();
    const head = rows ? String(sh.getRange(1, 1, 1, 1).getValue()).toLowerCase() : '';
    if (head.indexOf('timestamp') !== -1) sheet = sh;
    if (!sheet && rows > best) { best = rows; sheet = sh; }
  });
  return sheet;
}

/* Reads the form-responses sheet as a 2D array (header row first). */
function readTable() {
  const sheet = responsesSheet();
  if (!sheet || sheet.getLastRow() < 1) return [];
  return sheet.getDataRange().getValues();   // Dates become ISO strings via JSON
}

/* Deletes one profile (its sheet row + its photo file in Drive),
   matched by the unique Timestamp value (passed as milliseconds). */
function deleteProfile(ts) {
  const target = Number(ts);
  if (!target) return { error: 'bad id' };

  const sheet = responsesSheet();
  if (!sheet) return { error: 'no sheet' };

  const values  = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).toLowerCase());
  const photoCol = headers.findIndex(h =>
    h.indexOf('photo') !== -1 || h.indexOf('image') !== -1 || h.indexOf('picture') !== -1);

  for (let i = 1; i < values.length; i++) {
    const cell = values[i][0];                       // Timestamp is column A
    const t = (cell instanceof Date) ? cell.getTime() : new Date(cell).getTime();
    if (t === target) {
      if (photoCol >= 0) {                            // move photo to Drive Trash
        try {
          const m = String(values[i][photoCol]).match(/[-\w]{25,}/);
          if (m) DriveApp.getFileById(m[0]).setTrashed(true);
        } catch (e) {}
      }
      sheet.deleteRow(i + 1);                         // +1: row 1 is the header
      return { ok: true };
    }
  }
  return { error: 'not found' };
}
