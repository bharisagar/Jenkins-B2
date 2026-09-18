const buildTime = document.querySelector('#build-time');

if (buildTime) {
  buildTime.textContent = new Date().toLocaleString();
}
