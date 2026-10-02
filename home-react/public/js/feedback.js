/* ============================================================
   RentFlow – Feedback JavaScript
   Uses shared storage.js for all data access.
   - Auto-populates Name/Email from logged-in user (current_user).
   - Locks Name/Email so identity cannot be changed.
   - Admin role is read from current_user.role, NOT from a mock variable.
   - Logged-out users can still submit feedback manually.
   ============================================================ */

// ─── AUTH STATE ──────────────────────────────────────────────

function initFeedbackPage() {
    const loggedInUser = getLoggedInUser();
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    const nameInput  = document.getElementById('fbName');
    const emailInput = document.getElementById('fbEmail');

    if (isLoggedIn && loggedInUser) {
        // Logged in — auto-populate and lock identity fields
        if (nameInput) {
            nameInput.value    = loggedInUser.username || loggedInUser.name || '';
            nameInput.readOnly = true;
            nameInput.style.opacity = '0.7';
            nameInput.style.cursor  = 'not-allowed';
            nameInput.title = 'Name is automatically filled from your account.';
        }
        if (emailInput) {
            emailInput.value    = loggedInUser.useremail || loggedInUser.email || '';
            emailInput.readOnly = true;
            emailInput.style.opacity = '0.7';
            emailInput.style.cursor  = 'not-allowed';
            emailInput.title = 'Email is automatically filled from your account.';
        }
    } else {
        // Logged out — ensure fields are editable
        if (nameInput) {
            nameInput.value = '';
            nameInput.readOnly = false;
            nameInput.style.opacity = '1';
            nameInput.style.cursor  = 'text';
            nameInput.title = '';
        }
        if (emailInput) {
            emailInput.value = '';
            emailInput.readOnly = false;
            emailInput.style.opacity = '1';
            emailInput.style.cursor  = 'text';
            emailInput.title = '';
        }
    }
}

// ─── STAR RATING LOGIC ───────────────────────────────────────

function initStarRating() {
    const stars = document.querySelectorAll('#starRating .star');
    const ratingInput = document.getElementById('fbRating');
    const errRating = document.getElementById('errRating');

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const value = parseInt(e.target.getAttribute('data-value'), 10);
            ratingInput.value = value;
            if (errRating) errRating.textContent = '';

            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-value'), 10);
                s.classList.toggle('active', sVal <= value);
                s.textContent = sVal <= value ? '★' : '☆';
            });
        });
    });
}

function resetStarRating() {
    const stars = document.querySelectorAll('#starRating .star');
    const ratingInput = document.getElementById('fbRating');
    if (ratingInput) ratingInput.value = '0';
    stars.forEach(s => { s.classList.remove('active'); s.textContent = '☆'; });
}


// ─── FORM VALIDATION ─────────────────────────────────────────

function validateForm() {
    let isValid = true;

    const nameInput    = document.getElementById('fbName');
    const emailInput   = document.getElementById('fbEmail');
    const typeInput    = document.getElementById('fbType');
    const ratingInput  = document.getElementById('fbRating');
    const messageInput = document.getElementById('fbMessage');

    const errName    = document.getElementById('errName');
    const errEmail   = document.getElementById('errEmail');
    const errType    = document.getElementById('errType');
    const errRating  = document.getElementById('errRating');
    const errMessage = document.getElementById('errMessage');

    // Reset errors
    [errName, errEmail, errType, errRating, errMessage].forEach(el => { if (el) el.textContent = ''; });
    [nameInput, emailInput, typeInput, messageInput].forEach(el => { if (el) el.classList.remove('input-error'); });

    if (!nameInput || !nameInput.value.trim()) {
        if (errName) errName.textContent = 'Name is required.';
        if (nameInput) nameInput.classList.add('input-error');
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput || !emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        if (errEmail) errEmail.textContent = 'A valid email address is required.';
        if (emailInput) emailInput.classList.add('input-error');
        isValid = false;
    }

    if (!typeInput || !typeInput.value) {
        if (errType) errType.textContent = 'Please select a feedback type.';
        if (typeInput) typeInput.classList.add('input-error');
        isValid = false;
    }

    if (!ratingInput || parseInt(ratingInput.value, 10) === 0) {
        if (errRating) errRating.textContent = 'Please select a star rating.';
        isValid = false;
    }

    if (!messageInput || messageInput.value.trim().length < 10) {
        if (errMessage) errMessage.textContent = 'Feedback message must be at least 10 characters.';
        if (messageInput) messageInput.classList.add('input-error');
        isValid = false;
    }

    return isValid;
}

function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    // Always use the logged-in user's actual identity if available
    const loggedInUser = getLoggedInUser();
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // If logged in, strongly associate with their real identity from storage, 
    // rather than just what the read-only fields say.
    const feedbackName = (isLoggedIn && loggedInUser) 
        ? (loggedInUser.username || loggedInUser.name)
        : document.getElementById('fbName').value.trim();

    const feedbackEmail = (isLoggedIn && loggedInUser)
        ? (loggedInUser.useremail || loggedInUser.email)
        : document.getElementById('fbEmail').value.trim();

    const newFeedback = {
        id: 'FB-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        name: feedbackName,
        email: feedbackEmail,
        type:      document.getElementById('fbType').value,
        rating:    parseInt(document.getElementById('fbRating').value, 10),
        message:   document.getElementById('fbMessage').value.trim(),
        bookingId: document.getElementById('fbBookingId') ? document.getElementById('fbBookingId').value.trim() : '',
        date:      new Date().toISOString().split('T')[0],
        status:    'Visible'
    };

    // Store user phone/role if they are logged in to preserve the relationship
    if (isLoggedIn && loggedInUser) {
        if (loggedInUser.userphone) newFeedback.userphone = loggedInUser.userphone;
        if (loggedInUser.role) newFeedback.role = loggedInUser.role;
    }

    const allFeedback = getFeedback();
    allFeedback.unshift(newFeedback);
    saveFeedback(allFeedback);
    // Notify other pages (analytics, admin) in the same tab
    dispatchStorageUpdate(STORAGE_KEYS.FEEDBACK);

    renderFeedbackList();
    showToast('Thanks for your feedback!');

    // Reset form — but re-lock identity fields after reset
    document.getElementById('feedbackForm').reset();
    resetStarRating();
    initFeedbackPage(); // Re-populate locked fields after reset
}


// ─── RENDER FEEDBACK LIST ────────────────────────────────────

function getStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) { stars += (i <= rating) ? '★' : '☆'; }
    return stars;
}

// Global scope for onclick (used in rendered HTML)
window.removeFeedback = function(id) {
    if (confirm('Remove this feedback from the platform?')) {
        let allFeedback = getFeedback();
        allFeedback = allFeedback.filter(fb => fb.id !== id);
        saveFeedback(allFeedback);
        dispatchStorageUpdate(STORAGE_KEYS.FEEDBACK);
        renderFeedbackList();
        showToast('Feedback removed successfully.');
    }
};

function renderFeedbackList() {
    const container = document.getElementById('feedbackListContainer');
    if (!container) return;

    const allFeedback = getFeedback();

    // Determine if current user is admin using real session data
    const loggedInUser = getLoggedInUser();
    const isAdmin = loggedInUser && (loggedInUser.role || '').toLowerCase() === 'admin';

    if (allFeedback.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No feedback submitted yet.</p>
                <small>Your feedback will appear here after you submit it.</small>
            </div>
        `;
        return;
    }

    let html = '';
    allFeedback.forEach(fb => {
        let adminControls = '';
        // Show moderation controls only to admin (UI-level gate — not a secure backend check)
        if (isAdmin) {
            adminControls = `
                <div class="admin-actions">
                    <button class="btn-remove" onclick="removeFeedback('${fb.id}')">Remove Feedback</button>
                </div>
            `;
        }

        html += `
            <div class="feedback-item">
                <div class="feedback-stars">${getStars(fb.rating)}</div>
                <div class="feedback-message">"${fb.message}"</div>
                <div class="feedback-meta">
                    <span class="feedback-type-badge">${fb.type}</span>
                    <span>${fb.date}</span>
                </div>
                ${adminControls}
            </div>
        `;
    });

    container.innerHTML = html;
}


// ─── TOAST NOTIFICATION ──────────────────────────────────────

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 300);
    }, 3000);
}


// ─── MOBILE MENU TOGGLE ─────────────────────────────────────

function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const links  = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');
    if (!toggle || !links) return;

    const closeMenu = () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    if (navbar) {
        const syncScrolledState = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        };

        syncScrolledState();
        window.addEventListener('scroll', syncScrolledState, { passive: true });
    }
}


// ─── INITIALISE ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initFeedbackPage();
    initStarRating();
    initMobileMenu();
    renderFeedbackList();

    const form = document.getElementById('feedbackForm');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Listen for storage changes from OTHER tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.FEEDBACK) renderFeedbackList();
    });

    // Listen for same-tab updates
    window.addEventListener('rentiq_storage_update', (e) => {
        if (!e.detail || e.detail.key === STORAGE_KEYS.FEEDBACK) renderFeedbackList();
    });
});
