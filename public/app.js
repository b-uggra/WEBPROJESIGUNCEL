const root = document.getElementById('root');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// ——— Init ———
window.addEventListener('DOMContentLoaded', init);
function init(){
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
  document.getElementById('btn-logout').style.display = currentUser ? 'inline-block' : 'none';
  if(currentUser) loadPolls();
  else showRegister();
}

// ——— Navbar eventleri ———
document.getElementById('brand').onclick = e => { e.preventDefault(); init(); };
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('currentUser');
  currentUser = null;
  init();
};

// ——— Register View ———
function showRegister(){
  root.innerHTML = `
    <h3>Kayıt Ol</h3>
    <form id="regForm">
      <input id="r-user" class="form-control mb-2" placeholder="Kullanıcı Adı" required>
      <input id="r-email" class="form-control mb-2" placeholder="E-posta" required>
      <input id="r-pass"  type="password" class="form-control mb-2" placeholder="Şifre" required>
      <button class="btn btn-primary">Kayıt Ol</button>
      <p class="mt-3">Zaten üye misiniz? <a href="#" id="toLogin">Giriş Yap</a></p>
    </form>`;
  document.getElementById('regForm').onsubmit = async e => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        username: document.getElementById('r-user').value.trim(),
        email:    document.getElementById('r-email').value.trim(),
        password: document.getElementById('r-pass').value
      })
    });
    if(res.status===201){
      alert('Kayıt başarılı. Giriş sayfasına yönlendiriliyorsunuz.');
      showLogin();
    } else alert('Kayıt hatası');
  };
  document.getElementById('toLogin').onclick = e => { e.preventDefault(); showLogin(); };
}

// ——— Login View ———
function showLogin(){
  root.innerHTML = `
    <h3>Giriş Yap</h3>
    <form id="loginForm">
      <input id="l-user" class="form-control mb-2" placeholder="Kullanıcı Adı" required>
      <input id="l-pass" type="password" class="form-control mb-2" placeholder="Şifre" required>
      <button class="btn btn-success">Giriş Yap</button>
      <p class="mt-3">Hesabınız yok mu? <a href="#" id="toReg">Kayıt Ol</a></p>
    </form>`;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        username: document.getElementById('l-user').value.trim(),
        password: document.getElementById('l-pass').value
      })
    });
    if(res.ok){
      const { username } = await res.json();
      localStorage.setItem('currentUser', JSON.stringify(username));
      init();
    } else alert('Giriş hatası');
  };
  document.getElementById('toReg').onclick = e => { e.preventDefault(); showRegister(); };
}

// ——— Anket Listesi ———
async function loadPolls(){
  const polls = await fetch('/api/polls').then(r=>r.json());
  let html = `
    <div class="d-flex justify-content-between align-items-center">
      <h3>Anket Listesi</h3>
      <button class="btn btn-success" onclick="showAdd()">Anket Ekle</button>
    </div>
    <ul class="list-group mt-3">`;
  polls.forEach(p=> html+=`
    <li class="list-group-item d-flex justify-content-between">
      ${p.question}
      <button class="btn btn-primary btn-sm" onclick="showPoll('${p.id}')">Oy Ver</button>
    </li>`);
  html+=`</ul>`;
  root.innerHTML = html;
}

// ——— Tek Anket Görünümü ———
async function showPoll(id){
  const p = await fetch(`/api/polls/${id}`).then(r=>r.json());
  let html = `<h4>${p.question}</h4><form id="voteF">`;
  p.options.forEach((o,i)=> html+=`
    <div class="form-check">
      <input class="form-check-input" type="radio" name="opt" value="${i}" required>
      <label class="form-check-label">${o}</label>
    </div>`);
  html+=`</form>
    <button class="btn btn-success mt-2" onclick="submitVote('${id}')">Oyumu Gönder</button>
    <button class="btn btn-link mt-2" onclick="loadPolls()">Geri</button>`;
  root.innerHTML = html;
}

// ——— Oy Gönder ———
async function submitVote(id){
  const idx = document.querySelector('input[name="opt"]:checked').value;
  const res = await fetch(`/api/polls/${id}/vote`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:currentUser, optionIndex:Number(idx) })
  });
  if(res.ok) showResults(id);
  else {
    const msg = await res.text().catch(()=> '');
    alert(msg);
  }
}

// ——— Sonuçları Göster ———
async function showResults(id){
  const { counts } = await fetch(`/api/results/${id}`).then(r=>r.json());
  const p = await fetch(`/api/polls/${id}`).then(r=>r.json());
  let html = `<h4>${p.question} - Sonuçlar</h4><ul class="list-group">`;
  p.options.forEach((o,i)=> html+=`
    <li class="list-group-item d-flex justify-content-between">
      ${o}<span class="badge bg-primary">${counts[i]}</span>
    </li>`);
  html+=`</ul><button class="btn btn-link mt-2" onclick="loadPolls()">Geri</button>`;
  root.innerHTML = html;
}

// ——— Yeni Anket Ekle ———
function showAdd(){
  root.innerHTML = `
    <h3>Yeni Anket Oluştur</h3>
    <form id="addF">
      <input id="q" class="form-control mb-2" placeholder="Soru" required>
      <div id="optWr">
        <input class="form-control mb-2 optIn" placeholder="Seçenek 1" required>
        <input class="form-control mb-2 optIn" placeholder="Seçenek 2" required>
      </div>
      <button type="button" class="btn btn-link" onclick="addOpt()">Seçenek Ekle</button><br>
      <button class="btn btn-primary mt-2">Oluştur</button>
      <button class="btn btn-secondary mt-2" onclick="loadPolls();return false;">İptal</button>
    </form>`;
  document.getElementById('addF').onsubmit = async e=>{
    e.preventDefault();
    const question = document.getElementById('q').value.trim();
    const options = Array.from(document.querySelectorAll('.optIn'))
                         .map(i=>i.value.trim());
    const res = await fetch('/api/polls',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question, options })
    });
    if(res.ok) loadPolls();
    else alert('Anket oluşturma hatası');
  };
}

function addOpt(){
  const wr = document.getElementById('optWr');
  const inp = document.createElement('input');
  inp.className = 'form-control mb-2 optIn';
  inp.placeholder = `Seçenek ${wr.children.length+1}`;
  inp.required = true;
  wr.appendChild(inp);
}