require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Calea către fișierul JSON pentru utilizatori
const usersFilePath = path.join(__dirname, 'users.json');

// Funcție pentru a citi utilizatorii din fișier
function readUsers() {
  if (!fs.existsSync(usersFilePath)) {
    // Dacă fișierul nu există, returnăm un array gol
    return [];
  }
  const data = fs.readFileSync(usersFilePath, 'utf-8');
  return JSON.parse(data);
}

// Funcție pentru a scrie utilizatorii în fișier
function writeUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

// Ruta principală (testare)
app.get('/', (req, res) => {
  res.send('WELCOME to BUG MANAGEMENT API!');
});

// Endpoint pentru înregistrare
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  // Citește utilizatorii existenți
  const users = readUsers();

  // Verifică dacă utilizatorul există deja
  const userExists = users.find(user => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  // Hash-uiește parola
  const hashedPassword = await bcrypt.hash(password, 10);

  // Creează un utilizator nou
  const newUser = { id: users.length + 1, email, password: hashedPassword };
  users.push(newUser);

  // Salvează utilizatorii actualizați în fișier
  writeUsers(users);

  res.status(201).json({ message: 'User registered successfully' });
});

// Endpoint pentru autentificare
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Citește utilizatorii existenți
  const users = readUsers();

  // Găsește utilizatorul după email
  const user = users.find(user => user.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Verifică parola
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generează token-ul JWT
  const secretKey = process.env.JWT_SECRET || 'defaultSecretKey'; // Adaugă cheia secretă aici
  const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });

  res.status(200).json({ token }); // Returnează token-ul generat
});


// Middleware pentru autentificare
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // Adaugă informațiile utilizatorului la request
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Rută protejată pentru testare
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

// Pornirea serverului
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
