# SHADA1st Apparel Shop — Modern Online Storefront & Admin Dashboard

An ultra-premium, responsive apparel store built for **SHADA1st Apparel Shop**. Customers can browse available collections, filter & multi-sort items, view product details in an interactive modal, and tap **"Order on WhatsApp"** to initiate orders directly with pre-filled greeting text and product specs.

The platform includes a dedicated **Admin Portal** featuring visual **Drag-and-Drop Item Reordering** across the screen, product & collection management, custom WhatsApp message template editors, and seamless **Firebase (Firestore)** synchronization with zero-setup LocalStorage fallback.

---

## 🌟 Key Features

### Customer Storefront (`index.html`)
- **Luxury Aesthetic**: Dark Obsidian & Champagne Gold theme with glassmorphism header, smooth micro-interactions, and custom typography (`Syne` + `Playfair Display` + `Inter`).
- **Customizable Color Scheme**: Clean CSS Custom Properties (`:root` variables in `css/style.css`) allowing background, card, text, and accent color modifications.
- **Collection Filtering**: Category pills to filter items (Streetwear, Luxury Evening, Urban Casual, Accessories, etc.).
- **Multi-Criteria Sorting**:
  - **Date Added**: Newest first or Oldest first.
  - **Price**: Low to High or High to Low.
  - **Alphabetical**: A to Z.
- **Search Bar**: Instant real-time search across apparel titles, details, and collections.
- **Interactive Product Modal**: Image viewer with thumbnail selector, sizes, colors, and price details.
- **Direct WhatsApp Ordering**:
  - Pre-fills WhatsApp message with custom greeting:
    `"Hello 👋! Thank you for reaching out to SHADA1st Apparel Shop. How may we assist you?"`
  - Includes exact product name, price, reference code, and order inquiry request.
- **Off-Hours Auto-Response Notice**: Displays business hours / auto-response text:
  `"Hey 👋! We're currently unavailable at the moment. Kindly Leave a message and we'd get back to you later on. Have a great night."`

---

## 📁 Repository Structure

```
c:\Desktop\SHADA1st\
├── index.html                 # Customer Storefront (Hero, Collections, Product Grid, Filters, WhatsApp Modal)
├── admin.html                 # Admin Dashboard (Product Editor, Collections, Drag-and-Drop Reorder, Settings)
├── css/
│   └── style.css              # Core Design System, CSS Variables, Responsive Grid, Modals & Drag Styles
├── js/
│   ├── firebase-config.js     # Dynamic Firebase v10 SDK loader & credentials manager
│   ├── store-db.js            # Dual Data Engine (Firestore + LocalStorage fallback)
│   ├── main.js                # Customer UI controller (Search, Multi-sorting, Modal, WhatsApp link generator)
│   └── admin.js               # Admin UI controller (CRUD, Drag-and-drop position sorting, Settings)
├── images/
│   ├── logo.svg               # Signature SHADA1st vector logo
│   └── placeholders/          # High quality styled SVG apparel placeholders
├── products.json              # Initial seed dataset (Products, Collections, Settings)
├── firestore-rules.txt        # Firebase Security Rules snippet
├── FIREBASE_SETUP.md          # Step-by-step setup guide for Firebase Firestore
└── README.md                  # Documentation
```

---

## 🚀 Running Locally

To run the application locally, start a simple HTTP web server in the repository directory:

### Option 1: Node.js / npx (Recommended)
```bash
npx http-server ./ -p 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Python 3
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

---


---

## 📦 Firebase Setup

Refer to [`FIREBASE_SETUP.md`](file:///c:/Desktop/SHADA1st/FIREBASE_SETUP.md) for full instructions on setting up your free Firebase project and pasting your keys in the Admin Settings tab.
