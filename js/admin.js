/**
 * SHADA1st Apparel Shop — Admin Portal Controller
 */

import { initStoreDatabase, getProducts, saveProduct, deleteProduct, updateProductsOrder, getCollections, saveCollection, deleteCollection, getStoreSettings, saveStoreSettings } from './store-db.js';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { escapeHTML, sanitizeInput } from './security.js';
import { checkRateLimit, resetRateLimit } from './rate-limiter.js';

let adminProducts = [];
let adminCollections = [];
let adminSettings = {};
let uploadedImageUrls = [];
let draggedItemIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initStoreDatabase();
  adminSettings = await getStoreSettings();
  setupAuthCheck();
  setupPinVisibilityToggle();
});

function setupPinVisibilityToggle() {
  const toggleBtn = document.getElementById('togglePinVisibility');
  const pinInput = document.getElementById('adminPinInput');
  const eyeIcon = document.getElementById('pinEyeIcon');

  if (toggleBtn && pinInput && eyeIcon) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = pinInput.getAttribute('type') === 'password';
      if (isPassword) {
        pinInput.setAttribute('type', 'text');
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
      } else {
        pinInput.setAttribute('type', 'password');
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
      }
    });
  }
}

function setupAuthCheck() {
  const loginForm = document.getElementById('adminLoginForm');
  const pinInput = document.getElementById('adminPinInput');
  const loginView = document.getElementById('adminLoginView');
  const dashboardView = document.getElementById('adminDashboardView');
  const authError = document.getElementById('authError');

  if (sessionStorage.getItem('shada_admin_logged') === 'true') {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    initAdminDashboard();
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Rate limit check for Admin PIN brute force protection (Max 5 attempts in 3 min)
      const rateCheck = checkRateLimit('admin_pin_attempts', 5, 180000);
      if (!rateCheck.allowed) {
        const secondsLeft = Math.ceil(rateCheck.remainingMs / 1000);
        if (authError) {
          authError.textContent = `Security Lockout: Too many invalid PIN attempts. Please wait ${secondsLeft}s.`;
          authError.style.display = 'block';
        }
        return;
      }

      const enteredPin = pinInput ? sanitizeInput(pinInput.value) : '';
      const correctPin = adminSettings.adminPin || '1234';

      if (enteredPin === correctPin) {
        resetRateLimit('admin_pin_attempts');
        sessionStorage.setItem('shada_admin_logged', 'true');
        if (loginView) loginView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'block';
        if (authError) authError.style.display = 'none';
        initAdminDashboard();
        showToast("Welcome to SHADA1st Admin Portal", "success");
      } else {
        if (authError) {
          authError.textContent = "Invalid Admin PIN. Please try again.";
          authError.style.display = 'block';
        }
      }
    });
  }
}

async function initAdminDashboard() {
  setupTabs();
  setupAdminSizePicker();
  await refreshAdminData();
  setupProductForm();
  setupImagePickers();
  setupCollectionForm();
  setupSettingsForm();
  setupFirebaseForm();
  
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('shada_admin_logged');
      window.location.reload();
    });
  }
}

function setupAdminSizePicker() {
  const grid = document.getElementById('adminSizePickerGrid');
  if (!grid) return;

  grid.querySelectorAll('.size-rect').forEach(box => {
    box.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.currentTarget;
      if (target.classList.contains('selected')) {
        target.classList.remove('selected');
        target.classList.add('out-of-stock');
      } else {
        target.classList.remove('out-of-stock');
        target.classList.add('selected');
      }
    });
  });
}

function getSelectedAdminSizes() {
  const selectedBoxes = document.querySelectorAll('#adminSizePickerGrid .size-rect.selected');
  const sizeArray = Array.from(selectedBoxes).map(b => b.getAttribute('data-size'));
  
  const customInput = document.getElementById('prodSizes');
  if (customInput && customInput.value.trim()) {
    const customSizes = customInput.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    customSizes.forEach(s => {
      if (!sizeArray.includes(s)) sizeArray.push(s);
    });
  }

  return sizeArray;
}

function setAdminSizePickerState(sizesArr) {
  const grid = document.getElementById('adminSizePickerGrid');
  if (!grid) return;

  const activeSizes = (sizesArr && sizesArr.length) ? sizesArr.map(s => s.toUpperCase()) : ['M', 'L', 'XL'];

  grid.querySelectorAll('.size-rect').forEach(box => {
    const sizeName = box.getAttribute('data-size');
    if (activeSizes.includes(sizeName) || activeSizes.includes('STANDARD') || activeSizes.includes('ONE SIZE')) {
      box.classList.add('selected');
      box.classList.remove('out-of-stock');
    } else {
      box.classList.remove('selected');
      box.classList.add('out-of-stock');
    }
  });

  const customInput = document.getElementById('prodSizes');
  if (customInput) {
    const defaultList = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const extraSizes = activeSizes.filter(s => !defaultList.includes(s));
    customInput.value = extraSizes.join(', ');
  }
}

async function refreshAdminData() {
  adminProducts = await getProducts();
  adminCollections = await getCollections();
  adminSettings = await getStoreSettings();

  renderProductsTable();
  renderCollectionsList();
  renderDragReorderGrid();
  updateCollectionDropdowns();
  populateSettingsForm();
  renderFirebaseStatus();
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const panelSections = document.querySelectorAll('.admin-panel-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      panelSections.forEach(s => s.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const section = document.getElementById(targetTab);
      if (section) section.classList.add('active');
    });
  });
}

function setupImagePickers() {
  const fileInput = document.getElementById('prodFileInput');
  const dropzone = document.getElementById('fileDropzone');

  if (dropzone && fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleProductFileSelect(e.target.files);
    });
  }

  const colFileInput = document.getElementById('colFileInput');
  if (colFileInput) {
    colFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          document.getElementById('colImage').value = evt.target.result;
          document.getElementById('colImagePreview').innerHTML = `
            <img src="${evt.target.result}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid var(--border-subtle);">
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function handleProductFileSelect(files) {
  if (!files || !files.length) return;

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedImageUrls.push(event.target.result);
      updateProductImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function updateProductImagePreviews() {
  const thumbsContainer = document.getElementById('imagePreviewThumbs');
  const hiddenInput = document.getElementById('prodImages');

  if (hiddenInput) hiddenInput.value = JSON.stringify(uploadedImageUrls);

  if (thumbsContainer) {
    if (uploadedImageUrls.length === 0) {
      thumbsContainer.innerHTML = '';
      return;
    }

    thumbsContainer.innerHTML = uploadedImageUrls.map((url, idx) => `
      <div class="img-preview-card">
        <img src="${escapeHTML(url)}" alt="Preview ${idx}">
        <button type="button" class="img-preview-remove" onclick="window.removeUploadedImage(${idx})" aria-label="Remove photo">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
  }
}

window.removeUploadedImage = (index) => {
  uploadedImageUrls.splice(index, 1);
  updateProductImagePreviews();
};

function renderProductsTable() {
  const tbody = document.getElementById('adminProductsTbody');
  if (!tbody) return;

  if (adminProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">No products found in catalog.</td></tr>`;
    return;
  }

  const symbol = escapeHTML(adminSettings.currencySymbol || 'GH₵');

  tbody.innerHTML = adminProducts.map((p, index) => {
    const formattedPrice = symbol + " " + Number(p.price).toLocaleString();
    const mainImg = (p.images && p.images.length > 0) ? escapeHTML(p.images[0]) : 'images/placeholders/apparel-1.svg';
    const sizesListStr = (p.sizes && p.sizes.length) ? p.sizes.map(escapeHTML).join(', ') : 'M, L, XL';
    const safeTitle = escapeHTML(p.name);
    const safeColName = escapeHTML(p.collectionName || 'General');

    return `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td>
          <img src="${mainImg}" class="table-thumb" alt="${safeTitle}">
        </td>
        <td>
          <strong>${safeTitle}</strong><br>
          <small style="color: var(--text-muted);">ID: ${escapeHTML(p.id)}</small>
        </td>
        <td><span class="card-badge-tag">${safeColName}</span></td>
        <td><strong style="color: var(--text-primary);">${formattedPrice}</strong></td>
        <td><span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${sizesListStr}</span></td>
        <td>${p.inStock ? '<span style="color: #25D366; font-weight:700;">In Stock</span>' : '<span style="color: #EF4444;">Out of Stock</span>'}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="window.editAdminProduct('${escapeHTML(p.id)}')">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn-secondary btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="window.deleteAdminProduct('${escapeHTML(p.id)}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupProductForm() {
  const form = document.getElementById('productForm');
  const collectionSelect = document.getElementById('prodCollection');
  
  if (collectionSelect) {
    collectionSelect.innerHTML = adminCollections.map(c => `
      <option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>
    `).join('');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const prodId = document.getElementById('prodId').value;
      const name = sanitizeInput(document.getElementById('prodName').value);
      const price = parseFloat(document.getElementById('prodPrice').value) || 0;
      const collectionId = document.getElementById('prodCollection').value;
      
      const selectedColObj = adminCollections.find(c => c.id === collectionId);
      const collectionName = selectedColObj ? selectedColObj.name : 'General';

      const sizes = getSelectedAdminSizes();
      const colorsInput = document.getElementById('prodColors').value;
      const colors = colorsInput.split(',').map(s => sanitizeInput(s)).filter(Boolean);

      const description = sanitizeInput(document.getElementById('prodDesc').value);
      const inStock = document.getElementById('prodInStock').checked;
      const featured = document.getElementById('prodFeatured').checked;

      if (uploadedImageUrls.length === 0) {
        uploadedImageUrls = ['images/placeholders/apparel-1.svg'];
      }

      const productPayload = {
        name,
        price,
        collectionId,
        collectionName,
        sizes: sizes.length ? sizes : ['M', 'L', 'XL'],
        colors: colors.length ? colors : ['Black', 'Gold'],
        description,
        inStock,
        featured,
        images: uploadedImageUrls
      };

      if (prodId) {
        productPayload.id = prodId;
      }

      showToast("Saving product to cloud...", "info");
      await saveProduct(productPayload);
      showToast("Product saved successfully!", "success");

      resetProductForm();
      await refreshAdminData();
    });
  }

  const cancelBtn = document.getElementById('cancelProdEdit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetProductForm);
  }
}

function resetProductForm() {
  const form = document.getElementById('productForm');
  if (form) form.reset();

  document.getElementById('prodId').value = '';
  uploadedImageUrls = [];
  updateProductImagePreviews();

  setAdminSizePickerState(['M', 'L', 'XL']);

  const title = document.getElementById('productFormTitle');
  if (title) title.innerHTML = `<i class="fa-solid fa-plus-circle" style="color: var(--accent-gold);"></i> Add New Apparel Item`;

  const cancelBtn = document.getElementById('cancelProdEdit');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

window.editAdminProduct = (productId) => {
  const product = adminProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('prodId').value = product.id;
  document.getElementById('prodName').value = product.name;
  document.getElementById('prodPrice').value = product.price;
  
  if (document.getElementById('prodCollection')) {
    document.getElementById('prodCollection').value = product.collectionId;
  }

  setAdminSizePickerState(product.sizes);

  document.getElementById('prodColors').value = (product.colors && product.colors.length) ? product.colors.join(', ') : '';
  document.getElementById('prodDesc').value = product.description || '';
  document.getElementById('prodInStock').checked = product.inStock !== false;
  document.getElementById('prodFeatured').checked = Boolean(product.featured);

  uploadedImageUrls = product.images || [];
  updateProductImagePreviews();

  const title = document.getElementById('productFormTitle');
  if (title) title.innerHTML = `<i class="fa-solid fa-pen" style="color: var(--accent-gold);"></i> Edit "${escapeHTML(product.name)}"`;

  const cancelBtn = document.getElementById('cancelProdEdit');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteAdminProduct = async (productId) => {
  if (confirm("Are you sure you want to delete this apparel item from the store catalog?")) {
    showToast("Deleting product...", "info");
    await deleteProduct(productId);
    showToast("Product deleted successfully", "success");
    await refreshAdminData();
  }
};

function setupCollectionForm() {
  const form = document.getElementById('collectionForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = sanitizeInput(document.getElementById('colName').value);
      const description = sanitizeInput(document.getElementById('colDesc').value);
      const image = document.getElementById('colImage').value || 'images/placeholders/collection-1.svg';

      const payload = { name, description, image };

      showToast("Saving collection...", "info");
      await saveCollection(payload);
      showToast("Collection created!", "success");

      form.reset();
      document.getElementById('colImage').value = '';
      document.getElementById('colImagePreview').innerHTML = '';
      await refreshAdminData();
    });
  }
}

function renderCollectionsList() {
  const container = document.getElementById('adminCollectionsList');
  if (!container) return;

  if (adminCollections.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">No collections created yet.</p>`;
    return;
  }

  container.innerHTML = adminCollections.map(col => {
    const safeName = escapeHTML(col.name);
    const itemCount = adminProducts.filter(p => p.collectionId === col.id).length;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <img src="${escapeHTML(col.image || 'images/placeholders/collection-1.svg')}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm);">
          <div>
            <strong>${safeName}</strong>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">${itemCount} Apparel Items</p>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-secondary" onclick="window.viewCollectionItems('${escapeHTML(col.id)}', '${safeName}')">
            <i class="fa-solid fa-eye"></i> View Items
          </button>
          <button class="btn-secondary btn-danger" onclick="window.deleteAdminCollection('${escapeHTML(col.id)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.viewCollectionItems = (colId, colName) => {
  const modal = document.getElementById('collectionItemsModal');
  const title = document.getElementById('collectionItemsModalTitle');
  const container = document.getElementById('collectionItemsList');

  if (title) title.textContent = `Items in "${colName}"`;

  const items = adminProducts.filter(p => p.collectionId === colId);

  if (container) {
    if (items.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No items assigned to this collection yet.</p>`;
    } else {
      const symbol = escapeHTML(adminSettings.currencySymbol || 'GH₵');
      container.innerHTML = items.map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${escapeHTML(p.images[0] || 'images/placeholders/apparel-1.svg')}" style="width: 40px; height: 40px; object-fit: cover;">
            <div>
              <strong style="font-size: 0.88rem;">${escapeHTML(p.name)}</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">${symbol} ${Number(p.price).toLocaleString()}</div>
            </div>
          </div>
          <button class="btn-secondary" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;" onclick="window.editAdminProduct('${escapeHTML(p.id)}'); window.closeCollectionItemsModal();">
            Edit Item
          </button>
        </div>
      `).join('');
    }
  }

  if (modal) {
    modal.classList.add('active');
  }
};

window.closeCollectionItemsModal = () => {
  const modal = document.getElementById('collectionItemsModal');
  if (modal) modal.classList.remove('active');
};

window.deleteAdminCollection = async (colId) => {
  if (confirm("Are you sure you want to delete this collection? Products in this collection will be reassigned to General.")) {
    showToast("Deleting collection...", "info");
    await deleteCollection(colId);
    showToast("Collection deleted", "success");
    await refreshAdminData();
  }
};

function updateCollectionDropdowns() {
  const collectionSelect = document.getElementById('prodCollection');
  if (collectionSelect) {
    collectionSelect.innerHTML = adminCollections.map(c => `
      <option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>
    `).join('');
  }
}

function renderDragReorderGrid() {
  const grid = document.getElementById('dragReorderGrid');
  if (!grid) return;

  if (adminProducts.length === 0) {
    grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No products to reorder.</p>`;
    return;
  }

  grid.innerHTML = adminProducts.map((p, idx) => `
    <div class="drag-card" draggable="true" data-index="${idx}">
      <span class="drag-card-order-badge">${idx + 1}</span>
      <img src="${escapeHTML(p.images[0] || 'images/placeholders/apparel-1.svg')}" class="drag-card-image" alt="${escapeHTML(p.name)}">
      <strong style="font-size: 0.8rem; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(p.name)}</strong>
    </div>
  `).join('');

  setupDragEvents();
}

function setupDragEvents() {
  const grid = document.getElementById('dragReorderGrid');
  const cards = grid.querySelectorAll('.drag-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedItemIndex = parseInt(card.getAttribute('data-index'), 10);
      card.style.opacity = '0.4';
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
    });

    card.addEventListener('dragover', (e) => e.preventDefault());

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(card.getAttribute('data-index'), 10);

      if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
        const itemToMove = adminProducts.splice(draggedItemIndex, 1)[0];
        adminProducts.splice(targetIndex, 0, itemToMove);
        renderDragReorderGrid();
      }
    });
  });

  const saveOrderBtn = document.getElementById('saveOrderBtn');
  if (saveOrderBtn) {
    saveOrderBtn.onclick = async () => {
      showToast("Saving new display order...", "info");
      await updateProductsOrder(adminProducts);
      showToast("Display order saved!", "success");
      await refreshAdminData();
    };
  }
}

function populateSettingsForm() {
  document.getElementById('settingPhone').value = adminSettings.whatsappPhone || '233200000000';
  document.getElementById('settingCurrency').value = adminSettings.currencySymbol || 'GH₵';
  document.getElementById('settingOpeningTime').value = adminSettings.openingTime || '08:00';
  document.getElementById('settingClosingTime').value = adminSettings.closingTime || '20:00';
  document.getElementById('settingManualStatus').value = adminSettings.manualStatus || 'auto';
  document.getElementById('settingAdminPin').value = adminSettings.adminPin || '1234';
}

function setupSettingsForm() {
  const form = document.getElementById('settingsForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const whatsappPhone = sanitizeInput(document.getElementById('settingPhone').value);
      const currencySymbol = document.getElementById('settingCurrency').value;
      const openingTime = document.getElementById('settingOpeningTime').value;
      const closingTime = document.getElementById('settingClosingTime').value;
      const manualStatus = document.getElementById('settingManualStatus').value;
      const newPin = sanitizeInput(document.getElementById('settingAdminPin').value);

      const payload = {
        whatsappPhone,
        currencySymbol,
        openingTime,
        closingTime,
        manualStatus,
        adminPin: newPin || '1234'
      };

      showToast("Saving settings...", "info");
      await saveStoreSettings(payload);
      showToast("Store settings saved!", "success");
      await refreshAdminData();
    });
  }
}

function renderFirebaseStatus() {
  const indicator = document.getElementById('firebaseStatusIndicator');
  const jsonArea = document.getElementById('firebaseConfigJson');
  const storedConfig = getStoredFirebaseConfig();

  if (indicator) {
    if (isFirebaseConfigured()) {
      indicator.innerHTML = `
        <div style="color: #25D366; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-circle-check"></i> Firebase Firestore Connected (${storedConfig.projectId})
        </div>
      `;
    } else {
      indicator.innerHTML = `
        <div style="color: var(--text-muted); font-weight: 700;">
          <i class="fa-solid fa-circle-notch"></i> LocalStorage Engine (Paste credentials JSON below to enable Firebase Cloud Sync)
        </div>
      `;
    }
  }

  if (jsonArea && storedConfig) {
    jsonArea.value = JSON.stringify(storedConfig, null, 2);
  }
}

function setupFirebaseForm() {
  const form = document.getElementById('firebaseConfigForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawJson = document.getElementById('firebaseConfigJson').value.trim();

      try {
        const parsed = JSON.parse(rawJson);
        if (!parsed.apiKey || !parsed.projectId) {
          throw new Error("Missing apiKey or projectId");
        }
        saveStoredFirebaseConfig(parsed);
        showToast("Firebase credentials saved! Reloading...", "success");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        alert("Firebase JSON Error: " + err.message + "\nPlease make sure you paste a valid JSON configuration object.");
      }
    });
  }
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${escapeHTML(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
