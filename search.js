<script>
// search.js — filters visible product cards by name/brand text on ANY page
(function () {
  function norm(s) { return (s || '').toString().toLowerCase().trim(); }
  function filterCards(q) {
    const query = norm(q);
    const containers = [
      document.querySelector('#product-grid'),
      document.querySelector('#home-featured'),
      ...document.querySelectorAll('.product-grid')
    ].filter(Boolean);

    containers.forEach(grid => {
      const cards = grid.querySelectorAll('.product');
      let any = false;
      cards.forEach(card => {
        const name  = norm(card.getAttribute('data-name'));
        const brand = norm(card.getAttribute('data-brand'));
        const hay   = (name + ' ' + brand).trim() || norm(card.innerText);
        const show  = !query || hay.includes(query);
        card.style.display = show ? '' : 'none';
        if (show) any = true;
      });
      let empty = grid.querySelector('.no-results');
      if (!any) {
        if (!empty) {
          empty = document.createElement('p');
          empty.className = 'no-results';
          empty.style.margin = '8px 0'; empty.style.color = '#9aa0aa';
          empty.textContent = 'No products match your search.';
          grid.appendChild(empty);
        }
      } else if (empty) empty.remove();
    });
  }
  function init() {
    const input = document.getElementById('search-bar');
    if (!input) return;
    const run = () => filterCards(input.value);
    input.addEventListener('input', run);
    document.addEventListener('DOMContentLoaded', run);
    window.addEventListener('load', run);
    window.applySearch = run;
  }
  init();
})();
</script>
