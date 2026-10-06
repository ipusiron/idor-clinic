window.App = window.App || {};
(function(){
  function t(key, values={}){
    const text=App.messages[App.preferences.language][key];
    if(typeof text !== 'string') throw new Error(`Missing translation: ${key}`);
    return text.replace(/\{([a-z]+)\}/gi,(_,name)=>String(values[name] ?? `{${name}}`));
  }
  function staticText(){
    document.documentElement.lang=App.preferences.language;
    document.querySelectorAll('[data-i18n]').forEach(e=>{ e.textContent=t(e.dataset.i18n); });
    document.getElementById('language').value=App.preferences.language;
    const toggle=document.getElementById('themeToggle');
    toggle.title=t(App.preferences.theme==='dark'?'light':'dark');
    toggle.setAttribute('aria-label',toggle.title);
    const note=document.getElementById('storageNote');
    note.hidden=App.preferences.storage;
    note.textContent=t('storage');
  }
  function setLanguage(lang){
    if(!['ja','en'].includes(lang)) return;
    App.preferences.language=lang;
    App.savePreference('language',lang);
    // Keep explicit language links and reload behavior consistent with the user's choice.
    const url=new URL(location.href);
    if(url.searchParams.has('lang')){
      url.searchParams.set('lang',lang);
      try { history.replaceState(null,'',url.href); } catch { /* file origins may restrict history */ }
    }
    staticText();
    App.ui.clearToast();
    if(App.DB) App.ui.renderRoute();
  }
  App.i18n={t,staticText,setLanguage};
})();
