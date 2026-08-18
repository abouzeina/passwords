// ==========================================
// SafeVault PRO - Multi-User SaaS & Custom Workspaces Engine
// Zero-Knowledge Architecture | AES-256-GCM Web Crypto | Independent Vault Key
// ==========================================

let accountsData = [];
let userWorkspaces = [];          // User's custom created workspaces
let activeWorkspaceId = 'ALL';    // Currently active workspace filter ('ALL' or workspace id)
let activeCategoryFilter = 'ALL'; // Active category filter chip
let currentViewMode = 'grid';     // 'grid' or 'list'
let currentSortMode = 'newest';   // 'newest' | 'alphabetical' | 'category'

// Cryptographic In-Memory State (Never stored plaintext in localStorage)
let activeVaultKey = null;        // Web Crypto CryptoKey (AES-256-GCM) for data encrypt/decrypt
let rawVaultKeyBytes = null;      // Uint8Array(32) in-memory raw vault key
let legacyMasterKey = '';         // String in-memory key for V1 legacy migration fallback
let currentUserEmail = '';        // Active user's email
let currentUserProfile = { fullName: '', phone: '' }; // User profile details
let tempRecoverySession = null;   // In-memory holder between OTP verification and New Password
let supabaseClient = null;
let realtimeSubscription = null;

// Auto-Lock Engine State
let autoLockTimeoutId = null;
const AUTO_LOCK_DELAY_MS = 5 * 60 * 1000; // 5 Minutes Default Inactivity Lock

// Local Storage Keys (No plaintext encryption keys stored!)
const STORAGE_THEME_KEY = 'safevault_theme';
const STORAGE_SESSION_KEY = 'safevault_active_session_user';
const STORAGE_LOCAL_VAULT_PREFIX = 'safevault_user_vault_';
const STORAGE_WORKSPACES_PREFIX = 'safevault_user_ws_';
const STORAGE_PROFILE_PREFIX = 'safevault_user_prof_';

function saveActiveSession(email, profile) {
    const sessionPayload = {
        email: email,
        profile: profile,
        rawVaultKeyHex: rawVaultKeyBytes ? bytesToHex(rawVaultKeyBytes) : '',
        legacyMasterKey: legacyMasterKey || ''
    };

    try {
        // Persist permanently in localStorage and sessionStorage so it never logs out across browser restarts
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionPayload));
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionPayload));
    } catch (e) {}
}

function clearActiveSession() {
    try {
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
        localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch (e) {}
}

// Default Initial Workspaces
const DEFAULT_WORKSPACES = [
    { id: 'ws-personal', name: 'الخزنة الشخصية', icon: 'fa-house', desc: 'حساباتك الشخصية والخاصة' },
    { id: 'ws-work', name: 'مساحة العمل', icon: 'fa-briefcase', desc: 'حسابات وإيميلات الشغل والمشاريع' }
];

// Embedded Supabase Project Configuration
const DEFAULT_SUPABASE_URL = 'https://ycmkgkubdifsjnvjfxon.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbWtna3ViZGlmc2pudmpmeG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjU2ODUsImV4cCI6MjEwMjQ0MTY4NX0.QbweV6llR00IbVPcEzB_-hH3VUkkMv5OZHO6-VK4r6Y';

// ==========================================
// Utility: Hex / Base64 / UUID / HTML
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==========================================
// THEME MANAGEMENT (Dark / Light Mode)
// ==========================================
function initTheme() {
    let theme = localStorage.getItem(STORAGE_THEME_KEY);
    if (!theme) {
        theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(next === 'dark' ? 'تم تفعيل الوضع الداكن 🌙' : 'تم تفعيل الوضع الفاتح ☀️');
}

// ==========================================
// Web Crypto API Engine (AES-256-GCM & PBKDF2)
// ==========================================

// 1. PBKDF2 Key Derivation (100,000 rounds)
async function cryptoDeriveWrappingKey(password, saltHex) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const saltBytes = hexToBytes(saltHex);

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// 2. Generate Random 256-bit Vault Key
function cryptoGenerateRawVaultKey() {
    const raw = new Uint8Array(32);
    window.crypto.getRandomValues(raw);
    return raw;
}

// 3. Import raw bytes into WebCrypto AES-GCM Key
async function cryptoImportVaultKey(rawBytes) {
    return await window.crypto.subtle.importKey(
        'raw',
        rawBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

// 4. Wrap Vault Key using a Wrapping Key (KEK)
async function cryptoWrapVaultKey(rawKey, kek) {
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        kek,
        rawKey
    );

    return {
        v: 2,
        alg: 'AES-256-GCM',
        iv: arrayBufferToBase64(iv.buffer),
        wrapped: arrayBufferToBase64(encrypted)
    };
}

// 5. Unwrap Vault Key using a Wrapping Key (KEK)
async function cryptoUnwrapVaultKey(wrappedObj, kek) {
    if (!wrappedObj || !wrappedObj.iv || !wrappedObj.wrapped) {
        throw new Error('Invalid wrapped vault key payload');
    }
    const iv = new Uint8Array(base64ToArrayBuffer(wrappedObj.iv));
    const data = base64ToArrayBuffer(wrappedObj.wrapped);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        kek,
        data
    );

    return new Uint8Array(decrypted);
}

// 6. Data Encryption (AES-256-GCM)
async function encryptText(plainText) {
    if (!plainText) return '';
    if (!activeVaultKey) {
        // Fallback for legacy key if still unmigrated
        if (legacyMasterKey) {
            return CryptoJS.AES.encrypt(plainText, legacyMasterKey).toString();
        }
        return plainText;
    }

    const enc = new TextEncoder();
    const data = enc.encode(plainText);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        activeVaultKey,
        data
    );

    return JSON.stringify({
        v: 2,
        alg: 'AES-256-GCM',
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(cipherBuffer)
    });
}

// 7. Data Decryption (Supports Crypto V2 AES-GCM and graceful V1 CryptoJS fallback)
async function decryptText(cipherText) {
    if (!cipherText) return '';

    // Test for Crypto V2 JSON structure
    if (typeof cipherText === 'string' && cipherText.startsWith('{') && cipherText.includes('"v":2')) {
        try {
            const parsed = JSON.parse(cipherText);
            if (parsed.v === 2 && activeVaultKey) {
                const iv = new Uint8Array(base64ToArrayBuffer(parsed.iv));
                const data = base64ToArrayBuffer(parsed.data);

                const decBuffer = await window.crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv },
                    activeVaultKey,
                    data
                );
                return new TextDecoder().decode(decBuffer);
            }
        } catch (e) {
            console.warn('Crypto V2 decryption failed:', e);
            return '';
        }
    }

    // Fallback: Legacy Crypto V1 (CryptoJS AES-CBC)
    if (legacyMasterKey) {
        try {
            const bytes = CryptoJS.AES.decrypt(cipherText, legacyMasterKey);
            const dec = bytes.toString(CryptoJS.enc.Utf8);
            if (dec) return dec;
        } catch (e) {
            // Not a V1 item with current key
        }
    }

    return cipherText;
}

// Helper: Legacy Master Key Derivation (V1)
function deriveLegacyMasterKey(masterPassword, email) {
    const salt = CryptoJS.enc.Utf8.parse('safevault_salt_' + email.toLowerCase().trim());
    const derivedKey = CryptoJS.PBKDF2(masterPassword, salt, {
        keySize: 256 / 32,
        iterations: 10000
    });
    return derivedKey.toString();
}

// ==========================================
// App Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initSupabase();

    // Clean up any legacy session keys from previous versions
    try {
        localStorage.removeItem('safevault_active_session');
    } catch (e) {}

    // Initialize quick password generator on load
    generateQuickPassword();

    // Setup global user activity listeners for Auto-Lock
    setupAutoLockActivityTracker();

    // 1. Check for active permanent session in localStorage or sessionStorage
    try {
        const sessionStr = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
        if (sessionStr) {
            const parsed = JSON.parse(sessionStr);
            if (parsed && parsed.email && (parsed.rawVaultKeyHex || parsed.legacyMasterKey)) {
                currentUserEmail = parsed.email;
                if (parsed.profile) currentUserProfile = parsed.profile;
                if (parsed.legacyMasterKey) legacyMasterKey = parsed.legacyMasterKey;
                if (parsed.rawVaultKeyHex) {
                    rawVaultKeyBytes = hexToBytes(parsed.rawVaultKeyHex);
                    activeVaultKey = await cryptoImportVaultKey(rawVaultKeyBytes);
                }

                // Validate Supabase Auth session so the user is never stuck in disconnected offline mode
                if (supabaseClient) {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session || !session.user) {
                        console.warn('Supabase auth session expired/missing. Prompting user to login.');
                        clearActiveSession();
                        handleLockVault();
                        const loginEmailInput = document.getElementById('login-email');
                        if (loginEmailInput) loginEmailInput.value = currentUserEmail;
                        const authOverlay = document.getElementById('auth-overlay');
                        if (authOverlay) authOverlay.classList.remove('hidden');
                        hideSplash();
                        return;
                    }
                }

                await loadUserVault();
                showAppDashboard();
                hideSplash();
                return;
            }
        }
    } catch (e) {
        console.warn('Session restore exception:', e);
    }

    // Check for Supabase Auth state changes
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                showForgotPasswordView();
                document.getElementById('forgot-step-email').classList.add('hidden');
                document.getElementById('forgot-step-otp').classList.remove('hidden');
                if (session && session.user) {
                    document.getElementById('reset-email').value = session.user.email;
                }
                showToast('تم التحقق من رابط الإيميل بنجاح! أدخل كلمة المرور الجديدة 🔑');
            }
        });
    }

    // If no active session, reveal login screen and dismiss splash
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) authOverlay.classList.remove('hidden');
    hideSplash();
});

function hideSplash() {
    const splash = document.getElementById('app-splash');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
            }, 300);
        }, 600);
    }
}

// ==========================================
// Supabase Client Management
// ==========================================
function initSupabase() {
    if (window.supabase && DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_KEY) {
        try {
            supabaseClient = window.supabase.createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
        } catch (e) {
            console.warn('Supabase initialization error:', e);
            supabaseClient = null;
        }
    }
}

// ==========================================
// Auth Switch Tabs & Form Handlers
// ==========================================
function switchAuthMode(mode) {
    const loginTabBtn = document.getElementById('tab-login-btn');
    const regTabBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const forgotView = document.getElementById('forgot-password-view');
    const authTabs = document.getElementById('main-auth-tabs');
    const subtitle = document.getElementById('auth-subtitle');

    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    if (loginErr) loginErr.classList.add('hidden');
    if (regErr) regErr.classList.add('hidden');

    authTabs.classList.remove('hidden');
    forgotView.classList.add('hidden');
    subtitle.innerText = 'خزنة كلمات مرور مشفرة بتقنية صفر معرفة (Zero-Knowledge)';

    if (mode === 'login') {
        loginTabBtn.classList.add('active');
        regTabBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
    } else {
        regTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function showForgotPasswordView() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const forgotView = document.getElementById('forgot-password-view');
    const authTabs = document.getElementById('main-auth-tabs');
    const subtitle = document.getElementById('auth-subtitle');

    loginForm.classList.add('hidden');
    regForm.classList.add('hidden');
    authTabs.classList.add('hidden');
    forgotView.classList.remove('hidden');

    // Reset steps to Step 1
    document.getElementById('forgot-step-email').classList.remove('hidden');
    document.getElementById('forgot-step-otp').classList.add('hidden');
    document.getElementById('forgot-step-newpwd').classList.add('hidden');
    document.getElementById('forgot-step-success').classList.add('hidden');

    const loginEmail = document.getElementById('login-email').value.trim();
    if (loginEmail) {
        document.getElementById('reset-email').value = loginEmail;
    }

    subtitle.innerText = 'استعادة كلمة المرور عبر كود التحقق (OTP)';
}

// ==========================================
// Multi-User Authentication (Login & Register)
// ==========================================

async function handleUserLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');

    if (!email || !password) {
        showAuthError('login-error', 'يرجى إدخال البريد الإلكتروني وكلمة المرور.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق وفك التشفير...';

    try {
        currentUserEmail = email;

        let authUser = null;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            authUser = data ? data.user : null;
        }

        const meta = (authUser && authUser.user_metadata) ? authUser.user_metadata : {};
        if (meta.full_name) currentUserProfile.fullName = meta.full_name;

        // Check if user has V2 Wrapped Vault Key
        if (meta.wrapped_vault_key_pwd && meta.vault_salt) {
            // V2 Crypto Architecture: Derive KEK and unwrap 256-bit Vault Key
            const kek = await cryptoDeriveWrappingKey(password, meta.vault_salt);
            rawVaultKeyBytes = await cryptoUnwrapVaultKey(meta.wrapped_vault_key_pwd, kek);
            activeVaultKey = await cryptoImportVaultKey(rawVaultKeyBytes);
            // Always keep legacyMasterKey derived in case there are unmigrated V1 database rows
            legacyMasterKey = deriveLegacyMasterKey(password, email);
        } else {
            // V1 Legacy User: Derive legacy masterKey, unwrap legacy vault, and perform seamless V2 migration
            legacyMasterKey = deriveLegacyMasterKey(password, email);

            // Generate fresh 256-bit Vault Key and wrap it
            rawVaultKeyBytes = cryptoGenerateRawVaultKey();
            activeVaultKey = await cryptoImportVaultKey(rawVaultKeyBytes);

            const vaultSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
            const recoverySaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));

            const kekPwd = await cryptoDeriveWrappingKey(password, vaultSaltHex);
            const kekRecovery = await cryptoDeriveWrappingKey('sv_escrow_' + email.toLowerCase().trim(), recoverySaltHex);

            const wrappedPwd = await cryptoWrapVaultKey(rawVaultKeyBytes, kekPwd);
            const wrappedRecovery = await cryptoWrapVaultKey(rawVaultKeyBytes, kekRecovery);

            // Save new wrapped keys to Supabase user metadata
            if (supabaseClient) {
                await supabaseClient.auth.updateUser({
                    data: {
                        vault_salt: vaultSaltHex,
                        recovery_salt: recoverySaltHex,
                        wrapped_vault_key_pwd: wrappedPwd,
                        wrapped_vault_key_recovery: wrappedRecovery,
                        crypto_version: 2
                    }
                });
            }
        }

        await loadUserVault();
        saveActiveSession(currentUserEmail, currentUserProfile);
        showAppDashboard();
        resetAutoLockTimer();
        showToast('مرحباً بك! تم فتح خزنتك المشفرة بنجاح 🔓');
    } catch (err) {
        console.error('Login error:', err);
        showAuthError('login-error', 'خطأ في تسجيل الدخول: البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> تسجيل الدخول';
    }
}

async function handleUserRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = document.getElementById('register-submit-btn');
    const errEl = document.getElementById('register-error');
    errEl.classList.add('hidden');

    if (!email || !password || !confirmPassword) {
        showAuthError('register-error', 'يرجى إدخال البريد الإلكتروني وكلمة المرور وتأكيدها.');
        return;
    }

    if (password.length < 8) {
        showAuthError('register-error', 'يجب ألا تقل كلمة المرور عن 8 خانات.');
        return;
    }

    if (password !== confirmPassword) {
        showAuthError('register-error', 'كلمتا المرور غير متطابقتين.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الحساب وتوليد مفتاح الخزنة...';

    try {
        currentUserEmail = email;
        currentUserProfile = { fullName: email.split('@')[0], phone: '' };

        // 1. Generate independent 256-bit Vault Key
        rawVaultKeyBytes = cryptoGenerateRawVaultKey();
        activeVaultKey = await cryptoImportVaultKey(rawVaultKeyBytes);

        // 2. Generate salts for Password KEK and Recovery Escrow
        const vaultSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const recoverySaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));

        // 3. Derive KEKs
        const kekPwd = await cryptoDeriveWrappingKey(password, vaultSaltHex);
        const kekRecovery = await cryptoDeriveWrappingKey('sv_escrow_' + email.toLowerCase().trim(), recoverySaltHex);

        // 4. Wrap Vault Key for Password Login & Resilient OTP Recovery
        const wrappedPwd = await cryptoWrapVaultKey(rawVaultKeyBytes, kekPwd);
        const wrappedRecovery = await cryptoWrapVaultKey(rawVaultKeyBytes, kekRecovery);

        // 5. Register user in Supabase Auth
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        vault_salt: vaultSaltHex,
                        recovery_salt: recoverySaltHex,
                        wrapped_vault_key_pwd: wrappedPwd,
                        wrapped_vault_key_recovery: wrappedRecovery,
                        crypto_version: 2
                    }
                }
            });

            if (error) throw error;
        }

        // 6. Initialize default workspaces
        userWorkspaces = JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
        accountsData = [];
        await saveToLocalStorage();

        saveActiveSession(currentUserEmail, currentUserProfile);
        showAppDashboard();
        resetAutoLockTimer();
        showToast('مرحباً بك! تم إنشاء حسابك وتشفير الخزنة بنجاح 🚀');

    } catch (err) {
        console.error('Registration error:', err);
        showAuthError('register-error', 'خطأ أثناء إنشاء الحساب: ' + (err.message || 'يرجى التحقق من صحة البيانات'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> إنشاء الحساب';
    }
}

// ==========================================
// Forgot Password & Reset via Email OTP (Zero Vault Loss)
// ==========================================

async function handleSendResetOtp(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const btn = document.getElementById('send-otp-btn');
    const errEl = document.getElementById('reset-email-error');
    errEl.classList.add('hidden');

    if (!email) {
        showAuthError('reset-email-error', 'يرجى إدخال البريد الإلكتروني.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال الكود...';

    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
            if (error) throw error;
        }

        document.getElementById('forgot-step-email').classList.add('hidden');
        document.getElementById('forgot-step-otp').classList.remove('hidden');
        showToast('تم إرسال كود التحقق إلى بريدك الإلكتروني! 📬');
    } catch (err) {
        console.error('Reset send error:', err);
        showAuthError('reset-email-error', 'حدث خطأ أثناء إرسال الكود: ' + (err.message || 'تأكد من صحة البريد'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال كود التحقق';
    }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const token = document.getElementById('reset-otp-token').value.trim();
    const btn = document.getElementById('verify-otp-btn');
    const errEl = document.getElementById('reset-otp-error');
    errEl.classList.add('hidden');

    if (!token || token.length < 4) {
        showAuthError('reset-otp-error', 'يرجى إدخال كود التحقق المكون من 6 أرقام.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';

    try {
        let authUser = null;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.verifyOtp({
                email: email,
                token: token,
                type: 'recovery'
            });
            if (error) throw error;
            authUser = data ? data.user : null;
        }

        const meta = (authUser && authUser.user_metadata) ? authUser.user_metadata : {};
        let recoveredRawKey = null;

        if (meta.wrapped_vault_key_recovery && meta.recovery_salt) {
            // Unwrap existing Vault Key via verified Recovery Escrow
            const recoveryKek = await cryptoDeriveWrappingKey('sv_escrow_' + email.toLowerCase().trim(), meta.recovery_salt);
            recoveredRawKey = await cryptoUnwrapVaultKey(meta.wrapped_vault_key_recovery, recoveryKek);
        } else {
            // If legacy user had no recovery envelope, generate new key
            recoveredRawKey = cryptoGenerateRawVaultKey();
        }

        // Cache recovery session in memory for Step 3
        tempRecoverySession = {
            email: email,
            rawVaultKeyBytes: recoveredRawKey,
            recoverySaltHex: meta.recovery_salt || bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
            wrappedRecovery: meta.wrapped_vault_key_recovery || null
        };

        document.getElementById('forgot-step-otp').classList.add('hidden');
        document.getElementById('forgot-step-newpwd').classList.remove('hidden');
        showToast('تم التحقق من الكود بنجاح! أدخل كلمة المرور الجديدة 🔑');
    } catch (err) {
        console.error('OTP verify error:', err);
        showAuthError('reset-otp-error', 'فشل التحقق: رمز التحقق غير صحيح أو انتهت صلاحيته.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> تحقق من الكود';
    }
}

async function handleResetNewPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;
    const btn = document.getElementById('change-pwd-btn');
    const errEl = document.getElementById('reset-newpwd-error');
    errEl.classList.add('hidden');

    if (!newPassword || newPassword.length < 8) {
        showAuthError('reset-newpwd-error', 'يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAuthError('reset-newpwd-error', 'كلمتا المرور غير متطابقتين.');
        return;
    }

    if (!tempRecoverySession || !tempRecoverySession.rawVaultKeyBytes) {
        showAuthError('reset-newpwd-error', 'انتهت صلاحية جلسة التحقق، يرجى طلب كود جديد.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث كلمة المرور...';

    try {
        const email = tempRecoverySession.email;
        const rawKey = tempRecoverySession.rawVaultKeyBytes;

        // 1. Generate new vault_salt for the new password
        const newVaultSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const newKekPwd = await cryptoDeriveWrappingKey(newPassword, newVaultSaltHex);

        // 2. Re-wrap the SAME Vault Key with the new password
        const newWrappedPwd = await cryptoWrapVaultKey(rawKey, newKekPwd);

        // 3. Ensure recovery envelope is up to date
        let wrappedRecovery = tempRecoverySession.wrappedRecovery;
        let recoverySaltHex = tempRecoverySession.recoverySaltHex;
        if (!wrappedRecovery) {
            const kekRecovery = await cryptoDeriveWrappingKey('sv_escrow_' + email.toLowerCase().trim(), recoverySaltHex);
            wrappedRecovery = await cryptoWrapVaultKey(rawKey, kekRecovery);
        }

        // 4. Update password and metadata in Supabase Auth
        if (supabaseClient) {
            const { error: updateErr } = await supabaseClient.auth.updateUser({
                password: newPassword,
                data: {
                    vault_salt: newVaultSaltHex,
                    recovery_salt: recoverySaltHex,
                    wrapped_vault_key_pwd: newWrappedPwd,
                    wrapped_vault_key_recovery: wrappedRecovery,
                    crypto_version: 2
                }
            });
            if (updateErr) throw updateErr;
        }

        // 5. Clean up temporary recovery state
        tempRecoverySession = null;

        // 6. Show Step 4 Success screen
        document.getElementById('forgot-step-newpwd').classList.add('hidden');
        document.getElementById('forgot-step-success').classList.remove('hidden');
        showToast('تم تغيير كلمة المرور بنجاح! 🔑✨');
    } catch (err) {
        console.error('Password change error:', err);
        showAuthError('reset-newpwd-error', 'حدث خطأ أثناء تغيير كلمة المرور: ' + (err.message || 'يرجى المحاولة لاحقاً'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-key"></i> تغيير كلمة المرور';
    }
}

async function handleResendOtp() {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
        showToast('يرجى كتابة البريد أولاً');
        return;
    }
    try {
        if (supabaseClient) {
            await supabaseClient.auth.resetPasswordForEmail(email);
        }
        showToast('تمت إعادة إرسال كود التحقق للبريد! 📬');
    } catch (e) {
        showToast('تعذر إعادة إرسال الكود حالياً ⚠️');
    }
}

// ==========================================
// Auto-Lock & Logout Security
// ==========================================

function setupAutoLockActivityTracker() {
    // Activity tracker kept for user interaction listeners
}

function resetAutoLockTimer() {
    // Permanent session: Inactivity auto-lock is disabled
    if (autoLockTimeoutId) {
        clearTimeout(autoLockTimeoutId);
        autoLockTimeoutId = null;
    }
}

function handleLockVault() {
    // Clear all sensitive encryption keys from memory
    activeVaultKey = null;
    rawVaultKeyBytes = null;
    legacyMasterKey = '';
    tempRecoverySession = null;
    accountsData = [];
    userWorkspaces = [];

    if (autoLockTimeoutId) {
        clearTimeout(autoLockTimeoutId);
        autoLockTimeoutId = null;
    }

    const loginPwd = document.getElementById('login-password');
    if (loginPwd) loginPwd.value = '';

    switchAuthMode('login');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-overlay').classList.remove('hidden');
}

function handleUserLogout() {
    clearActiveSession();

    if (supabaseClient) {
        supabaseClient.auth.signOut().catch(console.warn);
    }

    if (realtimeSubscription && supabaseClient) {
        supabaseClient.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
    }

    handleLockVault();
    currentUserEmail = '';
    showToast('تم تسجيل الخروج وقفل الخزنة بنجاح 🔒');
}

function showAuthError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(msg)}`;
        el.classList.remove('hidden');
    }
}

function showAppDashboard() {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    const syncDot = document.getElementById('header-sync-dot');
    if (syncDot) syncDot.className = 'status-indicator-dot dot-online';

    updateUserProfileUI();
    setupRealtimeSync();
    renderWorkspacesList();
    showVaultPage();
}

// ==========================================
// USER PROFILE MANAGEMENT & STANDALONE PAGE
// ==========================================

function updateUserProfileUI() {
    const nameEl = document.getElementById('header-user-name');
    const avatarMini = document.getElementById('header-avatar');

    const displayName = currentUserProfile.fullName || currentUserEmail.split('@')[0] || 'المستخدم';
    const firstLetter = displayName.trim().charAt(0).toUpperCase();

    if (nameEl) nameEl.innerText = displayName;
    if (avatarMini) avatarMini.innerText = firstLetter;

    // Profile Page Hero Elements
    const heroName = document.getElementById('profile-hero-name');
    const heroAvatar = document.getElementById('profile-hero-avatar');
    const heroEmail = document.getElementById('profile-hero-email');

    if (heroName) heroName.innerText = displayName;
    if (heroAvatar) heroAvatar.innerText = firstLetter;
    if (heroEmail) heroEmail.innerText = currentUserEmail;
}

function showProfilePage() {
    const vaultView = document.getElementById('vault-view');
    const profileView = document.getElementById('profile-view');
    const sideNavVault = document.getElementById('side-nav-vault');
    const sideNavProfile = document.getElementById('side-nav-profile');
    const mobNavVault = document.getElementById('mob-nav-vault');
    const mobNavProfile = document.getElementById('mob-nav-profile');

    if (vaultView) vaultView.classList.add('hidden');
    if (profileView) {
        profileView.classList.remove('hidden');
        profileView.scrollTop = 0;
    }

    if (sideNavVault) sideNavVault.classList.remove('active');
    if (sideNavProfile) sideNavProfile.classList.add('active');
    if (mobNavVault) mobNavVault.classList.remove('active');
    if (mobNavProfile) mobNavProfile.classList.add('active');

    // Populate profile inputs
    const fullNameInput = document.getElementById('prof-fullname');
    const phoneInput = document.getElementById('prof-phone');
    const emailReadonly = document.getElementById('prof-email-readonly');

    if (fullNameInput) fullNameInput.value = currentUserProfile.fullName || '';
    if (phoneInput) phoneInput.value = currentUserProfile.phone || '';
    if (emailReadonly) emailReadonly.value = currentUserEmail;

    // Reset change password form & alerts
    const pwdForm = document.getElementById('change-password-form');
    if (pwdForm) pwdForm.reset();
    const pwdErr = document.getElementById('change-pwd-error');
    if (pwdErr) pwdErr.classList.add('hidden');
    const pwdSuccess = document.getElementById('change-pwd-success');
    if (pwdSuccess) pwdSuccess.classList.add('hidden');
    updateProfilePwdStrength('');

    updateUserProfileUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showVaultPage() {
    const vaultView = document.getElementById('vault-view');
    const profileView = document.getElementById('profile-view');
    const sideNavVault = document.getElementById('side-nav-vault');
    const sideNavProfile = document.getElementById('side-nav-profile');
    const mobNavVault = document.getElementById('mob-nav-vault');
    const mobNavProfile = document.getElementById('mob-nav-profile');

    if (profileView) profileView.classList.add('hidden');
    if (vaultView) {
        vaultView.classList.remove('hidden');
        vaultView.scrollTop = 0;
    }

    if (sideNavVault) sideNavVault.classList.add('active');
    if (sideNavProfile) sideNavProfile.classList.remove('active');
    if (mobNavVault) mobNavVault.classList.add('active');
    if (mobNavProfile) mobNavProfile.classList.remove('active');

    renderAccounts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Compatibility aliases
function openProfileModal() {
    showProfilePage();
}

function closeProfileModal() {
    showVaultPage();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const fullName = document.getElementById('prof-fullname').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const btn = document.getElementById('save-profile-btn');

    if (!fullName) {
        showToast('يرجى كتابة الاسم الكامل');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري حفظ التعديلات...';

    try {
        currentUserProfile.fullName = fullName;
        currentUserProfile.phone = phone;

        localStorage.setItem(STORAGE_PROFILE_PREFIX + currentUserEmail, JSON.stringify(currentUserProfile));
        saveActiveSession(currentUserEmail, currentUserProfile);

        if (supabaseClient) {
            await supabaseClient.auth.updateUser({
                data: {
                    full_name: fullName,
                    phone_number: phone
                }
            });
        }

        updateUserProfileUI();
        showToast('تم تحديث بيانات الملف الشخصي بنجاح! 👤✨');
    } catch (err) {
        console.error('Profile update error:', err);
        showToast('حدث خطأ أثناء حفظ الملف الشخصي');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-check"></i> حفظ بيانات الملف الشخصي';
    }
}

// ==========================================
// Change User Master Password (Zero-Knowledge Re-Wrapping)
// ==========================================
function updateProfilePwdStrength(pwd) {
    const bar = document.getElementById('prof-strength-bar');
    const text = document.getElementById('prof-strength-text');
    if (!bar || !text) return;

    if (!pwd) {
        bar.style.width = '0%';
        bar.style.backgroundColor = 'transparent';
        text.innerText = 'قوة كلمة المرور';
        text.style.color = 'var(--text-muted)';
        return;
    }

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) {
        bar.style.width = '33%';
        bar.style.backgroundColor = 'var(--danger)';
        text.innerText = 'ضعيفة (يُفضل استخدام رموز وأرقام)';
        text.style.color = 'var(--danger)';
    } else if (score <= 4) {
        bar.style.width = '66%';
        bar.style.backgroundColor = 'var(--warning)';
        text.innerText = 'متوسطة الجودة';
        text.style.color = 'var(--warning)';
    } else {
        bar.style.width = '100%';
        bar.style.backgroundColor = 'var(--accent-emerald)';
        text.innerText = 'قوية وممتازة 🛡️';
        text.style.color = 'var(--accent-emerald)';
    }
}

async function handleUserChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('change-pwd-current').value;
    const newPassword = document.getElementById('change-pwd-new').value;
    const confirmPassword = document.getElementById('change-pwd-confirm').value;
    const submitBtn = document.getElementById('change-pwd-submit-btn');
    const errEl = document.getElementById('change-pwd-error');
    const successEl = document.getElementById('change-pwd-success');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAuthError('change-pwd-error', 'يرجى ملء جميع حقول كلمة المرور.');
        return;
    }

    if (newPassword.length < 8) {
        showAuthError('change-pwd-error', 'يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAuthError('change-pwd-error', 'كلمة المرور الجديدة وتأكيدها غير متطابقين.');
        return;
    }

    if (newPassword === currentPassword) {
        showAuthError('change-pwd-error', 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.');
        return;
    }

    if (!rawVaultKeyBytes && !activeVaultKey) {
        showAuthError('change-pwd-error', 'حدث خطأ في الجلسة النشطة. يرجى تسجيل الدخول مجدداً.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق وإعادة تشفير الخزنة...';

    try {
        // Step 1: Verify current password if Supabase is connected
        if (supabaseClient) {
            const { error: verifyErr } = await supabaseClient.auth.signInWithPassword({
                email: currentUserEmail,
                password: currentPassword
            });

            if (verifyErr) {
                throw new Error('كلمة المرور الحالية غير صحيحة.');
            }
        }

        // Step 2: Generate new random salt and derive new Wrapping Key (KEK)
        const newVaultSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const newKekPwd = await cryptoDeriveWrappingKey(newPassword, newVaultSaltHex);

        // Step 3: Re-wrap the SAME in-memory rawVaultKeyBytes with new KEK
        const newWrappedPwd = await cryptoWrapVaultKey(rawVaultKeyBytes, newKekPwd);

        // Step 4: Update password & metadata in Supabase
        if (supabaseClient) {
            const { error: updateErr } = await supabaseClient.auth.updateUser({
                password: newPassword,
                data: {
                    vault_salt: newVaultSaltHex,
                    wrapped_vault_key_pwd: newWrappedPwd,
                    crypto_version: 2
                }
            });

            if (updateErr) throw updateErr;
        }

        // Step 5: Update in-memory legacy derivation & persist active session
        legacyMasterKey = deriveLegacyMasterKey(newPassword, currentUserEmail);
        saveActiveSession(currentUserEmail, currentUserProfile);

        // Step 6: Reset inputs & show success feedback
        document.getElementById('change-pwd-current').value = '';
        document.getElementById('change-pwd-new').value = '';
        document.getElementById('change-pwd-confirm').value = '';
        updateProfilePwdStrength('');

        successEl.classList.remove('hidden');
        showToast('تم تغيير كلمة المرور وإعادة تشفير الخزنة بنجاح! 🔐✨');

    } catch (err) {
        console.error('Password change error:', err);
        showAuthError('change-pwd-error', err.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> تحديث كلمة المرور';
    }
}

function copyUserRecoveryKey() {
    showToast('خزنتك محمية بنظام استعادة البريد (OTP) المشفر تلقائياً 🛡️');
}

// ==========================================
// WORKSPACES MANAGEMENT
// ==========================================

function getResolvedWorkspaceId(acc) {
    if (!acc.workspaceId || acc.workspaceId === 'ws-personal') return 'ws-personal';
    const exists = userWorkspaces.some(w => w.id === acc.workspaceId);
    if (exists) return acc.workspaceId;

    // If acc had an orphaned workspace ID or 'ws-work', auto-link it to user's custom workspace
    const customWs = userWorkspaces.find(w => w.id !== 'ws-personal');
    if (customWs) {
        acc.workspaceId = customWs.id;
        return customWs.id;
    }
    return 'ws-personal';
}

function renderWorkspacesList() {
    const listEl = document.getElementById('workspaces-list');
    const wsCountEl = document.getElementById('workspaces-count');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!userWorkspaces || userWorkspaces.length === 0) {
        userWorkspaces = JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
    }

    // Resolve workspace IDs for all accounts
    accountsData.forEach(acc => {
        acc.workspaceId = getResolvedWorkspaceId(acc);
    });

    if (wsCountEl) wsCountEl.innerText = userWorkspaces.length;

    // 1. "All Accounts" Tab
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `ws-item-btn ${activeWorkspaceId === 'ALL' ? 'active' : ''}`;
    allBtn.innerHTML = `
        <div class="ws-info-left">
            <i class="fa-solid fa-border-all"></i>
            <span>جميع الحسابات</span>
        </div>
        <span class="ws-count-badge">${accountsData.length}</span>
    `;
    allBtn.onclick = () => switchWorkspace('ALL');
    listEl.appendChild(allBtn);

    // 2. Custom User Workspaces
    userWorkspaces.forEach(ws => {
        const count = accountsData.filter(a => getResolvedWorkspaceId(a) === ws.id).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `ws-item-btn ${activeWorkspaceId === ws.id ? 'active' : ''}`;
        btn.innerHTML = `
            <div class="ws-info-left">
                <i class="fa-solid ${ws.icon || 'fa-folder'}"></i>
                <span>${escapeHtml(ws.name)}</span>
            </div>
            <span class="ws-count-badge">${count}</span>
        `;
        btn.onclick = () => switchWorkspace(ws.id);
        listEl.appendChild(btn);
    });

    updateActiveWorkspaceBanner();
    updateWorkspaceSelectDropdown();
}

function switchWorkspace(wsId) {
    activeWorkspaceId = wsId;
    renderWorkspacesList();
    renderAccounts();
}

function updateActiveWorkspaceBanner() {
    const nameEl = document.getElementById('banner-ws-name');
    const descEl = document.getElementById('banner-ws-desc');
    const iconEl = document.getElementById('banner-ws-icon');
    const actionsEl = document.getElementById('banner-ws-actions');

    if (!nameEl) return;

    if (activeWorkspaceId === 'ALL') {
        nameEl.innerText = 'جميع الحسابات (كل المساحات)';
        descEl.innerText = 'عرض وإدارة جميع كلمات مرورك وحساباتك المسجلة عبر جميع مساحات العمل.';
        iconEl.innerHTML = '<i class="fa-solid fa-border-all"></i>';
        if (actionsEl) actionsEl.innerHTML = '';
    } else {
        const ws = userWorkspaces.find(w => w.id === activeWorkspaceId);
        if (ws) {
            nameEl.innerText = ws.name;
            descEl.innerText = ws.desc || 'مساحة عمل مخصصة لتنظيم وحفظ حساباتك.';
            iconEl.innerHTML = `<i class="fa-solid ${ws.icon || 'fa-folder'}"></i>`;
            
            if (actionsEl) {
                actionsEl.innerHTML = `
                    <button class="btn-icon" title="تعديل المساحة" onclick="openEditWorkspaceModal('${ws.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    ${ws.id !== 'ws-personal' ? `
                    <button class="btn-icon" title="حذف مساحة العمل" onclick="deleteWorkspace('${ws.id}')" style="color: var(--danger);">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>` : ''}
                `;
            }
        }
    }
}

function updateWorkspaceSelectDropdown() {
    const select = document.getElementById('acc-workspace');
    if (!select) return;

    select.innerHTML = '';
    userWorkspaces.forEach(ws => {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.innerText = ws.name;
        select.appendChild(opt);
    });

    if (activeWorkspaceId !== 'ALL') {
        select.value = activeWorkspaceId;
    }
}

function openCreateWorkspaceModal() {
    document.getElementById('ws-modal-title').innerHTML = '<i class="fa-solid fa-folder-plus"></i> إنشاء مساحة عمل مخصصة جديدة';
    document.getElementById('workspace-form').reset();
    document.getElementById('ws-id').value = '';
    document.getElementById('workspace-modal').classList.remove('hidden');
}

function openEditWorkspaceModal(wsId) {
    const ws = userWorkspaces.find(w => w.id === wsId);
    if (!ws) return;

    document.getElementById('ws-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل مساحة العمل';
    document.getElementById('ws-id').value = ws.id;
    document.getElementById('ws-name-input').value = ws.name;
    document.getElementById('ws-desc-input').value = ws.desc || '';

    const radio = document.querySelector(`input[name="ws-icon"][value="${ws.icon}"]`);
    if (radio) radio.checked = true;

    document.getElementById('workspace-modal').classList.remove('hidden');
}

function closeWorkspaceModal() {
    document.getElementById('workspace-modal').classList.add('hidden');
}

let isSubmittingWorkspace = false;

async function handleWorkspaceSubmit(e) {
    e.preventDefault();
    if (isSubmittingWorkspace) return;

    const name = document.getElementById('ws-name-input').value.trim();
    if (!name) return;

    isSubmittingWorkspace = true;
    const submitBtn = document.getElementById('save-ws-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        const id = document.getElementById('ws-id').value;
        const desc = document.getElementById('ws-desc-input').value.trim();
        const iconRadio = document.querySelector('input[name="ws-icon"]:checked');
        const icon = iconRadio ? iconRadio.value : 'fa-briefcase';

        if (id) {
            const idx = userWorkspaces.findIndex(w => w.id === id);
            if (idx !== -1) {
                userWorkspaces[idx] = { id, name, icon, desc };
            }
        } else {
            const newWs = {
                id: 'ws-' + Math.random().toString(36).substr(2, 8),
                name,
                icon,
                desc
            };
            userWorkspaces.push(newWs);
            activeWorkspaceId = newWs.id;
        }

        // Instant UI feedback (Optimistic Update)
        closeWorkspaceModal();
        renderWorkspacesList();
        renderAccounts();
        showToast(id ? 'تم تحديث مساحة العمل بنجاح!' : 'تم إنشاء مساحة العمل المخصصة بنجاح! 📁');

        // Background synchronization
        await saveAndSyncVault();
    } catch (err) {
        console.error('Error saving workspace:', err);
    } finally {
        isSubmittingWorkspace = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ مساحة العمل';
        }
    }
}

async function deleteWorkspace(wsId) {
    const ws = userWorkspaces.find(w => w.id === wsId);
    if (!ws) return;

    const confirmed = await showCustomConfirm({
        title: 'حذف مساحة العمل',
        message: `هل أنت متأكد من رغبتك في حذف مساحة "${ws.name}"؟ سيتم نقل جميع حساباتها تلقائياً إلى الخزنة الشخصية.`,
        confirmText: 'نعم، حذف المساحة',
        cancelText: 'إلغاء',
        isDanger: true,
        icon: 'fa-trash-can'
    });

    if (confirmed) {
        accountsData.forEach(acc => {
            if (acc.workspaceId === wsId) {
                acc.workspaceId = 'ws-personal';
            }
        });

        userWorkspaces = userWorkspaces.filter(w => w.id !== wsId);
        activeWorkspaceId = 'ALL';

        await saveAndSyncVault();
        renderWorkspacesList();
        renderAccounts();
        showToast('تم حذف مساحة العمل ونقل حساباتها للخزنة الشخصية');
    }
}

// ==========================================
// ==========================================
// PostgreSQL Database Vault Operations
// ==========================================

async function loadUserVault() {
    await loadFromLocalStorage();

    if (!supabaseClient || (!activeVaultKey && !legacyMasterKey)) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Restore custom workspaces from user metadata if available
        if (user.user_metadata && Array.isArray(user.user_metadata.workspaces) && user.user_metadata.workspaces.length > 0) {
            userWorkspaces = user.user_metadata.workspaces;
            const wsKey = STORAGE_WORKSPACES_PREFIX + currentUserEmail;
            localStorage.setItem(wsKey, JSON.stringify(userWorkspaces));
        }

        const { data, error } = await supabaseClient
            .from('vault_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Database select error:', error);
            return;
        }

        if (data && data.length > 0) {
            const cloudAccounts = await Promise.all(data.map(async row => {
                const decCat = await decryptText(row.category);
                const decNotes = await decryptText(row.notes);
                const decName = await decryptText(row.name);
                const decUser = await decryptText(row.username);
                const decPwd = await decryptText(row.password);
                const decUrl = await decryptText(row.url);
                const urls = decUrl ? decUrl.split(/[\n,]/).map(u => u.trim()).filter(u => u.length > 0) : [];
                const isFav = decNotes && decNotes.includes('__FAV__1');
                const rawWs = decNotes && decNotes.includes('__WS__') ? decNotes.split('__WS__')[1].split('__FAV__')[0] : 'ws-personal';
                const cleanNotes = decNotes && decNotes.includes('__NOTES__') ? decNotes.split('__NOTES__')[1].split('__CAT__')[0] : decNotes;

                return {
                    id: row.id,
                    workspaceId: decCat?.startsWith('ws-') ? decCat : rawWs,
                    name: decName,
                    username: decUser,
                    password: decPwd,
                    url: decUrl,
                    urls: urls,
                    isFavorite: isFav,
                    category: (decNotes && decNotes.includes('__CAT__')) ? decNotes.split('__CAT__')[1].split('__WS__')[0] : decCat || 'أخرى',
                    notes: cleanNotes,
                    updated_at: row.updated_at || row.created_at || null
                };
            }));

            const filteredCloud = cloudAccounts.filter(acc => acc.name || acc.username || acc.password);

            // Smart Merge: Never overwrite newer or more detailed local data with stale cloud data
            const localMap = new Map();
            accountsData.forEach(acc => {
                if (acc && acc.id) localMap.set(acc.id, acc);
            });

            const mergedAccounts = [];
            const seenIds = new Set();
            let needReSync = false;

            for (const cloudAcc of filteredCloud) {
                seenIds.add(cloudAcc.id);
                const localAcc = localMap.get(cloudAcc.id);

                if (localAcc) {
                    const localTime = localAcc.updated_at ? new Date(localAcc.updated_at).getTime() : 0;
                    const cloudTime = cloudAcc.updated_at ? new Date(cloudAcc.updated_at).getTime() : 0;
                    const localUrls = getAccountUrls(localAcc);
                    const cloudUrls = getAccountUrls(cloudAcc);

                    // If local has newer update or more urls, preserve local and schedule re-sync
                    if (localTime > cloudTime || (localUrls.length > cloudUrls.length)) {
                        mergedAccounts.push(localAcc);
                        needReSync = true;
                    } else {
                        mergedAccounts.push(cloudAcc);
                    }
                } else {
                    mergedAccounts.push(cloudAcc);
                }
            }

            // Keep local-only accounts that haven't reached cloud yet
            for (const acc of accountsData) {
                if (acc && acc.id && !seenIds.has(acc.id)) {
                    mergedAccounts.push(acc);
                    needReSync = true;
                }
            }

            accountsData = mergedAccounts;
            await saveToLocalStorage();

            if (needReSync) {
                await saveAndSyncVault();
            }
        } else if (accountsData.length > 0) {
            // Local accounts exist but cloud has none yet -> upload them
            await saveAndSyncVault();
        }
    } catch (e) {
        console.error('Vault load exception:', e);
    }
}

async function loadFromLocalStorage() {
    const key = STORAGE_LOCAL_VAULT_PREFIX + currentUserEmail;
    const wsKey = STORAGE_WORKSPACES_PREFIX + currentUserEmail;

    const savedWs = localStorage.getItem(wsKey);
    if (savedWs) {
        try {
            userWorkspaces = JSON.parse(savedWs);
        } catch (e) {
            userWorkspaces = JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
        }
    } else {
        userWorkspaces = JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
    }

    const saved = localStorage.getItem(key);
    if (saved && (activeVaultKey || legacyMasterKey)) {
        try {
            const dec = await decryptText(saved);
            if (dec) {
                accountsData = JSON.parse(dec);
            }
        } catch (e) {
            console.warn('Error loading local vault:', e);
        }
    }
}

async function saveToLocalStorage() {
    if (!currentUserEmail || (!activeVaultKey && !legacyMasterKey)) return;
    const key = STORAGE_LOCAL_VAULT_PREFIX + currentUserEmail;
    const wsKey = STORAGE_WORKSPACES_PREFIX + currentUserEmail;

    localStorage.setItem(wsKey, JSON.stringify(userWorkspaces));

    const jsonStr = JSON.stringify(accountsData);
    const encrypted = await encryptText(jsonStr);
    localStorage.setItem(key, encrypted);
}

async function saveAndSyncVault() {
    await saveToLocalStorage();
    if (!supabaseClient || !currentUserEmail || (!activeVaultKey && !legacyMasterKey)) return;

    const syncDot = document.getElementById('header-sync-dot');
    const syncLabel = document.getElementById('header-sync-label');
    if (syncDot) syncDot.className = 'status-indicator-dot dot-syncing';
    if (syncLabel) syncLabel.innerText = 'جاري المزامنة...';

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            if (syncDot) syncDot.className = 'status-indicator-dot dot-offline';
            if (syncLabel) syncLabel.innerText = 'حفظ محلي';
            return;
        }

        // Ensure all accounts have a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let idUpdated = false;
        accountsData.forEach(acc => {
            if (!acc.id || !uuidRegex.test(acc.id)) {
                acc.id = generateUUID();
                idUpdated = true;
            }
        });
        if (idUpdated) {
            await saveToLocalStorage();
        }

        if (accountsData.length > 0) {
            const recordsToUpsert = await Promise.all(accountsData.map(async acc => {
                const combinedNotes = `__NOTES__${acc.notes || ''}__CAT__${acc.category || 'أخرى'}__WS__${acc.workspaceId || 'ws-personal'}__FAV__${acc.isFavorite ? '1' : '0'}`;
                const urlString = Array.isArray(acc.urls) && acc.urls.length > 0 ? acc.urls.join('\n') : (acc.url || '');
                return {
                    id: acc.id,
                    user_id: user.id,
                    name: await encryptText(acc.name),
                    username: await encryptText(acc.username),
                    password: await encryptText(acc.password),
                    url: await encryptText(urlString),
                    category: await encryptText(acc.category || 'أخرى'),
                    notes: await encryptText(combinedNotes),
                    updated_at: acc.updated_at || new Date().toISOString()
                };
            }));

            const { error } = await supabaseClient
                .from('vault_items')
                .upsert(recordsToUpsert, { onConflict: 'id' });

            if (error) {
                console.error('Supabase upsert error:', error);
                if (syncDot) syncDot.className = 'status-indicator-dot dot-offline';
                if (syncLabel) syncLabel.innerText = 'خطأ مزامنة سحابية';
                return false;
            }
        }

        // Sync workspaces to Supabase Auth metadata
        try {
            await supabaseClient.auth.updateUser({
                data: { workspaces: userWorkspaces }
            });
        } catch (wsErr) {
            console.warn('Workspace sync warning:', wsErr);
        }

        // Broadcast instantaneous change event to all connected devices (phones/tablets/laptops)
        if (realtimeSubscription) {
            realtimeSubscription.send({
                type: 'broadcast',
                event: 'vault_sync',
                payload: { sender: currentUserEmail, timestamp: Date.now() }
            }).catch(() => {});
        }

        if (syncDot) syncDot.className = 'status-indicator-dot dot-online';
        if (syncLabel) syncLabel.innerText = 'متزامن لحظياً ⚡';
        return true;
    } catch (e) {
        console.error('Error during cloud sync:', e);
        if (syncDot) syncDot.className = 'status-indicator-dot dot-offline';
        if (syncLabel) syncLabel.innerText = 'خطأ مزامنة';
        return false;
    }
}

async function syncWithCloudNow() {
    if (!supabaseClient) {
        showToast('التطبيق في الوضع المحلي');
        return;
    }
    const syncDot = document.getElementById('header-sync-dot');
    const syncLabel = document.getElementById('header-sync-label');
    if (syncDot) syncDot.className = 'status-indicator-dot dot-syncing';
    if (syncLabel) syncLabel.innerText = 'جاري المزامنة...';

    showToast('جاري مزامنة ورفع البيانات... 🔄');
    try {
        await saveAndSyncVault();
        await loadUserVault();
        renderWorkspacesList();
        renderAccounts();
        showToast('تمت المزامنة وحفظ البيانات سحابياً بنجاح! ☁️✨');
    } catch (e) {
        console.error('Manual sync failed:', e);
        showToast('تعذر إتمام المزامنة السحابية ⚠️');
    }
}

let backgroundSyncTimer = null;
let syncListenersInitialized = false;

function setupRealtimeSync() {
    if (!supabaseClient) return;
    if (realtimeSubscription) {
        try {
            supabaseClient.removeChannel(realtimeSubscription);
        } catch (e) {}
        realtimeSubscription = null;
    }

    supabaseClient.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;

        const channelName = 'vault_user_' + user.id;
        realtimeSubscription = supabaseClient
            .channel(channelName, {
                config: {
                    broadcast: { self: false }
                }
            })
            // 1. Instant 0ms WebSocket Broadcast from any connected device
            .on('broadcast', { event: 'vault_sync' }, async () => {
                await loadUserVault();
                renderWorkspacesList();
                renderAccounts();
                showToast('⚡ تم تحديث الخزنة فوراً من جهاز آخر!');
            })
            // 2. Direct PostgreSQL Database CDC (Change Data Capture)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'vault_items',
                    filter: `user_id=eq.${user.id}`
                },
                async () => {
                    await loadUserVault();
                    renderWorkspacesList();
                    renderAccounts();
                }
            )
            .subscribe((status) => {
                const syncDot = document.getElementById('header-sync-dot');
                const syncLabel = document.getElementById('header-sync-label');
                if (status === 'SUBSCRIBED') {
                    if (syncDot) syncDot.className = 'status-indicator-dot dot-online';
                    if (syncLabel) syncLabel.innerText = 'متزامن لحظياً ⚡';
                }
            });
    });

    // Fast 5-second polling fallback so mobile is always 100% up-to-date
    if (backgroundSyncTimer) clearInterval(backgroundSyncTimer);
    backgroundSyncTimer = setInterval(async () => {
        if (currentUserEmail && (activeVaultKey || legacyMasterKey) && supabaseClient && !document.hidden) {
            await loadUserVault();
            renderWorkspacesList();
            renderAccounts();
        }
    }, 5000);

    // Initialize auto-sync event listeners once
    if (!syncListenersInitialized) {
        syncListenersInitialized = true;

        // Auto-sync when internet reconnects
        window.addEventListener('online', async () => {
            if (currentUserEmail && (activeVaultKey || legacyMasterKey) && supabaseClient) {
                showToast('تم استعادة الاتصال بالإنترنت، جاري المزامنة... 🌐');
                await syncWithCloudNow();
            }
        });

        // Auto-sync when returning to the tab or mobile unlock
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && currentUserEmail && (activeVaultKey || legacyMasterKey) && supabaseClient) {
                await loadUserVault();
                renderWorkspacesList();
                renderAccounts();
            }
        });

        window.addEventListener('focus', async () => {
            if (currentUserEmail && (activeVaultKey || legacyMasterKey) && supabaseClient) {
                await loadUserVault();
                renderWorkspacesList();
                renderAccounts();
            }
        });

        window.addEventListener('pageshow', async () => {
            if (currentUserEmail && (activeVaultKey || legacyMasterKey) && supabaseClient) {
                await loadUserVault();
                renderWorkspacesList();
                renderAccounts();
            }
        });
    }
}

// ==========================================
// SMART BRAND DETECTION & ICONOGRAPHY SYSTEM
// 100% Guaranteed Crisp FontAwesome Icons (No Broken Favicon Images)
// ==========================================
function getBrandInfo(name = '', url = '', category = '') {
    const text = (name + ' ' + (url || '')).toLowerCase().trim();

    // 1. Popular Global & Regional Brands
    if (text.includes('google') || text.includes('gmail') || text.includes('drive') || text.includes('youtube')) {
        return { icon: text.includes('youtube') ? 'fa-brands fa-youtube' : 'fa-brands fa-google', brandClass: 'brand-google' };
    }
    if (text.includes('github')) {
        return { icon: 'fa-brands fa-github', brandClass: 'brand-github' };
    }
    if (text.includes('facebook') || text.includes('meta')) {
        return { icon: 'fa-brands fa-facebook', brandClass: 'brand-facebook' };
    }
    if (text.includes('twitter') || text.includes('x.com') || text.includes('x corp')) {
        return { icon: 'fa-brands fa-x-twitter', brandClass: 'brand-twitter' };
    }
    if (text.includes('instagram')) {
        return { icon: 'fa-brands fa-instagram', brandClass: 'brand-instagram' };
    }
    if (text.includes('linkedin')) {
        return { icon: 'fa-brands fa-linkedin', brandClass: 'brand-linkedin' };
    }
    if (text.includes('discord')) {
        return { icon: 'fa-brands fa-discord', brandClass: 'brand-discord' };
    }
    if (text.includes('telegram')) {
        return { icon: 'fa-brands fa-telegram', brandClass: 'brand-telegram' };
    }
    if (text.includes('whatsapp')) {
        return { icon: 'fa-brands fa-whatsapp', brandClass: 'brand-whatsapp' };
    }
    if (text.includes('spotify')) {
        return { icon: 'fa-brands fa-spotify', brandClass: 'brand-spotify' };
    }
    if (text.includes('netflix')) {
        return { icon: 'fa-solid fa-film', brandClass: 'brand-netflix' };
    }
    if (text.includes('amazon') || text.includes('aws')) {
        return { icon: 'fa-brands fa-amazon', brandClass: 'brand-amazon' };
    }
    if (text.includes('apple') || text.includes('icloud')) {
        return { icon: 'fa-brands fa-apple', brandClass: 'brand-apple' };
    }
    if (text.includes('microsoft') || text.includes('outlook') || text.includes('office') || text.includes('live.com') || text.includes('hotmail')) {
        return { icon: 'fa-brands fa-microsoft', brandClass: 'brand-microsoft' };
    }
    if (text.includes('steam')) {
        return { icon: 'fa-brands fa-steam', brandClass: 'brand-steam' };
    }
    if (text.includes('figma')) {
        return { icon: 'fa-brands fa-figma', brandClass: 'brand-figma' };
    }
    if (text.includes('slack')) {
        return { icon: 'fa-brands fa-slack', brandClass: 'brand-slack' };
    }
    if (text.includes('paypal')) {
        return { icon: 'fa-brands fa-paypal', brandClass: 'brand-paypal' };
    }
    if (text.includes('tiktok')) {
        return { icon: 'fa-brands fa-tiktok', brandClass: 'brand-tiktok' };
    }
    if (text.includes('reddit')) {
        return { icon: 'fa-brands fa-reddit', brandClass: 'brand-reddit' };
    }
    if (text.includes('chatgpt') || text.includes('openai')) {
        return { icon: 'fa-solid fa-robot', brandClass: 'brand-openai' };
    }
    if (text.includes('notion')) {
        return { icon: 'fa-solid fa-book-bookmark', brandClass: 'brand-notion' };
    }
    if (text.includes('dropbox')) {
        return { icon: 'fa-brands fa-dropbox', brandClass: '' };
    }
    if (text.includes('gitlab')) {
        return { icon: 'fa-brands fa-gitlab', brandClass: '' };
    }
    if (text.includes('trello')) {
        return { icon: 'fa-brands fa-trello', brandClass: '' };
    }
    if (text.includes('bank') || text.includes('بنك') || text.includes('visa') || text.includes('mastercard') || text.includes('alrajhi') || text.includes('nbe') || text.includes('cib') || text.includes('paypal')) {
        return { icon: 'fa-solid fa-building-columns', brandClass: 'brand-bank' };
    }

    // 2. Intelligent Category Fallback Icon
    return {
        icon: getIconForCategory(category),
        brandClass: ''
    };
}

function getIconForCategory(cat) {
    switch (cat) {
        case 'وسائط إجتماعية': return 'fa-solid fa-share-nodes';
        case 'البريد الإلكتروني': return 'fa-solid fa-envelope';
        case 'بنوك ومدفوعات': return 'fa-solid fa-credit-card';
        case 'عمل واستضافة': return 'fa-solid fa-server';
        case 'ألعاب وترفيه': return 'fa-solid fa-gamepad';
        default: return 'fa-solid fa-key';
    }
}

// ==========================================
// SECURITY HEALTH ANALYZER
// ==========================================
function updateSecurityHealth() {
    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;

    accountsData.forEach(acc => {
        const pwd = acc.password || '';
        if (pwd.length >= 12 && (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) && /\d/.test(pwd) && /[^a-zA-Z\d]/.test(pwd)) {
            strongCount++;
        } else if (pwd.length >= 8 && ((/[a-zA-Z]/.test(pwd) && /\d/.test(pwd)) || /[^a-zA-Z\d]/.test(pwd))) {
            mediumCount++;
        } else {
            weakCount++;
        }
    });

    const strongEl = document.getElementById('sec-strong-count');
    const mediumEl = document.getElementById('sec-medium-count');
    const weakEl = document.getElementById('sec-weak-count');
    const badgeEl = document.getElementById('security-score-badge');

    if (strongEl) strongEl.innerText = strongCount;
    if (mediumEl) mediumEl.innerText = mediumCount;
    if (weakEl) weakEl.innerText = weakCount;

    if (badgeEl) {
        const total = accountsData.length;
        if (total === 0) {
            badgeEl.innerText = '100% آمن';
            badgeEl.className = 'health-score-badge';
        } else {
            const score = Math.round((strongCount / total) * 100);
            badgeEl.innerText = `${score}% أمان`;
            if (score >= 80) {
                badgeEl.style.background = 'var(--success-bg)';
                badgeEl.style.color = 'var(--success)';
                badgeEl.style.borderColor = 'var(--success-border)';
            } else if (score >= 50) {
                badgeEl.style.background = 'var(--warning-bg)';
                badgeEl.style.color = 'var(--warning)';
                badgeEl.style.borderColor = 'var(--warning-border)';
            } else {
                badgeEl.style.background = 'var(--danger-bg)';
                badgeEl.style.color = 'var(--danger)';
                badgeEl.style.borderColor = 'var(--danger-border)';
            }
        }
    }
}

// ==========================================
// MULTIPLE URLS & SHARE HELPERS
// ==========================================
function getAccountUrls(acc) {
    if (!acc) return [];
    if (Array.isArray(acc.urls) && acc.urls.length > 0) {
        return acc.urls.filter(u => u && u.trim());
    }
    if (acc.url && typeof acc.url === 'string') {
        return acc.url.split(/[\n,]/).map(u => u.trim()).filter(u => u.length > 0);
    }
    return [];
}

function addUrlInputField(value = '') {
    const list = document.getElementById('urls-input-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'url-input-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    row.innerHTML = `
        <input type="url" class="acc-url-field" placeholder="مثال: https://example.com/wp-admin" value="${escapeHtml(value)}" style="flex: 1;">
        <button type="button" class="btn-icon" title="حذف هذا الرابط" style="color: var(--danger);" onclick="this.closest('.url-input-row').remove()">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    list.appendChild(row);
}

function formatAccountShareText(acc) {
    if (!acc) return '';
    const urls = getAccountUrls(acc);
    const lines = [];
    if (acc.name && acc.name.trim()) {
        lines.push(acc.name.trim());
        lines.push('');
    }
    urls.forEach(u => lines.push(u));
    lines.push(`username: ${acc.username || ''}`);
    lines.push(`password: ${acc.password || ''}`);

    return "```\n" + lines.join('\n') + "\n```";
}

// ==========================================
// SHARE & COPY ALL ACCOUNT DATA
// ==========================================
function copyAllAccountData(id, btnElement = null) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    const codeBlockText = formatAccountShareText(acc);
    copyToClipboard(codeBlockText, btnElement);
    showToast('تم نسخ جميع بيانات الحساب كاملة ومنسقة! 📋✨');
}

function shareAccountData(id, btnElement = null) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    const codeBlockText = formatAccountShareText(acc);

    // 1. Try Native Web Share API if supported
    if (navigator.share && navigator.canShare && navigator.canShare({ title: acc.name, text: codeBlockText })) {
        navigator.share({
            title: acc.name || 'بيانات الحساب',
            text: codeBlockText
        }).catch(err => {
            if (err.name !== 'AbortError') {
                copyToClipboard(codeBlockText, btnElement);
                showToast('تم نسخ كود المشاركة المنسق! 📋✨');
            }
        });
    } else {
        // 2. Direct Copy to Clipboard
        copyToClipboard(codeBlockText, btnElement);
        showToast('تم نسخ كود المشاركة المنسق! 📋✨');
    }
}

// ==========================================
// Accounts Management (Render, Add, Edit, Delete)
// ==========================================
function ensureAccountDecrypted(acc) {
    if (!acc) return;
    if (legacyMasterKey) {
        ['name', 'username', 'password', 'url', 'category', 'notes'].forEach(field => {
            if (typeof acc[field] === 'string' && acc[field].startsWith('U2FsdGVk')) {
                try {
                    const bytes = CryptoJS.AES.decrypt(acc[field], legacyMasterKey);
                    const dec = bytes.toString(CryptoJS.enc.Utf8);
                    if (dec) acc[field] = dec;
                } catch (e) {}
            }
        });
    }
}

function renderAccounts() {
    const grid = document.getElementById('accounts-grid');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortSelector = document.getElementById('sort-selector');
    currentSortMode = sortSelector ? sortSelector.value : 'newest';

    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        if (searchTerm) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
    }

    grid.innerHTML = '';

    // Auto-decrypt all accounts if any were stored as legacy ciphertext
    accountsData.forEach(acc => ensureAccountDecrypted(acc));

    // Filter by Workspace, Search, and Category
    let filtered = accountsData.filter(acc => {
        const resolvedWsId = getResolvedWorkspaceId(acc);
        const matchesWs = activeWorkspaceId === 'ALL' || resolvedWsId === activeWorkspaceId;
        const matchesCategory = activeCategoryFilter === 'ALL' || (activeCategoryFilter === 'FAVORITES' ? !!acc.isFavorite : acc.category === activeCategoryFilter);

        if (!matchesWs || !matchesCategory) return false;
        if (!searchTerm) return true;

        const wsObj = userWorkspaces.find(w => w.id === resolvedWsId) || { name: 'الخزنة الشخصية' };
        const urls = getAccountUrls(acc);

        // All searchable parts
        const rawParts = [
            acc.name || '',
            acc.username || '',
            acc.password || '',
            acc.notes || '',
            acc.category || '',
            wsObj.name || '',
            acc.url || '',
            ...urls,
            '••••••••••••',
            '••••••••'
        ];

        const fullText = rawParts.join(' ').toLowerCase();
        const cleanFullText = fullText.replace(/\s+/g, '');
        const cleanSearch = searchTerm.toLowerCase().replace(/\s+/g, '');

        // 1. Direct match or match without whitespace
        if (fullText.includes(searchTerm.toLowerCase()) || cleanFullText.includes(cleanSearch)) {
            return true;
        }

        // 2. Multi-token search (search terms separated by spaces)
        const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        if (tokens.length > 1) {
            const allTokensMatch = tokens.every(token => fullText.includes(token));
            if (allTokensMatch) return true;

            const anySignificantTokenMatch = tokens.some(token => token.length >= 3 && fullText.includes(token));
            if (anySignificantTokenMatch) return true;
        }

        // 3. Alphanumeric fuzzy match (for passwords with shifted symbols or WhatsApp copy-paste)
        const alphaNumFull = fullText.replace(/[^a-z0-9]/gi, '');
        const alphaNumSearch = searchTerm.replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (alphaNumSearch.length >= 2 && alphaNumFull.includes(alphaNumSearch)) {
            return true;
        }

        return false;
    });

    // Sorting: Pinned/Favorite accounts ALWAYS come first, then sorted by chosen sort mode
    filtered.sort((a, b) => {
        const favA = a.isFavorite ? 1 : 0;
        const favB = b.isFavorite ? 1 : 0;
        if (favA !== favB) return favB - favA; // Favorites first!

        if (currentSortMode === 'alphabetical') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (currentSortMode === 'category') {
            return (a.category || '').localeCompare(b.category || '');
        }
        return 0; // default newest
    });

    // Update counters
    const totalCountEl = document.getElementById('total-count');
    if (totalCountEl) totalCountEl.innerText = filtered.length;

    const allChipCount = document.getElementById('chip-count-all');
    if (allChipCount) allChipCount.innerText = accountsData.length;

    const favChipCount = document.getElementById('chip-count-fav');
    if (favChipCount) favChipCount.innerText = accountsData.filter(a => a.isFavorite).length;

    updateSecurityHealth();

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    filtered.forEach(acc => {
        const wsObj = userWorkspaces.find(w => w.id === getResolvedWorkspaceId(acc)) || { name: 'الخزنة الشخصية', icon: 'fa-house' };
        const urls = getAccountUrls(acc);
        const brand = getBrandInfo(acc.name, urls[0] || acc.url, acc.category);

        const card = document.createElement('div');
        card.className = 'account-card' + (acc.isFavorite ? ' is-favorite' : '');
        card.setAttribute('title', 'انقر لعرض تفاصيل الحساب الكاملة');
        card.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) {
                showAccountDetails(acc.id);
            }
        };

        // Render Links HTML for Card Footer
        let linksHtml = '';
        if (urls.length === 1) {
            const u = urls[0];
            linksHtml = `<a href="${escapeHtml(u.startsWith('http') ? u : 'https://' + u)}" target="_blank" rel="noopener" class="card-url-pill" onclick="event.stopPropagation();"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>فتح الموقع</span></a>`;
        } else if (urls.length > 1) {
            linksHtml = `
                <div class="card-links-multiple">
                    <a href="${escapeHtml(urls[0].startsWith('http') ? urls[0] : 'https://' + urls[0])}" target="_blank" rel="noopener" class="card-url-pill" onclick="event.stopPropagation();"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>رابط 1</span></a>
                    <a href="${escapeHtml(urls[1].startsWith('http') ? urls[1] : 'https://' + urls[1])}" target="_blank" rel="noopener" class="card-url-pill" onclick="event.stopPropagation();"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>رابط 2</span></a>
                    ${urls.length > 2 ? `<span class="card-links-more">+${urls.length - 2}</span>` : ''}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="account-card-header">
                <div class="title-area">
                    <div class="account-icon ${brand.brandClass || ''}">
                        <i class="${brand.icon || 'fa-solid fa-key'}"></i>
                    </div>
                    <div class="title-info">
                        <div class="account-title" title="${escapeHtml(acc.name)}">
                            ${escapeHtml(acc.name)}
                        </div>
                        <div class="badge-row">
                            <span class="account-ws-badge" title="مساحة العمل"><i class="fa-solid ${wsObj.icon}"></i> ${escapeHtml(wsObj.name)}</span>
                            <span class="account-category-badge">${escapeHtml(acc.category || 'أخرى')}</span>
                        </div>
                    </div>
                </div>
                <div class="card-top-actions">
                    <button type="button" class="btn-icon star-btn-action ${acc.isFavorite ? 'is-fav' : ''}" title="${acc.isFavorite ? 'إزالة من المفضلة' : 'تثبيت في المفضلة'}" onclick="event.stopPropagation(); toggleFavoriteAccount('${acc.id}', this)" aria-label="المفضلة">
                        <i class="${acc.isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star'}"></i>
                    </button>
                    <button type="button" class="btn-icon edit-btn-action" title="تعديل الحساب" onclick="event.stopPropagation(); editAccount('${acc.id}')" aria-label="تعديل">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="btn-icon delete-btn-action" title="حذف الحساب" onclick="event.stopPropagation(); deleteAccount('${acc.id}')" aria-label="حذف">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>

            <!-- Credentials Body -->
            <div class="account-card-body">
                <!-- Username Row -->
                <div class="account-info-row">
                    <div class="info-label-group">
                        <i class="fa-solid fa-user info-icon"></i>
                        <span class="info-label">المستخدم</span>
                    </div>
                    <div class="info-content">
                        <span class="info-val" title="${escapeHtml(acc.username)}">${escapeHtml(acc.username)}</span>
                    </div>
                    <div class="info-actions">
                        <button type="button" class="btn-icon copy-btn-action" title="نسخ اسم المستخدم" onclick="event.stopPropagation(); copyAccountUsername('${acc.id}', this)" aria-label="نسخ اسم المستخدم">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </div>

                <!-- Password Row -->
                <div class="account-info-row">
                    <div class="info-label-group">
                        <i class="fa-solid fa-key info-icon"></i>
                        <span class="info-label">كلمة السر</span>
                    </div>
                    <div class="info-content">
                        <span class="info-val font-mono" id="pwd-val-${acc.id}">••••••••••••</span>
                    </div>
                    <div class="info-actions">
                        <button type="button" class="btn-icon" title="إظهار/إخفاء كلمة السر" onclick="event.stopPropagation(); toggleCardPassword('${acc.id}')" aria-label="إظهار أو إخفاء كلمة السر">
                            <i class="fa-solid fa-eye" id="eye-icon-${acc.id}"></i>
                        </button>
                        <button type="button" class="btn-icon copy-btn-action" title="نسخ كلمة السر" onclick="event.stopPropagation(); copyAccountPassword('${acc.id}', this)" aria-label="نسخ كلمة السر">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </div>

                ${acc.notes ? `
                <div class="account-notes-preview">
                    <i class="fa-solid fa-note-sticky"></i>
                    <p>${escapeHtml(acc.notes)}</p>
                </div>
                ` : ''}
            </div>

            <!-- Card Footer -->
            <div class="account-card-footer">
                <div class="footer-links-group">
                    ${linksHtml || '<span></span>'}
                </div>
                
                <div class="footer-actions-right">
                    <button type="button" class="btn-share-pill" onclick="event.stopPropagation(); copyAllAccountData('${acc.id}', this)" title="نسخ كافة بيانات الحساب كاملة">
                        <i class="fa-solid fa-copy"></i> <span>نسخ الكل</span>
                    </button>
                    <button type="button" class="btn-details-pill" onclick="event.stopPropagation(); showAccountDetails('${acc.id}')" title="عرض تفاصيل الحساب">
                        <span>التفاصيل</span> <i class="fa-solid fa-chevron-left"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// ACCOUNT FULL DETAILS POPUP (نافذة تفاصيل الحساب)
// ==========================================
let activeDetailsAccount = null;

function showAccountDetails(id) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    activeDetailsAccount = acc;
    const wsObj = userWorkspaces.find(w => w.id === (acc.workspaceId || 'ws-personal')) || { name: 'شخصي', icon: 'fa-house' };
    const urls = getAccountUrls(acc);
    const brand = getBrandInfo(acc.name, urls[0] || acc.url, acc.category);

    // 1. Header Information
    document.getElementById('det-name').innerText = acc.name || 'حساب بدون عنوان';
    document.getElementById('det-ws-badge').innerHTML = `<i class="fa-solid ${wsObj.icon}"></i> ${escapeHtml(wsObj.name)}`;
    document.getElementById('det-cat-badge').innerText = acc.category || 'أخرى';

    const brandIconBox = document.getElementById('det-brand-icon');
    brandIconBox.className = `details-brand-icon ${brand.brandClass || ''}`;
    brandIconBox.innerHTML = `<i class="${brand.icon || 'fa-solid fa-key'}"></i>`;

    // 2. Dynamic URLs Container
    const urlsContainer = document.getElementById('det-urls-container');
    if (urlsContainer) {
        urlsContainer.innerHTML = '';
        if (urls.length === 0) {
            urlsContainer.classList.add('hidden');
        } else {
            urlsContainer.classList.remove('hidden');
            urls.forEach((u, idx) => {
                const urlCard = document.createElement('div');
                urlCard.className = 'details-field-card';
                const labelText = urls.length > 1 ? `رابط الموقع / اللوحة (${idx + 1})` : 'رابط الخدمة / الموقع';
                urlCard.innerHTML = `
                    <div class="field-meta">
                        <span class="field-label"><i class="fa-solid fa-link"></i> ${labelText}</span>
                        <a href="${escapeHtml(u.startsWith('http') ? u : 'https://' + u)}" target="_blank" rel="noopener" class="direct-link-btn">
                            <span>فتح الموقع</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                    <div class="field-value-row">
                        <span class="field-text-val selectable font-mono">${escapeHtml(u)}</span>
                        <button type="button" class="btn-icon copy-btn-action" title="نسخ الرابط" onclick="copyToClipboard('${escapeHtml(u)}', this)">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                `;
                urlsContainer.appendChild(urlCard);
            });
        }
    }

    // 3. Username Field
    document.getElementById('det-username').innerText = acc.username || '—';

    // 4. Password Field
    const pwdDisplay = document.getElementById('det-password-display');
    const eyeIcon = document.getElementById('det-eye-icon');
    pwdDisplay.innerText = '••••••••••••';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';

    // Password Strength
    const strengthTag = document.getElementById('det-pwd-strength');
    const pwd = acc.password || '';
    if (pwd.length >= 12 && (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) && /\d/.test(pwd) && /[^a-zA-Z\d]/.test(pwd)) {
        strengthTag.innerText = 'كلمة سر قوية جداً 🛡️';
        strengthTag.style.background = 'var(--success-bg)';
        strengthTag.style.color = 'var(--accent-emerald)';
    } else if (pwd.length >= 8 && ((/[a-zA-Z]/.test(pwd) && /\d/.test(pwd)) || /[^a-zA-Z\d]/.test(pwd))) {
        strengthTag.innerText = 'كلمة سر متوسطة ⚡';
        strengthTag.style.background = 'var(--warning-bg)';
        strengthTag.style.color = 'var(--warning)';
    } else {
        strengthTag.innerText = 'كلمة سر ضعيفة ⚠️';
        strengthTag.style.background = 'var(--danger-bg)';
        strengthTag.style.color = 'var(--danger)';
    }

    // 5. Notes Field
    const notesCard = document.getElementById('det-notes-card');
    const notesText = document.getElementById('det-notes-text');
    if (acc.notes && acc.notes.trim()) {
        notesCard.classList.remove('hidden');
        notesText.innerText = acc.notes;
    } else {
        notesCard.classList.add('hidden');
    }

    // 6. Action Buttons
    const favIcon = document.getElementById('det-fav-icon');
    const favBtn = document.getElementById('det-fav-btn');
    if (favIcon && favBtn) {
        if (acc.isFavorite) {
            favIcon.className = 'fa-solid fa-star';
            favBtn.classList.add('is-fav');
            favBtn.title = 'إزالة من المفضلة';
        } else {
            favIcon.className = 'fa-regular fa-star';
            favBtn.classList.remove('is-fav');
            favBtn.title = 'تثبيت في المفضلة';
        }
    }

    const copyAllBtn = document.getElementById('det-copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.onclick = () => copyAllAccountData(acc.id, copyAllBtn);
    }

    const shareBtn = document.getElementById('det-share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => shareAccountData(acc.id, shareBtn);
    }

    const editBtn = document.getElementById('det-edit-btn');
    const deleteBtn = document.getElementById('det-delete-btn');

    editBtn.onclick = () => {
        closeAccountDetailsModal();
        editAccount(acc.id);
    };

    deleteBtn.onclick = () => {
        closeAccountDetailsModal();
        deleteAccount(acc.id);
    };

    // Show modal
    document.getElementById('account-details-modal').classList.remove('hidden');
}

async function toggleFavoriteAccount(id, btnElement = null) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    acc.isFavorite = !acc.isFavorite;
    acc.updated_at = new Date().toISOString();

    triggerHaptic(acc.isFavorite ? 'success' : 'light');

    // Instant visual update
    renderAccounts();
    if (activeDetailsAccount && activeDetailsAccount.id === id) {
        showAccountDetails(id);
    }

    showToast(acc.isFavorite ? 'تم تثبيت الحساب في المفضلة ⭐' : 'تمت إزالة الحساب من المفضلة');

    // Save and sync in background
    await saveToLocalStorage();
    await saveAndSyncVault();
}

function closeAccountDetailsModal() {
    document.getElementById('account-details-modal').classList.add('hidden');
    activeDetailsAccount = null;
}

function toggleDetailsPassword() {
    if (!activeDetailsAccount) return;
    const pwdDisplay = document.getElementById('det-password-display');
    const eyeIcon = document.getElementById('det-eye-icon');

    if (pwdDisplay.innerText === '••••••••••••') {
        pwdDisplay.innerText = activeDetailsAccount.password || '';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
        pwdDisplay.innerText = '••••••••••••';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
    }
}

function copyDetailPassword(btnEl) {
    if (!activeDetailsAccount || !activeDetailsAccount.password) return;
    copyToClipboard(activeDetailsAccount.password, btnEl);
}

function copyDetailField(elementId, btnEl) {
    const el = document.getElementById(elementId);
    if (el && el.innerText) {
        copyToClipboard(el.innerText, btnEl);
    }
}

// ==========================================
// Category Filter Chips & View Mode Controls
// ==========================================
function filterByCategory(cat) {
    activeCategoryFilter = cat;

    // Update chips active state
    document.querySelectorAll('.category-chip').forEach(chip => {
        if (chip.getAttribute('data-cat') === cat) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    renderAccounts();
}

function setViewMode(mode) {
    currentViewMode = mode;
    const grid = document.getElementById('accounts-grid');
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');

    if (mode === 'grid') {
        grid.className = 'accounts-grid view-grid';
        if (gridBtn) gridBtn.classList.add('active');
        if (listBtn) listBtn.classList.remove('active');
    } else {
        grid.className = 'accounts-grid view-list';
        if (listBtn) listBtn.classList.add('active');
        if (gridBtn) gridBtn.classList.remove('active');
    }
}

function clearSearch() {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = '';
        renderAccounts();
    }
}

function previewBrandIcon(name) {
    // Dynamic brand detection preview
}

function checkAccountModalStrength(pwd) {
    const bar = document.getElementById('modal-strength-bar');
    if (!bar) return;

    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 20;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/\d/.test(pwd)) score += 15;
    if (/[^a-zA-Z\d]/.test(pwd)) score += 20;

    bar.style.width = score + '%';
    if (score < 45) {
        bar.style.background = 'var(--danger)';
    } else if (score < 75) {
        bar.style.background = 'var(--warning)';
    } else {
        bar.style.background = 'var(--accent-emerald)';
    }
}

function openAddModal() {
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة حساب جديد';
    document.getElementById('account-form').reset();
    document.getElementById('account-id').value = '';
    const favCb = document.getElementById('acc-favorite');
    if (favCb) favCb.checked = false;

    // Reset multiple URLs list to 1 empty input
    const urlsList = document.getElementById('urls-input-list');
    if (urlsList) {
        urlsList.innerHTML = '';
        addUrlInputField('');
    }

    const bar = document.getElementById('modal-strength-bar');
    if (bar) bar.style.width = '0%';

    updateWorkspaceSelectDropdown();
    document.getElementById('account-modal').classList.remove('hidden');
}

function closeAccountModal() {
    document.getElementById('account-modal').classList.add('hidden');
}

let isSubmittingAccount = false;

async function handleAccountSubmit(e) {
    e.preventDefault();
    if (isSubmittingAccount) return;

    const name = document.getElementById('acc-name').value.trim();
    const username = document.getElementById('acc-username').value.trim();
    const password = document.getElementById('acc-password').value;

    if (!name || !username || !password) {
        showToast('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    isSubmittingAccount = true;
    const submitBtn = document.getElementById('save-account-btn') || e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        const id = document.getElementById('account-id').value;
        const workspaceId = document.getElementById('acc-workspace').value || 'ws-personal';
        const category = document.getElementById('acc-category').value;
        const notes = document.getElementById('acc-notes').value.trim();
        const isFavorite = document.getElementById('acc-favorite')?.checked || false;

        // Collect all URL inputs
        const urlInputs = document.querySelectorAll('.acc-url-field');
        const urls = [];
        urlInputs.forEach(input => {
            const val = input.value.trim();
            if (val) urls.push(val);
        });
        const url = urls.join('\n');
        const now = new Date().toISOString();

        if (id) {
            const idx = accountsData.findIndex(a => a.id === id);
            if (idx !== -1) {
                accountsData[idx] = { id, workspaceId, name, username, password, url, urls, isFavorite, category, notes, updated_at: now };
            }
        } else {
            const newAccount = {
                id: generateUUID(),
                workspaceId,
                name, username, password, url, urls, isFavorite, category, notes,
                updated_at: now
            };
            accountsData.push(newAccount);
        }

        // Close modal immediately (Optimistic UI - Instant 0ms response!)
        closeAccountModal();
        renderWorkspacesList();
        renderAccounts();
        showToast(id ? 'تم تحديث بيانات الحساب بنجاح! 🔒' : 'تمت إضافة الحساب وتشفيره بنجاح! 🛡️');

        // Sync in background without freezing the UI
        await saveAndSyncVault();
    } catch (err) {
        console.error('Error saving account:', err);
    } finally {
        isSubmittingAccount = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ الحساب مشفراً';
        }
    }
}

function editAccount(id) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    updateWorkspaceSelectDropdown();

    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الحساب';
    document.getElementById('account-id').value = acc.id;
    document.getElementById('acc-workspace').value = acc.workspaceId || 'ws-personal';
    document.getElementById('acc-name').value = acc.name;
    document.getElementById('acc-username').value = acc.username;
    document.getElementById('acc-password').value = acc.password;
    document.getElementById('acc-category').value = acc.category || 'أخرى';
    document.getElementById('acc-notes').value = acc.notes || '';
    const favCb = document.getElementById('acc-favorite');
    if (favCb) favCb.checked = !!acc.isFavorite;

    // Populate Multiple URLs
    const urlsList = document.getElementById('urls-input-list');
    if (urlsList) {
        urlsList.innerHTML = '';
        const existingUrls = getAccountUrls(acc);
        if (existingUrls.length > 0) {
            existingUrls.forEach(u => addUrlInputField(u));
        } else {
            addUrlInputField('');
        }
    }

    checkAccountModalStrength(acc.password || '');
    document.getElementById('account-modal').classList.remove('hidden');
}

async function deleteAccount(id) {
    const acc = accountsData.find(a => a.id === id);
    const accName = acc ? acc.name : 'هذا الحساب';

    const confirmed = await showCustomConfirm({
        title: 'حذف الحساب نهائياً',
        message: `هل أنت متأكد من رغبتك في حذف "${escapeHtml(accName)}" نهائياً؟ لا يمكن استرجاعه بعد الحذف.`,
        confirmText: 'نعم، حذف الحساب',
        cancelText: 'إلغاء',
        isDanger: true,
        icon: 'fa-trash-can'
    });

    if (confirmed) {
        accountsData = accountsData.filter(a => a.id !== id);

        if (supabaseClient) {
            try {
                await supabaseClient.from('vault_items').delete().eq('id', id);
            } catch (e) {
                console.warn('Error deleting item from database:', e);
            }
        }

        await saveToLocalStorage();
        renderWorkspacesList();
        renderAccounts();
        showToast('تم حذف الحساب بنجاح 🗑️');

        // Broadcast deletion event immediately to all devices
        if (realtimeSubscription) {
            realtimeSubscription.send({
                type: 'broadcast',
                event: 'vault_sync',
                payload: { sender: currentUserEmail, deletedId: id, timestamp: Date.now() }
            }).catch(() => {});
        }
    }
}

// ==========================================
// Custom Modern Dialog Helpers
// ==========================================
function showCustomConfirm({ title = 'تأكيد الإجراء', message = 'هل أنت متأكد؟', confirmText = 'تأكيد', cancelText = 'إلغاء', isDanger = true, icon = 'fa-triangle-exclamation' } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const titleEl = document.getElementById('dialog-title');
        const msgEl = document.getElementById('dialog-message');
        const confirmBtn = document.getElementById('dialog-confirm-btn');
        const cancelBtn = document.getElementById('dialog-cancel-btn');
        const iconEl = document.getElementById('dialog-icon');
        const iconWrap = document.getElementById('dialog-icon-wrap');

        titleEl.innerText = title;
        msgEl.innerText = message;
        confirmBtn.innerText = confirmText;
        cancelBtn.innerText = cancelText;
        cancelBtn.classList.remove('hidden');

        if (isDanger) {
            confirmBtn.className = 'btn btn-danger';
            iconWrap.className = 'dialog-icon-wrapper';
            iconEl.className = `fa-solid ${icon}`;
        } else {
            confirmBtn.className = 'btn btn-primary';
            iconWrap.className = 'dialog-icon-wrapper icon-info';
            iconEl.className = `fa-solid ${icon}`;
        }

        modal.classList.remove('hidden');

        confirmBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(true);
        };
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(false);
        };
    });
}

function showCustomAlert({ title = 'تنبيه', message = '', buttonText = 'حسناً', type = 'info', icon = 'fa-circle-info' } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const titleEl = document.getElementById('dialog-title');
        const msgEl = document.getElementById('dialog-message');
        const confirmBtn = document.getElementById('dialog-confirm-btn');
        const cancelBtn = document.getElementById('dialog-cancel-btn');
        const iconEl = document.getElementById('dialog-icon');
        const iconWrap = document.getElementById('dialog-icon-wrap');

        titleEl.innerText = title;
        msgEl.innerText = message;
        confirmBtn.innerText = buttonText;
        confirmBtn.className = 'btn btn-primary';
        cancelBtn.classList.add('hidden');

        iconWrap.className = `dialog-icon-wrapper icon-${type}`;
        iconEl.className = `fa-solid ${icon}`;

        modal.classList.remove('hidden');

        confirmBtn.onclick = () => {
            modal.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            resolve();
        };
    });
}

// ==========================================
// Password Strength Meter & Generator
// ==========================================
function checkPasswordStrength(password) {
    const bar = document.getElementById('strength-bar');
    const txt = document.getElementById('strength-text');
    if (!bar || !txt) return;

    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[^a-zA-Z\d]/.test(password)) score += 20;

    bar.style.width = score + '%';

    if (score < 40) {
        bar.style.background = 'var(--danger)';
        txt.innerText = 'قوة كلمة المرور: ضعيفة ⚠️';
        txt.style.color = 'var(--danger)';
    } else if (score < 75) {
        bar.style.background = 'var(--warning)';
        txt.innerText = 'قوة كلمة المرور: متوسطة ⚡';
        txt.style.color = 'var(--warning)';
    } else {
        bar.style.background = 'var(--accent-emerald)';
        txt.innerText = 'قوة كلمة المرور: قوية وممتازة 🛡️';
        txt.style.color = 'var(--accent-emerald)';
    }
}

function generateQuickPassword() {
    const lengthInput = document.getElementById('gen-length');
    const length = lengthInput ? (parseInt(lengthInput.value) || 16) : 16;

    const useUpper = document.getElementById('gen-opt-upper')?.checked ?? true;
    const useLower = document.getElementById('gen-opt-lower')?.checked ?? true;
    const useNums = document.getElementById('gen-opt-nums')?.checked ?? true;
    const useSyms = document.getElementById('gen-opt-syms')?.checked ?? true;

    let charPool = '';
    if (useUpper) charPool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) charPool += 'abcdefghijklmnopqrstuvwxyz';
    if (useNums) charPool += '0123456789';
    if (useSyms) charPool += '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (!charPool) charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

    let pwd = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        pwd += charPool.charAt(array[i] % charPool.length);
    }

    const genResult = document.getElementById('gen-result');
    if (genResult) genResult.value = pwd;
}

function copyGenPassword() {
    const val = document.getElementById('gen-result')?.value;
    if (val) copyToClipboard(val);
}

function fillGeneratedPassword() {
    generateQuickPassword();
    const generated = document.getElementById('gen-result')?.value || '';
    const accPwd = document.getElementById('acc-password');
    if (accPwd) {
        accPwd.value = generated;
        checkAccountModalStrength(generated);
    }
    showToast('تمت تعبئة كلمة سر قوية ومولدة تلقائياً! ⚡');
}

// ==========================================
// Export / Import Encrypted Backups
// ==========================================
async function exportEncryptedData() {
    if (!activeVaultKey && !legacyMasterKey) return;
    const exportObject = {
        workspaces: userWorkspaces,
        accounts: accountsData
    };
    const jsonString = JSON.stringify(exportObject);
    const encrypted = await encryptText(jsonString);

    const dataObj = {
        app: "SafeVault PRO Multi-Workspace",
        version: 2,
        user: currentUserEmail,
        timestamp: new Date().toISOString(),
        encryptedPayload: encrypted
    };

    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safevault_${currentUserEmail.split('@')[0]}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('تم تصدير ملف الخزنة المشفر بنجاح! 📥');
}

function importEncryptedData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const content = JSON.parse(e.target.result);
            const payload = content.encryptedPayload || content;

            let decryptedString = '';
            if (typeof payload === 'object') {
                decryptedString = await decryptText(JSON.stringify(payload));
            } else {
                decryptedString = await decryptText(payload);
            }

            if (!decryptedString) {
                await showCustomAlert({
                    title: 'فشل فك التشفير',
                    message: 'يبدو أن هذا الملف مشفر بمفتاح خزنة مختلف عن حسابك الحالي.',
                    type: 'warning',
                    icon: 'fa-lock'
                });
                return;
            }

            const imported = JSON.parse(decryptedString);
            if (imported.accounts && Array.isArray(imported.accounts)) {
                accountsData = imported.accounts;
                if (imported.workspaces) userWorkspaces = imported.workspaces;
            } else if (Array.isArray(imported)) {
                accountsData = imported;
            }

            await saveAndSyncVault();
            renderWorkspacesList();
            renderAccounts();
            showToast('تم استيراد الحسابات ومساحات العمل بنجاح! 📥✨');
        } catch (err) {
            await showCustomAlert({
                title: 'ملف غير صالح',
                message: 'حدث خطأ أثناء قراءة الملف. تأكد من اختيار ملف JSON صحيح تم تصديره من SafeVault.',
                type: 'warning',
                icon: 'fa-triangle-exclamation'
            });
        }
    };
    reader.readAsText(file);
}

// ==========================================
// Helpers, Interactions & Native Haptics
// ==========================================
function triggerHaptic(type = 'light') {
    if (!navigator.vibrate) return;
    try {
        switch (type) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(24);
                break;
            case 'success':
                navigator.vibrate([12, 35, 18]);
                break;
            case 'warning':
            case 'error':
                navigator.vibrate([25, 45, 25]);
                break;
            case 'pull':
                navigator.vibrate(15);
                break;
        }
    } catch (e) {}
}

function toggleCardPassword(id) {
    const span = document.getElementById(`pwd-val-${id}`);
    const icon = document.getElementById(`eye-icon-${id}`);
    if (!span) return;

    triggerHaptic('light');
    const acc = accountsData.find(a => a.id === id);
    const actualPassword = acc ? (acc.password || '') : '';

    if (span.getAttribute('data-revealed') === 'true') {
        span.innerText = '••••••••••••';
        span.setAttribute('data-revealed', 'false');
        if (icon) icon.className = 'fa-solid fa-eye';
    } else {
        span.innerText = actualPassword;
        span.setAttribute('data-revealed', 'true');
        if (icon) icon.className = 'fa-solid fa-eye-slash';
    }
}

function copyAccountUsername(id, btnElement = null) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc || !acc.username) return;
    copyToClipboard(acc.username, btnElement);
}

function copyAccountPassword(id, btnElement = null) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc || !acc.password) return;
    copyToClipboard(acc.password, btnElement);
}

function copyToClipboard(text, btnElement = null) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        triggerHaptic('success');
        showToast('تم النسخ إلى الحافظة بنجاح! 📋');

        if (btnElement) {
            btnElement.classList.add('copied');
            const icon = btnElement.querySelector('i');
            const originalClass = icon ? icon.className : 'fa-solid fa-copy';

            if (icon) icon.className = 'fa-solid fa-check';

            setTimeout(() => {
                btnElement.classList.remove('copied');
                if (icon) icon.className = originalClass;
            }, 1500);
        }
    }).catch(() => {
        showToast('فشل النسخ إلى الحافظة');
    });
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn ? btn.querySelector('i') : null;
    if (!input) return;

    triggerHaptic('light');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-solid fa-eye';
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ==========================================
// Mobile Bottom Navigation & Speed Dial FAB
// ==========================================
function handleMobileNav(tab) {
    triggerHaptic('light');
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    const target = document.getElementById(`mob-nav-${tab}`);
    if (target) target.classList.add('active');

    // Close speed dial if open
    toggleFabSpeedDial(false);

    if (tab === 'vault') {
        showVaultPage();
    } else if (tab === 'profile') {
        showProfilePage();
    }
}

function toggleFabSpeedDial(forceState = null) {
    const dial = document.getElementById('fab-speed-dial');
    const fabBtn = document.getElementById('mob-nav-add');
    if (!dial || !fabBtn) return;

    const isHidden = dial.classList.contains('hidden');
    const shouldShow = forceState !== null ? forceState : isHidden;

    if (shouldShow) {
        dial.classList.remove('hidden');
        fabBtn.classList.add('active-fab');
        triggerHaptic('medium');
    } else {
        dial.classList.add('hidden');
        fabBtn.classList.remove('active-fab');
        triggerHaptic('light');
    }
}

function openWorkspacesDrawer() {
    triggerHaptic('medium');
    renderDrawerWorkspacesList();
    document.getElementById('workspaces-drawer-modal').classList.remove('hidden');
}

function closeWorkspacesDrawer() {
    document.getElementById('workspaces-drawer-modal').classList.add('hidden');
}

function renderDrawerWorkspacesList() {
    const listEl = document.getElementById('ws-drawer-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // 1. "All Accounts"
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `ws-item-btn ${activeWorkspaceId === 'ALL' ? 'active' : ''}`;
    allBtn.innerHTML = `
        <div class="ws-info-left">
            <i class="fa-solid fa-border-all"></i>
            <span>جميع الحسابات</span>
        </div>
        <span class="ws-count-badge">${accountsData.length}</span>
    `;
    allBtn.onclick = () => {
        triggerHaptic('light');
        switchWorkspace('ALL');
        closeWorkspacesDrawer();
    };
    listEl.appendChild(allBtn);

    // 2. Custom Workspaces
    userWorkspaces.forEach(ws => {
        const count = accountsData.filter(a => getResolvedWorkspaceId(a) === ws.id).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `ws-item-btn ${activeWorkspaceId === ws.id ? 'active' : ''}`;
        btn.innerHTML = `
            <div class="ws-info-left">
                <i class="fa-solid ${ws.icon || 'fa-folder'}"></i>
                <span>${escapeHtml(ws.name)}</span>
            </div>
            <span class="ws-count-badge">${count}</span>
        `;
        btn.onclick = () => {
            triggerHaptic('light');
            switchWorkspace(ws.id);
            closeWorkspacesDrawer();
        };
        listEl.appendChild(btn);
    });
}

function openGeneratorModal() {
    triggerHaptic('medium');
    generateQuickPasswordModal();
    document.getElementById('generator-modal').classList.remove('hidden');
}

function closeGeneratorModal() {
    document.getElementById('generator-modal').classList.add('hidden');
}

function generateQuickPasswordModal() {
    const lengthInput = document.getElementById('gen-length-modal');
    const length = lengthInput ? (parseInt(lengthInput.value) || 16) : 16;

    const useUpper = document.getElementById('gen-opt-upper-modal')?.checked ?? true;
    const useLower = document.getElementById('gen-opt-lower-modal')?.checked ?? true;
    const useNums = document.getElementById('gen-opt-nums-modal')?.checked ?? true;
    const useSyms = document.getElementById('gen-opt-syms-modal')?.checked ?? true;

    let charPool = '';
    if (useUpper) charPool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) charPool += 'abcdefghijklmnopqrstuvwxyz';
    if (useNums) charPool += '0123456789';
    if (useSyms) charPool += '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (!charPool) charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

    let pwd = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        pwd += charPool.charAt(array[i] % charPool.length);
    }

    const genResult = document.getElementById('gen-result-modal');
    if (genResult) genResult.value = pwd;
}

// ==========================================
// Native Mobile Pull-to-Refresh
// ==========================================
function initPullToRefresh() {
    const container = document.getElementById('pull-refresh-container');
    const icon = document.getElementById('pull-refresh-icon');
    const text = document.getElementById('pull-refresh-text');
    const vaultView = document.getElementById('vault-view');
    if (!container || !vaultView) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let isSyncing = false;
    const threshold = 65;

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 4 && !isSyncing && !vaultView.classList.contains('hidden')) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging || isSyncing) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0 && window.scrollY <= 2) {
            // Prevent native mobile browser's default reload circle
            if (e.cancelable) e.preventDefault();

            const pullHeight = Math.min(diff * 0.45, 90);
            container.style.height = `${pullHeight}px`;

            const rotation = (pullHeight / threshold) * 360;
            if (icon) icon.style.transform = `rotate(${rotation}deg)`;

            if (pullHeight >= threshold * 0.45) {
                if (text) text.innerText = 'اترك للتحديث السحابي...';
                if (!container.dataset.vibrated) {
                    triggerHaptic('pull');
                    container.dataset.vibrated = 'true';
                }
            } else {
                if (text) text.innerText = 'اسحب للتحديث...';
                delete container.dataset.vibrated;
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', async () => {
        if (!isDragging || isSyncing) return;
        isDragging = false;
        const diff = currentY - startY;
        const pullHeight = Math.min(diff * 0.45, 90);

        if (pullHeight >= threshold * 0.45 && window.scrollY <= 4) {
            isSyncing = true;
            container.classList.add('refreshing');
            if (text) text.innerText = 'جاري المزامنة...';
            if (icon) icon.classList.add('fa-spin');
            triggerHaptic('medium');

            try {
                await syncWithCloudNow();
                triggerHaptic('success');
            } catch (err) {
            } finally {
                setTimeout(() => {
                    container.style.height = '0px';
                    container.classList.remove('refreshing');
                    if (icon) {
                        icon.classList.remove('fa-spin');
                        icon.style.transform = '';
                    }
                    if (text) text.innerText = 'اسحب للتحديث';
                    isSyncing = false;
                }, 500);
            }
        } else {
            container.style.height = '0px';
            if (icon) icon.style.transform = '';
        }
        delete container.dataset.vibrated;
    }, { passive: true });
}

// ==========================================
// Swipe-Down-to-Dismiss on Mobile Bottom Sheets
// ==========================================
function initDrawerSwipeDismiss() {
    ['workspaces-drawer-modal', 'generator-modal'].forEach(modalId => {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        const card = overlay.querySelector('.modal-card, .ws-drawer-card, .generator-modal-card');
        if (!card) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        card.addEventListener('touchstart', (e) => {
            if (card.scrollTop <= 2) {
                startY = e.touches[0].clientY;
                isDragging = true;
            }
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                card.style.transform = `translateY(${diff * 0.75}px)`;
            }
        }, { passive: true });

        card.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            const diff = currentY - startY;
            if (diff > 85) {
                triggerHaptic('light');
                overlay.classList.add('hidden');
                card.style.transform = '';
            } else {
                card.style.transform = '';
            }
        }, { passive: true });
    });
}

// ==========================================
// Biometric WebAuthn Platform Authentication
// ==========================================
const BIOMETRIC_CRED_KEY = 'safevault_biometric_registered';

async function checkBiometricAvailability(autoPrompt = true) {
    try {
        const isAvailable = !!(window.PublicKeyCredential && 
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
        
        const bioLoginBox = document.getElementById('biometric-login-box');
        const bioSettingBtn = document.getElementById('btn-profile-biometric');
        const bioTitle = document.getElementById('biometric-btn-title');
        const bioDesc = document.getElementById('biometric-btn-desc');

        const isRegistered = localStorage.getItem(BIOMETRIC_CRED_KEY) === 'true';

        if (bioLoginBox) {
            if (isAvailable && isRegistered) {
                bioLoginBox.classList.remove('hidden');
                // Auto trigger biometric unlock on startup if on login screen
                if (autoPrompt) {
                    const authOverlay = document.getElementById('auth-overlay');
                    if (authOverlay && !authOverlay.classList.contains('hidden')) {
                        setTimeout(() => {
                            handleBiometricLogin(true);
                        }, 500);
                    }
                }
            } else {
                bioLoginBox.classList.add('hidden');
            }
        }

        if (bioSettingBtn && bioTitle && bioDesc) {
            if (!isAvailable) {
                bioSettingBtn.style.display = 'none';
            } else {
                bioSettingBtn.style.display = 'flex';
                if (isRegistered) {
                    bioTitle.innerText = 'البصمة مفعلة (Touch ID / Face ID) ✓';
                    bioDesc.innerText = 'انقر لإلغاء تفعيل الدخول بالبصمة';
                } else {
                    bioTitle.innerText = 'تفعيل البصمة / Face ID';
                    bioDesc.innerText = 'تفعيل فتح الخزنة السريع ببصمة الإصبع أو الوجه';
                }
            }
        }
    } catch (e) {}
}

async function toggleBiometricSetup() {
    triggerHaptic('medium');
    const isRegistered = localStorage.getItem(BIOMETRIC_CRED_KEY) === 'true';

    if (isRegistered) {
        localStorage.removeItem(BIOMETRIC_CRED_KEY);
        localStorage.removeItem('safevault_bio_email');
        localStorage.removeItem('safevault_bio_pwd');
        showToast('تم إلغاء تفعيل الدخول بالبصمة');
        checkBiometricAvailability(false);
        return;
    }

    if (!window.PublicKeyCredential) {
        showToast('جهازك لا يدعم المصادقة بالبصمة');
        return;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const createOptions = {
            publicKey: {
                challenge: challenge,
                rp: { name: 'SafeVault PRO' },
                user: {
                    id: new Uint8Array(16),
                    name: currentUserEmail || 'user@safevault.app',
                    displayName: (currentUserProfile && currentUserProfile.fullName) || 'مستخدم SafeVault'
                },
                pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required'
                },
                timeout: 60000
            }
        };

        const credential = await navigator.credentials.create(createOptions);
        if (credential) {
            localStorage.setItem(BIOMETRIC_CRED_KEY, 'true');
            if (currentUserEmail) localStorage.setItem('safevault_bio_email', currentUserEmail);
            if (legacyMasterKey) localStorage.setItem('safevault_bio_pwd', legacyMasterKey);
            triggerHaptic('success');
            showToast('تم تفعيل الدخول بالبصمة / Face ID بنجاح! 🔒✨');
            checkBiometricAvailability(false);
        }
    } catch (err) {
        console.warn('Biometric setup canceled or failed:', err);
        showToast('تم إلغاء إعداد البصمة');
    }
}

async function handleBiometricLogin(isAuto = false) {
    if (!isAuto) triggerHaptic('medium');
    const savedEmail = localStorage.getItem('safevault_bio_email');
    const savedKey = localStorage.getItem('safevault_bio_pwd');

    if (!savedEmail || !savedKey) {
        if (!isAuto) showToast('يرجى تسجيل الدخول أولاً وتفعيل البصمة من الملف الشخصي');
        return;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const getOptions = {
            publicKey: {
                challenge: challenge,
                timeout: 60000,
                userVerification: 'required'
            }
        };

        const assertion = await navigator.credentials.get(getOptions);
        if (assertion) {
            triggerHaptic('success');
            showToast('تم التحقق من البصمة بنجاح! 🔓✨');
            
            // Auto fill & login with saved credentials
            const emailInput = document.getElementById('login-email');
            const pwdInput = document.getElementById('login-password');
            if (emailInput) emailInput.value = savedEmail;
            if (pwdInput) pwdInput.value = savedKey;

            // Submit login
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                loginForm.dispatchEvent(submitEvent);
            }
        }
    } catch (err) {
        console.warn('Biometric login canceled or failed:', err);
        if (!isAuto) {
            triggerHaptic('warning');
            showToast('تم إلغاء التحقق من البصمة');
        }
    }
}

// ==========================================
// PWA (Progressive Web App) & Service Worker
// ==========================================
let deferredPWAInstallPrompt = null;

function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('SafeVault PWA ServiceWorker registered successfully! 🛡️', reg.scope);
                })
                .catch(err => {
                    console.warn('PWA ServiceWorker registration failed:', err);
                });
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPWAInstallPrompt = e;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.classList.remove('hidden');
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPWAInstallPrompt = null;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.classList.add('hidden');
        showToast('تم تثبيت تطبيق SafeVault بنجاح على جهازك! 📲🎉');
    });
}

async function installPWAApp() {
    triggerHaptic('medium');
    if (deferredPWAInstallPrompt) {
        deferredPWAInstallPrompt.prompt();
        const { outcome } = await deferredPWAInstallPrompt.userChoice;
        if (outcome === 'accepted') {
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.classList.add('hidden');
            showToast('جاري تثبيت تطبيق SafeVault PRO... 📲✨');
        }
        deferredPWAInstallPrompt = null;
        return;
    }

    // Guide toast for mobile browsers
    showToast('لتثبيت التطبيق: اضغط على الثلاث نقاط (⋮) في المتصفح واختر "تثبيت التطبيق" أو "Install App" 📲');
}

// ==========================================
// Global Smart Keyboard Shortcuts (اختصارات لوحة المفاتيح)
// ==========================================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isEditing = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        // 1. Ctrl + K or Cmd + K or "/" (when not typing): Focus Search Bar
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        // "/" to search when outside inputs
        if (e.key === '/' && !isEditing) {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        // 2. Escape: Close open modals, or clear search focus
        if (e.key === 'Escape') {
            const modals = [
                'account-modal',
                'account-details-modal',
                'create-ws-modal',
                'workspaces-drawer-modal',
                'generator-modal',
                'custom-dialog-modal'
            ];

            let closedAny = false;
            modals.forEach(mId => {
                const modal = document.getElementById(mId);
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    closedAny = true;
                }
            });

            toggleFabSpeedDial(false);

            if (!closedAny && isEditing) {
                activeElement.blur();
            }
            return;
        }

        // 3. "N" or Alt + N: Open Add Account Modal (when not typing inside an input)
        if ((e.key === 'n' || e.key === 'N' || ((e.altKey) && (e.key === 'n' || e.key === 'N'))) && !isEditing && !e.ctrlKey && !e.metaKey) {
            const authCard = document.getElementById('auth-card');
            if (authCard && !authCard.classList.contains('hidden')) return;
            e.preventDefault();
            openAddModal();
            return;
        }

        // 4. Alt + F: Toggle Favorites filter
        if ((e.altKey && (e.key === 'f' || e.key === 'F')) && !isEditing) {
            e.preventDefault();
            if (activeCategoryFilter === 'FAVORITES') {
                filterByCategory('ALL');
            } else {
                filterByCategory('FAVORITES');
            }
            return;
        }
    });
}

// ==========================================
// Universal Modal Backdrop Dismiss (Click Outside to Close)
// ==========================================
function initModalBackdropDismiss() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                // NEVER dismiss the mandatory auth login overlay
                if (overlay.id === 'auth-overlay') return;

                overlay.classList.add('hidden');
                if (overlay.id === 'account-details-modal') {
                    activeDetailsAccount = null;
                }
            }
        });
    });
}

function copyGenPasswordModal() {
    const val = document.getElementById('gen-result-modal')?.value;
    if (val) copyToClipboard(val);
}

// Startup Initializations
initPWA();
initKeyboardShortcuts();
initModalBackdropDismiss();
initPullToRefresh();
initDrawerSwipeDismiss();
checkBiometricAvailability(true);
