function verifyAdminToken(req, res, next) {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword === 'docnest-admin-2024') {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
}

module.exports = verifyAdminToken;
