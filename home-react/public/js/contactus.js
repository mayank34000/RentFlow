/**
 * ============================================================================
 * RENTFLOW - CONTACT & FAQ MODULE
 * ============================================================================
 * Handles the FAQ Accordion UI and the Contact Us Form.
 * Demonstrates DOM Manipulation, Event Listeners, and Promises (simulated network request).
 */

document.addEventListener("DOMContentLoaded", () => {
    // ========================================
    // 0. AUTH UI UPDATE
    // ========================================
    function updateAuthUI() {
        const authContainer = document.getElementById("auth-buttons");
        if (!authContainer) return;
        
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (isLoggedIn) {
            let user = { userfname: "User" };
            try { user = JSON.parse(localStorage.getItem("current_user")) || user; } catch(e) {}
            const nameToDisplay = user.name || user.username || user.userfname || 'User';
            const firstName = nameToDisplay.split(' ')[0];
            const savedImage = localStorage.getItem('profileImage') || '../assets/profile.png';
            
            authContainer.style.display = 'flex';
            authContainer.style.alignItems = 'center';
            authContainer.style.gap = '15px';
            authContainer.style.position = 'relative';
            const premiumText = user.isPremium ? "Extend Premium" : "Get Premium";
            
            authContainer.innerHTML = `
                <div class="profile-dropdown-trigger" id="profile-dropdown-trigger" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                    <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);">
                        <img src="${savedImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <span id="profile-name" style="font-weight: 600; color: #fff;">${firstName}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                
                <div class="profile-dropdown-menu" id="profile-dropdown-menu" style="display: none; position: absolute; top: 40px; right: 0; background: #12172b; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; width: 180px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 1000; padding: 6px 0; flex-direction: column;">
                    <a href="profile.html" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Profile</a>
                    <a href="#" id="nav-my-wallet" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Wallet</a>
                    <a href="premium.html" style="padding: 10px 16px; color: #eab308; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s, color 0.2s; display: block; white-space: nowrap;">👑 ${premiumText}</a>
                    <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0;"></div>
                    <a href="#" id="dropdown-logout" style="padding: 10px 16px; color: #ef4444; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s; display: block;">Logout</a>
                </div>
            `;
            
            const trigger = document.getElementById("profile-dropdown-trigger");
            const menu = document.getElementById("profile-dropdown-menu");
            
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === "flex" ? "none" : "flex";
            });
            
            document.addEventListener("click", () => {
                menu.style.display = "none";
            });
            
            document.getElementById("nav-my-wallet").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                menu.style.display = "none";
                openWalletModal();
            });
            
            document.getElementById("dropdown-logout").addEventListener("click", (e) => {
                e.preventDefault();
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("current_user");
                window.location.reload();
            });
        }
    }
    updateAuthUI();

    // ========================================
    // 1. FAQ ACCORDION LOGIC
    // ========================================
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // Toggle the 'active' class on the parent accordion-item
            const parentItem = this.parentElement;
            
            // Optional: Close all other open accordions before opening this one
            // document.querySelectorAll('.accordion-item').forEach(item => {
            //     if (item !== parentItem) item.classList.remove('active');
            // });

            parentItem.classList.toggle('active');
        });
    });

    // ========================================
    // 2. MODAL LOGIC
    // ========================================
    const contactModal = document.getElementById("contact-modal");
    const closeContactModal = document.getElementById("close-contact-modal");
    
    // Close modal via close button
    closeContactModal.addEventListener("click", () => {
        contactModal.classList.remove("show");
    });

    // Close modal via backdrop click
    contactModal.addEventListener("click", (e) => {
        if (e.target === contactModal) {
            contactModal.classList.remove("show");
        }
    });

    // ========================================
    // 3. FORM HANDLING & PROMISES
    // ========================================
    const contactForm = document.getElementById("contact-form");
    const toastContainer = document.getElementById("toast-container");

    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Gather form data
        const name = document.getElementById("contact-name").value.trim();
        const email = document.getElementById("contact-email").value.trim();
        const subject = document.getElementById("contact-subject").value.trim();
        const message = document.getElementById("contact-message").value.trim();

        if (!name || !email || !subject || !message) {
            showToast("Please fill in all fields.", "error");
            return;
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;

        // Simulate network request using Promises and setTimeout
        new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate a successful API call 95% of the time
                if (Math.random() > 0.05) {
                    resolve("Message sent successfully");
                } else {
                    reject(new Error("Network Error"));
                }
            }, 1500); // 1.5 second delay
        })
        .then((successMsg) => {
            showToast("Your message has been sent. We'll be in touch soon!");
            contactForm.reset();
            contactModal.classList.remove("show");
        })
        .catch((error) => {
            showToast("Failed to send message. Please try again later.", "error");
            console.error("Contact Form Error:", error);
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });

    // ========================================
    // 4. TOAST NOTIFICATION UTILITY
    // ========================================
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = "toast";
        
        const iconHtml = type === "success" 
            ? `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

        toast.innerHTML = `${iconHtml} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add("show"), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});
