const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Cliente solo para AUTENTICAR el token (no para hacer consultas con RLS)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware de autenticación + cliente Supabase con el JWT
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido.' });
    }

    // 1) Validar el token y obtener el usuario
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // 2) Crear un cliente Supabase que envíe este token en cada request
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Guardamos usuario y cliente en el request
    req.user = data.user;
    req.supabase = supabase;

    next();
  } catch (err) {
    console.error('Error en authMiddleware:', err);
    return res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

// Crear tarea
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const { user, supabase } = req;

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio.' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description: description || '',
          completed: false,
          user_id: user.id, // debe cumplir con la policy user_id = auth.uid()
        },
      ])
      .select(); // opcional, para devolver la fila creada

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Error al crear tarea:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Listar tareas del usuario autenticado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { user, supabase } = req;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Error al obtener tareas:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Actualizar tarea
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;
    const { user, supabase } = req;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) updateData.completed = completed;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id); // asegura que solo edite sus propias tareas

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Eliminar tarea
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { user, supabase } = req;

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // solo borra tareas del usuario

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
