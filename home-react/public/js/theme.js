/**
 * ============================================================================
 * RENTFLOW - GLOBAL THEME MANAGER
 * ============================================================================
 * This script runs on every page to apply the user's saved theme preference.
 * The theme is stored in localStorage under the key "theme".
 * Supported values: "dark" (default), "light"
 *
 * It can be loaded in <head> or <body> — it handles both cases.
 */
(function () {
    function applyTheme() {
        var savedTheme = localStorage.getItem("theme") || "dark";
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
        }
    }

    // If body exists already, apply immediately
    if (document.body) {
        applyTheme();
    } else {
        // If loaded in <head>, wait for DOM to be ready
        document.addEventListener("DOMContentLoaded", applyTheme);
    }
})();
