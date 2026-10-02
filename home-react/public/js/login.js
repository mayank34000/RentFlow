// ======================================================
// ADMIN CREDENTIALS (edit these)
// ======================================================
const ADMIN_EMAIL = "admin@rentflow.com";
const ADMIN_PASSWORD = "Admin@123";

// ======================================================
// NORMAL LOGIN (email/password)
// ======================================================
function handleLogin(event) {
  event?.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  // --- Admin login ---
  if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
    const adminUser = { useremail: ADMIN_EMAIL, role: "admin", username: "Administrator" };
    saveSession(adminUser, "admin");
    window.location.href = "admin-dashboard.html";
    return;
  }

  // --- Regular user login ---
  const users = getUsers();
  const user = users.find(
    u => u.useremail?.toLowerCase() === email && u.userpassword === password
  );

  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  if (user.role !== "customer" && user.role !== "renter") {
    user.role = "customer";
  }

  saveSession(user, user.role);
  redirectByRole(user.role);
}

// ======================================================
// GOOGLE LOGIN
// ======================================================
const GOOGLE_CLIENT_ID = "354423086263-a5p6thqr2udjam895sotpa701180cpp3.apps.googleusercontent.com";

function handleGoogleLogin(response) {
  const payload = parseJwt(response.credential);
  if (!payload) return alert("Google login failed!");

  const users = getUsers();
  const index = users.findIndex(
    u => u.useremail?.toLowerCase() === payload.email.toLowerCase()
  );

  if (index === -1) {
    alert("No account found with this Google account. Please sign up first.");
    return;
  }

  const user = users[index];
  Object.assign(user, {
    username: payload.name,
    googleId: payload.sub,
    profileImage: payload.picture || "../assets/google.png",
    loginMethod: "google",
  });
  localStorage.setItem("user", JSON.stringify(users));

  if (user.role !== "customer" && user.role !== "renter") {
    user.role = "customer";
  }

  saveSession(user, user.role);
  redirectByRole(user.role);
}

function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(
      atob(base64).split("").map(c =>
        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
      ).join("")
    ));
  } catch (error) {
    console.error("JWT error:", error);
    return null;
  }
}

window.onload = function () {
  if (typeof google === "undefined" || !google.accounts?.id) {
    console.error("Google Identity Services not loaded.");
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  google.accounts.id.renderButton(document.getElementById("google-btn"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: 350,
  });
};

// ======================================================
// HELPERS
// ======================================================
function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem("user")) || [];
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error reading users:", error);
    return [];
  }
}

function saveSession(user, role, skipRole = false) {
  localStorage.setItem("current_user", JSON.stringify(user));
  localStorage.setItem("isLoggedIn", "true");
  if (!skipRole && role) localStorage.setItem("userRole", role);
  if (user.profileImage) {
    localStorage.setItem("profileImage", user.profileImage);
  } else {
    localStorage.removeItem("profileImage");
  }
}

function redirectByRole(role) {
  window.location.href = "index.html";
}