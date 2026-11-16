// AI homework evaluation (Google Gemini or Anthropic Claude). The result is only a SUGGESTION for the teacher —
// nothing reaches students or parents until the teacher reviews and publishes.
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma.js';
import { UPLOAD_ROOT } from './upload.js';
import { HttpError } from './http.js';

const MODEL = 'claude-opus-5-5';
let client = null;
// Provider: Gemini when GEMINI_API_KEY is set (free tier available), otherwise Claude when ANTHROPIC_API_KEY is set.
export const aiProvider = () => (process.env.AI_FAKE === '1' ? 'test' : process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'claude' : null);
// In-house brand shown to users (the underlying engine — Gemini or Claude — is not shown). Change with AI_BRAND_NAME.
export const aiProviderLabel = () => process.env.AI_BRAND_NAME || 'Rynix AI';
export const aiEngine = () => ({ gemini: 'gemini', claude: 'claude', test: 'test' })[aiProvider()] || null;
export const aiEnabled = () => !!aiProvider();
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash';
let gemini = null;
const getGemini = () => (gemini ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' }));
const getClient = () => (client ||= process.env.AI_FAKE === '1' ? fakeClient() : new Anthropic()); // reads ANTHROPIC_API_KEY from the environment

/** Offline stand-in used only by automated tests (AI_FAKE=1): returns a fixed, schema-valid evaluation. */
function fakeClient() {
  return { beta: { messages: { create: async (req) => {
    const pages = req.messages[0].content.filter((c) => c.type !== 'text').length;
    return { model: 'test-double', stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: JSON.stringify({
      summary: `Test evaluation of ${pages} page(s).`, suggestedMarks: 8, suggestedGrade: 'A', feedbackForStudent: 'Good work! Check your spellings.',
      strengths: ['Clear structure'], improvements: ['Spelling'], questions: [{ label: 'Q1', verdict: 'correct', marksAwarded: 8, comment: 'Well explained' }],
      markings: pages ? [{ questionLabel: 'Q1', fileNumber: 1, page: 1, box: [100, 100, 300, 800], verdict: 'correct', marksText: '8/10', note: 'well done' }] : [],
      legibility: 'clear', confidence: 'high', teacherNotes: 'Simulated result for testing.' }) }] };
  } } } };
}

const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

/** Load an uploaded file (database storage or local disk) as { buffer, mime }. */
async function loadFile(url) {
  const m = url.match(/^\/api\/files\/([^./?]+)/);
  if (m) {
    const f = await prisma.storedFile.findUnique({ where: { id: m[1] } });
    return f ? { buffer: Buffer.from(f.data), mime: f.mime, name: f.name } : null;
  }
  if (url.startsWith('/uploads/')) {
    const p = path.join(UPLOAD_ROOT, url.slice('/uploads/'.length));
    if (!p.startsWith(UPLOAD_ROOT) || !fs.existsSync(p)) return null;
    const ext = path.extname(p).toLowerCase();
    return { buffer: fs.readFileSync(p), mime: IMAGE_TYPES[ext] || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'), name: path.basename(p) };
  }
  return null;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'suggestedMarks', 'suggestedGrade', 'feedbackForStudent', 'strengths', 'improvements', 'questions', 'markings', 'legibility', 'confidence', 'teacherNotes'],
  properties: {
    summary: { type: 'string', description: 'One or two sentences for the teacher summarising the quality of the work.' },
    suggestedMarks: { type: 'number', description: 'Suggested marks between 0 and the maximum. Use 0 when no maximum marks are set.' },
    suggestedGrade: { type: 'string', enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'E'] },
    feedbackForStudent: { type: 'string', description: 'Encouraging, specific feedback addressed to the student (2-4 sentences).' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'verdict', 'marksAwarded', 'comment'],
        properties: {
          label: { type: 'string', description: 'Question number or short name, e.g. "Q3" or "Introduction".' },
          verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect', 'not_attempted'] },
          marksAwarded: { type: 'number' },
          comment: { type: 'string' },
        },
      },
    },
    markings: {
      type: 'array',
      description: 'Where each answer is on the attached pages, so it can be ticked/crossed on the page. One entry per answer you can see. Empty when nothing is attached.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['questionLabel', 'fileNumber', 'page', 'box', 'verdict', 'marksText', 'note'],
        properties: {
          questionLabel: { type: 'string' },
          fileNumber: { type: 'integer', description: 'Attached file number as listed (1, 2, ...).' },
          page: { type: 'integer', description: 'Page number inside that file (always 1 for a photo).' },
          box: { type: 'array', items: { type: 'number' }, description: '[ymin, xmin, ymax, xmax] around the student answer, each 0-1000 relative to that page.' },
          verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect', 'not_attempted'] },
          marksText: { type: 'string', description: 'e.g. "3/3", "1/3" or "" when no marks are set.' },
          note: { type: 'string', description: 'Very short teacher-style remark, max 6 words, e.g. "sign error", "well done".' },
        },
      },
    },
    legibility: { type: 'string', enum: ['clear', 'partly_readable', 'unreadable'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    teacherNotes: { type: 'string', description: 'Private notes for the teacher only: doubtful parts, unreadable sections, possible copying, things to verify.' },
  },
};

const SYSTEM = `You are an experienced, fair and encouraging school teacher in India (CBSE curriculum) helping a colleague check homework.
You receive the homework question, optional answer key / marking scheme, maximum marks, and the student's work (typed text and/or photos or PDFs of handwritten pages).
Evaluate the work against the question:
- Read handwriting carefully. If part of the work cannot be read, say so in teacherNotes and do not guess its content.
- Award marks strictly within 0 and the maximum, following the answer key when given. Never award marks for parts that were not attempted.
- Keep feedbackForStudent age-appropriate, specific and kind; mention one thing done well and one concrete next step.
- Write feedback in the same language as the homework (e.g. Hindi homework gets Hindi feedback).
- For every answer visible on the attached pages, add a markings entry with a tight box around that answer (box = [ymin, xmin, ymax, xmax] on a 0-1000 scale of that page) so it can be ticked or crossed on the page like a teacher would.
- Your output is a suggestion: the teacher reviews it before anything is shared, so flag anything uncertain in teacherNotes and lower confidence accordingly.`;

/** Ask Claude to evaluate one submission. Returns the parsed suggestion object. */
export async function evaluateSubmission({ homework, student, submission }) {
  if (!aiEnabled()) throw new HttpError(503, 'AI evaluation is not set up yet. Add a GEMINI_API_KEY (or ANTHROPIC_API_KEY) on the server to enable it.');
  const files = JSON.parse(submission.files || '[]');
  const content = [];
  let attached = 0;
  let sentBytes = 0;
  const skipped = [];
  const attachedFiles = [];
  for (const f of files) {
    const data = await loadFile(f.url);
    if (!data) continue;
    // AI services accept ~20 MB per request; larger files are left for the teacher to check by hand
    if (sentBytes + data.buffer.length > 18 * 1024 * 1024) { skipped.push(f.name); continue; }
    sentBytes += data.buffer.length;
    if (data.mime === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data.buffer.toString('base64') } });
      attached++;
      attachedFiles.push({ url: f.url, name: f.name, isPdf: true });
    } else if (Object.values(IMAGE_TYPES).includes(data.mime)) {
      content.push({ type: 'image', source: { type: 'base64', media_type: data.mime, data: data.buffer.toString('base64') } });
      attached++;
      attachedFiles.push({ url: f.url, name: f.name, isPdf: false });
    }
  }
  const brief = [
    `Class: ${student.className}`,
    `Subject: ${homework.subject?.name || '—'}`,
    `Homework title: ${homework.title}`,
    `Instructions: ${homework.description || '(none)'}`,
    `Maximum marks: ${homework.maxMarks ?? 'not set (give a grade; set suggestedMarks to 0)'}`,
    `Answer key / marking scheme from the teacher: ${homework.answerKey || '(not provided — use your subject knowledge)'}`,
    `Student's typed answer: ${submission.text?.trim() || '(none)'}`,
    `Attached files of the student's work (shown above, in this order): ${attachedFiles.length ? attachedFiles.map((a, i) => `File ${i + 1}: ${a.name} (${a.isPdf ? 'PDF - give the page number' : 'photo - page 1'})`).join('; ') : 'none'}`,
    ...(skipped.length ? [`NOT attached (too large for AI): ${skipped.join(', ')} — say in teacherNotes that the teacher must check these files manually.`] : []),
  ].join('\n');
  content.push({ type: 'text', text: `${brief}\n\nEvaluate this homework submission.` });

  const result = aiProvider() === 'gemini' ? await callGemini(content, brief) : await callClaude(content);
  if (homework.maxMarks != null) result.suggestedMarks = Math.min(Math.max(0, Number(result.suggestedMarks) || 0), homework.maxMarks);
  else result.suggestedMarks = null;
  return { ...result, attachedPages: attached, provider: aiProviderLabel(), pageAnnotations: buildAiAnnotations(result.markings, attachedFiles) };
}

const COLOR = { correct: '#16a34a', partially_correct: '#d97706', incorrect: '#dc2626', not_attempted: '#dc2626' };
const clamp = (v) => Math.min(1, Math.max(0, v));

/** Turn the AI's answer locations into marking-board items (same format as the teacher's pen), tagged ai:true. */
export function buildAiAnnotations(markings, attachedFiles) {
  const out = {};
  for (const m of markings || []) {
    const file = attachedFiles[(m.fileNumber || 0) - 1];
    if (!file || !Array.isArray(m.box) || m.box.length !== 4) continue;
    let [y0, x0, y1, x1] = m.box.map((v) => clamp(Number(v) / 1000));
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 - y0 < 0.01 || x1 - x0 < 0.01) continue;
    const key = file.isPdf ? `${file.url}#p${Math.max(1, m.page || 1)}` : file.url;
    const c = COLOR[m.verdict] || '#dc2626';
    const r = (v) => Math.round(v * 10000) / 10000;
    const items = (out[key] ||= []);
    items.push({ t: 'pen', c, w: 0.0025, ai: true, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(([x, y]) => [r(x), r(y)]) });
    items.push({ t: m.verdict === 'correct' || m.verdict === 'partially_correct' ? 'tick' : 'cross', c, ai: true, x: r(Math.min(x1 + 0.03, 0.96)), y: r(clamp(y0 + 0.025)), s: 0.04 });
    const label = [m.marksText, m.note].filter(Boolean).join(' - ').slice(0, 48);
    if (label) items.push({ t: 'text', c, ai: true, txt: label, s: 0.02, x: r(x0), y: r(y1 < 0.95 ? y1 + 0.025 : Math.max(0.03, y0 - 0.01)) });
  }
  return out;
}

async function callClaude(content) {
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // if the request is declined by a safety classifier, retry on a fallback model automatically
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(503, 'AI evaluation key is invalid. Please check ANTHROPIC_API_KEY.');
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'AI is busy right now — please try again in a minute.');
    if (e instanceof Anthropic.BadRequestError) throw new HttpError(400, `AI could not read this submission: ${e.message}`);
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `AI service error (${e.status}). Please try again.`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'AI declined to evaluate this submission. Please evaluate it manually.');
  if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'AI response was cut off. Please try again.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try { return { ...JSON.parse(text), model: response.model }; } catch { throw new HttpError(502, 'AI returned an unexpected answer. Please try again.'); }
}

/** Same request for Google Gemini: images/PDFs as inline data + JSON-schema structured output. */
async function callGemini(content) {
  const parts = content.map((c) => (c.type === 'text' ? { text: c.text } : { inlineData: { mimeType: c.source.media_type, data: c.source.data } }));
  let res;
  try {
    res = await getGemini().models.generateContent({
      model: GEMINI_MODEL(),
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', responseJsonSchema: SCHEMA, temperature: 0.2 },
    });
  } catch (e) {
    const status = e?.status || e?.code;
    if (status === 429) throw new HttpError(429, 'AI free limit reached for now — please try again in a minute.');
    if (status === 400 || status === 403) throw new HttpError(503, `Gemini rejected the request: ${String(e.message).slice(0, 160)}`);
    throw new HttpError(502, `AI service error. Please try again. (${String(e.message || e).slice(0, 120)})`);
  }
  const reason = res.candidates?.[0]?.finishReason;
  if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT') throw new HttpError(422, 'AI declined to evaluate this submission. Please evaluate it manually.');
  try { return { ...JSON.parse(res.text), model: res.modelVersion || GEMINI_MODEL() }; } catch { throw new HttpError(502, 'AI returned an unexpected answer. Please try again.'); }
}


