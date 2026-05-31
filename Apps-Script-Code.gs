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

const PIN = '1234';   // <-- CHANGE THIS to a PIN of your choice

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
    return reply({ table: readTable() });
  } catch (err) {
    return reply({ error: String(err) });
  }
}

/* Reads the form-responses sheet as a 2D array (header row first). */
function readTable() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) return [];
  const ss = SpreadsheetApp.openById(id);

  // Pick the sheet that holds the form responses (header contains "Timestamp"),
  // else fall back to the sheet with the most rows.
  let sheet = null, best = -1;
  ss.getSheets().forEach(sh => {
    const rows = sh.getLastRow();
    const head = rows ? String(sh.getRange(1, 1, 1, 1).getValue()).toLowerCase() : '';
    if (head.indexOf('timestamp') !== -1) sheet = sh;
    if (!sheet && rows > best) { best = rows; sheet = sh; }
  });
  if (!sheet || sheet.getLastRow() < 1) return [];

  return sheet.getDataRange().getValues();   // Dates become ISO strings via JSON
}
