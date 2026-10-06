window.App = window.App || {};
(function(){
  const mode=document.getElementById('mode');
  const theme=document.getElementById('themeToggle');
  let failed=false;
  function applyTheme(){
    document.documentElement.classList.toggle('light-mode',App.preferences.theme==='light');
    theme.textContent=App.preferences.theme==='light'?'🌙':'☀️';
    App.i18n.staticText();
  }
  applyTheme();
  window.addEventListener('hashchange',()=>App.ui.renderRoute());
  mode.disabled=true;
  mode.addEventListener('change',()=>{if(App.DB) App.setMode(mode.value);});
  theme.addEventListener('click',()=>{
    App.preferences.theme=App.preferences.theme==='light'?'dark':'light';
    App.savePreference('theme',App.preferences.theme);applyTheme();
  });
  document.getElementById('language').addEventListener('change',e=>{
    App.i18n.setLanguage(e.target.value);
    if(failed) document.getElementById('app').textContent=App.i18n.t('bootError');
  });
  (async function boot(){
    try {await App.loadDB();}
    catch {
      failed=true;
      document.getElementById('app').textContent=App.i18n.t('bootError');
      return;
    }
    App.ui.resetEditors();
    mode.disabled=false;
    App.ui.renderRoute();
  })();
})();
