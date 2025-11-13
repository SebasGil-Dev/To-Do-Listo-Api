require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CORS (puedes ajustar dominios luego)
app.use(cors());
app.use(express.json());

// Cliente de Supabase (modo backend)
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

    // Devolvemos el access_token y el usuario
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
