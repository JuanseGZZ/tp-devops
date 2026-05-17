const { Router } = require('express');
const chatService = require('../services/chat.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.use(authMiddleware);

function handleError(res, err) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
}

// GET /api/chats
router.get('/', async (req, res) => {
  try {
    const chats = await chatService.getChatsForUser(req.user.sub);
    res.json(chats);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/chats  — abre (o crea) un DM con targetUserId
router.post('/', async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ message: 'targetUserId es requerido.' });
  try {
    const chat = await chatService.openDirectChat(req.user.sub, targetUserId);
    res.status(201).json({ id: chat.id, isGroup: chat.isGroup });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/chats/:chatId/messages[?after=ISO]
router.get('/:chatId/messages', async (req, res) => {
  const after = req.query.after || null;
  try {
    const messages = await chatService.getMessages(req.params.chatId, req.user.sub, after);
    res.json(messages);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/chats/:chatId/messages
router.post('/:chatId/messages', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'content es requerido.' });
  try {
    const message = await chatService.sendMessage(req.params.chatId, req.user.sub, content);
    res.status(201).json(message);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
