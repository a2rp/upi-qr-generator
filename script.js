/* ===========================================================
   UPI QR Generator — Styled (Vanilla JS)
   - Builds UPI payment URI
   - Generates QR via a public QR PNG endpoint (CORS OK)
   - Draws QR on canvas for download/print
   - Amount & Note presets
   =========================================================== */

const dom = {
    vpa: qs("#vpa"),
    payeeName: qs("#payeeName"),
    txnRef: qs("#txnRef"),
    amount: qs("#amount"),
    note: qs("#note"),
    qrCanvas: qs("#qrCanvas"),
    upiLinkPreview: qs("#upiLinkPreview"),
    downloadBtn: qs("#downloadBtn"),
    copyLinkBtn: qs("#copyLinkBtn"),
    printBtn: qs("#printBtn"),
    resetBtn: qs("#resetBtn"),
    amountChips: qs("#amountChips"),
    noteChips: qs("#noteChips"),
};

const DEFAULT_AMOUNTS = [99, 199, 499, 999];
const DEFAULT_NOTES = ["Thanks", "Fees", "Subscription", "Donation"];

/* ------------------------------- Init ------------------------------- */
let state = {
    vpa: "",
    payeeName: "",
    txnRef: "",
    amount: "",
    note: "",
    amountPresets: [...DEFAULT_AMOUNTS],
    notePresets: [...DEFAULT_NOTES],
};

init();

function init() {
    // hydrate UI
    dom.vpa.value = state.vpa;
    dom.payeeName.value = state.payeeName;
    dom.txnRef.value = state.txnRef;
    dom.amount.value = state.amount;
    dom.note.value = state.note;

    renderChips();

    ["vpa", "payeeName", "txnRef", "amount", "note"].forEach((k) =>
        dom[k].addEventListener("input", onFormChange)
    );

    dom.downloadBtn.addEventListener("click", onDownload);
    dom.copyLinkBtn.addEventListener("click", onCopyLink);
    dom.printBtn.addEventListener("click", () => window.print());
    dom.resetBtn.addEventListener("click", onReset);

    dom.upiLinkPreview.addEventListener("click", onCopyLink);

    drawQR();
}

/* ------------------------------ Helpers ----------------------------- */
function qs(s) {
    return document.querySelector(s);
}

// Permissive VPA check: name@bank (alnum . _ - allowed both sides)
function isValidVPA(vpa) {
    return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-_]{2,}$/.test(vpa);
}

function buildUpiUri() {
    const params = new URLSearchParams();
    if (state.vpa) params.set("pa", state.vpa);
    if (state.payeeName) params.set("pn", state.payeeName);
    if (state.amount) params.set("am", Number(state.amount).toFixed(2));
    if (state.note) params.set("tn", state.note);
    params.set("cu", "INR");
    if (state.txnRef) params.set("tr", state.txnRef);
    return `upi://pay?${params.toString()}`;
}

function qrPngUrl(data, size = 420) {
    // Public QR endpoint with permissive CORS; perfect for canvas
    const base = "https://api.qrserver.com/v1/create-qr-code/";
    const q = new URLSearchParams({
        size: `${size}x${size}`,
        data,
        margin: "0",
    });
    return `${base}?${q.toString()}`;
}

/* ------------------------------ Events ------------------------------ */
function onFormChange() {
    state.vpa = dom.vpa.value.trim();
    state.payeeName = dom.payeeName.value.trim();
    state.txnRef = dom.txnRef.value.trim();
    state.amount = dom.amount.value.trim();
    state.note = dom.note.value.trim();
    drawQR();
}

function onAmountChip(v) {
    state.amount = String(v);
    dom.amount.value = state.amount;
    drawQR();
}
function onNoteChip(v) {
    state.note = v;
    dom.note.value = state.note;
    drawQR();
}

function onReset() {
    if (!confirm("Reset all fields?")) return;
    state.vpa = "";
    state.payeeName = "";
    state.txnRef = "";
    state.amount = "";
    state.note = "";
    dom.vpa.value = "";
    dom.payeeName.value = "";
    dom.txnRef.value = "";
    dom.amount.value = "";
    dom.note.value = "";
    drawQR();
}

async function onCopyLink() {
    const link = buildUpiUri();
    try {
        await navigator.clipboard.writeText(link);
        toast("UPI link copied.");
    } catch {
        window.prompt("Copy UPI link:", link);
    }
}

/* ------------------------------ Render ------------------------------ */
function renderChips() {
    dom.amountChips.innerHTML = "";
    state.amountPresets.forEach((v) => {
        const b = document.createElement("button");
        b.className = "chip";
        b.type = "button";
        b.textContent = `₹${v}`;
        b.addEventListener("click", () => onAmountChip(v));
        dom.amountChips.appendChild(b);
    });

    dom.noteChips.innerHTML = "";
    state.notePresets.forEach((v) => {
        const b = document.createElement("button");
        b.className = "chip";
        b.type = "button";
        b.textContent = v;
        b.addEventListener("click", () => onNoteChip(v));
        dom.noteChips.appendChild(b);
    });
}

function drawQR() {
    const canvas = dom.qrCanvas;
    const ctx = canvas.getContext("2d");
    const size = canvas.width; // 420

    // Clear + white bg (best for scanners)
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Require valid VPA
    if (!state.vpa || !isValidVPA(state.vpa)) {
        drawMessage(ctx, size, "Enter a valid UPI ID (name@bank)");
        dom.upiLinkPreview.textContent = "";
        return;
    }

    const upi = buildUpiUri();
    dom.upiLinkPreview.textContent = upi;

    // Fetch QR as PNG and draw
    const src = qrPngUrl(upi, size);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
        drawMessage(ctx, size, "QR render failed. Check connection.");
    };
    img.src = src;
}

/* -------------------------- Canvas helpers -------------------------- */
function drawMessage(ctx, size, text) {
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Arial";
    ctx.fillText(text, size / 2, size / 2);
}

/* ------------------------------ Actions ----------------------------- */
function onDownload() {
    const link = document.createElement("a");
    const safeVpa = (state.vpa || "upi").replace(/[^a-z0-9@._-]/gi, "_");
    const amount = state.amount ? `_${Number(state.amount).toFixed(2)}` : "";
    link.download = `upi_qr_${safeVpa}${amount}.png`;
    link.href = dom.qrCanvas.toDataURL("image/png");
    link.click();
}

function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = `
    position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
    background: rgba(20,20,20,0.95); color: #eaeaea; border: 1px solid #2a2a2a;
    padding: 10px 14px; border-radius: 10px; z-index: 9999; font: 14px system-ui;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}
