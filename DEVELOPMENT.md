# IDOR Clinic - 開発者向け技術文書

## 概要

IDOR Clinicは、教育目的のIDOR脆弱性シミュレーターです。本文書では、実装で使用されている技術的な仕組み、アーキテクチャー、アルゴリズムについて詳述します。

## 目次

1. [アーキテクチャー概要](#アーキテクチャー概要)
2. [カスタムUI フレームワーク](#カスタムuiフレームワーク)
3. [ページ生成システム](#ページ生成システム)
4. [モード切替システム](#モード切替システム)
5. [認証・認可シミュレーション](#認証認可シミュレーション)
6. [スコアリングアルゴリズム](#スコアリングアルゴリズム)
7. [テーマシステム](#テーマシステム)
8. [アコーディオンUI](#アコーディオンui)
9. [データ管理](#データ管理)
10. [セキュリティ考慮事項](#セキュリティ考慮事項)

---

## アーキテクチャー概要

### 全体構成

```
IDOR Clinic
├── index.html          # エントリーポイント
├── style.css           # CSSテーマシステム
├── js/
│   ├── main.js         # アプリケーション初期化
│   ├── utils.js        # カスタムDOM操作ユーティリティ
│   ├── ui.js           # ページ生成・UI管理
│   ├── auth.js         # 認証シミュレーション
│   ├── api.js          # API エンドポイントシミュレーション
│   └── data.js         # データ管理
└── data/
    ├── users.json      # ユーザーデータ
    ├── orders.json     # 注文データ
    └── messages.json   # メッセージデータ
```

### 設計原則

1. **フレームワークレス**: React/Vueなどを使わず、Vanilla JavaScriptで実装
2. **クライアントサイド完結**: サーバーサイドなし、全処理がブラウザー内で完結
3. **教育特化**: セキュリティ学習に最適化されたUI/UX
4. **レスポンシブ**: モバイル・デスクトップ対応

---

## カスタムUIフレームワーク

### U.el() - DOM生成ユーティリティ

IDOR Clinicの核となるのは、`utils.js`で定義された`U.el()`関数です。これはReactのJSXライクな記法でDOMを生成する独自フレームワークです。

#### 基本構文

```javascript
U.el(tagName, attributes, children)
```

#### 実装詳細

```javascript
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);

  // 属性設定
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k === 'disabled') {
      if (v) e.setAttribute('disabled', '');
    } else if (k.startsWith('on')) {
      e[k] = v;  // イベントハンドラー
    } else {
      e.setAttribute(k, v);
    }
  }

  // 子要素追加
  if (Array.isArray(children)) {
    children.filter(Boolean).forEach(child => {
      if (typeof child === 'string') {
        e.appendChild(document.createTextNode(child));
      } else {
        e.appendChild(child);
      }
    });
  } else if (children) {
    e.appendChild(document.createTextNode(String(children)));
  }

  return e;
}
```

#### 使用例

```javascript
// 複雑なUIコンポーネント
U.el('div', {class: 'card'}, [
  U.el('h3', {}, 'タイトル'),
  U.el('p', {style: 'color: var(--muted);'}, '説明文'),
  U.el('button', {
    class: 'btn',
    onclick: () => console.log('クリック')
  }, 'ボタン')
])
```

### 利点

1. **軽量**: フレームワーク不要、数十行のコード
2. **直感的**: HTML構造がJavaScriptコードから読み取れる
3. **柔軟性**: 動的な属性・イベント処理が簡単
4. **デバッグ**: ブラウザー標準のDOM APIを直接使用

---

## ページ生成システム

### ハッシュベースルーティング

GitHub Pagesでの動作を考慮し、ハッシュベースルーティングを採用。

```javascript
function renderRoute() {
  const h = location.hash || '#/';
  let node;

  if (h.startsWith('#/app')) node = appPage();
  else if (h.startsWith('#/compare')) node = comparePage();
  else if (h.startsWith('#/learn')) node = learnPage();
  else node = homePage();

  root.innerHTML = '';
  root.appendChild(node);
}

window.addEventListener('hashchange', () => App.ui.renderRoute());
```

### ページファクトリーパターン

各ページは独立した関数として実装され、DOMノードを返します。

```javascript
function homePage() {
  const wrap = U.el('div', {class: 'grid', style: 'grid-template-columns: 1fr; gap:14px;'});

  // ページコンテンツの構築
  wrap.appendChild(U.el('div', {class: 'card'}, [
    U.el('h3', {}, 'ようこそ — IDOR Clinic 🏥'),
    // ... コンテンツ
  ]));

  return wrap;
}
```

### コンポーネント指向設計

再利用可能なUIコンポーネントを関数として定義。

```javascript
function helpIcon(helpText) {
  return U.el('span', {class: 'help-tooltip'}, [
    U.el('span', {class: 'help-icon'}, '?'),
    U.el('span', {class: 'help-tooltiptext'}, helpText)
  ]);
}
```

---

## モード切替システム

### VULN vs SECURE の実装

```javascript
let MODE = 'VULN';

function setMode(newMode) {
  MODE = newMode;
  renderModeIndicator();
  // UIの再描画
}

// API レスポンスがモードによって変化
function getProfile(query) {
  if (MODE === 'SECURE') {
    // 認可チェック実装
    if (!session.user || query.userId !== session.user.id) {
      return {status: 403, error: 'Forbidden'};
    }
  }
  // VULN モードでは認可チェックなし
  return {status: 200, data: findUser(query.userId)};
}
```

### モード別ロジック

1. **VULNモード**: 認可チェックなし、IDOR攻撃が成功
2. **SECUREモード**: 適切な認可チェック、攻撃をブロック

---

## 認証・認可シミュレーション

### セッション管理

```javascript
const session = {
  user: null,
  token: null,
  loginTime: null
};

function login(username) {
  const user = users.find(u => u.name === username);
  if (user) {
    session.user = user;
    session.token = generateToken();
    session.loginTime = Date.now();
    return {success: true, user, token: session.token};
  }
  return {success: false, error: 'User not found'};
}
```

### 権限チェックアルゴリズム

```javascript
function checkOwnership(resourceOwnerId, currentUserId) {
  if (MODE === 'VULN') {
    return true; // 常に許可（脆弱）
  }

  if (MODE === 'SECURE') {
    return resourceOwnerId === currentUserId; // 所有者チェック
  }
}
```

---

## スコアリングアルゴリズム

### 得点計算

```javascript
function trackAttempt(type, targetId) {
  if (MODE === 'VULN' && session.user) {
    const isOwnResource = checkIfOwnResource(type, targetId);
    if (!isOwnResource) {
      // 他人のリソースへの攻撃成功
      score += 100;
      logAttackSuccess(type, targetId);
    }
  }
}

function useHint() {
  score = Math.max(0, score - 30); // ヒント使用でペナルティ
}
```

### ログシステム

```javascript
function pushLog(logEntry) {
  logs.unshift({
    time: new Date().toLocaleTimeString(),
    ...logEntry
  });

  // 最新12件のみ保持
  if (logs.length > 12) {
    logs = logs.slice(0, 12);
  }
}
```

---

## テーマシステム

### CSS カスタムプロパティによる実装

```css
:root {
  --bg: #0b0e14;
  --panel: #11161f;
  --text: #e8eef9;
  --accent: #66d9ef;
  /* ... */
}

:root.light-mode {
  --bg: #ffffff;
  --panel: #f8f9fa;
  --text: #212529;
  --accent: #0066cc;
  /* ... */
}
```

### JavaScript によるテーマ切替

```javascript
function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);

  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
    themeToggle.textContent = '🌙';
  } else {
    document.documentElement.classList.remove('light-mode');
    themeToggle.textContent = '☀️';
  }
}
```

### 利点

- **一元管理**: 全ての色をCSS変数で管理
- **パフォーマンス**: CSSクラス1つの変更で全体のテーマが切り替わる
- **永続化**: localStorage でユーザー設定を保存

---

## アコーディオンUI

### 動的コンポーネント生成

```javascript
function createAccordion(title, id, content) {
  return U.el('div', {class: 'accordion'}, [
    U.el('button', {
      class: 'accordion-header',
      onclick: `toggleAccordion('${id}')`
    }, [
      U.el('span', {}, title),
      U.el('span', {class: 'accordion-icon'}, '▼')
    ]),
    U.el('div', {
      class: 'accordion-content',
      id: `accordion-${id}`
    }, content)
  ]);
}

window.toggleAccordion = function(id) {
  const content = document.getElementById(`accordion-${id}`);
  const header = content.previousElementSibling;

  content.classList.toggle('active');
  header.classList.toggle('active');
}
```

### CSSアニメーション

```css
.accordion-icon {
  transition: transform 0.2s ease;
}

.accordion-header.active .accordion-icon {
  transform: rotate(180deg);
}

.accordion-content {
  display: none;
}

.accordion-content.active {
  display: block;
}
```

---

## データ管理

### JSON ファイルによるデータ駆動

```javascript
// 非同期データ読み込み
async function loadDB() {
  const [usersRes, ordersRes, messagesRes] = await Promise.all([
    fetch('./data/users.json'),
    fetch('./data/orders.json'),
    fetch('./data/messages.json')
  ]);

  users = await usersRes.json();
  orders = await ordersRes.json();
  messages = await messagesRes.json();
}
```

### データ構造設計

```javascript
// users.json
[
  {
    "id": 1001,
    "name": "Alice",
    "email": "alice@example.com",
    "role": "user"
  }
]

// orders.json
[
  {
    "id": "ORD-000101",
    "ownerId": 1001,
    "items": [...],
    "total": 1200
  }
]
```

### データモデル（擬似）

```typescript
type User = {
  id: number;           // 1001, 1002, 1003...
  username: string;     // alice, bob, carol...
  name: string;
  email: string;
  role: 'user' | 'admin';
};

type Order = {
  id: string;           // 'ORD-000123'（VULN） / 'tok_p2Yw6Q...'（SECURE）
  ownerId: number;      // User.id
  items: { sku:string; name:string; qty:number; price:number }[];
  total: number;
};

type Message = {
  id: number;           // 9001, 9002...
  senderId: number;
  recipientId: number;  // 所有者チェック対象
  subject: string;
  body: string;
  createdAt: string;
};
```

**シードデータ**: Alice(1001), Bob(1002), Carol(1003) 各3件の注文/メッセージ

**ID性質**:
- **VULN**: 連番・連続・推測可能
- **SECURE**: ランダム・不可視・間接参照必須

---

## セキュリティ考慮事項

### XSS 対策

```javascript
// テキストノードとして安全に挿入
if (typeof child === 'string') {
  e.appendChild(document.createTextNode(child));
}

// innerHTML は意図的な場合のみ使用
if (k === 'innerHTML') e.innerHTML = v;
```

### データ検証

```javascript
function sanitizeInput(input) {
  return String(input).trim().slice(0, 100); // 長さ制限
}

function validateUserId(userId) {
  return Number.isInteger(userId) && userId > 0;
}
```

### クライアントサイド制限

- すべての処理がクライアントサイドで完結
- 実際のサーバーへの通信なし
- ローカルストレージのみ使用（機密情報なし）

---

## パフォーマンス最適化

### 効率的なDOM操作

```javascript
// DocumentFragment による一括挿入
function appendChildren(parent, children) {
  const fragment = document.createDocumentFragment();
  children.forEach(child => fragment.appendChild(child));
  parent.appendChild(fragment);
}
```

### 遅延読み込み

```javascript
// ページが表示される時点でコンテンツ生成
function renderRoute() {
  // 必要な時点でページを生成
  const node = getCurrentPage();
  root.innerHTML = '';
  root.appendChild(node);
}
```

### メモリ管理

```javascript
// イベントリスナーの適切な管理
function cleanup() {
  // 古いイベントリスナーを削除
  root.innerHTML = '';
}
```

---

## 開発・拡張のガイドライン

### 新しいページの追加

1. `ui.js` に新しいページ関数を作成
2. `renderRoute()` にルーティングを追加
3. ナビゲーションにリンクを追加

```javascript
function newPage() {
  return U.el('div', {class: 'grid'}, [
    // ページコンテンツ
  ]);
}

// renderRoute() に追加
else if (h.startsWith('#/new')) node = newPage();
```

### 新しいコンポーネントの作成

```javascript
function newComponent(props) {
  return U.el('div', {class: 'component'}, [
    U.el('h3', {}, props.title),
    U.el('p', {}, props.description)
  ]);
}
```

### スタイルの追加

```css
.new-component {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}
```

---

## 技術的な特徴・革新点

### 1. ミニマリスト フレームワーク

- **従来**: React (42KB) + React DOM (130KB)
- **IDOR Clinic**: カスタムU.el() (< 1KB)

### 2. 宣言的UI構築

```javascript
// React JSX ライク
U.el('div', {class: 'card'}, [
  U.el('h3', {}, title),
  U.el('p', {}, description)
])
```

### 3. CSS-in-JS 風スタイリング

```javascript
U.el('div', {
  style: 'display: flex; gap: 12px; padding: 16px;'
}, content)
```

### 4. 関数型コンポーネント

```javascript
const Button = (text, onClick) =>
  U.el('button', {class: 'btn', onclick: onClick}, text);
```

### 5. 状態管理

```javascript
// グローバル状態
let MODE = 'VULN';
let session = {user: null};
let score = 0;

// 状態変更時の再描画
function updateUI() {
  renderModeIndicator();
  renderLoginBox();
  renderLogBox();
}
```

---

## 今後の拡張可能性

### 1. 追加の脆弱性タイプ

- SQL Injection シミュレーター
- XSS デモンストレーション
- CSRF 攻撃体験

### 2. 高度な認証メカニズム

- JWT トークン管理
- OAuth フロー シミュレーション
- 多要素認証

### 3. リアルタイム機能

- WebSocket による攻撃検知
- 複数ユーザーでの協調学習

### 4. 分析機能

- 学習進捗の可視化
- 攻撃パターンの分析
- レポート生成

---

## まとめ

IDOR Clinicは、教育目的に特化した軽量で効率的なWebアプリケーションです。フレームワークレスでありながら、現代的なコンポーネント指向の開発パターンを採用し、保守性と拡張性を両立しています。

独自のDOM操作ユーティリティ `U.el()` により、直感的で読みやすいコードを実現し、CSSカスタムプロパティによるテーマシステムで優れたユーザー体験を提供しています。

本文書が、IDOR Clinicの理解と今後の発展に寄与することを期待します。