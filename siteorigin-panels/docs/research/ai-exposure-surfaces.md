# Research: Exposing SiteOrigin Panels to AI abilities

**Status:** Research only — no implementation.
**Date:** 2026-06-16
**Question:** Where can the page builder be exposed to AI abilities in WordPress, and what is the right first step?

---

## 0. TL;DR

- Everything a layout *is* funnels through one JSON document: the **`panels_data`** post meta. That schema is the AI contract — every AI feature ultimately reads, transforms, or emits this structure.
- Most read/write/render machinery **already exists**; it is just not exposed as an *intentional, documented* contract aimed at AI consumers.
- The goal of **Phase 1 is exposure**, not shipping an AI feature: make the builder AI-addressable through stable hooks so later phases (in-editor assistant, then external/REST/MCP agents) plug in without re-plumbing core.
- **The one genuine gap** for external AI is transport: there is **no dedicated REST route and no `register_post_meta(..., show_in_rest)`** for `panels_data`. In-WordPress AI is well served by filters; out-of-WordPress AI is not served at all today.
- **Recommendation:** Phase 1 = *hooks + a read-only REST/meta exposure of `panels_data`*. Reasoning in §6.

---

## 1. The `panels_data` contract (the AI's lingua franca)

Stored as post meta under the key **`panels_data`**. Flat JSON with three parallel arrays:

```jsonc
{
  "grids": [                       // rows
    { "style": {}, "ratio": "", "color_label": "", "label": "" }
  ],
  "grid_cells": [                  // columns
    { "grid": 0, "weight": 0.5, "style": {} }   // grid = row index; weight = width ratio
  ],
  "widgets": [                     // widget instances
    {
      "panels_info": {
        "class": "WP_Widget_Text", // widget PHP class
        "grid": 0,                 // row index
        "cell": 0,                 // column index
        "cell_index": 0,           // position within the cell
        "widget_id": "uuid",
        "style": {}
      }
      // ...widget-specific field values (title, text, etc.)
    }
  ]
}
```

- **Save path:** `SiteOrigin_Panels_Admin::save_post()` — `inc/admin.php:220`. Decodes `$_POST['panels_data']`, runs `process_raw_widgets()`, applies `siteorigin_panels_data_pre_save`, then `update_post_meta($id, 'panels_data', ...)`.
- **Render path (read-only):** `SiteOrigin_Panels_Renderer::render()` — `inc/renderer.php:564`. Flattens flat arrays → `layout_data[row][cell][widgets]` (`get_panels_layout_data()` `:1078`) → HTML. CSS via `generate_css()` `:115`.

**Why this matters for AI:** this single schema is the contract. An AI feature "edits a page" iff it produces a valid `panels_data`. Everything below is about *where* that document can be read or injected.

---

## 2. Inventory of existing seams

### 2a. PHP filters/actions (for AI running *inside* WordPress)

| Hook | File:Line | Use for AI |
|---|---|---|
| `siteorigin_panels_data` | applied in `inc/admin.php` render path | Intercept/transform a layout on **read** before render |
| `siteorigin_panels_data_pre_save` | `inc/admin.php` save path | Transform/validate a layout **before persist** |
| `siteorigin_panels_prebuilt_layouts` | `siteorigin-panels.php:~294` | Register layout **sources** — an AI generator becomes "just another source" |
| `siteorigin_panels_layout_data` | `inc/renderer.php` | Modify the hierarchical structure pre-render |
| `siteorigin_panels_render` | `inc/renderer.php` | Final HTML seam |
| `siteorigin_panels_widget_class` | `inc/admin.php` (process_raw_widgets) | Remap widget classes |

**Gap:** there is no action fired *with the canonical `panels_data`* at well-known "an AI could act here" moments (e.g. "layout loaded for editing", "layout about to be rendered"), and no filter whose documented purpose is *"return an AI-generated layout."* These would be cheap to add and give later phases a stable seam instead of core patches.

### 2b. AJAX surface (for an *in-editor* assistant)

Registered in `inc/admin.php:52-56`, `inc/admin-layouts.php:23-27`, `inc/styles-admin.php:5`. All gated by nonce + capability.

| Action | Callback / File:Line | What it gives AI |
|---|---|---|
| `so_panels_builder_content_json` | `action_builder_content_json()` `inc/admin.php:1449` | Live preview **without saving** — returns `{post_content, preview, sanitized_panels_data}`. Ideal "AI proposes → user previews → accepts" loop |
| `so_panels_widget_form` | `action_widget_form()` `inc/admin.php:1505` | Render/prefill a **single** widget's form (AI fills copy for one widget) |
| `so_panels_get_layout` | `action_get_prebuilt_layout()` `inc/admin-layouts.php:487` | Returns a full, sanitized `panels_data` by id |
| `so_panels_import_layout` | `action_import_layout()` `inc/admin-layouts.php:633` | Accepts **raw JSON**, runs `decode_panels_data()` + `process_raw_widgets()` — reusable validation path for AI output |
| `so_panels_export_layout` | `action_export_layout()` `inc/admin-layouts.php:667` | Dumps current `panels_data` as JSON |

### 2c. Client-side builder API (Backbone, `js/siteorigin-panels/`)

| Method | File:Line | Use for AI |
|---|---|---|
| `builder.model.loadPanelsData(data, position)` | `model/builder.js:58` | Inject AI output; `position` = `'before' \| 'after' \| 'replace'` (append a section or replace the page) |
| `concatPanelsData(a, b)` | `model/builder.js:167` | Merge an AI suggestion into the current layout |
| `getPanelsData()` | `model/builder.js:217` | Serialize current editor state to send to an AI |
| `storeModelData()` | `view/builder.js:561` | How the model reaches the hidden `panels_data` field on save |

### 2d. Block editor / programmatic

- **Layout block** `siteorigin-panels/layout-block` — `compat/layout-block.php:39`; render callback `:127`; attribute `panelsData`. Data lives in **post content**, not a registered meta field.
- **REST validation only** (not a data endpoint): `rest_pre_insert_{post_type}` → `server_side_validation()` `compat/layout-block.php:34,252`.
- **Direct PHP:** `update_post_meta($id, 'panels_data', $data)`; read/output via `siteorigin_panels_render()` / `siteorigin_panels_generate_css()` (`inc/functions.php:39,48`).

### 2e. The transport gap (for AI running *outside* WordPress)

Verified: **no `register_rest_route`** for panels data and **no `register_meta`/`register_post_meta` with `show_in_rest`** for `panels_data`. (Only `register_block_type` references exist.) Consequence: an external agent / MCP server / SaaS has **no first-class HTTP way to read or write a layout**. This is the thing to *build*, not hook into.

---

## 3. Constraints that hold across all phases

Every phase inherits the same security model — design AI features to respect it rather than bypass it:

- **Capabilities:** post writes require `current_user_can('edit_post', $post_id)`; home page requires `edit_theme_options`.
- **Nonces:** `_sopanels_nonce` (`'save'`) for the metabox; `_panelsnonce` (`'panels_action'`) for builder AJAX.
- **Sanitization:** all inbound layout JSON passes `process_raw_widgets()`, which runs each widget's `WP_Widget::update()`. **AI output is never trusted raw** — it must traverse this path.

---

## 4. Phased exposure plan

### Phase 1 — Exposure (hooks; recommend + read-only REST)
Make the builder AI-addressable. Consumes §2a/§2e. Add a small, named set of intentional seams:
- Action(s) carrying canonical `panels_data` at read + pre-save moments.
- A documented filter meaning "supply/transform an AI-generated layout."
- (Recommended) read-only REST/meta exposure of `panels_data` so an external agent can already *see* a page (write stays internal).
- Reuse `process_raw_widgets()` for any inbound path.

### Phase 2 — In-editor assistant
Consumes §2b/§2c. New admin AJAX action → Claude API → returns `panels_data`; client calls `loadPanelsData(data, 'after'|'replace')`; preview via `so_panels_builder_content_json` before the user accepts.

### Phase 3 — External / REST / MCP agents
Consumes §2e + Phase-1 hooks. Add authenticated REST write (or `register_post_meta` with auth+sanitize callbacks); wrap as an MCP server so an external Claude agent can read+write layouts over HTTP.

---

## 4b. Core vs. premium boundary

The line: **free core *exposes*; a SiteOrigin Premium addon *consumes*.**

| Lives in free core (this plugin) | Lives in premium addon |
|---|---|
| The `panels_data` schema + sanitization (`process_raw_widgets()`) | The AI feature itself (Claude API calls, prompts) |
| Phase-1 hooks (actions/filters) as a **stable public API** | In-editor "Generate with AI" assistant (Phase 2) |
| Read-only REST/meta exposure of `panels_data` | External/MCP **write** path (Phase 3) |

Implications the planner must honor:
- Phase-1 hooks are a **committed public API**: named, documented, arity-locked. Once a premium addon depends on them they cannot be quietly renamed — treat naming/signatures as load-bearing.
- Core must contain **zero AI vendor logic** (no API keys, no model calls). Core only moves `panels_data` through seams.
- Read-only REST is **core** (parallels how WP exposes meta); **write**-over-REST is premium.

---

## 4c. Phase 1 deliverables (buildable scope)

1. A documented action fired with canonical `panels_data` on **read** (layout loaded for editing/render).
2. A documented action fired with canonical `panels_data` on **pre-save** (alongside / wrapping the existing `siteorigin_panels_data_pre_save`).
3. A documented filter whose contract is "**supply or transform an AI-generated layout**," routed through `process_raw_widgets()`.
4. **Read-only** REST/meta exposure of `panels_data` (route vs. `register_post_meta(show_in_rest)` is an open question, §7) — read auth only, no write.
5. Inline docblocks for each new hook stating: it is a public API, its arity, and that it is premium-addon-facing.

Out of scope for Phase 1: any Claude/AI call, any write-over-REST, any UI.

---

## 5. Most AI-friendly injection points (today, without core changes)

1. `siteorigin_panels_prebuilt_layouts` — "Generate with AI" appears as a layout *source* in the existing dialog. Minimal change, reuses import/validation. Strong MVP.
2. `siteorigin_panels_data` / `..._pre_save` — last-mile transform on read/save.
3. `so_panels_import_layout` — already accepts and validates raw JSON.
4. `loadPanelsData()` + `so_panels_builder_content_json` — in-editor propose/preview/accept loop.

---

## 6. Recommendation

**Phase 1 = hooks + a read-only REST/meta exposure of `panels_data`.**

Rationale:
- **Hooks alone** fully serve *in-WordPress* AI and are the safest start, but they leave the external path (MCP / external agent — an explicit later goal) completely unproven. We won't know if the schema is ergonomic for an external consumer until something outside WP reads it.
- Adding **read-only** REST/meta is cheap and low-risk: no write surface, no new trust boundary for mutations, and it immediately lets an external agent "see" a page. That exercises the contract end-to-end and de-risks Phase 3's write design.
- Defer **write-over-REST** to Phase 3, where it gets proper auth + the already-existing `process_raw_widgets()` sanitization.

Net: expose generously on **read**, conservatively on **write**. Hooks + read-only REST in Phase 1 proves both the in-WP and external paths without committing to how the AI is invoked.

---

## 7. Open questions for the planner

- Exact names/arity of the new Phase-1 actions/filters (pure implementation detail).
- Whether read-only REST is a custom `register_rest_route` namespace or `register_post_meta(show_in_rest => true)` with a read auth callback.
- Whether the layout block's post-content storage needs its own read seam, or whether meta-based exposure is sufficient for v1.
