# UPI QR Generator

![alt text](image.png)

Create a scannable **UPI QR** with amount & note presets. 100% client-side (HTML + SCSS + JS).

-   **Live:** https://a2rp.github.io/upi-qr-generator/
-   **Code:** https://github.com/a2rp/upi-qr-generator

## Features

-   VPA, Payee Name, Amount, Note → builds `upi://pay?...` link
-   Live QR preview (canvas), **Copy Link**, **Download PNG**, **Print-only QR**
-   Quick amount & note chips
-   No backend; works offline after first load

## Clone & Use

```bash
git clone https://github.com/a2rp/upi-qr-generator.git
cd upi-qr-generator

# If you use SCSS locally (recommended)
npm i -g sass            # once
sass --watch style.scss style.css

# Open the app
# 1) Double-click index.html, OR
# 2) Use Live Server in VS Code
```
