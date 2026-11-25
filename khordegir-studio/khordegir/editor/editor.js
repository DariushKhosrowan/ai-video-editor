/* TODO (see HANDOFF.md §Editor): full no-code editor. This stub only proves the wiring:
   it lists the templates from templates/_index.js and previews a template's example in the stage iframe. */
(function () {
  const frame = document.getElementById("stage");
  const fit = () => { const w = document.getElementById("stageWrap").clientWidth; frame.style.transform = `scale(${w / 1920})`; };
  window.addEventListener("resize", fit); fit();
  const list = document.getElementById("slides");
  const send = (slide) => frame.contentWindow.postMessage({ cmd: "load", slide, camGuide: document.getElementById("camGuide").checked }, "*");
  Stage.templateList().forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="n">${Stage.fa(i + 1)}</span><img src="../templates/${t.name}/preview.png" onerror="this.remove()"><div><div class="t">${t.label || t.name}</div><div class="lay">${t.name}</div></div>`;
    li.onclick = () => { [...list.children].forEach((x) => x.classList.remove("sel")); li.classList.add("sel"); send(Object.assign({ template: t.name }, t.example || {}));
      document.getElementById("form").innerHTML = `<h3>${t.label}</h3><div class="desc">${t.description || ""}</div><pre class="ex">${jsyaml.dump([Object.assign({ template: t.name }, t.example)])}</pre>`; };
    list.appendChild(li);
  });
  document.getElementById("status").textContent = "نسخه‌ی اولیه: فقط پیش‌نمایش قالب‌ها. ویرایشگر کامل در دست ساخت است (HANDOFF.md).";
  frame.addEventListener("load", () => list.firstChild && list.firstChild.click());
  document.getElementById("play").onclick = () => frame.contentWindow.postMessage({ cmd: "play" }, "*");
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest(".modal").hidden = true));
  document.getElementById("helpBtn").onclick = () => (document.getElementById("help").hidden = false);
})();
