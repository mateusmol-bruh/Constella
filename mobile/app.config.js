module.exports = ({ config }) => {
  if (process.env.CONSTELLA_DISTRIBUTION === '1') {
    let url;
    try { url = new URL(process.env.EXPO_PUBLIC_API_URL); } catch {}
    if (!url || url.protocol !== 'https:' || url.username || url.password ||
        url.search || url.hash || !['/', '/api', '/api/'].includes(url.pathname) ||
        /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(url.hostname) ||
        url.hostname.endsWith('.local')) {
      throw new Error('A distribuição exige EXPO_PUBLIC_API_URL com a origem HTTPS pública real da API.');
    }
  }
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  return { ...config,
    ...(process.env.GOOGLE_SERVICES_JSON ? { android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON } } : {}),
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
  };
};
