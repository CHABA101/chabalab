fetch('assets/partials/header.html')
  .then(r => r.text())
  .then(html => document.getElementById('header').innerHTML = html);

function toggleMenu() {
  document.getElementById('nav-menu').classList.toggle('active');
}