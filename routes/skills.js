const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 获取 SKILL.md 模板
router.get('/template', (req, res) => {
  const filePath = path.join(__dirname, '..', 'SKILL.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, data: content });
  } catch (e) {
    res.status(500).json({ error: '无法读取SKILL.md模板' });
  }
});

module.exports = router;
