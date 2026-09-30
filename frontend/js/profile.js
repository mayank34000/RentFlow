// =====================================================
// RENTFLOW PROFILE.JS
// =====================================================

// LOGOUT
function handlelogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("current_user");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
}

// TOAST
let toastTimer = null;
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// SETTINGS
const settingsOverlay = document.getElementById("settingsOverlay");
function openSettings() { settingsOverlay?.classList.add("show"); }
function closeSettings() { settingsOverlay?.classList.remove("show"); }

// CHANGE PASSWORD
function openChangePassword() {
    closeSettings();
    const form = document.getElementById("changePasswordForm");
    const toggleBtn = document.getElementById("togglePasswordFormBtn");
    if (form && toggleBtn) {
        openSettings();
        form.hidden = false;
        toggleBtn.textContent = "Cancel";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("togglePasswordFormBtn");
    const cancelBtn = document.getElementById("cancelPasswordBtn");
    const form = document.getElementById("changePasswordForm");
    const errorEl = document.getElementById("passwordError");
    if (!toggleBtn || !form) return;

    function showForm() {
        form.hidden = false;
        toggleBtn.textContent = "Cancel";
    }
    function hideForm() {
        form.hidden = true;
        form.reset();
        if (errorEl) { errorEl.hidden = true; errorEl.textContent = ""; }
        toggleBtn.textContent = "Change";
    }

    toggleBtn.addEventListener("click", () => form.hidden ? showForm() : hideForm());
    cancelBtn?.addEventListener("click", hideForm);

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        function showError(message) {
            if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
        }

        const currentUserData = localStorage.getItem("current_user");
        if (!currentUserData) return showError("User information not found.");

        let user;
        try { user = JSON.parse(currentUserData); }
        catch (error) { return showError("Could not load your account."); }

        const storedPassword = user.userpassword || user.password || "";
        if (storedPassword && currentPassword !== storedPassword)
            return showError("Current password is incorrect.");

        if (newPassword.length < 6)
            return showError("New password must be at least 6 characters.");

        if (newPassword !== confirmPassword)
            return showError("New passwords do not match.");

        if (user.userpassword !== undefined) user.userpassword = newPassword;
        else user.password = newPassword;

        localStorage.setItem("current_user", JSON.stringify(user));
        updateStoredUser(user);
        hideForm();
        alert("Password updated successfully!");
    });
});

// THEME
const themeSelect = document.getElementById("themeSelect");
const savedTheme = localStorage.getItem("theme") || "dark";
function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
}
if (themeSelect) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    themeSelect.addEventListener("change", function () {
        applyTheme(themeSelect.value);
        localStorage.setItem("theme", themeSelect.value);
    });
}

// DELETE ACCOUNT
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", function () {
        const confirmDelete = confirm(
            "Are you sure you want to delete your RentFlow account?\n\nThis action cannot be undone."
        );
        if (!confirmDelete) return;

        const currentUserData = localStorage.getItem("current_user");
        let currentUser = null;
        if (currentUserData) {
            try { currentUser = JSON.parse(currentUserData); }
            catch (error) { console.error(error); }
        }

        if (currentUser && currentUser.useremail) {
            const usersData = localStorage.getItem("user");
            if (usersData) {
                try {
                    let users = JSON.parse(usersData);
                    users = users.filter(
                        u => u.useremail?.toLowerCase() !== currentUser.useremail.toLowerCase()
                    );
                    localStorage.setItem("user", JSON.stringify(users));
                } catch (error) { console.error("Error deleting user:", error); }
            }
        }

        [
            "token", "current_user", "isLoggedIn", "pendingUserEmail",
            "profileImage", "userLatitude", "userLongitude", "address", "city",
            "state", "country", "pin"
        ].forEach(key => localStorage.removeItem(key));

        alert("Your account has been deleted successfully.");
        window.location.href = "signup.html";
    });
}

// LOAD PROFILE
function loadProfile() {
    const currentUserData = localStorage.getItem("current_user");
    if (!currentUserData) return console.log("No current user found in localStorage.");

    let user;
    try { user = JSON.parse(currentUserData); }
    catch (error) { return console.error("Could not parse current user:", error); }

    // Basic info
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    if (fullName) fullName.value = user.username || "";
    if (email) email.value = user.useremail || "";
    if (phone) phone.value = user.userphone || "";

    // DOB / gender / address / bio
    ["dob", "gender", "city", "address", "state", "country", "pin", "bio"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = user[id] || "";
    });

    // Profile card
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    if (profileName) profileName.textContent = user.username || "";
    if (profileEmail) profileEmail.textContent = user.useremail || "";

    updatePremiumStatus(user);
    updatePremiumNavLink();

    // Nav user
    const navName = document.getElementById("navName");
    const navAvatar = document.getElementById("navAvatar");
    const username = user.username || "Account";
    const firstName = username.trim().split(/\s+/)[0];
    if (navName) navName.textContent = firstName || "Account";
    if (navAvatar) navAvatar.textContent = firstName ? firstName.charAt(0).toUpperCase() : "A";
}

// PREMIUM STATUS
function updatePremiumStatus(user) {
    const premiumStatus = document.getElementById("premiumStatus");
    const premiumExpiryDateStr = document.getElementById("premiumExpiryDateStr");
    if (!premiumStatus) return;

    if (user.isPremium !== true || !user.premiumExpiryDate) {
        premiumStatus.style.display = "none";
        return;
    }

    const expiryDate = new Date(user.premiumExpiryDate);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        premiumStatus.style.display = "none";
        return;
    }

    premiumStatus.style.display = "block";
    const options = { year: "numeric", month: "long", day: "numeric" };
    if (premiumExpiryDateStr) {
        premiumExpiryDateStr.textContent = expiryDate.toLocaleDateString(undefined, options);
    }
}

// PREMIUM NAV LINK
function updatePremiumNavLink() {
    const premiumNavLink = document.getElementById("premiumNavLink");
    if (!premiumNavLink) return;

    const currentUserData = localStorage.getItem("current_user");
    if (!currentUserData) {
        premiumNavLink.textContent = "👑 Get Premium";
        return;
    }

    try {
        const user = JSON.parse(currentUserData);
        const isPremium = user.isPremium === true;
        const expiryDate = user.premiumExpiryDate ? new Date(user.premiumExpiryDate) : null;
        const premiumStillActive = isPremium && expiryDate &&
            !isNaN(expiryDate.getTime()) && expiryDate > new Date();

        premiumNavLink.textContent = premiumStillActive ? "👑 Extend Premium" : "👑 Get Premium";
    } catch (error) {
        console.error("Could not check premium status:", error);
        premiumNavLink.textContent = "👑 Get Premium";
    }
}

// PROFILE IMAGE
const DEFAULT_PROFILE_IMAGE = "../assets/profile.png";

function loadProfileImage() {
    const profileImage = document.getElementById("profileImage");
    if (!profileImage) return;
    const savedImage = localStorage.getItem("profileImage");
    profileImage.src = savedImage || DEFAULT_PROFILE_IMAGE;
}

function setupProfileImageUpload() {
    const profileImageInput = document.getElementById("profileImageInput");
    const profileImage = document.getElementById("profileImage");
    if (!profileImageInput || !profileImage) return;

    profileImageInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return alert("Please select a valid image.");

        const reader = new FileReader();
        reader.onload = function (event) {
            const imageData = event.target.result;
            profileImage.src = imageData;
            localStorage.setItem("profileImage", imageData);

            const currentUserData = localStorage.getItem("current_user");
            if (currentUserData) {
                try {
                    const currentUser = JSON.parse(currentUserData);
                    currentUser.profileImage = imageData;
                    localStorage.setItem("current_user", JSON.stringify(currentUser));
                    updateStoredUser(currentUser);
                } catch (error) { console.error("Could not update profile image:", error); }
            }
        };
        reader.readAsDataURL(file);
    });
}

// EDIT PROFILE
document.addEventListener("DOMContentLoaded", function () {
    const editToggleBtn = document.getElementById("editToggleBtn");
    const editToggleLabel = document.getElementById("editToggleLabel");
    const saveBtn = document.getElementById("saveBtn");
    const profileFields = [
        "fullName", "email", "phone", "dob", "gender",
        "city", "address", "state", "country", "pin", "bio"
    ];
    if (!editToggleBtn) return;

    editToggleBtn.addEventListener("click", function () {
        profileFields.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.disabled = false;
                field.style.pointerEvents = "auto";
                field.style.opacity = "1";
                field.removeAttribute("readonly");
            }
        });
        if (editToggleLabel) editToggleLabel.textContent = "Editing";
        editToggleBtn.classList.add("editing");
        if (saveBtn) saveBtn.style.display = "flex";
    });
});

// SAVE PROFILE
document.addEventListener("DOMContentLoaded", function () {
    const profileForm = document.getElementById("profileForm");
    const saveBtn = document.getElementById("saveBtn");
    if (!profileForm || !saveBtn) return;

    profileForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentUserData = localStorage.getItem("current_user");
        if (!currentUserData) return alert("User information not found.");

        let user;
        try { user = JSON.parse(currentUserData); }
        catch (error) { return alert("Could not load your profile."); }

        const oldEmail = user.useremail;
        const getVal = id => document.getElementById(id);

        const fullName = getVal("fullName");
        const email = getVal("email");
        const phone = getVal("phone");
        const dob = getVal("dob");
        const gender = getVal("gender");
        const city = getVal("city");
        const address = getVal("address");
        const state = getVal("state");
        const country = getVal("country");
        const pin = getVal("pin");
        const bio = getVal("bio");

        if (fullName) user.username = fullName.value.trim();
        if (email) user.useremail = email.value.trim();
        if (phone) user.userphone = phone.value.trim();
        if (dob) user.dob = dob.value;
        if (gender) user.gender = gender.value;
        if (city) user.city = city.value.trim();
        if (address) user.address = address.value.trim();
        if (state) user.state = state.value;
        if (country) user.country = country.value;
        if (pin) user.pin = pin.value.trim();
        if (bio) user.bio = bio.value.trim();

        localStorage.setItem("current_user", JSON.stringify(user));
        updateStoredUser(user, oldEmail);

        const profileName = document.getElementById("profileName");
        const profileEmail = document.getElementById("profileEmail");
        if (profileName) profileName.textContent = user.username || "";
        if (profileEmail) profileEmail.textContent = user.useremail || "";

        updatePremiumStatus(user);
        updatePremiumNavLink();

        [
            "fullName", "email", "phone", "dob", "gender",
            "city", "address", "state", "country", "pin", "bio"
        ].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.disabled = true;
        });

        const editToggleBtn = document.getElementById("editToggleBtn");
        const editToggleLabel = document.getElementById("editToggleLabel");
        if (editToggleBtn) editToggleBtn.classList.remove("editing");
        if (editToggleLabel) editToggleLabel.textContent = "Edit";

        saveBtn.style.display = "none";
        showToast("Profile updated successfully!");
    });
});

// UPDATE USER ARRAY
function updateStoredUser(updatedUser, oldEmail = null) {
    const usersData = localStorage.getItem("user");
    if (!usersData) return;

    try {
        let users = JSON.parse(usersData);
        if (!Array.isArray(users)) return;

        const emailToFind = oldEmail || updatedUser.useremail;
        const userIndex = users.findIndex(
            u => u.useremail && emailToFind && u.useremail.toLowerCase() === emailToFind.toLowerCase()
        );

        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updatedUser };
        }

        localStorage.setItem("user", JSON.stringify(users));
    } catch (error) { console.error("Error updating stored user:", error); }
}

// CURRENT LOCATION
document.addEventListener("DOMContentLoaded", function () {
    const locationBtn = document.getElementById("getLocationBtn");
    if (!locationBtn) return;

    locationBtn.addEventListener("click", handleAutoLocate);

    async function handleAutoLocate() {
        if (!navigator.geolocation) {
            return showToast("Geolocation is not supported by your browser.", true);
        }

        locationBtn.textContent = "📍 Getting Location...";
        locationBtn.disabled = true;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 15000, maximumAge: 0
                });
            });

            const { latitude, longitude } = position.coords;
            localStorage.setItem("userLatitude", latitude);
            localStorage.setItem("userLongitude", longitude);

            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error("Nominatim request failed");

            const data = await response.json();
            if (!data.address) throw new Error("No address information found");

            const a = data.address;
            const fullAddress = data.display_name || "";
            const city = a.city || a.town || a.village || a.municipality || "";
            const state = a.state || "";
            const country = a.country || "";
            const pin = a.postcode || "";

            const addressInput = document.getElementById("address");
            if (addressInput) addressInput.value = fullAddress;

            const currentUserData = localStorage.getItem("current_user");
            if (currentUserData) {
                try {
                    const currentUser = JSON.parse(currentUserData);
                    Object.assign(currentUser, {
                        address: fullAddress, city, state, country, pin, latitude, longitude
                    });
                    localStorage.setItem("current_user", JSON.stringify(currentUser));
                    updateStoredUser(currentUser);
                } catch (error) { console.error(error); }
            }

            locationBtn.textContent = "✓ Location Found";
            showToast(`Location detected: ${city ? city + ", " : ""}${state || country}`);
        } catch (error) {
            console.error("Location error:", error);
            locationBtn.textContent = "📍 Use Current Location";
            showToast("Could not find your address. Please try again.", true);
        } finally {
            locationBtn.disabled = false;
        }
    }
});

// PROFILE INITIALIZATION
document.addEventListener("DOMContentLoaded", function () {
    loadProfile();
    loadProfileImage();
    setupProfileImageUpload();
    updatePremiumNavLink();
});