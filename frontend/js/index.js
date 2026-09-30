document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab auth variables from LocalStorage
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = JSON.parse(localStorage.getItem('current_user'));

    // 2. Grab HTML Elements
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const profileName = document.getElementById('profile-name');
    const navProfileImg = document.getElementById('nav-profile-img');
    const logoutBtn = document.getElementById('logout-btn');
    const navPremiumBtn = document.getElementById('nav-premium');

    if (isLoggedIn && currentUser) {
        // Toggle UI visibility
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            userProfile.style.position = 'relative';
            
            const nameToDisplay = currentUser.name || currentUser.username || 'User';
            const firstName = nameToDisplay.split(' ')[0];
            const savedImage = localStorage.getItem('profileImage') || '../assets/profile.png';
            
            const premiumText = currentUser.isPremium ? "Extend Premium" : "Get Premium";
            
            userProfile.innerHTML = `
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
                localStorage.removeItem("profileImage");
                window.location.reload();
            });
        }
        
        const heroCtaSignup = document.getElementById('hero-cta-signup');
        if(heroCtaSignup) heroCtaSignup.style.display = 'none';

        // Hide "Go Premium" if they already bought it
        if (currentUser.isPremium) {
            if(navPremiumBtn) navPremiumBtn.style.display = 'none';
            
            // Check Expiration behind the scenes
            if (currentUser.premiumExpiryDate) {
                const expiry = new Date(currentUser.premiumExpiryDate);
                const now = new Date();
                if (now > expiry) {
                    handleExpiredPremium(currentUser);
                }
            }
        }
    }

    // 4. Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
        });
    }

    // 5. Dynamic About Page CTA buttons rendering
    const aboutCtaButtons = document.getElementById('about-cta-buttons');
    if (aboutCtaButtons) {
        if (isLoggedIn && currentUser) {
            aboutCtaButtons.innerHTML = `
                <a href="profile.html" class="btn-primary">Go to Profile</a>
                <a href="booking.html" class="btn-secondary">Explore Rentals</a>
            `;
        } else {
            aboutCtaButtons.innerHTML = `
                <a href="signup.html" class="btn-primary">Get Started Free</a>
                <a href="login.html" class="btn-secondary">Log In</a>
            `;
        }
    }
});

function handleExpiredPremium(currentUser) {
    if (confirm("Your RentFlow Premium subscription has expired. Do you want to renew now to continue accessing premium features (like your phone number visibility)?")) {
        currentUser.isPremium = false;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        let allUsers = JSON.parse(localStorage.getItem('user')) || [];
        const userIndex = allUsers.findIndex(u => u.useremail === currentUser.useremail);
        if (userIndex !== -1) {
            allUsers[userIndex].isPremium = false;
            localStorage.setItem('user', JSON.stringify(allUsers));
        }
        window.location.href = "premium.html";
    } else {
        currentUser.isPremium = false;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        let allUsers = JSON.parse(localStorage.getItem('user')) || [];
        const userIndex = allUsers.findIndex(u => u.useremail === currentUser.useremail);
        if (userIndex !== -1) {
            allUsers[userIndex].isPremium = false;
            localStorage.setItem('user', JSON.stringify(allUsers));
        }
        window.location.reload();
    }
}