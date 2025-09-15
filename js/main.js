// main.js
window.App = window.App || {};
(function(){
  const modeSel = document.getElementById('mode');
  const themeToggle = document.getElementById('themeToggle');

  // Theme management
  let currentTheme = localStorage.getItem('theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);

    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
      themeToggle.textContent = '🌙';
      themeToggle.title = 'ダークモードに切り替え';
    } else {
      document.documentElement.classList.remove('light-mode');
      themeToggle.textContent = '☀️';
      themeToggle.title = 'ライトモードに切り替え';
    }
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // Initialize theme
  applyTheme(currentTheme);

  // Event listeners
  window.addEventListener('hashchange', ()=> App.ui.renderRoute());
  modeSel.addEventListener('change', ()=> App.setMode(modeSel.value));
  themeToggle.addEventListener('click', toggleTheme);

  (async function boot(){
    await App.loadDB();
    // 初期Login UI
    App.ui.renderLoginBox();
    // 初期モード表示
    App.ui.renderModeIndicator();
    // 初期画面
    App.ui.renderRoute();
    // モードセレクタ同期
    modeSel.value = App.MODE;
  })();
})();
