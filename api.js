/**
 * js/api.js — AutoNest Frontend API Client
 * ══════════════════════════════════════════════════════════════
 * Place this file at: autonest-website/project/js/api.js
 * Add to ALL pages BEFORE script.js:  <script src="js/api.js"></script>
 * checkout.html already has: <script src="js/api.js"></script>
 * ══════════════════════════════════════════════════════════════
 *
 * This file provides:
 *  - BASE_URL          → your backend server address
 *  - apiRequest()      → central fetch helper (adds JWT, handles errors)
 *  - getToken()        → read JWT from localStorage
 *  - getUser()         → read user object from localStorage
 *  - setAuthData()     → save JWT + user after login/register
 *  - clearAuthData()   → logout helper
 *  - AuthAPI           → register, login, getMe
 *  - OrderAPI          → create, getAll, getById, cancel
 *  - PaymentAPI        → createRazorpayOrder, verify, cod
 *  - ServiceAPI        → getAll, getByCategory, getById
 */

// ── Config ────────────────────────────────────────────────────
// Change this to your backend URL. For local dev use:
const BASE_URL = 'http://localhost:5000/api';
// For production: const BASE_URL = 'https://api.autonest.in/api';

// ════════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ════════════════════════════════════════════════════════════════

/** Get the JWT token from localStorage */
function getToken() {
  return localStorage.getItem('an_token') || null;
}

/** Get the user object from localStorage */
function getUser() {
  try {
    const u = localStorage.getItem('an_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

/** Save token + user after login/register */
function setAuthData(token, user) {
  localStorage.setItem('an_token', token);
  localStorage.setItem('an_user', JSON.stringify(user));
}

/** Clear auth data on logout */
function clearAuthData() {
  localStorage.removeItem('an_token');
  localStorage.removeItem('an_user');
}

/** Check if user is logged in */
function isLoggedIn() {
  return !!getToken();
}

// ════════════════════════════════════════════════════════════════
//  CENTRAL FETCH HELPER
// ════════════════════════════════════════════════════════════════

/**
 * apiRequest — wraps fetch with:
 *  - automatic JSON headers
 *  - automatic Bearer token injection
 *  - unified error handling
 *
 * Returns the parsed response body (data.data, data.token, etc.)
 * Throws an Error with the server's message on failure.
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data     = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data; // full response: { success, token, data, message }
}

// ════════════════════════════════════════════════════════════════
//  AUTH API
// ════════════════════════════════════════════════════════════════

const AuthAPI = {
  /**
   * Register a new user
   * @param {{ name, email, phone, password }} body
   */
  register: async (body) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body,
    });
    // Auto-save auth data after registration
    setAuthData(res.token, res.data.user);
    return res;
  },

  /**
   * Login with email + password
   * @param {{ email, password }} body
   */
  login: async (body) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body,
    });
    // Auto-save auth data after login
    setAuthData(res.token, res.data.user);
    return res;
  },

  /** Get current logged-in user */
  getMe: async () => {
    return apiRequest('/auth/me');
  },

  /** Logout */
  logout: () => {
    clearAuthData();
    window.location.href = '/login.html';
  },
};

// ════════════════════════════════════════════════════════════════
//  ORDER API
// ════════════════════════════════════════════════════════════════

const OrderAPI = {
  /**
   * Create a new order (called before payment)
   * @param {{ product_id, name, category, price, duration, quantity, payment_method }} body
   * Returns: { success, data: { order_id, totalAmount, status } }
   */
  create: async (body) => {
    return apiRequest('/orders', {
      method: 'POST',
      body,
    });
  },

  /** Get all orders for the logged-in user */
  getAll: async () => {
    return apiRequest('/orders');
  },

  /** Get a single order by ID */
  getById: async (orderId) => {
    return apiRequest(`/orders/${orderId}`);
  },

  /** Cancel an order */
  cancel: async (orderId) => {
    return apiRequest(`/orders/${orderId}/cancel`, { method: 'PUT' });
  },
};

// ════════════════════════════════════════════════════════════════
//  PAYMENT API
// ════════════════════════════════════════════════════════════════

const PaymentAPI = {
  /**
   * Step 1: Create a Razorpay order
   * @param {{ order_id }} body  ← your MongoDB Order _id
   * Returns: { razorpay_order_id, amount, currency, key_id }
   */
  createRazorpayOrder: async (body) => {
    return apiRequest('/payments/create-razorpay-order', {
      method: 'POST',
      body,
    });
  },

  /**
   * Step 3: Verify payment after Razorpay success callback
   * @param {{ razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }} body
   */
  verify: async (body) => {
    return apiRequest('/payments/verify', {
      method: 'POST',
      body,
    });
  },

  /**
   * Confirm a COD / Pay Later order
   * @param {{ order_id }} body
   */
  cod: async (body) => {
    return apiRequest('/payments/cod', {
      method: 'POST',
      body,
    });
  },

  /** Get payment details for an order */
  getByOrder: async (orderId) => {
    return apiRequest(`/payments/order/${orderId}`);
  },
};

// ════════════════════════════════════════════════════════════════
//  SERVICE API
// ════════════════════════════════════════════════════════════════

const ServiceAPI = {
  /** Get all available services (optional ?category=car-wash) */
  getAll: async (category = null) => {
    const query = category ? `?category=${category}` : '';
    return apiRequest(`/services${query}`);
  },

  /** Get services by category */
  getByCategory: async (category) => {
    return apiRequest(`/services/category/${category}`);
  },

  /** Get single service */
  getById: async (id) => {
    return apiRequest(`/services/${id}`);
  },
};

// ════════════════════════════════════════════════════════════════
//  AUTO-RUN: Update navbar based on login state
// ════════════════════════════════════════════════════════════════
(function updateNavbar() {
  const user = getUser();
  if (!user) return;

  // Show profile wrapper, hide login/register buttons
  const profileWrap = document.getElementById('profileWrap');
  if (profileWrap) profileWrap.style.display = 'block';

  const profileName   = document.getElementById('profileName');
  const profileEmail  = document.getElementById('profileEmail');
  const profileAvatar = document.getElementById('profileBtn');

  if (profileName)  profileName.textContent  = user.name  || 'User';
  if (profileEmail) profileEmail.textContent = user.email || '';
  if (profileAvatar) {
    // Show initials in avatar button
    const initials = (user.name || 'U')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    profileAvatar.textContent = initials;
  }

  // Wire up logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuthData();
      window.location.href = 'login.html';
    });
  }
})();

// ════════════════════════════════════════════════════════════════
//  WIRE UP LOGIN FORM (login.html)
// ════════════════════════════════════════════════════════════════
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const btn      = loginForm.querySelector('button[type="submit"]');

    // Clear previous errors
    document.getElementById('loginEmailErr').textContent = '';
    document.getElementById('loginPassErr').textContent  = '';

    if (!email) {
      document.getElementById('loginEmailErr').textContent = 'Email is required';
      return;
    }
    if (!password) {
      document.getElementById('loginPassErr').textContent = 'Password is required';
      return;
    }

    btn.textContent = 'Signing in...';
    btn.disabled    = true;

    try {
      await AuthAPI.login({ email, password });

      // Redirect — if came from checkout, go back there
      const params   = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      window.location.href = redirect
        ? decodeURIComponent(redirect)
        : 'index.html';
    } catch (err) {
      document.getElementById('loginPassErr').textContent = err.message;
      btn.textContent = 'Sign In →';
      btn.disabled    = false;
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  WIRE UP REGISTER FORM (register.html)
// ════════════════════════════════════════════════════════════════
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const confirm  = document.getElementById('regConf').value;
    const terms    = document.getElementById('terms').checked;
    const btn      = registerForm.querySelector('button[type="submit"]');

    // Clear previous errors
    document.getElementById('regPassErr').textContent = '';
    document.getElementById('regConfErr').textContent = '';

    if (password !== confirm) {
      document.getElementById('regConfErr').textContent = 'Passwords do not match';
      return;
    }
    if (!terms) {
      alert('Please accept the Terms of Service to continue');
      return;
    }

    btn.textContent = 'Creating Account...';
    btn.disabled    = true;

    try {
      await AuthAPI.register({ name, email, phone, password });
      window.location.href = 'index.html';
    } catch (err) {
      document.getElementById('regPassErr').textContent = err.message;
      btn.textContent = 'Create Account →';
      btn.disabled    = false;
    }
  });
}
