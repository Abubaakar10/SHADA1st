# SHADA1st Apparel Shop — High Fashion & E-Commerce Platform

An ultra-premium, responsive online storefront and admin management platform built for **SHADA1st Apparel Shop** in Ghana 🇬🇭. 

Customers can explore curated fashion collections, search items with live as-you-type auto-suggestions, select available sizes, and tap **"ORDER VIA WHATSAPP"** to trigger native mobile app ordering with pre-filled product details.

The platform includes a dedicated **Admin Portal** featuring interactive size availability toggles, visual **Drag-and-Drop Display Reordering**, store opening/closing schedule manager, security rate-limiting, and live **Google Cloud Firestore** database synchronization.

---

## 🌟 Key Features

### 🛍️ Customer Storefront (`index.html`)
- **Live Search Auto-Suggestions**: Real-time popup dropdown menu displaying matching item thumbnails, titles, collections, and prices as users type.
- **Inspiration Hero Showcase**: 3-column showcase section featuring `#1 APPAREL SHOP IN GHANA` badge, featured product card, and lifestyle editorial cards.
- **Interactive Rectangular Size Selector**: Displays available in-stock sizes (`S`, `M`, `L`, `XL`) with struck-through dashed styling for out-of-stock sizes.
- **Direct Native WhatsApp Deep-Linking**: Uses native protocol (`whatsapp://send`) to launch the installed WhatsApp / WhatsApp Business mobile app directly without web preview screens.
- **Shimmering Skeleton Loaders**: Displays modern luxury shimmering placeholders while database items curate from Google Cloud Firestore.
- **Mobile-First Responsive Design**: Optimized layouts for mobile phones and iPads, including centered stats and automatic badge positioning.

### 🔒 Admin Portal (`admin.html`)
- **Interactive Size Availability Picker**: Tap size boxes (`XXS` through `3XL`) to switch between **In Stock** (solid black) and **Out of Stock** (struck-through dashed).
- **Store Hours & Status Scheduler**: Set opening/closing hours or force store status to **Force Open** or **Force Closed**.
- **Photo Upload Dropzone**: Select multiple photos from camera, photo library, or local computer.
- **Brute-Force Lockout Protection**: Automatically locks out invalid Admin PIN login attempts (Max 5 attempts / 3 minutes).

### 🛡️ Security & Performance Engine
- **Parameterized Data Sanitation (`js/security.js`)**: Escapes HTML entities (`&`, `<`, `>`, `"`, `'`, `/`) so all inputs are treated strictly as plain text data, preventing XSS and injection attacks.
- **Client-Side Security Rate Limiter (`js/rate-limiter.js`)**: Prevents automated form spamming and PIN brute-force attempts.
- **WCAG Accessibility (a11y) Compliance**: Includes `aria-label`, `role="dialog"`, `role="listbox"`, `aria-live="polite"` regions, and `:focus-visible` ring outlines.

---

## 📁 Repository Structure

```
SHADA1st/
├── index.html                 # Customer Storefront (Hero, Search Popup, Catalog Grid, Product Modal)
├── admin.html                 # Admin Dashboard (Product Editor, Collections, Settings)
├── css/
│   └── style.css              # Core Design System, Skeleton Shimmer, Responsive Layouts & Modals
├── js/
│   ├── firebase-config.js     # Cloud Firestore JS SDK loader & credentials setup
│   ├── store-db.js            # Dual Data Engine (Firestore Database + LocalStorage fallback)
│   ├── security.js           # XSS Data Sanitation & HTML Entity Escaping Engine
│   ├── rate-limiter.js        # Brute-force lockout & action rate limiter
│   ├── main.js                # Customer UI Controller (Search suggestions, Modals, Native WhatsApp link)
│   └── admin.js               # Admin UI Controller (CRUD operations, Size Toggles, Drag reorder)
├── images/
│   ├── logo.svg               # Signature SHADA1st vector logo
│   └── placeholders/          # Styled editorial apparel photo placeholders
├── products.json              # Starter seed catalog dataset
└── README.md                  # Comprehensive Documentation
```

---

## 🚀 Running Locally

To run the application locally, start a simple HTTP web server in the repository directory:

### Option 1: Node.js / npx (Recommended)
```bash
npx http-server ./ -p 8000
```
Then open `http://localhost:8000` in your web browser.

### Option 2: Python 3
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

---

## 🌐 Deploying to Vercel

1. Log into **[vercel.com](https://vercel.com)** with your GitHub account.
2. Select **Add New...** ➔ **Project**.
3. Import your repository.
4. Click **Deploy**. Vercel will publish your live website in under 30 seconds!

---

## 📄 License & Credits

Built for **SHADA1st Apparel Shop**. All rights reserved. Designed for Ghana 🇬🇭 & Worldwide.
