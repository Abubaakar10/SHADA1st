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
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--accent-gold-light);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <p font-weight="600">Curating SHADA1st Collections...</p>
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
        <i class="fa-solid fa-circle" style="font-size: 0.6rem;"></i> We are Currently OPEN (${openTime} - ${closeTime})
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="store-status-badge closed">
        <i class="fa-solid fa-moon"></i> Store Closed — Leave a message and we'll reply shortly!
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
      <i class="fa-solid fa-layer-group"></i> All Collections
    </button>
  `;

  allCollections.forEach(col => {
    html += `
      <button class="pill-btn ${activeCollectionFilter === col.id ? 'active' : ''}" data-collection="${col.id}">
        ${col.name}
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
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
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
    countEl.textContent = `Showing ${products.length} item${products.length === 1 ? '' : 's'}`;
  }

  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <i class="fa-solid fa-shirt" style="font-size: 3rem; color: var(--accent-gold); margin-bottom: 1rem; opacity: 0.5;"></i>
        <h3 style="margin-bottom: 0.5rem;">No apparel items match your search</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Try selecting a different collection or clearing your search filters.</p>
      </div>
    `;
    return;
  }

  const symbol = storeSettings.currencySymbol || 'GH₵';
  let html = '';
  products.forEach(p => {
    const formattedPrice = symbol + Number(p.price).toLocaleString();
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : 'images/placeholders/apparel-1.svg';
    
    html += `
      <div class="product-card" data-id="${p.id}">
        <div class="card-image-wrapper" onclick="window.openProductModal('${p.id}')">
          <img src="${mainImg}" alt="${p.name}" class="card-image" loading="lazy">
          <span class="badge-collection">${p.collectionName || 'Collection'}</span>
          ${p.featured ? `<span class="badge-featured">Featured</span>` : ''}
        </div>
        <div class="card-content">
          <h3 class="product-title" onclick="window.openProductModal('${p.id}')">${p.name}</h3>
          <p class="product-description-snippet">${p.description || 'Exclusive piece from SHADA1st Apparel collection.'}</p>
          <div class="card-footer">
            <div class="price-tag">
              <span class="price-label">Price</span>
              <span class="price-amount">${formattedPrice}</span>
            </div>
            <button class="btn-whatsapp-order" onclick="window.triggerWhatsAppOrder('${p.id}', event)">
              <i class="fa-brands fa-whatsapp" style="font-size: 1.1rem;"></i> Order
            </button>
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

// Product detail modal with interactive selection
window.openProductModal = (productId) => {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  modalProduct = product;
  selectedQuantity = 1;
  const qtyDisplay = document.getElementById('qtyDisplay');
  if (qtyDisplay) qtyDisplay.textContent = '1';

  const modal = document.getElementById('productModal');
  const mainImage = document.getElementById('modalMainImage');
  const thumbsContainer = document.getElementById('modalThumbs');
  const tag = document.getElementById('modalTag');
  const title = document.getElementById('modalTitle');
  const price = document.getElementById('modalPrice');
  const desc = document.getElementById('modalDescription');
  const sizesList = document.getElementById('modalSizes');
  const colorsList = document.getElementById('modalColors');
  const whatsappBtn = document.getElementById('modalWhatsAppBtn');
  const autoReplyMsg = document.getElementById('modalAutoReplyText');

  const symbol = storeSettings.currencySymbol || 'GH₵';
  const formattedPrice = symbol + Number(product.price).toLocaleString();
  
  if (tag) tag.textContent = product.collectionName || 'Exclusive Item';
  if (title) title.textContent = product.name;
  if (price) price.textContent = formattedPrice;
  if (desc) desc.textContent = product.description || 'High-end tailored apparel designed by SHADA1st.';

  const images = (product.images && product.images.length > 0) ? product.images : ['images/placeholders/apparel-1.svg'];
  if (mainImage) mainImage.src = images[0];

  if (thumbsContainer) {
    thumbsContainer.innerHTML = images.map((img, idx) => `
      <img src="${img}" class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="window.switchModalImage('${img}', this)">
    `).join('');
  }

  // Interactive Sizes Selection
  if (sizesList) {
    const sizes = product.sizes && product.sizes.length ? product.sizes : ['Standard'];
    selectedSize = sizes[0];
    sizesList.innerHTML = sizes.map((s, idx) => `
      <span class="chip ${idx === 0 ? 'selected' : ''}" data-size="${s}" onclick="window.selectModalSize('${s}', this)">${s}</span>
    `).join('');
  }

  // Interactive Colors Selection
  if (colorsList) {
    const colors = product.colors && product.colors.length ? product.colors : ['Default'];
    selectedColor = colors[0];
    colorsList.innerHTML = colors.map((c, idx) => `
      <span class="chip ${idx === 0 ? 'selected' : ''}" data-color="${c}" onclick="window.selectModalColor('${c}', this)">${c}</span>
    `).join('');
  }

  if (whatsappBtn) {
    whatsappBtn.onclick = () => window.triggerWhatsAppOrder(product.id);
  }

  if (autoReplyMsg) {
    autoReplyMsg.textContent = storeSettings.whatsappUnavailableMsg || "Hey 👋! We're currently unavailable at the moment. Kindly Leave a message and we'd get back to you later on. Have a great night.";
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.selectModalSize = (size, element) => {
  selectedSize = size;
  const chips = document.querySelectorAll('#modalSizes .chip');
  chips.forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
};

window.selectModalColor = (color, element) => {
  selectedColor = color;
  const chips = document.querySelectorAll('#modalColors .chip');
  chips.forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
};

window.switchModalImage = (imgSrc, element) => {
  const mainImg = document.getElementById('modalMainImage');
  if (mainImg) mainImg.src = imgSrc;
  const thumbs = document.querySelectorAll('.thumb-item');
  thumbs.forEach(t => t.classList.remove('active'));
  element.classList.add('active');
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

// WhatsApp Order Direct Link Generator (Includes Item Name, Price, Quantity, Size, Color)
window.triggerWhatsAppOrder = (productId, event) => {
  if (event) event.stopPropagation();

  const product = allProducts.find(p => p.id === productId) || modalProduct;
  if (!product) return;

  const phone = storeSettings.whatsappPhone || '233200000000';
  const symbol = storeSettings.currencySymbol || 'GH₵';
  const unitPrice = Number(product.price);
  const formattedUnitPrice = symbol + unitPrice.toLocaleString();
  const totalPrice = unitPrice * selectedQuantity;
  const formattedTotalPrice = symbol + totalPrice.toLocaleString();

  const chosenSize = selectedSize || (product.sizes && product.sizes[0]) || 'Standard';
  const chosenColor = selectedColor || (product.colors && product.colors[0]) || 'Default';

  // Format exact message requested by user
  let customerOrderInquiry = `Hello 👋! I would like to order: *${product.name}* (Price: ${formattedUnitPrice})\nQuantity: *${selectedQuantity}*\nSize: *${chosenSize}*\nColor: *${chosenColor}*`;

  if (selectedQuantity > 1) {
    customerOrderInquiry += `\nTotal Amount: *${formattedTotalPrice}*`;
  }

  customerOrderInquiry += `\n\nPlease let me know how to proceed with payment and delivery.`;

  const encodedMsg = encodeURIComponent(customerOrderInquiry);
  const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
  
  window.open(waUrl, '_blank');
};
