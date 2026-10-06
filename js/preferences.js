// Runs before the stylesheet so the saved theme is applied before first paint.
window.App = window.App || {};
(function(){
  const preferences = {language:'en',theme:'light',storage:true};
  let language, theme;
  try {
    language=localStorage.getItem('idor-clinic.language');
    theme=localStorage.getItem('idor-clinic.theme') || localStorage.getItem('theme');
  } catch { preferences.storage=false; }
  const query = new URLSearchParams(location.search).get('lang');
  preferences.language = ['ja','en'].includes(query) ? query : ['ja','en'].includes(language) ? language
    : navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  preferences.theme = ['light','dark'].includes(theme) ? theme
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.classList.toggle('light-mode',preferences.theme==='light');
  document.documentElement.lang=preferences.language;
  App.preferences=preferences;
  App.savePreference=(key,value)=>{
    try { localStorage.setItem(`idor-clinic.${key}`,value); }
    catch { preferences.storage=false; }
  };
})();
