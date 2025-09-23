# Replit Job Digester – Full Starter Kit

This repo scaffolds a full-stack prototype you can run on Replit that:
- Uploads **PDF**, **DOCX**, or **pasted text** job descriptions
- Uses **OpenAI** (JSON mode) with **portable JSON Codexes** to extract + normalize into your **Job Card** schema
- Highlights **missing fields** while still rendering everything it can
- Keeps all **prompts and behavior inside codex JSON** so you can edit and export them

---

## File Tree
```
.
├── README.md
├── package.json
├── .env.example
├── server.js
├── public/
│   ├── index.html
│   └── app.js
├── src/
│   ├── routes/
│   │   ├── upload.js
│   │   ├── jobs.js
│   │   └── codex.js
│   ├── services/
│   │   ├── ingest.js
│   │   ├── codex.js
│   │   └── llm.js
│   ├── tools/
│   │   ├── schemaValidate.js
│   │   └── normalize.js
│   └── db/
│       └── memory.js
└── codex/
    ├── job-card-v1.json
    └── job-card-v1.schema.json
```

---

## README.md
```md
# Job Digester (OpenAI + Codex Agents)

Run on Replit. Extracts job descriptions into a consistent Job Card and flags missing info.

## Quick Start
1. Create a new Replit (Node.js)
2. Add files from this repo
3. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`
4. Click **Run** in Replit
5. Open the webview → upload a PDF/DOCX or paste text

## Environment
```
OPENAI_API_KEY=sk-...
PORT=3000
OPENAI_MODEL=gpt-4.1-mini
```

## Notes
- All prompts + schema + rules live in `codex/job-card-v1.json`
- Change output fields, labels, and missing policies without touching code
- The backend keeps everything in memory for now (swap to a DB easily)
```
```

---

## package.json
```json
{
  "name": "job-digester",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^3.0.1",
    "dotenv": "^16.4.5",
    "docx-parser": "^1.0.4",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.58.1",
    "pdf-parse": "^1.1.1"
  }
}
```

---

## .env.example
```bash
OPENAI_API_KEY=sk-xxxxx
PORT=3000
OPENAI_MODEL=gpt-4.1-mini
```

---

## server.js
```js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRouter from './src/routes/upload.js';
import jobsRouter from './src/routes/jobs.js';
import codexRouter from './src/routes/codex.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/upload', uploadRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/codex', codexRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## public/index.html
```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Job Digester</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; background: #0f172a; color: #e2e8f0; }
    .wrap { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
    .card { background: #0b1220; border: 1px solid #1f2937; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    label { display:block; margin:8px 0 4px; }
    input, textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
    button { background:#2563eb; color:white; border:none; padding:10px 14px; border-radius:8px; cursor:pointer; font-weight:600; }
    .grid { display:grid; grid-template-columns: 1fr 320px; gap:16px; }
    .badge { padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid #334155; }
    .badge.warn { border-color:#f59e0b; color:#f59e0b; }
    .badge.error { border-color:#ef4444; color:#ef4444; }
    .muted { color:#94a3b8; }
    .section h3 { margin: 0 0 6px; font-size: 14px; color:#cbd5e1; }
    .pill { display:inline-block; padding:4px 8px; border:1px solid #334155; border-radius:999px; margin:2px 4px 0 0; font-size:12px; }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Upload a Job Description</h1>
      <div class="two">
        <div>
          <label>PDF/DOCX</label>
          <input type="file" id="file" />
        </div>
        <div>
          <label>Or paste text</label>
          <textarea id="text" rows="6" placeholder="Paste description here..."></textarea>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
        <button id="uploadBtn">Process</button>
        <span id="status" class="muted"></span>
      </div>
    </div>

    <div id="result"></div>
  </div>
  <script src="/public/app.js"></script>
</body>
</html>
```

---

## public/app.js
```js
const el = (sel) => document.querySelector(sel);
const statusEl = el('#status');
const resultEl = el('#result');

el('#uploadBtn').addEventListener('click', async () => {
  statusEl.textContent = 'Uploading…';
  resultEl.innerHTML = '';

  const file = el('#file').files[0];
  const text = el('#text').value.trim();

  const form = new FormData();
  if (file) form.append('file', file);
  if (text) form.append('text', text);

  const r = await fetch('/api/upload', { method: 'POST', body: form });
  const { jobId, error } = await r.json();
  if (error) { statusEl.textContent = error; return; }

  statusEl.textContent = 'Processing…';

  // poll until ready
  let data;
  for (let i=0;i<40;i++) {
    const resp = await fetch(`/api/jobs/${jobId}`);
    data = await resp.json();
    if (data && data.jobCard) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  statusEl.textContent = '';
  renderJob(data);
});

function pills(arr){
  return (arr||[]).map(s=>`<span class="pill">${escapeHtml(s)}</span>`).join('');
}

function renderJob(res){
  if (!res || !res.jobCard) { resultEl.innerHTML = '<div class="card">No result.</div>'; return; }
  const j = res.jobCard;
  const missing = j.missing_fields||[];
  const warnCt = missing.filter(m=>m.severity==='warn').length;
  const errCt = missing.filter(m=>m.severity==='error').length;

  const basics = j.basics||{};

  resultEl.innerHTML = `
    <div class="grid">
      <div>
        <div class="card">
          <h1>${escapeHtml(basics.title||'—')} <span class="muted">${escapeHtml(basics.seniority||'')}</span></h1>
          <div class="muted">${escapeHtml(basics.company||'—')} · ${escapeHtml(basics.location||'—')} · ${escapeHtml(basics.work_mode||'—')}</div>
        </div>

        <div class="card section">
          <h3>Job Overview</h3>
          <div>${escapeHtml(j.overview||'— not provided —')}</div>
        </div>

        <div class="card section">
          <h3>Requirements</h3>
          <div><strong>Experience:</strong> ${escapeHtml(j.requirements?.years_experience||'—')}</div>
          <div style="margin-top:6px;"><strong>Must have:</strong> ${pills(j.requirements?.must_have)}</div>
          <div style="margin-top:6px;"><strong>Nice to have:</strong> ${pills(j.requirements?.nice_to_have)}</div>
        </div>

        <div class="card section">
          <h3>Required Competencies</h3>
          <div><strong>Frontend:</strong> ${pills(j.competencies?.frontend)}</div>
          <div><strong>Backend:</strong> ${pills(j.competencies?.backend)}</div>
          <div><strong>Cloud Architecture:</strong> ${pills(j.competencies?.cloud_architecture)}</div>
          <div><strong>Database & Optimization:</strong> ${pills(j.competencies?.database)}</div>
          <div><strong>Agile:</strong> ${pills(j.competencies?.agile)}</div>
        </div>

        <div class="card section">
          <h3>Preferred Skills</h3>
          <div>${pills(j.preferred_skills)}</div>
        </div>

        <div class="card section">
          <h3>Work Culture & Environment</h3>
          <div>${escapeHtml(j.work_culture||'— not provided —')}</div>
        </div>

        <div class="card section">
          <h3>Procurement Requirements</h3>
          <div><strong>Contract:</strong> ${escapeHtml(j.procurement?.contract_type||'—')}</div>
          <div><strong>NDA:</strong> ${String(j.procurement?.nda_required??'—')}</div>
          <div><strong>Security:</strong> ${escapeHtml(j.procurement?.security_clearance||'—')}</div>
          <div><strong>VAT Registration:</strong> ${escapeHtml(j.procurement?.vat_registration||'—')}</div>
        </div>

      </div>
      <div>
        <div class="card section">
          <h3>Project Details</h3>
          <div><strong>Start:</strong> ${escapeHtml(j.project_details?.start_date||'—')}</div>
          <div><strong>Duration:</strong> ${escapeHtml(j.project_details?.duration||'—')}</div>
          <div><strong>Workload:</strong> ${escapeHtml(j.project_details?.workload||'—')}</div>
          <div><strong>Setup:</strong> ${escapeHtml(j.project_details?.work_setup||'—')}</div>
          <div><strong>Rate:</strong> ${escapeHtml(j.project_details?.rate_band||'—')}</div>
        </div>

        <div class="card section">
          <h3>Language Requirements</h3>
          <div>${pills(j.language_requirements)}</div>
        </div>

        <div class="card section">
          <h3>Decision Process</h3>
          <div>${escapeHtml(j.decision_process||'—')}</div>
        </div>

        <div class="card section">
          <h3>Key Stakeholders</h3>
          <div>${pills(j.stakeholders)}</div>
        </div>

        <div class="card section">
          <h3>Contact Information</h3>
          <div><strong>${escapeHtml(j.contact?.name||'—')}</strong> ${escapeHtml(j.contact?.role||'')}</div>
          <div class="muted">${escapeHtml(j.contact?.email||'—')} · ${escapeHtml(j.contact?.phone||'—')}</div>
        </div>

        <div class="card section">
          <h3>Missing Info
            ${errCt?`<span class=\"badge error\">${errCt} errors</span>`:''}
            ${warnCt?`<span class=\"badge warn\" style=\"margin-left:6px;\">${warnCt} warnings</span>`:''}
          </h3>
          <ul>
            ${(missing||[]).map(m=>`<li><span class="badge ${m.severity}">${m.severity}</span> <code>${escapeHtml(m.path)}</code> – ${escapeHtml(m.message)}</li>`).join('')||'<span class="muted">None</span>'}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
```

---

## src/db/memory.js
```js
const store = {
  jobs: new Map(),
  texts: new Map(),
  cards: new Map(),
  codexes: new Map()
};

export default store;
```

---

## src/services/codex.js
```js
import fs from 'fs/promises';
import path from 'path';
import store from '../db/memory.js';

const CODEx_DIR = path.resolve('codex');

export async function loadCodex(id = 'job-card-v1') {
  if (store.codexes.has(id)) return store.codexes.get(id);
  const p = path.join(CODEx_DIR, `${id}.json`);
  const txt = await fs.readFile(p, 'utf-8');
  const json = JSON.parse(txt);
  store.codexes.set(id, json);
  return json;
}

export async function saveCodex(id, data){
  store.codexes.set(id, data);
  return data;
}
```

---

## src/services/llm.js
```js
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callJsonModel({ system, user, model }) {
  const resp = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });
  const txt = resp.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}
```

---

## src/tools/schemaValidate.js
```js
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export function validateAgainstSchema(data, schema){
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(data);
  return { ok, errors: validate.errors || [] };
}
```

---

## src/tools/normalize.js
```js
export function normalizeJobCard(card, codex){
  const out = JSON.parse(JSON.stringify(card||{}));
  const rules = codex.normalization_rules || [];

  const applyMap = (s, map) => {
    if (!s) return s; const k = s.toLowerCase();
    for (const [key, val] of Object.entries(map)) {
      if (k.includes(key.toLowerCase())) return val;
    }
    return s;
  };

  // Example normalization: work_mode
  if (out?.basics?.work_mode && rules.length){
    const wmRule = rules.find(r => r.match && r.map);
    if (wmRule) out.basics.work_mode = applyMap(out.basics.work_mode, wmRule.map);
  }

  return out;
}
```

---

## src/services/ingest.js
```js
import { loadCodex } from './codex.js';
import { callJsonModel } from './llm.js';
import { validateAgainstSchema } from '../tools/schemaValidate.js';
import { normalizeJobCard } from '../tools/normalize.js';

export async function ingestRawText(rawText, document_type, codexId='job-card-v1'){
  const codex = await loadCodex(codexId);
  const schema = codex.output_schema;

  // 1) ExtractorAgent
  const extractorUser = JSON.stringify({
    schema,
    guidance: codex.prompts.extractor_guidance,
    text: rawText,
    source: { document_type }
  });

  const extracted = await callJsonModel({
    system: codex.prompts.extractor_system,
    user: extractorUser
  });

  // Ensure missing_fields exists
  extracted.missing_fields = extracted.missing_fields || [];

  // 2) NormalizerAgent
  const normalized = normalizeJobCard(extracted, codex);

  // 3) ValidatorAgent
  const { ok, errors } = validateAgainstSchema(normalized, schema);
  if (!ok) {
    normalized.missing_fields.push(...(errors||[]).map(e=>({
      path: e.instancePath || e.schemaPath,
      severity: 'error',
      message: e.message || 'Schema validation error'
    })));
  }

  // 4) PresenterAgent hints
  normalized.display = normalized.display || codex.presentation || {};
  return normalized;
}
```

---

## src/routes/upload.js
```js
import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';
import store from '../db/memory.js';
import { ingestRawText } from '../services/ingest.js';
import docx from 'docx-parser';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    let rawText = req.body.text || '';
    let document_type = 'text';

    if (req.file) {
      const buf = await readFile(req.file.path);
      if ((req.file.mimetype||'').includes('pdf')) {
        const data = await pdf(buf);
        rawText = data.text;
        document_type = 'pdf';
      } else {
        rawText = await new Promise((resolve, reject) =>
          docx.parseBuffer(buf, (data) => resolve(data), reject)
        );
        document_type = 'docx';
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    store.jobs.set(id, { id, status: 'processing', document_type });
    store.texts.set(id, rawText);

    // Fire and forget (simple POC queue)
    (async () => {
      const card = await ingestRawText(rawText, document_type);
      store.cards.set(id, card);
      store.jobs.set(id, { id, status: 'done', document_type });
    })();

    res.json({ jobId: id });
  } catch (e) {
    console.error(e);
    res.json({ error: 'Upload failed' });
  }
});

export default router;
```

---

## src/routes/jobs.js
```js
import { Router } from 'express';
import store from '../db/memory.js';

const router = Router();

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const job = store.jobs.get(id) || null;
  const jobCard = store.cards.get(id) || null;
  res.json({ job, jobCard });
});

export default router;
```

---

## src/routes/codex.js
```js
import { Router } from 'express';
import { loadCodex, saveCodex } from '../services/codex.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const codex = await loadCodex(req.params.id);
  res.json(codex);
});

router.put('/:id', async (req, res) => {
  const updated = await saveCodex(req.params.id, req.body);
  res.json(updated);
});

router.get('/:id/export', async (req, res) => {
  const codex = await loadCodex(req.params.id);
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.id}.json`);
  res.json(codex);
});

export default router;
```

---

## codex/job-card-v1.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JobCard",
  "type": "object",
  "required": ["basics"],
  "properties": {
    "basics": {
      "type": "object",
      "required": ["title", "company", "location", "work_mode"],
      "properties": {
        "title": {"type": "string"},
        "seniority": {"type": "string"},
        "company": {"type": "string"},
        "location": {"type": "string"},
        "work_mode": {"type": "string"}
      }
    },
    "overview": {"type": "string"},
    "requirements": {
      "type": "object",
      "properties": {
        "years_experience": {"type": "string"},
        "must_have": {"type": "array", "items": {"type": "string"}},
        "nice_to_have": {"type": "array", "items": {"type": "string"}}
      }
    },
    "competencies": {
      "type": "object",
      "properties": {
        "frontend": {"type": "array", "items": {"type": "string"}},
        "backend": {"type": "array", "items": {"type": "string"}},
        "cloud_architecture": {"type": "array", "items": {"type": "string"}},
        "database": {"type": "array", "items": {"type": "string"}},
        "agile": {"type": "array", "items": {"type": "string"}}
      }
    },
    "preferred_skills": {"type": "array", "items": {"type": "string"}},
    "work_culture": {"type": "string"},
    "procurement": {
      "type": "object",
      "properties": {
        "contract_type": {"type": "string"},
        "nda_required": {"type": "boolean"},
        "security_clearance": {"type": "string"},
        "vat_registration": {"type": "string"}
      }
    },
    "contact": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "role": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": "string"}
      }
    },
    "project_details": {
      "type": "object",
      "properties": {
        "start_date": {"type": "string"},
        "duration": {"type": "string"},
        "workload": {"type": "string"},
        "work_setup": {"type": "string"},
        "rate_band": {"type": "string"}
      }
    },
    "language_requirements": {"type": "array", "items": {"type": "string"}},
    "decision_process": {"type": "string"},
    "stakeholders": {"type": "array", "items": {"type": "string"}},
    "display": {"type": "object"},
    "missing_fields": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "severity", "message"],
        "properties": {
          "path": {"type": "string"},
          "severity": {"type": "string", "enum": ["info", "warn", "error"]},
          "message": {"type": "string"}
        }
      }
    },
    "source_refs": {"type": "object"}
  }
}
```

---

## codex/job-card-v1.json (prompts live here)
```json
{
  "codex_id": "job-card-v1",
  "version": "1.0.0",
  "purpose": "Extract and normalize job descriptions into a Privateers Job Card schema.",
  "output_schema": { "$ref": "./job-card-v1.schema.json" },
  "normalization_rules": [
    { "match": "work mode", "map": { "hybrid": "hybrid", "on-site": "onsite", "on site": "onsite", "remote": "remote" } }
  ],
  "presentation": {
    "theme": "dark",
    "missing_policy": { "show_placeholders": true, "placeholder_text": "— not provided —" },
    "section_order": [
      "overview","requirements","competencies","preferred_skills","work_culture","procurement","project_details","language_requirements","decision_process","stakeholders","contact"
    ],
    "labels": {
      "overview": "Job Overview",
      "requirements": "Requirements",
      "competencies": "Required Competencies",
      "preferred_skills": "Preferred Skills",
      "work_culture": "Work Culture & Environment",
      "procurement": "Procurement Requirements",
      "project_details": "Project Details",
      "language_requirements": "Language Requirements",
      "decision_process": "Decision Process",
      "stakeholders": "Key Stakeholders",
      "contact": "Contact Information"
    }
  },
  "prompts": {
    "extractor_system": "You are a precision extractor. Convert job descriptions into the provided JSON schema (JobCard). Strictly follow the schema. Do not invent values. If a value is not present, omit it. Where you see an important field missing, append an entry to missing_fields with a JSON path and a short message. Keep technology terms as they appear. Prefer arrays of strings for bullets.",
    "extractor_guidance": "1) Read the text. 2) Fill JobCard fields. 3) If multiple variants exist, choose the most explicit. 4) Do NOT fabricate contact details or dates. 5) Place numeric ranges as strings (e.g., '800–1000 DKK/hour'). 6) Preserve English/Danish as given."
  },
  "missing_rules": [
    { "path": "project_details.start_date", "severity": "warn", "message": "Start date missing." },
    { "path": "contact.email", "severity": "error", "message": "Contact email missing." },
    { "path": "basics.title", "severity": "error", "message": "Role title missing." },
    { "path": "basics.company", "severity": "warn", "message": "Company missing." }
  ]
}
