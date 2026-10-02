// ================= NORMAL SIGNUP =================

let handleSubmit = () => {
  let name = document.getElementById("username");
  let email = document.getElementById("email");
  let phone = document.getElementById("phone");
  let password = document.getElementById("password");
  let confirm_password = document.getElementById("confirm_password");
  let terms = document.getElementById("terms");

  if (name.value.trim().length < 3) { alert("Username must be at least 3 characters long!"); return; }
  if (name.value.trim().length > 30) { alert("Username cannot be more than 30 characters!"); return; }

  let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value.trim())) { alert("Please enter a valid email address!"); return; }

  let phonePattern = /^[0-9]{10}$/;
  if (!phonePattern.test(phone.value.trim())) { alert("Please enter a valid phone number!"); return; }

  if (password.value.length < 8) { alert("Password must be at least 8 characters long!"); return; }
  if (password.value.length > 50) { alert("Password cannot be more than 50 characters!"); return; }

  let upperCase = /[A-Z]/, lowerCase = /[a-z]/, number = /[0-9]/;
  let specialCharacter = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`]/;

  if (!upperCase.test(password.value)) { alert("Password must contain at least one uppercase letter!"); return; }
  if (!lowerCase.test(password.value)) { alert("Password must contain at least one lowercase letter!"); return; }
  if (!number.test(password.value)) { alert("Password must contain at least one number!"); return; }
  if (!specialCharacter.test(password.value)) { alert("Password must contain at least one special character!"); return; }

  if (password.value !== confirm_password.value) { alert("Passwords do not match!"); return; }
  if (!terms.checked) { alert("Please accept the Terms & Conditions!"); return; }

  // Role is chosen later on role-selection.html
  let user = {
    username: name.value.trim(),
    useremail: email.value.trim(),
    userphone: phone.value.trim(),
    userpassword: password.value,
    role: "customer"
  };

  let get_user = localStorage.getItem("user");
  let user_array = [];

  if (get_user) {
    try {
      user_array = JSON.parse(get_user);
      if (!Array.isArray(user_array)) user_array = [];
    } catch (error) {
      console.error("Error reading users from localStorage:", error);
      user_array = [];
    }
  }

  let isPresent = user_array.some(
    u => u.useremail && u.useremail.toLowerCase() === email.value.trim().toLowerCase()
  );

  if (isPresent) { alert("User already exists!"); return; }

  user_array.push(user);
  localStorage.setItem("user", JSON.stringify(user_array));

  // Don't carry over a role from a previous account in this browser
  localStorage.removeItem("userRole");

  alert("Account created successfully! Please log in.");
  window.location.href = "login.html";
};


// ================= GOOGLE SIGN-IN =================

const GOOGLE_CLIENT_ID = "354423086263-a5p6thqr2udjam895sotpa701180cpp3.apps.googleusercontent.com";

function handleGoogleLogin(response) {
  const payload = parseJwt(response.credential);
  if (!payload) { alert("Google login failed!"); return; }

  const googleUser = {
    username: payload.name,
    useremail: payload.email,
    userphone: "",
    userpassword: "",
    role: "customer",
    googleId: payload.sub,
    profileImage: payload.picture || "../assets/google.png",
    loginMethod: "google"
  };

  let users = JSON.parse(localStorage.getItem("user")) || [];
  const index = users.findIndex(u => u.useremail?.toLowerCase() === googleUser.useremail.toLowerCase());

  if (index !== -1) {
    googleUser.userphone = users[index].userphone || "";
    // Don't overwrite an already-selected role
    googleUser.role = users[index].role || "customer";
    users[index] = { ...users[index], ...googleUser };
  } else {
    users.push(googleUser);
  }

  localStorage.setItem("user", JSON.stringify(users));

  const finalUser = index !== -1 ? users[index] : googleUser;

  localStorage.setItem("current_user", JSON.stringify(finalUser));
  localStorage.setItem("profileImage", finalUser.profileImage || "../assets/google.png");
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", finalUser.role);

  window.location.href = "index.html";
}

function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(
      decodeURIComponent(
        atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      )
    );
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
    cancel_on_tap_outside: true
  });

  google.accounts.id.renderButton(document.getElementById("google-btn"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: 350
  });
};


// ================= TERMS & CONDITIONS MODAL =================

document.addEventListener("DOMContentLoaded", function () {
  const backdrop = document.getElementById("modalBackdrop");
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const closeBtn2 = document.getElementById("closeModalBtn");
  const body = document.getElementById("modalBody");
  const jumpLinks = Array.from(document.querySelectorAll("#modalJump a"));
  const agreeCheck = document.getElementById("agreeCheck");
  const acceptBtn = document.getElementById("acceptBtn");

  if (!backdrop || !openBtn || !closeBtn || !closeBtn2 || !body || !agreeCheck || !acceptBtn) {
    console.warn("RentFlow Terms Modal: Required element missing.");
    return;
  }

  function openModal(event) {
    if (event) event.preventDefault();
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    body.scrollTop = 0;
    jumpLinks.forEach(link => link.classList.remove("active"));
    if (jumpLinks.length > 0) jumpLinks[0].classList.add("active");
  }

  function closeModal() {
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  closeBtn2.addEventListener("click", closeModal);

  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) closeModal();
  });

  jumpLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const blocks = jumpLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);

  body.addEventListener("scroll", function () {
    if (!blocks.length) return;

    let current = blocks[0];
    for (const block of blocks) {
      if (block.offsetTop - body.offsetTop <= body.scrollTop + 40) current = block;
    }

    jumpLinks.forEach(link => link.classList.remove("active"));
    const activeLink = jumpLinks.find(link => link.getAttribute("href") === "#" + current.id);
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });

  agreeCheck.addEventListener("change", () => {
    acceptBtn.disabled = !agreeCheck.checked;
  });

  acceptBtn.addEventListener("click", () => {
    if (!agreeCheck.checked) return;

    const termsCheckbox = document.getElementById("terms");
    if (termsCheckbox) {
      termsCheckbox.checked = true;
      termsCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    closeModal();
  });
});