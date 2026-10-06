// auth.js
window.App = window.App || {};
(function(){
  App.MODE = 'VULN';
  App.session = { user: null, token: null };

  function setMode(m){
    App.MODE = m === 'SECURE' ? 'SECURE' : 'VULN';
    App.ui?.renderRoute();
  }

  function login(userId){
    const u = App.DB.users.find(x=>x.id === Number(userId));
    if(!u){ App.ui.toast('userMissing', 'bad'); return; }
    let token;
    try { token = App.utils.randToken(24); }
    catch { App.ui.toast('randomError', 'bad'); return; }
    App.session = {user:u, token};
    App.progress.attempts = [];
    App.progress.alertActive = false;
    App.ui.resetEditors();
    App.ui.toast({key:'loggedIn',values:{user:u.username}}, 'good');
    App.ui.renderRoute();
  }

  function logout(){
    App.session = { user:null, token:null };
    App.progress.attempts = [];
    App.progress.alertActive = false;
    App.ui.resetEditors();
    App.ui.toast('loggedOut', 'warn');
    App.ui.renderRoute();
  }

  App.setMode = setMode;
  App.login = login;
  App.logout = logout;
})();
