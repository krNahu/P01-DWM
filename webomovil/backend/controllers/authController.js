const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const { username, password, nombre, correo, fecha } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevo = new Usuario({ 
            username, password: hashedPassword, nombre, correo, fechaNacimiento: fecha 
        });
        await nuevo.save();
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await Usuario.findOne({ username });
        if (!user) return res.json({ success: false, message: 'Usuario no existe' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.json({ success: false, message: 'Contraseña incorrecta' });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};