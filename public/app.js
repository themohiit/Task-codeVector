// ============================================================================
// STATE CONFIGURATION
// ============================================================================
const state = {
  products: [],
  cursor: null,
  category: '',
  limit: 24,
  hasMore: true,
  isLoading: false
};

const BASE_URL = '/api/products';

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const productsGrid = document.getElementById('products-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const btnSpinner = document.getElementById('btn-spinner');
const emptyState = document.getElementById('empty-state');
const queryTimeSpan = document.getElementById('query-time');
const limitSelect = document.getElementById('limit-select');
const categoryButtons = document.querySelectorAll('.category-btn');
const endMessage = document.getElementById('end-message');

// ============================================================================
// RENDER SKELETON LOADERS
// ============================================================================
function renderSkeletons(count = 12) {
  productsGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="card-header">
        <div class="skeleton-line skeleton-tag"></div>
        <div class="skeleton-line skeleton-price"></div>
      </div>
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-title" style="width: 60%"></div>
      <div class="skeleton-line skeleton-footer"></div>
    `;
    productsGrid.appendChild(skeleton);
  }
}

// ============================================================================
// FORMAT CURRENCY
// ============================================================================
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

// ============================================================================
// FORMAT DATE
// ============================================================================
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ============================================================================
// RENDER PRODUCT CARDS
// ============================================================================
function renderProducts(products, append = false) {
  if (!append) {
    productsGrid.innerHTML = '';
  }

  if (products.length === 0 && !append) {
    emptyState.classList.remove('hidden');
    productsGrid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  productsGrid.classList.remove('hidden');

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="category-tag">${product.category}</span>
        <span class="price-text">${formatPrice(product.price)}</span>
      </div>
      <h3 class="product-name">${product.name}</h3>
      <div class="card-footer">
        <span>Added: ${formatDate(product.created_at)}</span>
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

// ============================================================================
// FETCH PRODUCTS FROM API
// ============================================================================
async function fetchProducts(append = false) {
  if (state.isLoading) return;
  state.isLoading = true;

  // Toggle spinners & buttons
  if (append) {
    btnSpinner.classList.remove('hidden');
    loadMoreBtn.disabled = true;
  } else {
    renderSkeletons(state.limit);
    loadMoreBtn.classList.add('hidden');
    endMessage.classList.add('hidden');
  }

  // Construct URL with query parameters
  const params = new URLSearchParams();
  params.append('limit', state.limit);
  if (state.category) {
    params.append('category', state.category);
  }
  if (state.cursor && append) {
    params.append('cursor', state.cursor);
  }

  const startTime = performance.now();

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    const result = await response.json();

    const endTime = performance.now();
    const queryDuration = Math.round(endTime - startTime);
    queryTimeSpan.textContent = queryDuration;

    if (result.success) {
      state.products = result.data;
      state.cursor = result.nextCursor;
      state.hasMore = result.hasMore;

      renderProducts(state.products, append);

      // Handle pagination buttons visibility
      if (state.hasMore) {
        loadMoreBtn.classList.remove('hidden');
        endMessage.classList.add('hidden');
      } else if (state.products.length > 0 || append) {
        loadMoreBtn.classList.add('hidden');
        endMessage.classList.remove('hidden');
      } else {
        loadMoreBtn.classList.add('hidden');
        endMessage.classList.add('hidden');
      }
    } else {
      console.error('API Error:', result.message);
      alert(`Error fetching products: ${result.message}`);
    }
  } catch (err) {
    console.error('Network Error:', err);
    alert('Failed to connect to the server. Make sure the backend is running.');
  } finally {
    state.isLoading = false;
    btnSpinner.classList.add('hidden');
    loadMoreBtn.disabled = false;
  }
}

// ============================================================================
// INITIALIZE & REGISTER EVENT LISTENERS
// ============================================================================
function init() {
  // Category buttons click events
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;

      // Reset active class
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update state
      state.category = btn.getAttribute('data-category');
      state.cursor = null; // Clear cursor for new search

      fetchProducts(false);
    });
  });

  // Limit change event
  limitSelect.addEventListener('change', (e) => {
    state.limit = parseInt(e.target.value, 10);
    state.cursor = null; // Clear cursor for new query size
    fetchProducts(false);
  });

  // Load more button event
  loadMoreBtn.addEventListener('click', () => {
    fetchProducts(true);
  });

  // Initial Fetch
  fetchProducts(false);
}

document.addEventListener('DOMContentLoaded', init);
