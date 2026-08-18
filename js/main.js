/**
 * SHADA1st Apparel Shop — Customer Storefront Controller
 */

import { initStoreDatabase, getProducts, getCollections, getStoreSettings } from './store-db.js';
import { escapeHTML, sanitizeInput } from './security.js';
import { checkRateLimit } from './rate-limiter.js';

let allProducts = [];
let allCollections = [];
let storeSettings = {};
let activeCollectionFilter = 'all';
let currentSortMode = 'date-desc';
let currentSearchQuery = '';

// Modal Selection State
let modalProduct = null;
let selectedSize = '';
let selectedColor = '';
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
  await initStoreDatabase();
  await loadStoreData();
  setupEventListeners();
  setupQuantityControls();
});

async function loadStoreData() {
  showSkeletonLoadingState();
  try {
    storeSettings = await getStoreSettings();
    allCollections = await getCollections();
    allProducts = await getProducts();
    
    renderStoreStatusBadge();
    renderCollectionPills();
    renderHeroShowcase();
    applyFiltersAndSort();
    setupFooterSupportLink();
  } catch (error) {
    console.error("Failed to load storefront data:", error);
  }
}

function showSkeletonLoadingState() {
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.innerHTML = Array(8).fill(0).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text" style="width: 40%;"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `).join('');
  }
}

function renderStoreStatusBadge() {
  const container = document.getElementById('storeStatusBadgeContainer');
  if (!container) return;

  const isOpen = checkIsStoreOpen();
  const openTime = escapeHTML(storeSettings.openingTime || '08:00');
  const closeTime = escapeHTML(storeSettings.closingTime || '20:00');

  if (isOpen) {
    container.innerHTML = `
      <div class="store-status-badge open" aria-label="Store Status: Open">
        <i class="fa-solid fa-circle" style="font-size: 0.5rem;" aria-hidden="true"></i> STORE OPEN (${openTime} - ${closeTime})
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="store-status-badge closed" aria-label="Store Status: Closed">
        <i class="fa-solid fa-moon" aria-hidden="true"></i> STORE CLOSED
      </div>
    `;
  }
}

function checkIsStoreOpen() {
  if (storeSettings.manualStatus === 'open') return true;
  if (storeSettings.manualStatus === 'closed') return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = (storeSettings.openingTime || '08:00').split(':').map(Number);
  const [closeH, closeM] = (storeSettings.closingTime || '20:00').split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function renderCollectionPills() {
  const container = document.getElementById('collectionPills');
  if (!container) return;

  let html = `
    <button class="pill-btn ${activeCollectionFilter === 'all' ? 'active' : ''}" data-collection="all" aria-label="Show All Collections">
      ALL ITEMS
    </button>
  `;

  allCollections.forEach(col => {
    const safeName = escapeHTML(col.name).toUpperCase();
    html += `
      <button class="pill-btn ${activeCollectionFilter === col.id ? 'active' : ''}" data-collection="${escapeHTML(col.id)}" aria-label="Filter by collection ${safeName}">
        ${safeName}
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      activeCollectionFilter = targetBtn.getAttribute('data-collection');
      applyFiltersAndSort();
    });
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = sanitizeInput(e.target.value).toLowerCase();
      applyFiltersAndSort();
      renderSearchSuggestions(currentSearchQuery);
    });

    searchInput.addEventListener('focus', () => {
      if (currentSearchQuery) {
        renderSearchSuggestions(currentSearchQuery);
      }
    });
  }

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (searchInput && suggestionsDropdown && !searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      suggestionsDropdown.classList.remove('active');
    }
  });

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = sanitizeInput(e.target.value);
      applyFiltersAndSort();
    });
  }

  const modalClose = document.getElementById('modalClose');
  const modalBackdrop = document.getElementById('productModal');
  if (modalClose && modalBackdrop) {
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.closeHowToOrderModal();
      if (suggestionsDropdown) suggestionsDropdown.classList.remove('active');
    }
  });
}

function renderSearchSuggestions(query) {
  const dropdown = document.getElementById('searchSuggestionsDropdown');
  if (!dropdown) return;

  if (!query || query.length < 1) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
    return;
  }

  const matches = allProducts.filter(p => 
    p.name.toLowerCase().includes(query) ||
    (p.collectionName && p.collectionName.toLowerCase().includes(query)) ||
    (p.description && p.description.toLowerCase().includes(query))
  ).slice(0, 5);

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 0.85rem; font-size: 0.78rem; color: var(--text-muted); text-align: center;">
        No apparel items found matching "${escapeHTML(query)}"
      </div>
    `;
    dropdown.classList.add('active');
    return;
  }

  const symbol = escapeHTML(storeSettings.currencySymbol || 'GH₵');

  dropdown.innerHTML = matches.map(item => {
    const mainImg = (item.images && item.images.length > 0) ? escapeHTML(item.images[0]) : 'images/placeholders/apparel-1.svg';
    const formattedPrice = symbol + " " + Number(item.price).toLocaleString();
    const collectionTag = escapeHTML(item.collectionName || 'General');
    const safeTitle = escapeHTML(item.name);

    return `
      <div class="suggestion-item" onclick="window.selectSearchSuggestion('${escapeHTML(item.id)}')" role="button" tabindex="0">
        <img src="${mainImg}" alt="${safeTitle}" class="suggestion-thumb">
        <div class="suggestion-info">
          <div class="suggestion-title">${safeTitle}</div>
          <div class="suggestion-meta">
            <span>${collectionTag.toUpperCase()}</span>
            <strong style="color: var(--text-primary);">${formattedPrice}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');

  dropdown.classList.add('active');
}

window.selectSearchSuggestion = (productId) => {
  const dropdown = document.getElementById('searchSuggestionsDropdown');
  if (dropdown) dropdown.classList.remove('active');
  window.openProductModal(productId);
};

function setupQuantityControls() {
  const minusBtn = document.getElementById('qtyMinusBtn');
  const plusBtn = document.getElementById('qtyPlusBtn');
  const qtyDisplay = document.getElementById('qtyDisplay');

  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      if (selectedQuantity > 1) {
        selectedQuantity--;
        if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
      }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      selectedQuantity++;
      if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
    });
  }
}

function applyFiltersAndSort() {
  let filtered = [...allProducts];

  if (activeCollectionFilter !== 'all') {
    filtered = filtered.filter(p => p.collectionId === activeCollectionFilter || (p.collectionName && p.collectionName.toLowerCase() === activeCollectionFilter.toLowerCase()));
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(currentSearchQuery) ||
      (p.description && p.description.toLowerCase().includes(currentSearchQuery)) ||
      (p.collectionName && p.collectionName.toLowerCase().includes(currentSearchQuery))
    );
  }

  switch (currentSortMode) {
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
      break;
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      filtered.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }

  renderProductGrid(filtered);
}

function renderProductGrid(products) {
  const grid = document.getElementById('productGrid');
  const countEl = document.getElementById('resultsCount');
  
  if (countEl) {
    countEl.textContent = `${products.length} ITEM${products.length === 1 ? '' : 'S'}`;
  }

  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-subtle);">
        <i class="fa-solid fa-shirt" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;" aria-hidden="true"></i>
        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; letter-spacing: 1px; text-transform: uppercase;">NO PRODUCTS FOUND</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">Try selecting a different collection or search term.</p>
      </div>
    `;
    return;
  }

  const symbol = escapeHTML(storeSettings.currencySymbol || 'GH₵');
  let html = '';
  products.forEach(p => {
    const formattedPrice = symbol + " " + Number(p.price).toLocaleString();
    const mainImg = (p.images && p.images.length > 0) ? escapeHTML(p.images[0]) : 'images/placeholders/apparel-1.svg';
    const safeTitle = escapeHTML(p.name);
    
    html += `
      <div class="product-card" data-id="${escapeHTML(p.id)}">
        <div class="card-image-wrapper" onclick="window.openProductModal('${escapeHTML(p.id)}')" role="button" tabindex="0" aria-label="View product details for ${safeTitle}">
          <img src="${mainImg}" alt="${safeTitle}" class="card-image" loading="lazy">
          ${p.featured ? `<span class="card-badge-tag">FEATURED</span>` : ''}
        </div>
        <div class="card-content">
          <span class="card-brand-sub">SHADA1st</span>
          <h3 class="product-title" onclick="window.openProductModal('${escapeHTML(p.id)}')" role="button" tabindex="0">${safeTitle}</h3>
          
          <div class="rating-row" aria-label="Rating: 4.9 out of 5 stars">
            <span class="rating-stars" aria-hidden="true">★★★★★</span>
            <span>4.9</span>
          </div>

          <div class="card-footer">
            <span class="price-amount">${formattedPrice}</span>
            <button class="btn-whatsapp-order" onclick="window.openProductModal('${escapeHTML(p.id)}', event)" aria-label="Order ${safeTitle} on WhatsApp">
              ORDER
            </button>
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

// SHADA1st PRODUCT DETAIL MODAL
window.openProductModal = (productId, event) => {
  if (event) event.stopPropagation();

  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  modalProduct = product;
  selectedQuantity = 1;
  const qtyDisplay = document.getElementById('qtyDisplay');
  if (qtyDisplay) qtyDisplay.textContent = '1';

  const modal = document.getElementById('productModal');
  const mainImage = document.getElementById('modalMainImage');
  const tag = document.getElementById('modalTag');
  const title = document.getElementById('modalTitle');
  const price = document.getElementById('modalPrice');
  const desc = document.getElementById('modalDescription');
  const sizeBoxesContainer = document.getElementById('modalSizeBoxes');
  const whatsappBtn = document.getElementById('modalWhatsAppBtn');

  const symbol = escapeHTML(storeSettings.currencySymbol || 'GH₵');
  const formattedPrice = symbol + " " + Number(product.price).toLocaleString();
  
  if (tag) tag.textContent = product.collectionName ? product.collectionName.toUpperCase() : 'PREMIUM QUALITY';
  if (title) title.textContent = product.name.toUpperCase();
  if (price) price.textContent = formattedPrice;
  if (desc) desc.textContent = product.description || 'Crafted from 280GSM heavyweight combed organic cotton. Designed in Ghana for everyday statement prestige.';

  const images = (product.images && product.images.length > 0) ? product.images : ['images/placeholders/apparel-1.svg'];
  if (mainImage) mainImage.src = images[0];

  // Render Multi-Image Gallery Thumbnails
  const thumbsContainer = document.getElementById('modalImageThumbs');
  if (thumbsContainer) {
    if (images.length > 1) {
      thumbsContainer.style.display = 'flex';
      thumbsContainer.innerHTML = images.map((imgUrl, idx) => `
        <img src="${escapeHTML(imgUrl)}" class="gallery-thumb-item ${idx === 0 ? 'active' : ''}" onclick="window.selectModalImage('${escapeHTML(imgUrl)}', this)" alt="Thumbnail ${idx + 1}">
      `).join('');
    } else {
      thumbsContainer.style.display = 'none';
      thumbsContainer.innerHTML = '';
    }
  }

  // Render Color Selection Chips
  const colorContainer = document.getElementById('modalColorBoxes');
  const colorRow = document.getElementById('modalColorRow');
  const colors = (product.colors && product.colors.length) ? product.colors : [];

  if (colorContainer) {
    if (colors.length > 0) {
      if (colorRow) colorRow.style.display = 'block';
      selectedColor = colors[0];
      colorContainer.innerHTML = colors.map((col, idx) => `
        <div class="color-chip ${idx === 0 ? 'selected' : ''}" onclick="window.selectModalColor('${escapeHTML(col)}', this)" role="button" tabindex="0">
          ${escapeHTML(col)}
        </div>
      `).join('');
    } else {
      if (colorRow) colorRow.style.display = 'none';
      selectedColor = 'Default';
    }
  }

  // Render Rectangular Size Boxes
  if (sizeBoxesContainer) {
    const standardBoxes = ['XXS', 'XS', 'S', 'M', 'L', 'XL'];
    const savedInStockSizes = (product.sizes && product.sizes.length) 
      ? product.sizes.map(s => s.toUpperCase()) 
      : ['M', 'L', 'XL'];

    const displayBoxes = [...standardBoxes];
    savedInStockSizes.forEach(s => {
      if (!displayBoxes.includes(s) && s !== 'STANDARD' && s !== 'ONE SIZE') {
        displayBoxes.push(s);
      }
    });

    selectedSize = savedInStockSizes[0] || 'M';

    sizeBoxesContainer.innerHTML = displayBoxes.map(s => {
      const isInStock = savedInStockSizes.includes(s) || savedInStockSizes.includes('STANDARD') || savedInStockSizes.includes('ONE SIZE');
      const isSelected = isInStock && s === selectedSize;

      if (!isInStock) {
        return `<div class="size-rect out-of-stock" title="Out of stock">${escapeHTML(s)}</div>`;
      }

      return `<div class="size-rect ${isSelected ? 'selected' : ''}" onclick="window.selectModalSize('${escapeHTML(s)}', this)" role="button" tabindex="0" aria-label="Select size ${escapeHTML(s)}">${escapeHTML(s)}</div>`;
    }).join('');
  }

  if (whatsappBtn) {
    whatsappBtn.onclick = () => window.triggerWhatsAppOrder(product.id);
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.selectModalImage = (imgUrl, element) => {
  const mainImage = document.getElementById('modalMainImage');
  if (mainImage) mainImage.src = imgUrl;
  const thumbs = document.querySelectorAll('#modalImageThumbs .gallery-thumb-item');
  thumbs.forEach(t => t.classList.remove('active'));
  if (element) element.classList.add('active');
};

window.selectModalColor = (color, element) => {
  selectedColor = color;
  const chips = document.querySelectorAll('#modalColorBoxes .color-chip');
  chips.forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
};

function renderHeroShowcase() {
  const hotCard = document.getElementById('heroHotReleaseCard');
  const hotImg = document.getElementById('heroHotImg');
  const hotTitle = document.getElementById('heroHotTitle');
  const hotPrice = document.getElementById('heroHotPrice');
  const editorialImg = document.getElementById('heroEditorialImg');

  if (storeSettings.heroEditorialImage && editorialImg) {
    editorialImg.src = storeSettings.heroEditorialImage;
  }

  let hotProduct = null;
  if (storeSettings.hotLookProductId) {
    hotProduct = allProducts.find(p => p.id === storeSettings.hotLookProductId);
  }
  if (!hotProduct) {
    hotProduct = allProducts.find(p => p.featured) || allProducts[0];
  }

  if (hotProduct) {
    const symbol = storeSettings.currencySymbol || 'GH₵';
    const mainImgUrl = (hotProduct.images && hotProduct.images.length) ? hotProduct.images[0] : 'images/placeholders/hero-featured-product.jpg';
    
    if (hotImg) hotImg.src = mainImgUrl;
    if (hotTitle) hotTitle.textContent = hotProduct.name.toUpperCase();
    if (hotPrice) hotPrice.textContent = `${symbol} ${Number(hotProduct.price).toLocaleString()}`;
    
    if (hotCard) {
      hotCard.onclick = () => window.openProductModal(hotProduct.id);
    }
  }
}

window.selectModalSize = (size, element) => {
  selectedSize = size;
  const boxes = document.querySelectorAll('#modalSizeBoxes .size-rect');
  boxes.forEach(b => b.classList.remove('selected'));
  element.classList.add('selected');
};

function closeModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.openHowToOrderModal = () => {
  const modal = document.getElementById('howToOrderModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeHowToOrderModal = () => {
  const modal = document.getElementById('howToOrderModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

/**
 * Universal Mobile-Native & Desktop WhatsApp Redirect Launcher
 * Triggers native WhatsApp / WhatsApp Business app on iOS/Android via whatsapp:// protocol
 */
function openWhatsAppAppOrWeb(phoneNum, rawText) {
  // Rate Limiter Check for Order Submissions (Max 1 per 2 seconds)
  const rateLimit = checkRateLimit('whatsapp_action', 1, 2000);
  if (!rateLimit.allowed) {
    return;
  }

  const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(rawText);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // 1. Primary: Native Mobile App Deep Link Protocol
    const appDeepLink = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
    const webFallbackUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    let appOpened = false;

    // Listen for blur/pagehide to verify if native WhatsApp app launched
    const handleBlur = () => {
      appOpened = true;
      window.removeEventListener('pagehide', handleBlur);
      window.removeEventListener('blur', handleBlur);
    };

    window.addEventListener('pagehide', handleBlur);
    window.addEventListener('blur', handleBlur);

    // Launch native app directly
    window.location.href = appDeepLink;

    // Fallback to wa.me URL if WhatsApp app is not installed
    setTimeout(() => {
      window.removeEventListener('pagehide', handleBlur);
      window.removeEventListener('blur', handleBlur);
      if (!appOpened && document.hasFocus()) {
        window.location.href = webFallbackUrl;
      }
    }, 1500);
  } else {
    // Desktop / Laptop Web Browser Handler
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  }
}

function setupFooterSupportLink() {
  const btn = document.getElementById('footerWhatsAppSupport');
  if (btn) {
    btn.onclick = () => {
      const phone = storeSettings.whatsappPhone || '233200000000';
      const customerInquiry = "Hello 👋! I have a question about SHADA1st Apparel Shop products and would like to chat with support.";
      openWhatsAppAppOrWeb(phone, customerInquiry);
    };
  }
}

// WhatsApp Order Generator
window.triggerWhatsAppOrder = (productId, event) => {
  if (event) event.stopPropagation();

  const product = allProducts.find(p => p.id === productId) || modalProduct;
  if (!product) return;

  const phone = storeSettings.whatsappPhone || '233200000000';
  const symbol = storeSettings.currencySymbol || 'GH₵';
  const unitPrice = Number(product.price);
  const formattedUnitPrice = symbol + " " + unitPrice.toLocaleString();
  const totalPrice = unitPrice * selectedQuantity;
  const formattedTotalPrice = symbol + " " + totalPrice.toLocaleString();

  const chosenSize = selectedSize || (product.sizes && product.sizes[0]) || 'Standard';
  const chosenColor = selectedColor || (product.colors && product.colors[0]) || 'Default';

  let customerOrderInquiry = `Hello 👋! I would like to order: *${product.name}* (Price: ${formattedUnitPrice})\nQuantity: *${selectedQuantity}*\nSize: *${chosenSize}*\nColor: *${chosenColor}*`;

  if (selectedQuantity > 1) {
    customerOrderInquiry += `\nTotal Amount: *${formattedTotalPrice}*`;
  }

  customerOrderInquiry += `\n\nPlease let me know how to proceed with payment and delivery.`;

  openWhatsAppAppOrWeb(phone, customerOrderInquiry);
};
