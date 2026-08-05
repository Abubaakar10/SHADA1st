/**
 * SHADA1st Apparel Shop — Admin Portal & Drag-and-Drop Controller
 */

import { initStoreDatabase, getProducts, saveProduct, deleteProduct, updateProductsOrder, getCollections, saveCollection, getStoreSettings, saveStoreSettings } from './store-db.js';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let adminProducts = [];
let adminCollections = [];
let adminSettings = {};
let draggedItemIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initStoreDatabase();
  adminSettings = await getStoreSettings();
  setupAuthCheck();
});

function setupAuthCheck() {
  const loginForm = document.getElementById('adminLoginForm');
  const pinInput = document.getElementById('adminPinInput');
  const loginView = document.getElementById('adminLoginView');
  const dashboardView = document.getElementById('adminDashboardView');
  const authError = document.getElementById('authError');

  // Check if session key already exists
  if (sessionStorage.getItem('shada_admin_logged') === 'true') {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    initAdminDashboard();
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPin = pinInput ? pinInput.value.trim() : '';
      const correctPin = adminSettings.adminPin || '1234';

      if (enteredPin === correctPin) {
        sessionStorage.setItem('shada_admin_logged', 'true');
        if (loginView) loginView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'block';
        if (authError) authError.style.display = 'none';
        initAdminDashboard();
        showToast("Welcome to SHADA1st Admin Portal", "success");
      } else {
        if (authError) {
          authError.textContent = "Invalid Admin PIN. (Default PIN: 1234)";
          authError.style.display = 'block';
        }
      }
    });
  }
}

async function initAdminDashboard() {
  setupTabs();
  await refreshAdminData();
  setupProductForm();
  setupCollectionForm();
  setupSettingsForm();
  setupFirebaseForm();
  
  // Logout Button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('shada_admin_logged');
      window.location.reload();
    });
  }
}

async function refreshAdminData() {
  adminProducts = await getProducts();
  adminCollections = await getCollections();
  adminSettings = await getStoreSettings();
  
  renderProductsTable();
  renderCollectionsTable();
  renderDragAndDropGrid();
  populateSettingsForm();
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabSections = document.querySelectorAll('.admin-panel-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add('active');
    });
  });
}

// --------------------------------------------------------------------------
// TAB 1: PRODUCT MANAGEMENT
// --------------------------------------------------------------------------

function renderProductsTable() {
  const tbody = document.getElementById('adminProductsTbody');
  if (!tbody) return;

  if (adminProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">No products found in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminProducts.map((p, index) => {
    const formattedPrice = (p.currency || '₦') + Number(p.price).toLocaleString();
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : 'images/placeholders/apparel-1.svg';
    
    return `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td>
          <img src="${mainImg}" class="table-thumb" alt="${p.name}">
        </td>
        <td>
          <strong>${p.name}</strong><br>
          <small style="color: var(--text-muted);">ID: ${p.id}</small>
        </td>
        <td><span class="badge-collection">${p.collectionName || 'General'}</span></td>
        <td><strong style="color: var(--accent-gold-light);">${formattedPrice}</strong></td>
        <td>${p.inStock ? '<span style="color: #25D366; font-weight:700;">In Stock</span>' : '<span style="color: #FF6B6B;">Out of Stock</span>'}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="window.editAdminProduct('${p.id}')">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn-secondary btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="window.deleteAdminProduct('${p.id}')">
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
      <option value="${c.id}">${c.name}</option>
    `).join('');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('prodId').value;
      const name = document.getElementById('prodName').value.trim();
      const price = parseFloat(document.getElementById('prodPrice').value) || 0;
      const collectionId = document.getElementById('prodCollection').value;
      const selectedCol = adminCollections.find(c => c.id === collectionId);
      const collectionName = selectedCol ? selectedCol.name : 'General';
      const description = document.getElementById('prodDesc').value.trim();
      const imageUrlsRaw = document.getElementById('prodImages').value.trim();
      const sizesRaw = document.getElementById('prodSizes').value.trim();
      const colorsRaw = document.getElementById('prodColors').value.trim();
      const inStock = document.getElementById('prodInStock').checked;
      const featured = document.getElementById('prodFeatured').checked;

      const images = imageUrlsRaw ? imageUrlsRaw.split(',').map(s => s.trim()).filter(Boolean) : ['images/placeholders/apparel-1.svg'];
      const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL'];
      const colors = colorsRaw ? colorsRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Obsidian Black'];

      const payload = {
        id: id || undefined,
        name,
        price,
        currency: adminSettings.currencySymbol || '₦',
        collectionId,
        collectionName,
        description,
        images,
        sizes,
        colors,
        inStock,
        featured
      };

      await saveProduct(payload);
      showToast(id ? "Product updated successfully!" : "New item added to SHADA1st catalog!", "success");
      resetProductForm();
      await refreshAdminData();
    });
  }

  const cancelBtn = document.getElementById('cancelProdEdit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetProductForm);
  }
}

window.editAdminProduct = (productId) => {
  const p = adminProducts.find(item => item.id === productId);
  if (!p) return;

  document.getElementById('prodId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodCollection').value = p.collectionId || 'streetwear';
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodImages').value = (p.images || []).join(', ');
  document.getElementById('prodSizes').value = (p.sizes || []).join(', ');
  document.getElementById('prodColors').value = (p.colors || []).join(', ');
  document.getElementById('prodInStock').checked = p.inStock !== false;
  document.getElementById('prodFeatured').checked = Boolean(p.featured);

  document.getElementById('productFormTitle').textContent = `Edit Apparel Item: ${p.name}`;
  document.getElementById('cancelProdEdit').style.display = 'inline-flex';
  
  // Scroll to form
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
};

window.deleteAdminProduct = async (productId) => {
  if (confirm("Are you sure you want to remove this item from the SHADA1st catalog?")) {
    await deleteProduct(productId);
    showToast("Product deleted.", "info");
    await refreshAdminData();
  }
};

function resetProductForm() {
  const form = document.getElementById('productForm');
  if (form) form.reset();
  document.getElementById('prodId').value = '';
  document.getElementById('productFormTitle').textContent = "Add New Apparel Item";
  document.getElementById('cancelProdEdit').style.display = 'none';
}

// --------------------------------------------------------------------------
// TAB 2: COLLECTION MANAGEMENT
// --------------------------------------------------------------------------

function renderCollectionsTable() {
  const container = document.getElementById('adminCollectionsList');
  if (!container) return;

  container.innerHTML = adminCollections.map(col => `
    <div style="background: var(--bg-tertiary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="${col.image || 'images/placeholders/apparel-1.svg'}" style="width: 50px; height: 50px; border-radius: var(--radius-sm); object-fit: cover;">
        <div>
          <h4 style="font-size: 1.1rem; color: var(--accent-gold-light);">${col.name}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${col.description || 'No description provided.'}</p>
        </div>
      </div>
      <span class="badge-collection">${adminProducts.filter(p => p.collectionId === col.id).length} Items</span>
    </div>
  `).join('');
}

function setupCollectionForm() {
  const form = document.getElementById('collectionForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('colName').value.trim();
      const description = document.getElementById('colDesc').value.trim();
      const image = document.getElementById('colImage').value.trim() || 'images/placeholders/apparel-1.svg';

      await saveCollection({ name, description, image });
      showToast("Collection created successfully!", "success");
      form.reset();
      await refreshAdminData();
      
      // Update dropdown in product form
      const collectionSelect = document.getElementById('prodCollection');
      if (collectionSelect) {
        collectionSelect.innerHTML = adminCollections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    });
  }
}

// --------------------------------------------------------------------------
// TAB 3: VISUAL DRAG-AND-DROP REORDERING
// --------------------------------------------------------------------------

function renderDragAndDropGrid() {
  const grid = document.getElementById('dragReorderGrid');
  if (!grid) return;

  if (adminProducts.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No items available to sort.</p>`;
    return;
  }

  grid.innerHTML = adminProducts.map((p, index) => {
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : 'images/placeholders/apparel-1.svg';
    return `
      <div class="drag-card" draggable="true" data-index="${index}" data-id="${p.id}">
        <span class="drag-card-order-badge">${index + 1}</span>
        <img src="${mainImg}" class="drag-card-image" alt="${p.name}">
        <div class="drag-card-title">${p.name}</div>
        <div class="drag-handle">
          <span><i class="fa-solid fa-arrows-up-down-left-right"></i> Drag to reorder</span>
          <span style="color: var(--accent-gold-light); font-weight:700;">${p.currency || '₦'}${Number(p.price).toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join('');

  attachDragAndDropHandlers();
}

function attachDragAndDropHandlers() {
  const cards = document.querySelectorAll('.drag-card');
  const grid = document.getElementById('dragReorderGrid');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedItemIndex = parseInt(card.getAttribute('data-index'));
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.drag-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');

      const targetIndex = parseInt(card.getAttribute('data-index'));
      if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
        // Rearrange array items
        const itemToMove = adminProducts.splice(draggedItemIndex, 1)[0];
        adminProducts.splice(targetIndex, 0, itemToMove);

        // Re-render grid visually to show updated sequence
        renderDragAndDropGrid();
        showToast("Position order updated. Click 'Save Display Order' to persist.", "info");
      }
    });
  });

  // Save Order Action Button
  const saveOrderBtn = document.getElementById('saveOrderBtn');
  if (saveOrderBtn) {
    saveOrderBtn.onclick = async () => {
      saveOrderBtn.disabled = true;
      saveOrderBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Positions...`;

      await updateProductsOrder(adminProducts);

      saveOrderBtn.disabled = false;
      saveOrderBtn.innerHTML = `<i class="fa-solid fa-check"></i> Save Display Order`;
      showToast("Storefront apparel display positions saved successfully!", "success");
      await refreshAdminData();
    };
  }
}

// --------------------------------------------------------------------------
// TAB 4: STORE SETTINGS & FIREBASE CONFIG
// --------------------------------------------------------------------------

function populateSettingsForm() {
  const phone = document.getElementById('settingPhone');
  const greeting = document.getElementById('settingGreeting');
  const autoReply = document.getElementById('settingAutoReply');
  const pin = document.getElementById('settingAdminPin');

  if (phone) phone.value = adminSettings.whatsappPhone || '';
  if (greeting) greeting.value = adminSettings.whatsappGreeting || '';
  if (autoReply) autoReply.value = adminSettings.whatsappUnavailableMsg || '';
  if (pin) pin.value = adminSettings.adminPin || '1234';
}

function setupSettingsForm() {
  const form = document.getElementById('settingsForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const whatsappPhone = document.getElementById('settingPhone').value.trim();
      const whatsappGreeting = document.getElementById('settingGreeting').value.trim();
      const whatsappUnavailableMsg = document.getElementById('settingAutoReply').value.trim();
      const adminPin = document.getElementById('settingAdminPin').value.trim() || '1234';

      await saveStoreSettings({
        whatsappPhone,
        whatsappGreeting,
        whatsappUnavailableMsg,
        adminPin
      });

      showToast("Store & WhatsApp settings saved successfully!", "success");
      await refreshAdminData();
    });
  }
}

function setupFirebaseForm() {
  const fbConfigInput = document.getElementById('firebaseConfigJson');
  const fbStatusIndicator = document.getElementById('firebaseStatusIndicator');
  const fbForm = document.getElementById('firebaseConfigForm');

  const currentCfg = getStoredFirebaseConfig();
  if (fbConfigInput && currentCfg) {
    fbConfigInput.value = JSON.stringify(currentCfg, null, 2);
  }

  if (fbStatusIndicator) {
    if (isFirebaseConfigured()) {
      fbStatusIndicator.innerHTML = `<span style="color: #25D366; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Firebase Firestore Connected</span>`;
    } else {
      fbStatusIndicator.innerHTML = `<span style="color: var(--accent-gold); font-weight:600;"><i class="fa-solid fa-bolt"></i> LocalStorage Engine Active (Demo Mode)</span>`;
    }
  }

  if (fbForm) {
    fbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const rawJson = fbConfigInput.value.trim();
        if (!rawJson) {
          saveStoredFirebaseConfig(null);
          showToast("Firebase config cleared. Switched to LocalStorage mode.", "info");
          setTimeout(() => window.location.reload(), 1000);
          return;
        }

        const parsed = JSON.parse(rawJson);
        if (!parsed.apiKey || !parsed.projectId) {
          throw new Error("Invalid Firebase credentials object. Requires apiKey and projectId.");
        }

        saveStoredFirebaseConfig(parsed);
        showToast("Firebase credentials saved! Reloading store connection...", "success");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        alert("Firebase JSON Error: " + err.message);
      }
    });
  }
}

// Toast helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}" style="color: var(--accent-gold);"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
