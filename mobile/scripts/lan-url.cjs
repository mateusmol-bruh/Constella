function lanUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {}
  if (
    !u ||
    u.protocol !== 'http:' ||
    u.port !== '3000' ||
    !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !['/', '/api', '/api/'].includes(u.pathname)
  )
    throw new Error(
      'O APK local exige EXPO_PUBLIC_API_URL=http://IPv4_PRIVADO_DO_PC:3000, sem credenciais.',
    );
  return u.origin;
}
module.exports = { lanUrl };
