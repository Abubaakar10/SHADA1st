/**
 * SHADA1st Apparel Shop — Store Data Management Layer
 * Abstracted layer supporting LocalStorage out-of-the-box and Firebase Firestore synchronization.
 */

import { initFirebase, getStoredFirebaseConfig } from './firebase-config.js';

const STORAGE_KEYS = {
  PRODUCTS: 'shada_products_v1',
  COLLECTIONS: 'shada_collections_v1',
  SETTINGS: 'shada_settings_v1'
};

let firebaseContext = null;

// Initialize Store Database
export async function initStoreDatabase() {
  firebaseContext = await initFirebase();
  
  // Ensure default data exists in local storage
  const existingProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!existingProducts) {
    try {
      const resp = await fetch('products.json');
      if (resp.ok) {
        const seedData = await resp.json();
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(seedData.products || []));
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(seedData.collections || []));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seedData.settings || {}));
        console.log("SHADA1st: Initialized store with seed data.");
      }
    } catch (e) {
      console.warn("SHADA1st: Could not fetch initial products.json seed file.", e);
    }
  }
}

// --------------------------------------------------------------------------
// PRODUCTS API
// --------------------------------------------------------------------------

export async function getProducts() {
  // If Firebase is active, attempt fetching from Firestore
  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const q = query(collection(firebaseContext.db, "products"), orderBy("displayOrder", "asc"));
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      if (items.length > 0) {
        // Cache to LocalStorage for offline speed
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(items));
        return items;
      }
    } catch (err) {
      console.warn("Firestore fetch products error, falling back to LocalStorage:", err);
    }
  }

  // LocalStorage Fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const items = raw ? JSON.parse(raw) : [];
    // Ensure sorted by displayOrder
    items.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
    return items;
  } catch (e) {
    return [];
  }
}

export async function saveProduct(productData) {
  let products = await getProducts();
  const now = new Date().toISOString();
  
  if (productData.id) {
    // Update existing product
    const idx = products.findIndex(p => p.id === productData.id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...productData, updatedAt: now };
    }
  } else {
    // Create new product
    const newId = 'shada-' + Date.now();
    const maxOrder = products.reduce((max, item) => Math.max(max, item.displayOrder || 0), 0);
    const newProduct = {
      id: newId,
      name: productData.name || 'New Apparel Item',
      price: Number(productData.price) || 0,
      currency: productData.currency || '₦',
      collectionId: productData.collectionId || 'streetwear',
      collectionName: productData.collectionName || 'Streetwear',
      images: productData.images && productData.images.length ? productData.images : ['images/placeholders/apparel-1.svg'],
      description: productData.description || '',
      sizes: productData.sizes || ['S', 'M', 'L', 'XL'],
      colors: productData.colors || ['Obsidian Black'],
      dateAdded: now,
      inStock: productData.inStock !== false,
      featured: productData.featured || false,
      displayOrder: maxOrder + 1
    };
    products.push(newProduct);
    productData = newProduct;
  }

  // Save Local
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

  // Sync to Firestore if active
  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(firebaseContext.db, "products", productData.id), productData, { merge: true });
    } catch (e) {
      console.error("Firestore product save failed:", e);
    }
  }

  return productData;
}

export async function deleteProduct(productId) {
  let products = await getProducts();
  products = products.filter(p => p.id !== productId);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(firebaseContext.db, "products", productId));
    } catch (e) {
      console.error("Firestore product delete failed:", e);
    }
  }

  return true;
}

// Update items order after drag-and-drop
export async function updateProductsOrder(orderedItems) {
  const updatedProducts = orderedItems.map((item, index) => ({
    ...item,
    displayOrder: index + 1
  }));

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      for (const item of updatedProducts) {
        await setDoc(doc(firebaseContext.db, "products", item.id), { displayOrder: item.displayOrder }, { merge: true });
      }
    } catch (e) {
      console.error("Firestore batch order update failed:", e);
    }
  }

  return updatedProducts;
}

// --------------------------------------------------------------------------
// COLLECTIONS API
// --------------------------------------------------------------------------

export async function getCollections() {
  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const querySnapshot = await getDocs(collection(firebaseContext.db, "collections"));
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      if (items.length > 0) {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(items));
        return items;
      }
    } catch (err) {
      console.warn("Firestore fetch collections error, falling back to LocalStorage:", err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function saveCollection(collectionData) {
  let collections = await getCollections();
  
  if (collectionData.id) {
    const idx = collections.findIndex(c => c.id === collectionData.id);
    if (idx !== -1) {
      collections[idx] = { ...collections[idx], ...collectionData };
    }
  } else {
    const id = collectionData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newCollection = {
      id,
      name: collectionData.name,
      slug: id,
      description: collectionData.description || '',
      image: collectionData.image || 'images/placeholders/apparel-1.svg'
    };
    collections.push(newCollection);
    collectionData = newCollection;
  }

  localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(firebaseContext.db, "collections", collectionData.id), collectionData, { merge: true });
    } catch (e) {
      console.error("Firestore collection save error:", e);
    }
  }

  return collectionData;
}

// --------------------------------------------------------------------------
// STORE SETTINGS API (WhatsApp Phone, Custom Greetings, Auto-Reply, Admin PIN)
// --------------------------------------------------------------------------

export async function getStoreSettings() {
  const defaultSettings = {
    storeName: "SHADA1st Apparel Shop",
    whatsappPhone: "2348100000000",
    whatsappGreeting: "Hello 👋! Thank you for reaching out to SHADA1st Apparel Shop. How may we assist you?",
    whatsappUnavailableMsg: "Hey 👋! We're currently unavailable at the moment. Kindly Leave a message and we'd get back to you later on. Have a great night.",
    currencySymbol: "₦",
    adminPin: "1234"
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

export async function saveStoreSettings(newSettings) {
  const current = await getStoreSettings();
  const updated = { ...current, ...newSettings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

  if (firebaseContext && firebaseContext.isFirebaseActive && firebaseContext.db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(firebaseContext.db, "settings", "general"), updated, { merge: true });
    } catch (e) {
      console.error("Firestore settings save error:", e);
    }
  }

  return updated;
}
