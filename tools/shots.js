// Quick screenshots of key screens: node shots.js
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.WEB || 'http://localhost:5174';
const OUT = fileURLToPath(new URL('./screenshots/', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const shot = async (path, name, scroll = 0) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  if (scroll) { await page.evaluate((y) => window.scrollTo(0, y), scroll); await new Promise((r) => setTimeout(r, 2000)); }
  await page.screenshot({ path: `${OUT}${name}.png` });
};
const login = async (email, password) => {
  const { token } = await (await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json();
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('rny_token', t); sessionStorage.setItem('rny_loaded', '1'); }, token);
};
await page.goto(BASE + '/');
await page.evaluate(() => { sessionStorage.setItem('rny_loaded', '1'); localStorage.setItem('rny_lang', 'en'); });
await shot('/', 'home');
await shot('/', 'home-achievement', 1700);
await shot('/', 'home-stats', 2500);
await page.evaluate(() => localStorage.setItem('rny_lang', 'hi'));
await shot('/', 'home-hindi');
await page.evaluate(() => localStorage.setItem('rny_lang', 'en'));
await shot('/admissions', 'admissions', 700);
await login('admin@rajschool.in', 'Admin@123');
await shot('/app', 'dashboard');
await login('9876543210', '9876543210');
await shot('/app/portal', 'parent');
await login('admin@rnygroups.com', 'Admin@123');
await shot('/platform', 'platform');
await browser.close();
console.log('saved to', OUT);
