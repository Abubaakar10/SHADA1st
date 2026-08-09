/**
 * SHADA1st Apparel Shop — Customer Storefront Controller
 */

import { initStoreDatabase, getProducts, getCollections, getStoreSettings } from './store-db.js';

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
  showLoadingState();
  try {
    storeSettings = await getStoreSettings();
    allCollections = await getCollections();
    allProducts = await getProducts();
    
    renderStoreStatusBadge();
    renderCollectionPills();
    applyFiltersAndSort();
    setupFooterSupportLink();
  } catch (error) {
    console.error("Failed to load storefront data:", error);
  }
}

function showLoadingState() {
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p style="font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">CURATING SHADA1st LOOKBOOK...</p>
      </div>
    `;
  }
}

function renderStoreStatusBadge() {
  const container = document.getElementById('storeStatusBadgeContainer');
  if (!container) return;

  const isOpen = checkIsStoreOpen();
  const openTime = storeSettings.openingTime || '08:00';
  const closeTime = storeSettings.closingTime || '20:00';

  if (isOpen) {
    container.innerHTML = `
      <div class="store-status-badge open">
        <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> STORE OPEN (${openTime} - ${closeTime})
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="store-status-badge closed">
        <i class="fa-solid fa-moon"></i> STORE CLOSED — LEAVE A MESSAGE
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
    <button class="pill-btn ${activeCollectionFilter === 'all' ? 'active' : ''}" data-collection="all">
      ALL ITEMS
    </button>
  `;

  allCollections.forEach(col => {
    html += `
      <button class="pill-btn ${activeCollectionFilter === col.id ? 'active' : ''}" data-collection="${col.id}">
        ${col.name.toUpperCase()}
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
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      applyFiltersAndSort();
    });
  }

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = e.target.value;
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
    }
  });
}

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
        <i class="fa-solid fa-shirt" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; letter-spacing: 1px; text-transform: uppercase;">NO PRODUCTS FOUND</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">Try selecting a different collection or search term.</p>
      </div>
    `;
    return;
  }

  const symbol = storeSettings.currencySymbol || 'GH₵';
  let html = '';
  products.forEach(p => {
    const formattedPrice = symbol + " " + Number(p.price).toLocaleString();
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : 'images/placeholders/apparel-1.svg';
    
    html += `
      <div class="product-card" data-id="${p.id}">
        <div class="card-image-wrapper" onclick="window.openProductModal('${p.id}')">
          <img src="${mainImg}" alt="${p.name}" class="card-image" loading="lazy">
          ${p.featured ? `<span class="card-badge-tag">FEATURED</span>` : ''}
        </div>
        <div class="card-content">
          <span class="card-brand-sub">SHADA1st</span>
          <h3 class="product-title" onclick="window.openProductModal('${p.id}')">${p.name}</h3>
          
          <div class="rating-row">
            <span class="rating-stars">★★★★★</span>
            <span>4.9</span>
          </div>

          <div class="card-footer">
            <span class="price-amount">${formattedPrice}</span>
            <button class="btn-whatsapp-order" onclick="window.openProductModal('${p.id}', event)">
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

  const symbol = storeSettings.currencySymbol || 'GH₵';
  const formattedPrice = symbol + " " + Number(product.price).toLocaleString();
  
  if (tag) tag.textContent = product.collectionName ? product.collectionName.toUpperCase() : 'PREMIUM QUALITY';
  if (title) title.textContent = product.name.toUpperCase();
  if (price) price.textContent = formattedPrice;
  if (desc) desc.textContent = product.description || 'Crafted from 280GSM heavyweight combed organic cotton. Designed in Ghana for everyday statement prestige.';

  const images = (product.images && product.images.length > 0) ? product.images : ['images/placeholders/apparel-1.svg'];
  if (mainImage) mainImage.src = images[0];

  // Render Rectangular Size Boxes
  if (sizeBoxesContainer) {
    const defaultSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL'];
    const availableSizes = product.sizes && product.sizes.length ? product.sizes : ['S', 'M', 'L', 'XL'];
    selectedSize = availableSizes[0];

    sizeBoxesContainer.innerHTML = defaultSizes.map(s => {
      const isAvailable = availableSizes.includes(s) || availableSizes.includes('Standard') || availableSizes.includes('One Size');
      const isSelected = isAvailable && s === selectedSize;

      if (!isAvailable) {
        return `<div class="size-rect out-of-stock" title="Out of stock">${s}</div>`;
      }

      return `<div class="size-rect ${isSelected ? 'selected' : ''}" onclick="window.selectModalSize('${s}', this)">${s}</div>`;
    }).join('');
  }

  // Pre-set selected color if available
  selectedColor = (product.colors && product.colors.length) ? product.colors[0] : 'Default';

  if (whatsappBtn) {
    whatsappBtn.onclick = () => window.triggerWhatsAppOrder(product.id);
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

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

function setupFooterSupportLink() {
  const btn = document.getElementById('footerWhatsAppSupport');
  if (btn) {
    btn.onclick = () => {
      const phone = storeSettings.whatsappPhone || '233200000000';
      const customerInquiry = "Hello 👋! I have a question about SHADA1st Apparel Shop products and would like to chat with support.";
      const encodedMsg = encodeURIComponent(customerInquiry);
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    };
  }
}

// WhatsApp Order Generator (Triggered inside Modal Panel)
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

  const encodedMsg = encodeURIComponent(customerOrderInquiry);
  const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
  
  window.open(waUrl, '_blank');
};
