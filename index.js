require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

/**
 * CORS: permitir peticiones desde el front (local y Netlify)
 * Para desarrollo usamos origin: '*' para no pelearnos.
 * Si luego quieres limitarlo, se ajusta fácil.
 */
app.use(cors({
  origin: '*', // <-- DEV: permite cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Manejo explícito de preflight
app.options('*', cors());

app.use(express.json());

// Cliente Supabase (modo backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ===============================
//   AUTENTICACIÓN
// ===============================

// Registro de usuario
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ user: data.user });
  } catch (err) {
    console.error('Error en /register:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Login de usuario
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.json({
      token: data.session.access_token,
      user: data.user,
    });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ===============================
//   TASKS ROUTER
// ===============================
const tasksRouter = require('./tasks');
app.use('/tasks', tasksRouter);

// ===============================
//   ARRANQUE DEL SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});
