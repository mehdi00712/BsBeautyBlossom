// search.js — universal search by product name/brand on any page
// Safe to include on multiple pages; guarded against double initialization.

(function () {
  if (window.__SEARCH_INIT__) return;        // ✅ prevent double-binding
  window.__SEARCH_INIT__ = true;

  function norm(s) {
    return (s || '').toString().toLowerCase().trim();
  }

  function filterCards(q) {
    const query = norm(q);

    // Look through common grids used across the site
    const containers = [
      document.querySelector('#product-grid'),
      document.querySelector('#home-featured'),
      ...document.querySelectorAll('.product-grid')
    ].filter(Boolean);

    containers.forEach(grid => {
      const cards = grid.querySelectorAll('.product');
      let any = false;

      cards.forEach(card => {
        // Prefer explicit data attributes when available
        const name  = norm(card.getAttribute('data-name'));
        const brand = norm(card.getAttribute('data-brand'));
        const hay   = (name + ' ' + brand).trim() || norm(card.innerText);

        const show = !query || hay.includes(query);
        card.style.display = show ? '' : 'none';
        if (show) any = true;
      });

      // Optional "no results" message per grid
      let empty = grid.querySelector('.no-results');
      if (!any) {
        if (!empty) {
          empty = document.createElement('p');
          empty.className = 'no-results';
          empty.style.margin = '8px 0';
          empty.style.color  = '#9aa0aa';
          empty.textContent  = 'No products match your search.';
          grid.appendChild(empty);
        }
      } else if (empty) {
        empty.remove();
      }
    });
  }

  function init() {
    const input = document.getElementById('search-bar');
    if (!input) return; // page doesn't have a search bar

    const run = () => filterCards(input.value);

    // Filter as the user types
    input.addEventListener('input', run);

    // Apply once on load (useful if cards already exist)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      run();
    } else {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    }
    window.addEventListener('load', run, { once: true });

    // Expose a hook so product renderers can re-apply after dynamic loads
    window.applySearch = run;
  }

  init();
})();
