const express = require('express');
const path    = require('path');
const fs      = require('fs').promises;

const app   = express();
const DATA  = path.join(__dirname, 'data');
const USERS = path.join(DATA, 'users.json');
const POLLS = path.join(DATA, 'polls.json');
const VOTES = path.join(DATA, 'votes.json');

// ——— Başlangıç (JSON dosyaları) ———
;(async()=>{
  try{ await fs.mkdir(DATA) }catch{}
  try{ await fs.access(USERS) }catch{ await fs.writeFile(USERS,'[]') }
  try{ await fs.access(POLLS) }
  catch{
    const ps = Array.from({length:10},(_,i)=>({
      id:`${i+1}`,
      question:`Anket ${i+1} sorusu`,
      options:['Seçenek A','Seçenek B','Seçenek C','Seçenek D']
    }));
    await fs.writeFile(POLLS, JSON.stringify(ps,null,2));
  }
  try{ await fs.access(VOTES) }
  catch{
    const ps = JSON.parse(await fs.readFile(POLLS,'utf8'));
    const v  = {};
    ps.forEach(p=>v[p.id]=p.options.map(_=>0));
    await fs.writeFile(VOTES, JSON.stringify(v,null,2));
  }
})();

// ——— Middleware ———
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

// ——— Kayıt ———
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  const users = JSON.parse(await fs.readFile(USERS,'utf8'));
  if (users.some(u=>u.username===username)) {
    return res.status(409).send('Kullanıcı adı dolu');
  }
  users.push({ username, email, password, votes: [] });
  await fs.writeFile(USERS, JSON.stringify(users,null,2));
  res.sendStatus(201);
});

// ——— Giriş ———
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(await fs.readFile(USERS,'utf8'));
  const u = users.find(u=>u.username===username && u.password===password);
  if (!u) return res.status(401).send('Hatalı kullanıcı veya şifre');
  // Başarılı ise kullanıcı adını dönüyoruz
  res.json({ username });
});

// ——— Anket Listesi ———
app.get('/api/polls', async (req, res) => {
  const ps = JSON.parse(await fs.readFile(POLLS,'utf8'));
  res.json(ps);
});

// ——— Tek Anket ———
app.get('/api/polls/:id', async (req, res) => {
  const ps = JSON.parse(await fs.readFile(POLLS,'utf8'));
  const p = ps.find(p=>p.id===req.params.id);
  if (!p) return res.sendStatus(404);
  res.json(p);
});

// ——— Yeni Anket Oluştur ———
app.post('/api/polls', async (req, res) => {
  const { question, options } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).send('En az 2 seçenek ve soru gerekli');
  }
  const ps = JSON.parse(await fs.readFile(POLLS,'utf8'));
  const newId = String(Math.max(...ps.map(p=>+p.id)) + 1);
  ps.push({ id:newId, question, options });
  await fs.writeFile(POLLS, JSON.stringify(ps,null,2));

  const votes = JSON.parse(await fs.readFile(VOTES,'utf8'));
  votes[newId] = options.map(_=>0);
  await fs.writeFile(VOTES, JSON.stringify(votes,null,2));

  res.status(201).json({ id:newId, question, options });
});

// ——— Oylama ———
app.post('/api/polls/:id/vote', async (req, res) => {
  const { username, optionIndex } = req.body;
  if (!username) return res.status(401).send('Önce giriş yapın');
  const users = JSON.parse(await fs.readFile(USERS,'utf8'));
  const votes = JSON.parse(await fs.readFile(VOTES,'utf8'));
  const u = users.find(u=>u.username===username);
  if (!u) return res.status(401).send('Geçersiz kullanıcı');

  u.votes = u.votes||[];
  if (u.votes.includes(req.params.id)) {
    return res.status(403).send('Zaten oy kullandınız');
  }
  votes[req.params.id][optionIndex] += 1;
  u.votes.push(req.params.id);

  await fs.writeFile(VOTES, JSON.stringify(votes,null,2));
  await fs.writeFile(USERS, JSON.stringify(users,null,2));
  res.sendStatus(201);
});

// ——— Sonuçlar ———
app.get('/api/results/:id', async (req, res) => {
  const votes = JSON.parse(await fs.readFile(VOTES,'utf8'));
  res.json({ counts: votes[req.params.id]||[] });
});

// ——— Sunucu Başlat ———
const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log(`Sunucu http://localhost:${PORT}`));