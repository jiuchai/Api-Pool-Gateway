const { db } = require('../database');
const { formatDateTime } = require('../utils/helpers');

function validate(data) {
  if (!data.title || !data.title.trim()) throw { status: 400, message: '标题不能为空' };
  if (!data.content || !data.content.trim()) throw { status: 400, message: '内容不能为空' };
}

module.exports = {
  async getNotices({ page = 1, pageSize = 20, includeUnpublished = true }) {
    const skip = (page - 1) * pageSize;
    const query = includeUnpublished ? {} : { published: true };
    const total = await db.notices.count(query);
    const list = await db.notices.find(query).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(pageSize);
    return {
      notices: list.map(n => ({
        id: n._id, title: n.title, content: n.content,
        published: !!n.published, pinned: !!n.pinned,
        createdAt: formatDateTime(n.createdAt), updatedAt: formatDateTime(n.updatedAt),
      })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    };
  },

  async getPublishedNotices() {
    const list = await db.notices.find({ published: true }).sort({ pinned: -1, createdAt: -1 });
    return list.map(n => ({
      id: n._id, title: n.title, content: n.content,
      published: true, pinned: !!n.pinned,
      createdAt: formatDateTime(n.createdAt),
    }));
  },

  async createNotice(data) {
    validate(data);
    const now = Date.now();
    return await db.notices.insert({
      title: data.title.trim(),
      content: data.content.trim(),
      published: !!data.published,
      pinned: !!data.pinned,
      createdAt: now, updatedAt: now,
    });
  },

  async updateNotice(id, data) {
    validate(data);
    const existing = await db.notices.findOne({ _id: id });
    if (!existing) throw { status: 404, message: '公告不存在' };
    await db.notices.update({ _id: id }, { $set: {
      title: data.title.trim(),
      content: data.content.trim(),
      published: !!data.published,
      pinned: !!data.pinned,
      updatedAt: Date.now(),
    } });
    return await db.notices.findOne({ _id: id });
  },

  async deleteNotice(id) {
    const existing = await db.notices.findOne({ _id: id });
    if (!existing) throw { status: 404, message: '公告不存在' };
    await db.notices.remove({ _id: id }, {});
    return { message: '已删除' };
  },
};
