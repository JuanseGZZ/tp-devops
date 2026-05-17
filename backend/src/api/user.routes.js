const { Router } = require('express');
const userService = require('../services/user.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.use(authMiddleware);

function handleError(res, err) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
}

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const user = await userService.getMe(req.user.sub);
    res.json(user);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/users/search?q=texto
router.get('/search', async (req, res) => {
  try {
    const results = await userService.search(req.query.q, req.user.sub);
    res.json(results);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/users/friends
router.get('/friends', async (req, res) => {
  try {
    const data = await userService.getFriends(req.user.sub);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/users/friends/request
router.post('/friends/request', async (req, res) => {
  const { addresseeId } = req.body;
  if (!addresseeId) return res.status(400).json({ message: 'addresseeId es requerido.' });
  try {
    const friendship = await userService.sendFriendRequest(req.user.sub, addresseeId);
    res.status(201).json({ friendshipId: friendship.id, status: friendship.status });
  } catch (err) {
    handleError(res, err);
  }
});

// PATCH /api/users/friends/:friendshipId
router.patch('/friends/:friendshipId', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'status es requerido.' });
  try {
    const friendship = await userService.respondFriendRequest(
      req.params.friendshipId,
      req.user.sub,
      status
    );
    res.json({ friendshipId: friendship.id, status: friendship.status });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
