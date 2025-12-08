// src/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.isAuthenticated = (req, res, next) => {
    // Buscamos el token en las cookies del header
    let token = req.cookies.session_user; 
    
    // Si no está ahí, miramos si viene como 'Authorization: Bearer ...' (opcional)
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No hay token.' });
    }

    try {
        // Verificamos que el token sea válido con la misma clave secreta del login
        const verified = jwt.verify(token, process.env.SESSION_SECRET || 'SECRET_KEY_SUPER_SECRETA');
        req.user = verified;
        next(); // ¡Pase usted!
    } catch (error) {
        res.status(400).json({ error: 'Token no válido o expirado' });
    }
};