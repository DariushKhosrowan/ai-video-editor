import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, loadTemplateRegistry } from "./project.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PKG_ROOT = path.join(ROOT, "khordegir-studio", "khordegir");
const VIDEOS_ROOT = path.join(ROOT, "khordegir-studio", "videos");

describe("Project & Starter Assets Registry", () => {
  it("registers article_zoom template and aliases", () => {
    const reg = loadTemplateRegistry(PKG_ROOT);
    assert.ok(reg.names.includes("article_zoom"));
    assert.equal(reg.aliasMap["مقاله"], "article_zoom");
    assert.equal(reg.aliasMap["زوم مقاله"], "article_zoom");
    assert.equal(reg.aliasMap["article-zoom"], "article_zoom");
  });

  it("loads _new-video starter project with zero missing-image warnings", () => {
    const proj = new Project(path.join(VIDEOS_ROOT, "_new-video"), PKG_ROOT);
    assert.equal(proj.warnings.length, 0, `Unexpected warnings: ${proj.warnings.join("; ")}`);
    assert.equal(proj.livingStage?.bgStyle, "dreamy-bokeh");
    assert.equal(proj.livingStage?.floatMode, "selective");

    const artSlide = proj.slides.find((s) => s.template === "article_zoom");
    assert.ok(artSlide, "Expected starter deck to include article_zoom slide");
    assert.ok(artSlide.focus_text, "Expected article_zoom slide to define focus_text");
    assert.ok(proj.find("/assets/world-map-dark.jpg"));
    assert.ok(proj.find("/assets/archive-newspaper.jpg"));
    assert.ok(proj.find("/assets/podcast-studio-mic.jpg"));
  });
});
