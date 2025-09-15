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
    if(!u){ App.ui.toast('ユーザが見つかりません', 'bad'); return; }
    App.session.user = u;
    App.session.token = App.utils.randToken(24);
    App.ui.toast(`${u.username} としてログインしました`, 'good');
    App.ui.renderRoute();
  }

  function logout(){
    App.session = { user:null, token:null };
    App.ui.toast('ログアウトしました', 'warn');
    App.ui.renderRoute();
  }

  App.setMode = setMode;
  App.login = login;
  App.logout = logout;
})();
