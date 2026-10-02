export function handleNavClick(e, targetPath) {
  if (!targetPath) return;

  // Anchor links like #features, #how-it-works
  if (targetPath.startsWith('#')) {
    const el = document.querySelector(targetPath);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  // Do NOT e.preventDefault() for page links (login.html, signup.html, etc.)
  // Native browser navigation will cleanly open the target html page without URL corruption or loops.
}
