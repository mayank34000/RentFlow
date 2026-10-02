document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('site-header');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    // Scroll Behavior
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        // Trigger once on load
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        }
    }

    // Hamburger Mobile Menu
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
        });
    }

    // Handle Auth buttons (from index.js)
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = JSON.parse(localStorage.getItem('current_user'));

    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const profileName = document.getElementById('profile-name');
    const navProfileImg = document.getElementById('nav-profile-img');
    const logoutBtn = document.getElementById('logout-btn');
    const navPremiumBtn = document.getElementById('nav-premium');

    if (isLoggedIn && currentUser) {
        if(authButtons) authButtons.style.display = 'none';
        if(userProfile) userProfile.style.display = 'flex';
        
        if(profileName) profileName.innerText = currentUser.name ? currentUser.name.split(' ')[0] : currentUser.username.split(' ')[0];

        const savedImage = localStorage.getItem('profileImage');
        if (savedImage && navProfileImg) {
            navProfileImg.src = savedImage;
        }

        if (currentUser.isPremium) {
            if(navPremiumBtn) navPremiumBtn.style.display = 'none';
            
            if (currentUser.premiumExpiryDate) {
                const expiry = new Date(currentUser.premiumExpiryDate);
                const now = new Date();
                if (now > expiry) {
                    handleExpiredPremium(currentUser);
                }
            }
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('current_user');
            window.location.href = 'index.html'; 
        });
    }
});

function handleExpiredPremium(currentUser) {
    alert("Your RentFlow Premium subscription has expired. Please renew to continue accessing premium features.");
    currentUser.isPremium = false;
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
    let allUsers = JSON.parse(localStorage.getItem('user')) || [];
    const userIndex = allUsers.findIndex(u => (u.useremail === currentUser.useremail || u.username === currentUser.username));
    if (userIndex !== -1) {
        allUsers[userIndex].isPremium = false;
        localStorage.setItem('user', JSON.stringify(allUsers));
    }
    window.location.reload();
}
