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

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    if (!window.RentFlowAPI || !window.RentFlowAPI.isLoggedIn()) {
        showToast('You must be logged in to submit feedback.', 'error');
        return;
    }

    const payload = {
        rating: parseInt(document.getElementById('fbRating').value, 10),
        comment: document.getElementById('fbMessage').value.trim()
    };

    const submitBtn = document.querySelector('.btn-submit');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
        const res = await window.RentFlowAPI.post('/feedback', payload);
        if (res.success) {
            showToast('Thanks for your feedback!');
            document.getElementById('feedbackForm').reset();
            resetStarRating();
            initFeedbackPage(); 
            renderFeedbackList();
        } else {
            throw new Error(res.message);
        }
    } catch (err) {
        console.error('Submit error:', err);
        showToast('Error submitting feedback: ' + err.message, 'error');
    } finally {
        submitBtn.textContent = origText;
        submitBtn.disabled = false;
    }
}


// ─── RENDER FEEDBACK LIST ────────────────────────────────────

function getStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) { stars += (i <= rating) ? '★' : '☆'; }
    return stars;
}

window.removeFeedback = async function(id) {
    if (!confirm('Remove this feedback from the platform?')) return;
    
    try {
        const res = await window.RentFlowAPI.delete('/feedback/' + id);
        if (res.success) {
            showToast('Feedback removed successfully.');
            renderFeedbackList();
        } else {
            throw new Error(res.message);
        }
    } catch (err) {
        console.error('Error removing:', err);
        showToast('Error removing feedback: ' + err.message, 'error');
    }
};

async function renderFeedbackList() {
    const container = document.getElementById('feedbackListContainer');
    if (!container) return;

    const loggedInUser = window.RentFlowAPI && window.RentFlowAPI.getAuthUser();
    const isAdmin = loggedInUser && (loggedInUser.role || '').toLowerCase() === 'admin';

    try {
        container.innerHTML = '<div class="empty-state"><p>Loading feedback...</p></div>';
        const res = await window.RentFlowAPI.get('/feedback');
        
        if (!res.success) {
            throw new Error(res.message);
        }
        
        const allFeedback = res.feedbacks || [];
        
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
            if (isAdmin) {
                adminControls = `
                    <div class="admin-actions">
                        <button class="btn-remove" onclick="removeFeedback('${fb._id}')">Remove Feedback</button>
                    </div>
                `;
            }

            const userName = fb.user ? fb.user.name : 'Unknown User';
            const dateStr = new Date(fb.createdAt).toLocaleDateString();

            html += `
                <div class="feedback-item">
                    <div class="feedback-stars">${getStars(fb.rating)}</div>
                    <div class="feedback-message">"${fb.comment || 'No comment provided'}"</div>
                    <div class="feedback-meta">
                        <span class="feedback-type-badge">${userName}</span>
                        <span>${dateStr}</span>
                    </div>
                    ${adminControls}
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading feedback:', err);
        container.innerHTML = `<div class="empty-state"><p style="color: #f87171;">Error loading feedback.</p></div>`;
    }
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
