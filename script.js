const elements = {
    upiId: document.getElementById("upiId"),
    payeeName: document.getElementById("payeeName"),
    amount: document.getElementById("amount"),

    transactionReference: document.getElementById("transactionReference"),

    note: document.getElementById("note"),

    upiIdError: document.getElementById("upiIdError"),
    amountError: document.getElementById("amountError"),

    qrPlaceholder: document.getElementById("qrPlaceholder"),
    qrCode: document.getElementById("qrCode"),
    qrStatus: document.getElementById("qrStatus"),

    upiLinkPreview: document.getElementById("upiLinkPreview"),

    copyButton: document.getElementById("copyButton"),
    downloadButton: document.getElementById("downloadButton"),
    printButton: document.getElementById("printButton"),
    resetButton: document.getElementById("resetButton"),

    currentYear: document.getElementById("currentYear"),
    toast: document.getElementById("toast"),
};

const amountPresetButtons = document.querySelectorAll("[data-amount]");

const notePresetButtons = document.querySelectorAll("[data-note]");

const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

const QR_SIZE = 520;
const EXPORT_PADDING = 48;

let qrInstance = null;
let currentUpiUri = "";
let updateTimer = null;
let toastTimer = null;

const normalizeValue = (value) => {
    return value.trim();
};

const escapeHtml = (value) => {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

const formatDate = (date = new Date()) => {
    const day = String(date.getDate()).padStart(2, "0");

    const month = date.toLocaleString("en-US", {
        month: "short",
    });

    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
};

const isValidUpiId = (value) => {
    const upiId = normalizeValue(value);

    if (!upiId) {
        return false;
    }

    if (upiId.length < 5 || upiId.length > 100) {
        return false;
    }

    return UPI_ID_PATTERN.test(upiId);
};

const validateUpiId = () => {
    const value = normalizeValue(elements.upiId.value);

    if (!value) {
        elements.upiId.classList.remove("invalid");

        elements.upiIdError.hidden = true;
        elements.upiIdError.textContent = "";

        return false;
    }

    if (!isValidUpiId(value)) {
        elements.upiId.classList.add("invalid");

        elements.upiIdError.textContent =
            "Enter a valid UPI ID such as name@bank.";

        elements.upiIdError.hidden = false;

        return false;
    }

    elements.upiId.classList.remove("invalid");

    elements.upiIdError.hidden = true;
    elements.upiIdError.textContent = "";

    return true;
};

const validateAmount = () => {
    const value = elements.amount.value.trim();

    if (!value) {
        elements.amount.classList.remove("invalid");

        elements.amountError.hidden = true;
        elements.amountError.textContent = "";

        return true;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        elements.amount.classList.add("invalid");

        elements.amountError.textContent = "Enter an amount greater than zero.";

        elements.amountError.hidden = false;

        return false;
    }

    const decimalPart = value.split(".")[1];

    if (decimalPart && decimalPart.length > 2) {
        elements.amount.classList.add("invalid");

        elements.amountError.textContent =
            "Use no more than two decimal places.";

        elements.amountError.hidden = false;

        return false;
    }

    elements.amount.classList.remove("invalid");

    elements.amountError.hidden = true;
    elements.amountError.textContent = "";

    return true;
};

const formatAmount = () => {
    const value = elements.amount.value.trim();

    if (!value) {
        return "";
    }

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return "";
    }

    return amount.toFixed(2);
};

const buildUpiUri = () => {
    const params = new URLSearchParams();

    params.set("pa", normalizeValue(elements.upiId.value));

    const payeeName = normalizeValue(elements.payeeName.value);

    const reference = normalizeValue(elements.transactionReference.value);

    const amount = formatAmount();

    const note = normalizeValue(elements.note.value);

    if (payeeName) {
        params.set("pn", payeeName);
    }

    if (reference) {
        params.set("tr", reference);
    }

    if (amount) {
        params.set("am", amount);
    }

    if (note) {
        params.set("tn", note);
    }

    params.set("cu", "INR");

    return `upi://pay?${params.toString()}`;
};

const setStatus = (text, type = "") => {
    elements.qrStatus.textContent = text;

    elements.qrStatus.classList.remove("ready", "error");

    if (type) {
        elements.qrStatus.classList.add(type);
    }
};

const setActionState = (enabled) => {
    elements.copyButton.disabled = !enabled;
    elements.downloadButton.disabled = !enabled;
    elements.printButton.disabled = !enabled;
};

const showToast = (message, type = "success") => {
    window.clearTimeout(toastTimer);

    elements.toast.textContent = message;

    elements.toast.classList.remove("visible", "success", "error");

    elements.toast.classList.add("visible", type);

    toastTimer = window.setTimeout(() => {
        elements.toast.classList.remove("visible");
    }, 2200);
};

const clearQr = () => {
    if (qrInstance) {
        qrInstance.clear();
        qrInstance = null;
    }

    elements.qrCode.innerHTML = "";
    elements.qrCode.hidden = true;

    elements.qrPlaceholder.hidden = false;

    currentUpiUri = "";

    elements.upiLinkPreview.textContent = "upi://pay";

    setActionState(false);
};

const generateQr = () => {
    const upiValid = validateUpiId();
    const amountValid = validateAmount();

    if (!upiValid || !amountValid) {
        clearQr();

        if (elements.upiId.value.trim()) {
            setStatus("Invalid", "error");
        } else {
            setStatus("Waiting");
        }

        return;
    }

    const upiUri = buildUpiUri();

    clearQr();

    elements.qrPlaceholder.hidden = true;
    elements.qrCode.hidden = false;

    try {
        qrInstance = new QRCode(elements.qrCode, {
            text: upiUri,
            width: QR_SIZE,
            height: QR_SIZE,
            colorDark: "#050505",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M,
        });

        currentUpiUri = upiUri;

        elements.upiLinkPreview.textContent = upiUri;

        setActionState(true);
        setStatus("Ready", "ready");
    } catch {
        clearQr();

        setStatus("Error", "error");

        showToast("Unable to generate the QR code.", "error");
    }
};

const scheduleQrUpdate = () => {
    window.clearTimeout(updateTimer);

    updateTimer = window.setTimeout(generateQr, 120);
};

const copyUpiLink = async () => {
    if (!currentUpiUri) {
        return;
    }

    try {
        await navigator.clipboard.writeText(currentUpiUri);

        showToast("UPI payment link copied.");
    } catch {
        const textarea = document.createElement("textarea");

        textarea.value = currentUpiUri;

        textarea.setAttribute("readonly", "");

        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();

        const copied = document.execCommand("copy");

        textarea.remove();

        if (copied) {
            showToast("UPI payment link copied.");
        } else {
            showToast("Unable to copy the UPI link.", "error");
        }
    }
};

const getQrCanvas = () => {
    return elements.qrCode.querySelector("canvas");
};

const getQrImage = () => {
    return elements.qrCode.querySelector("img");
};

const getRawQrDataUrl = () => {
    const canvas = getQrCanvas();

    if (canvas) {
        return canvas.toDataURL("image/png");
    }

    const image = getQrImage();

    if (image && image.src && image.src.startsWith("data:image")) {
        return image.src;
    }

    return "";
};

const createPaddedQrDataUrl = () => {
    const sourceCanvas = getQrCanvas();

    if (sourceCanvas) {
        const exportCanvas = document.createElement("canvas");

        const size = sourceCanvas.width + EXPORT_PADDING * 2;

        exportCanvas.width = size;
        exportCanvas.height = size;

        const context = exportCanvas.getContext("2d");

        context.fillStyle = "#ffffff";

        context.fillRect(0, 0, size, size);

        context.drawImage(sourceCanvas, EXPORT_PADDING, EXPORT_PADDING);

        return exportCanvas.toDataURL("image/png");
    }

    const sourceUrl = getRawQrDataUrl();

    return sourceUrl;
};

const downloadQr = () => {
    if (!currentUpiUri) {
        return;
    }

    const dataUrl = createPaddedQrDataUrl();

    if (!dataUrl) {
        showToast("QR image is not ready yet.", "error");

        return;
    }

    const upiId = normalizeValue(elements.upiId.value)
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-");

    const link = document.createElement("a");

    link.href = dataUrl;

    link.download = `${upiId || "upi"}-qr-code.png`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    showToast("QR code downloaded.");
};

const printQr = () => {
    if (!currentUpiUri) {
        return;
    }

    const dataUrl = createPaddedQrDataUrl();

    if (!dataUrl) {
        showToast("QR image is not ready yet.", "error");

        return;
    }

    const printWindow = window.open("", "_blank", "width=760,height=820");

    if (!printWindow) {
        showToast("Allow pop-ups to print the QR code.", "error");

        return;
    }

    const payee =
        normalizeValue(elements.payeeName.value) ||
        normalizeValue(elements.upiId.value);

    const amount = formatAmount();

    const note = normalizeValue(elements.note.value);

    const reference = normalizeValue(elements.transactionReference.value);

    const upiId = normalizeValue(elements.upiId.value);

    const printedDate = formatDate(new Date());

    printWindow.document.write(`
        <!doctype html>

        <html lang="en">
            <head>
                <meta charset="UTF-8" />

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />

                <title>UPI QR Code</title>

                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    @page {
                        size: auto;
                        margin: 16mm;
                    }

                    body {
                        display: grid;
                        place-items: center;

                        min-height: 100vh;

                        padding: 30px;

                        color: #111111;
                        background: #ffffff;

                        font-family:
                            Arial,
                            sans-serif;
                    }

                    .printCard {
                        width: min(
                            520px,
                            100%
                        );

                        padding: 28px;

                        border:
                            1px solid
                            #dddddd;

                        border-radius: 16px;

                        text-align: center;
                    }

                    .label {
                        color: #777777;

                        font-size: 11px;
                        font-weight: 700;

                        letter-spacing:
                            0.12em;

                        text-transform:
                            uppercase;
                    }

                    .date {
                        margin-top: 6px;

                        color: #777777;

                        font-size: 12px;
                    }

                    .qr {
                        display: block;

                        width: min(
                            420px,
                            100%
                        );

                        margin:
                            24px auto 0;

                        object-fit: contain;
                    }

                    h1 {
                        margin-top: 22px;

                        font-size: 23px;
                    }

                    .upi {
                        margin-top: 6px;

                        color: #555555;

                        font-size: 13px;
                    }

                    .amount {
                        margin-top: 15px;

                        font-size: 22px;
                        font-weight: 700;
                    }

                    .details {
                        display: grid;
                        gap: 5px;

                        margin-top: 16px;

                        color: #555555;

                        font-size: 12px;
                        line-height: 1.5;
                    }

                    .hint {
                        margin-top: 22px;

                        color: #777777;

                        font-size: 11px;
                    }

                    @media print {
                        body {
                            min-height: auto;
                            padding: 0;
                        }

                        .printCard {
                            border: 0;
                        }
                    }
                </style>
            </head>

            <body>
                <main class="printCard">
                    <p class="label">
                        UPI Payment QR
                    </p>

                    <p class="date">
                        ${escapeHtml(printedDate)}
                    </p>

                    <img
                        class="qr"
                        src="${dataUrl}"
                        alt="UPI payment QR code"
                    />

                    <h1>
                        ${escapeHtml(payee)}
                    </h1>

                    <p class="upi">
                        ${escapeHtml(upiId)}
                    </p>

                    ${
                        amount
                            ? `
                                <p class="amount">
                                    ₹${escapeHtml(amount)}
                                </p>
                            `
                            : ""
                    }

                    <div class="details">
                        ${
                            reference
                                ? `
                                    <p>
                                        Reference:
                                        ${escapeHtml(reference)}
                                    </p>
                                `
                                : ""
                        }

                        ${
                            note
                                ? `
                                    <p>
                                        ${escapeHtml(note)}
                                    </p>
                                `
                                : ""
                        }
                    </div>

                    <p class="hint">
                        Verify all payment details before
                        completing the transaction.
                    </p>
                </main>
            </body>
        </html>
    `);

    printWindow.document.close();

    const image = printWindow.document.querySelector(".qr");

    const startPrint = () => {
        printWindow.focus();

        window.setTimeout(() => {
            printWindow.print();
        }, 100);
    };

    if (image.complete) {
        startPrint();
    } else {
        image.addEventListener("load", startPrint, {
            once: true,
        });
    }
};

const resetGenerator = () => {
    elements.upiId.value = "";
    elements.payeeName.value = "";
    elements.amount.value = "";
    elements.transactionReference.value = "";
    elements.note.value = "";

    elements.upiId.classList.remove("invalid");

    elements.amount.classList.remove("invalid");

    elements.upiIdError.hidden = true;
    elements.amountError.hidden = true;

    elements.upiIdError.textContent = "";
    elements.amountError.textContent = "";

    clearQr();

    setStatus("Waiting");

    elements.upiId.focus();

    showToast("Generator reset.");
};

const handleInput = () => {
    scheduleQrUpdate();
};

[
    elements.upiId,
    elements.payeeName,
    elements.amount,
    elements.transactionReference,
    elements.note,
].forEach((element) => {
    element.addEventListener("input", handleInput);
});

elements.upiId.addEventListener("blur", validateUpiId);

elements.amount.addEventListener("blur", () => {
    if (validateAmount() && elements.amount.value.trim()) {
        elements.amount.value = formatAmount();

        scheduleQrUpdate();
    }
});

amountPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
        elements.amount.value = button.dataset.amount;

        scheduleQrUpdate();

        elements.amount.focus();
    });
});

notePresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
        elements.note.value = button.dataset.note;

        scheduleQrUpdate();

        elements.note.focus();
    });
});

elements.copyButton.addEventListener("click", copyUpiLink);

elements.downloadButton.addEventListener("click", downloadQr);

elements.printButton.addEventListener("click", printQr);

elements.resetButton.addEventListener("click", resetGenerator);

elements.currentYear.textContent = new Date().getFullYear();

clearQr();
setStatus("Waiting");
