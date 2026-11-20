/**
 * StimmMoment — Optionales Google Apps Script Backend (100 % kostenlos)
 *
 * Speichert Audio-Aufnahmen und Metadaten in einem eigenen Google-Drive-Ordner
 * ("StimmMoment_Audio_Storage"), sodass gedruckte QR-Sticker geräteübergreifend
 * auf jedem Smartphone abgespielt werden können.
 *
 * Einrichtung (ca. 2 Minuten):
 * 1. Öffne https://script.google.com/ -> "Neues Projekt".
 * 2. Kopiere diesen gesamten Code hinein und speichere ihn.
 * 3. Klicke auf "Bereitstellen" -> "Neue Bereitstellung" -> Typ "Web-App":
 *    - Ausführen als: "Ich"
 *    - Zugriff: "Jeder"
 * 4. Kopiere die Web-App-URL (endet auf /exec) und trage sie entweder
 *    - direkt in index.html bei DEFAULT_API_URL ein (für alle Nutzer aktiv), oder
 *    - im Browser unter "FAQ & Meine Sticker" -> "Cloud-Anbindung".
 */

var FOLDER_NAME = 'StimmMoment_Audio_Storage';
var INDEX_FILE_NAME = '_index.json';
var MAX_BASE64_BYTES = 8 * 1024 * 1024; // ~6 MB Audio-Obergrenze

function getStorageFolder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) {
    return it.next();
  }
  return DriveApp.createFolder(FOLDER_NAME);
}

function sanitizeId_(rawId) {
  return String(rawId || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function readIndex_(folder) {
  var files = folder.getFilesByName(INDEX_FILE_NAME);
  if (!files.hasNext()) return {};
  try {
    return JSON.parse(files.next().getBlob().getDataAsString('UTF-8')) || {};
  } catch (err) {
    return {};
  }
}

function writeIndex_(folder, indexObj) {
  var json = JSON.stringify(indexObj);
  var files = folder.getFilesByName(INDEX_FILE_NAME);
  if (files.hasNext()) {
    files.next().setContent(json);
  } else {
    folder.createFile(INDEX_FILE_NAME, json, MimeType.PLAIN_TEXT);
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || '').trim();

  if (!action) {
    return jsonOut_({ ok: true, service: 'StimmMoment API', status: 'ready' });
  }

  var folder = getStorageFolder_();

  if (action === 'get') {
    var id = sanitizeId_(params.id);
    if (!id) return jsonOut_({ ok: false, found: false, error: 'Missing id' });

    var files = folder.getFilesByName(id + '.json');
    if (!files.hasNext()) {
      return jsonOut_({ ok: true, found: false, id: id });
    }
    try {
      var data = JSON.parse(files.next().getBlob().getDataAsString('UTF-8'));
      return jsonOut_({
        ok: true,
        found: true,
        id: data.id,
        title: data.title || 'Persönliche Sprachnachricht',
        author: data.author || '',
        email: data.email || '',
        pinHash: data.pinHash || '',
        hasPin: Boolean(data.pinHash),
        mimeType: data.mimeType || 'audio/mp4',
        durationSec: data.durationSec || 0,
        createdAt: data.createdAt || '',
        audioBase64: data.audioBase64 || ''
      });
    } catch (err) {
      return jsonOut_({ ok: false, found: false, error: 'Read error' });
    }
  }

  if (action === 'findByEmail') {
    var email = String(params.email || '').trim().toLowerCase();
    if (!email) return jsonOut_({ ok: true, items: [] });

    var idx = readIndex_(folder);
    var items = [];
    Object.keys(idx).forEach(function (k) {
      var entry = idx[k];
      if (entry && entry.email && String(entry.email).toLowerCase() === email) {
        items.push(entry);
      }
    });
    return jsonOut_({ ok: true, items: items });
  }

  return jsonOut_({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var rawBody = (e && e.postData && e.postData.contents) || '';
    var body = JSON.parse(rawBody);
    var action = String(body.action || '').trim();
    var id = sanitizeId_(body.id);

    if (!id) {
      return jsonOut_({ ok: false, error: 'Invalid sticker id' });
    }

    var folder = getStorageFolder_();
    var fileName = id + '.json';

    if (action === 'save') {
      var audioBase64 = String(body.audioBase64 || '');
      if (!audioBase64 || audioBase64.length > MAX_BASE64_BYTES) {
        return jsonOut_({ ok: false, error: 'Audio missing or too large' });
      }

      var record = {
        id: id,
        title: String(body.title || 'Persönliche Sprachnachricht').slice(0, 120),
        author: String(body.author || '').slice(0, 80),
        email: String(body.email || '').trim().toLowerCase().slice(0, 120),
        pinHash: String(body.pinHash || '').slice(0, 128),
        hasPin: Boolean(body.pinHash),
        mimeType: String(body.mimeType || 'audio/mp4').slice(0, 64),
        durationSec: Number(body.durationSec) || 0,
        createdAt: String(body.createdAt || new Date().toISOString()),
        audioBase64: audioBase64
      };

      var content = JSON.stringify(record);
      var existing = folder.getFilesByName(fileName);
      if (existing.hasNext()) {
        existing.next().setContent(content);
      } else {
        folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
      }

      var idx = readIndex_(folder);
      idx[id] = {
        id: record.id,
        title: record.title,
        author: record.author,
        email: record.email,
        hasPin: record.hasPin,
        durationSec: record.durationSec,
        createdAt: record.createdAt
      };
      writeIndex_(folder, idx);

      return jsonOut_({ ok: true, id: id });
    }

    if (action === 'delete') {
      var files = folder.getFilesByName(fileName);
      if (files.hasNext()) {
        var f = files.next();
        try {
          var current = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
          if (current.pinHash && current.pinHash !== String(body.pinHash || '')) {
            return jsonOut_({ ok: false, error: 'Invalid PIN' });
          }
        } catch (parseErr) {}
        f.setTrashed(true);
      }

      var idxDel = readIndex_(folder);
      delete idxDel[id];
      writeIndex_(folder, idxDel);

      return jsonOut_({ ok: true, id: id });
    }

    return jsonOut_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
