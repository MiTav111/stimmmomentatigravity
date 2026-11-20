# StimmMoment

**100 % kostenloses DIY-QR-Audio-Sticker-Portal** im warmen Editorial-Scrapbook-Stil — als eigenständige Single-File-Webanwendung (`index.html`), ganz ohne Shop, ohne App-Installation und ohne externe JS-CDNs.

## Features
- **Offline-QR-Engine (`OfflineQrEngine`)**: Eigenständige ISO/IEC-18004-QR-Erzeugung (Byte-Mode, Fehlerkorrektur-Stufe M) direkt im Browser als scharfes SVG und hochauflösender Einzel-PNG-Download.
- **DIN-A4-Sofortdruck**: Ausschneidebögen für `1`, `4`, `6`, `8` oder `12` Sticker mit gestrichelten Schnittlinien und sauberem `@media print`-Layout.
- **Interaktive Audio-Demo**: 3 Beispiel-Sticker über die Web Audio API.
- **Smartphone-Aufnahmestudio (`?id=SM-...`)**: Bis zu 3 Minuten Sprachaufnahme per `MediaRecorder` (`audio/mp4` / `audio/webm` / `audio/ogg`), Vorschau, optionaler 4-stelliger Bearbeitungs-PIN, Einwilligungs-Checkbox sowie lokalem IndexedDB-Fallback oder optionaler Google-Apps-Script-Cloud-API.

---

## 1. Live schalten mit GitHub Pages (HTTPS inklusive)

HTTPS ist wichtig, damit mobile Browser den Mikrofonzugriff für Sprachaufnahmen erlauben — GitHub Pages liefert HTTPS automatisch mit.

1. Repository auf GitHub anlegen und diesen Ordner auf den Branch `main` pushen.
2. Auf GitHub im Repository **Settings → Pages** öffnen.
3. Unter **Build and deployment → Source** entweder **GitHub Actions** wählen (der Workflow `.github/workflows/deploy-pages.yml` ist bereits enthalten) oder **Deploy from a branch (`main` / `/ (root)`)**.
4. Nach ca. 1 Minute ist deine Seite über HTTPS erreichbar — `index.html` erkennt die veröffentlichte URL automatisch für alle QR-Codes!

---

## 2. Optional: Cloud-Speicher in 2 Minuten aktivieren (Google Apps Script)

Ohne Cloud-API speichert StimmMoment Aufnahmen lokal im jeweiligen Browser (ideal zum Testen). Damit Freunde und Familie deine gedruckten QR-Sticker auf **jedem** Smartphone scannen und anhören können, richte das enthaltene kostenlose Backend `backend/Code.gs` ein:

1. Öffne [script.google.com](https://script.google.com/) und erstelle ein **Neues Projekt**.
2. Kopiere den kompletten Inhalt aus `backend/Code.gs` hinein und speichere.
3. Klicke auf **Bereitstellen → Neue Bereitstellung → Web-App**:
   - **Ausführen als:** *Ich*
   - **Zugriff:** *Jeder*
4. Kopiere die erzeugte Web-App-URL (`https://script.google.com/macros/s/.../exec`).
5. Trage sie in `index.html` bei `const DEFAULT_API_URL = '...';` ein (so nutzen alle Scanner automatisch dein gemeinsames Cloud-Backend) — oder zum Testen lokal im Browser unter **FAQ & Meine Sticker → Cloud-Anbindung**.

---

## 3. Lokal testen

```bash
python3 -m http.server 8765
```

Danach im Browser `http://localhost:8765` öffnen.
