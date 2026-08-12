const { Router } = require('express');
const { registerUserSchema, loginSchema } = require('../utils/validators');
const { register, login } = require('../controllers/userController');

const router = Router();

router.post('/register', (req, res, next) => {
  const parsed = registerUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  next();
}, register);

router.post('/login', (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  next();
}, login);

module.exports = router;
