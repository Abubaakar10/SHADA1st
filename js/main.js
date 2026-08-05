/**
 * SHADA1st Apparel Shop — Customer Storefront Controller
 */

import { initStoreDatabase, getProducts, getCollections, getStoreSettings } from './store-db.js';

let allProducts = [];
let allCollections = [];
let storeSettings = {};
let activeCollectionFilter = 'all';
let currentSortMode = 'custom';
let currentSearchQuery = '';
let currentSelectedProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initStoreDatabase();
  await loadStoreData();
  setupEventListeners();
});

async function loadStoreData() {
  showLoadingState();
  try {
    storeSettings = await getStoreSettings();
    allCollections = await getCollections();
    allProducts = await getProducts();
    
    renderCollectionPills();
    applyFiltersAndSort();
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

  // Add click handlers for pills
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
  // Search Bar Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      applyFiltersAndSort();
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = e.target.value;
      applyFiltersAndSort();
    });
  }

  // Modal Close Trigger
  const modalClose = document.getElementById('modalClose');
  const modalBackdrop = document.getElementById('productModal');
  if (modalClose && modalBackdrop) {
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Keyboard ESC to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function applyFiltersAndSort() {
  let filtered = [...allProducts];

  // 1. Collection Filter
  if (activeCollectionFilter !== 'all') {
    filtered = filtered.filter(p => p.collectionId === activeCollectionFilter || p.collectionName?.toLowerCase() === activeCollectionFilter.toLowerCase());
  }

  // 2. Search Filter
  if (currentSearchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(currentSearchQuery) ||
      (p.description && p.description.toLowerCase().includes(currentSearchQuery)) ||
      (p.collectionName && p.collectionName.toLowerCase().includes(currentSearchQuery))
    );
  }

  // 3. Multi-Criteria Sorting Logic
  switch (currentSortMode) {
    case 'custom':
      // Admin Drag Position Order (Display Order asc)
      filtered.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
      break;
    case 'date-desc':
      // Newest Added First
      filtered.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
      break;
    case 'date-asc':
      // Oldest Added First
      filtered.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
      break;
    case 'price-asc':
      // Price: Low to High
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      // Price: High to Low
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      // Name A - Z
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

  let html = '';
  products.forEach(p => {
    const formattedPrice = (p.currency || '₦') + Number(p.price).toLocaleString();
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

// Global modal launcher
window.openProductModal = (productId) => {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  currentSelectedProduct = product;
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

  const formattedPrice = (product.currency || '₦') + Number(product.price).toLocaleString();
  
  if (tag) tag.textContent = product.collectionName || 'Exclusive Item';
  if (title) title.textContent = product.name;
  if (price) price.textContent = formattedPrice;
  if (desc) desc.textContent = product.description || 'High-end tailored apparel designed by SHADA1st.';

  // Render main image & thumbnails
  const images = (product.images && product.images.length > 0) ? product.images : ['images/placeholders/apparel-1.svg'];
  if (mainImage) mainImage.src = images[0];

  if (thumbsContainer) {
    thumbsContainer.innerHTML = images.map((img, idx) => `
      <img src="${img}" class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="window.switchModalImage('${img}', this)">
    `).join('');
  }

  // Render Sizes & Colors
  if (sizesList) {
    const sizes = product.sizes && product.sizes.length ? product.sizes : ['Standard'];
    sizesList.innerHTML = sizes.map(s => `<span class="chip selected">${s}</span>`).join('');
  }

  if (colorsList) {
    const colors = product.colors && product.colors.length ? product.colors : ['Default'];
    colorsList.innerHTML = colors.map(c => `<span class="chip">${c}</span>`).join('');
  }

  // Build WhatsApp Action
  if (whatsappBtn) {
    whatsappBtn.onclick = () => {
      window.triggerWhatsAppOrder(product.id);
    };
  }

  // Set configured auto-reply message note
  if (autoReplyMsg) {
    autoReplyMsg.textContent = storeSettings.whatsappUnavailableMsg || "Hey 👋! We're currently unavailable at the moment. Kindly Leave a message and we'd get back to you later on. Have a great night.";
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
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

// WhatsApp Link Generator with exact user request greeting & formatting
window.triggerWhatsAppOrder = (productId, event) => {
  if (event) event.stopPropagation();

  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const phone = storeSettings.whatsappPhone || '2348100000000';
  const greeting = storeSettings.whatsappGreeting || "Hello 👋! Thank you for reaching out to SHADA1st Apparel Shop. How may we assist you?";
  const formattedPrice = (product.currency || '₦') + Number(product.price).toLocaleString();

  // Custom order message string
  const customMessage = `${greeting}\n\n🛒 *ORDER INQUIRY*\nItem: *${product.name}*\nPrice: *${formattedPrice}*\nCollection: ${product.collectionName || 'General'}\nItem Ref: ${product.id}\n\nI would like to discuss payment, delivery, and place my order for this item.`;

  const encodedMsg = encodeURIComponent(customMessage);
  const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
  
  window.open(waUrl, '_blank');
};
