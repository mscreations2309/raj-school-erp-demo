import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rny_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const actAs = localStorage.getItem('rny_act_school');
  if (actAs) config.headers['x-school-id'] = actAs;
  const site = sessionStorage.getItem('rny_site');
  if (site && config.url?.startsWith('/public')) config.headers['x-tenant'] = site;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('rny_token') && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('rny_token');
      if (location.pathname.startsWith('/app') || location.pathname.startsWith('/platform')) location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) => {
  const d = e?.response?.data;
  if (d?.details && Array.isArray(d.details)) return `${d.error}: ${d.details.join('; ')}`;
  return d?.error || e?.message || 'Something went wrong';
};

/** Download a CSV/file endpoint with auth headers. */
export async function download(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = Object.assign(document.createElement('a'), { href, download: filename });
  a.click();
  URL.revokeObjectURL(href);
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/upload', fd);
  return data.url;
}
