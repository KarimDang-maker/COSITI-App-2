export const ok = (res, data, status = 200, meta) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data) => ok(res, data, 201);

export const page = (res, { items, total, page: p, pageSize }, extra = {}) =>
  ok(res, items, 200, { total, page: p, pageSize, pages: Math.ceil(total / pageSize), ...extra });

export const clientMeta = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });
