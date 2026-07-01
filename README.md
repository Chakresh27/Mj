# 💎 Madhusri Jewellers — POS Billing

A fast, mobile-first jewellery billing web app. Pure **HTML + CSS + JavaScript** (no frameworks), hosted free on **GitHub Pages**, with each shop connected to its **own private Google Sheet**.

- ⚡ Instant live total calculation (no calculate button)
- 🧾 Auto bill numbers (synced from the Sheet across devices)
- 🖨️ Printable invoice + ⬇️ PDF download
- 🟢 WhatsApp bill sharing
- 📚 Bill history with search + CSV export
- 🏪 Multi-shop: same code, different Google Sheet per shop
- 📱 Dark gold theme, works great on phone and PC, offline-safe

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | The whole app (UI + logic). Deploy this to GitHub Pages. |
| `google-apps-script.gs` | Backend code — paste into each shop's Google Sheet Apps Script. |
| `README.md` | This guide. |

---

## 🧮 Calculation

```
Metal Value = Weight (g) × Rate per gram
Taxable     = Metal Value + Making Charges
GST         = Taxable × GST% ÷ 100
─────────────────────────────────────────
GRAND TOTAL = Taxable + GST
```

Empty fields are treated as `0`. All money is rounded to 2 decimals. Set **GST = 0** to match the plain `total = (weight × rate) + making` formula.

---

## 🚀 Setup — Step by Step

### 1) Google Sheet + backend (do once per shop)

1. Go to <https://sheets.new> and create a new Sheet. Name it e.g. `Madhusri Bills`.
2. **Extensions ▸ Apps Script**.
3. Delete the sample code, paste the entire contents of `google-apps-script.gs`, and **Save** (💾).
4. Click **Deploy ▸ New deployment**.
   - Click the gear ⚙ ▸ **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - **Deploy**, authorise access when prompted.
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy.../exec`).

### 2) Connect the website to the Sheet

Open `index.html` and edit the `CONFIG` block near the bottom `<script>`:

```js
const CONFIG = {
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",  // ← paste your URL
  SHOP: {
    id:      "madhusri-main",     // unique per shop (used for local storage)
    name:    "Madhusri Jewellers",
    tagline: "Gold • Silver • Diamond",
    address: "Main Bazaar Road, Your City",
    phone:   "919999999999",      // shop WhatsApp/contact, country code, no +
    gstin:   "",                  // optional
    currency:"₹"
  },
  BILL_PREFIX: "MJ"
};
```

### 3) Publish on GitHub Pages

```bash
git clone https://github.com/Chakresh27/Mj.git
# copy index.html (and this README) into the folder
cd Mj
git add .
git commit -m "Madhusri Jewellers POS"
git push
```

Then on GitHub: **Settings ▸ Pages ▸ Branch: `main` / root ▸ Save**.
Your app will be live at `https://chakresh27.github.io/Mj/`.

---

## 🏪 Adding another shop

1. Copy the project into a new repo (or a new folder/branch).
2. Create a **new** Google Sheet + Apps Script deployment for that shop.
3. Change `GOOGLE_SCRIPT_URL`, and give `SHOP.id` a **different** value.

Each shop's data stays fully separate — different Sheet, different URL, different local storage.

---

## 🔒 Notes & Troubleshooting

- **Bill numbers**: pulled from the Sheet on load so every device/staff member stays in sync. If offline, the device keeps its own count and syncs when back online.
- **"Saved locally • sync failed"**: bill is safe on the device. Check the `GOOGLE_SCRIPT_URL` and that the deployment access is **Anyone**.
- **Re-deploying the script**: use **Deploy ▸ Manage deployments ▸ Edit ▸ Version: New** so the URL stays the same.
- **PDF**: uses jsPDF from a CDN. If a browser blocks it, the app falls back to Print (choose *Save as PDF*).
- **Privacy**: all data lives in *your* Google Sheet and the local browser. Nothing goes to any third party.

---

Made for shop counters — big buttons, instant totals, phone-first. 🙏
