/* PratMusic player + Bring Your Own Files panel */
"use strict";

const state = {
  library: null,
  queue: [],
  index: -1,
  shuffle: false,
  repeat: false,
  filter: { vibe: null, source: "all", query: "" },
  favs: new Set(JSON.parse(localStorage.getItem("pratmusic:favs") || "[]")),
};

function saveFavs() {
  localStorage.setItem("pratmusic:favs", JSON.stringify([...state.favs]));
}

const $ = (sel) => document.querySelector(sel);
const audio = $("#audio");

/* ------------------------------------------------------------------ */
/* data                                                                */
/* ------------------------------------------------------------------ */
async function loadLibrary() {
  const res = await fetch("/api/library");
  state.library = await res.json();
  renderVibes();
  renderGrid();
}

function vibeColors(vibeKey) {
  const v = (state.library.vibes || {})[vibeKey];
  return v ? v.palette : ["#221a33", "#555", "#999"];
}

function matches(t) {
  const f = state.filter;
  if (f.source === "generated" && t.source !== "generated") return false;
  if (f.source === "byo" && t.source !== "byo") return false;
  if (f.source === "fav" && !state.favs.has(t.id)) return false;
  if (f.vibe && t.vibe !== f.vibe) return false;
  if (f.query) {
    const q = f.query.toLowerCase();
    const hay = `${t.title} ${t.artist} ${t.album} ${t.vibe_label} ${(t.moods || []).join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function visibleTracks() {
  return (state.library.tracks || []).filter(matches);
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */
function renderVibes() {
  const ul = $("#vibe-list");
  ul.innerHTML = "";
  const all = document.createElement("li");
  all.className = "active";
  all.dataset.vibe = "";
  all.innerHTML = `<span class="vibe-dot" style="background:linear-gradient(135deg,#c46bd8,#6bb8ff)"></span>All vibes`;
  all.onclick = () => setVibeFilter(null);
  ul.appendChild(all);

  for (const [key, v] of Object.entries(state.library.vibes || {})) {
    const li = document.createElement("li");
    li.dataset.vibe = key;
    const [c1, c2] = v.palette;
    li.innerHTML = `
      <span class="vibe-dot" style="background:linear-gradient(135deg,${c1},${c2})"></span>
      <span>${v.label}</span>
      <span class="vibe-ref">vibe of ${v.reference}</span>`;
    li.onclick = () => setVibeFilter(key);
    ul.appendChild(li);
  }
}

function setVibeFilter(key) {
  state.filter.vibe = key || null;
  document.querySelectorAll(".vibe-list li").forEach((li) => {
    li.classList.toggle("active", (li.dataset.vibe || null) === (key || null));
  });
  renderGrid();
}

function fmt(sec) {
  if (sec == null) return "?:??";
  sec = Math.round(sec);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function renderGrid() {
  const grid = $("#grid");
  const tracks = visibleTracks();
  grid.innerHTML = "";
  $("#empty-state").classList.toggle("hidden", tracks.length > 0);

  const headingBits = [];
  if (state.filter.vibe) headingBits.push(state.library.vibes[state.filter.vibe].label);
  if (state.filter.source === "byo") headingBits.push("— My Files");
  if (state.filter.source === "generated") headingBits.push("— PratMusic Originals (CC0)");
  $("#grid-heading").textContent = headingBits.length ? headingBits.join(" ") : "All tracks";

    for (const t of tracks) {
    const card = document.createElement("div");
    card.className = "card" + (state.queue[state.index]?.id === t.id ? " playing" : "");
    const art = t.artwork ? "/" + t.artwork : "";
    const isFav = state.favs.has(t.id);
    card.innerHTML = `
      ${art ? `<img src="${art}" alt="" loading="lazy">` : `<div class="cover-fallback">🎵</div>`}
      <div class="body">
        <div class="title-row">
          <div class="title">${esc(t.title)}</div>
          <button class="fav-btn${isFav ? " faved" : ""}" data-fav="${t.id}" title="Favourite">${isFav ? "♥" : "♡"}</button>
        </div>
        <div class="artist">${esc(t.artist)}</div>
        <div class="meta">
          ${t.vibe_label ? `<span class="badge vibe">${esc(t.vibe_label)}</span>` : ""}
          ${t.source === "generated" ? `<span class="badge cc">CC0</span>` : `<span class="badge byo">my files</span>`}
          <span class="dur">${fmt(t.duration)}</span>
        </div>
      </div>`;
    card.onclick = (e) => {
      if (e.target.classList.contains("fav-btn")) return; // handled below
      playTrack(t.id);
    };
    grid.appendChild(card);
  }
}

/* favourite toggling (event delegation) */
const gridEl = $("#grid");
gridEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".fav-btn");
  if (!btn) return;
  const id = btn.dataset.fav;
  if (state.favs.has(id)) {
    state.favs.delete(id);
    btn.textContent = "♡";
    btn.classList.remove("faved");
  } else {
    state.favs.add(id);
    btn.textContent = "♥";
    btn.classList.add("faved");
  }
  saveFavs();
  if (state.filter.source === "fav") renderGrid();
});

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------------------------------------------ */
/* playback                                                            */
/* ------------------------------------------------------------------ */
function playTrack(id) {
  const tracks = visibleTracks();
  const idx = tracks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    state.queue = tracks;
    state.index = idx;
  }
  loadAndPlay(id);
}

function loadAndPlay(id) {
  const t = state.library.tracks.find((x) => x.id === id);
  if (!t) return;
  audio.src = `/audio?id=${encodeURIComponent(t.id)}`;
  audio.play().catch(() => {});
  $("#pb-title").textContent = t.title;
  $("#pb-artist").textContent = `${t.artist} · ${t.vibe_label || "My Files"}`;
  $("#pb-art").src = t.artwork ? "/" + t.artwork : "";
  $("#pb-art").classList.toggle("hidden", !t.artwork);
  $("#np-title").textContent = t.title;
  $("#np-artist").textContent = `${t.artist} — ${t.vibe_label || "My Files"}`;
  $("#np-art").src = t.artwork ? "/" + t.artwork : "";
  $("#now-playing-strip").classList.remove("hidden");
  $("#btn-play").textContent = "▶";
  renderGrid();
}

audio.addEventListener("play", () => ($("#btn-play").textContent = "⏸"));
audio.addEventListener("pause", () => ($("#btn-play").textContent = "▶"));
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  $("#seek").value = Math.round((audio.currentTime / audio.duration) * 1000);
  $("#pb-cur").textContent = fmt(audio.currentTime);
  $("#pb-total").textContent = fmt(audio.duration);
});
audio.addEventListener("loadedmetadata", () => {
  $("#pb-total").textContent = fmt(audio.duration);
});
audio.addEventListener("ended", () => {
  if (state.repeat) { audio.currentTime = 0; audio.play(); return; }
  nextTrack();
});

function step(dir) {
  if (!state.queue.length) return;
  if (state.shuffle) {
    let i;
    do { i = Math.floor(Math.random() * state.queue.length); }
    while (state.queue.length > 1 && i === state.index);
    state.index = i;
  } else {
    state.index = (state.index + dir + state.queue.length) % state.queue.length;
  }
  loadAndPlay(state.queue[state.index].id);
}

function nextTrack() { step(1); }
function prevTrack() { step(-1); }

$("#btn-play").onclick = () => {
  if (!audio.src) {
    const first = visibleTracks()[0];
    if (first) playTrack(first.id);
    return;
  }
  audio.paused ? audio.play() : audio.pause();
};
$("#btn-next").onclick = nextTrack;
$("#btn-prev").onclick = prevTrack;
$("#btn-shuffle").onclick = (e) => {
  state.shuffle = !state.shuffle;
  e.currentTarget.classList.toggle("on", state.shuffle);
};
$("#btn-repeat").onclick = (e) => {
  state.repeat = !state.repeat;
  e.currentTarget.classList.toggle("on", state.repeat);
};
$("#seek").oninput = (e) => {
  if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration;
};
$("#volume").oninput = (e) => (audio.volume = parseFloat(e.target.value));

/* filters */
$("#search").oninput = (e) => { state.filter.query = e.target.value; renderGrid(); };
document.querySelectorAll(".src").forEach((a) => {
  a.onclick = (e) => {
    e.preventDefault();
    state.filter.source = a.dataset.src;
    document.querySelectorAll(".src").forEach((x) => x.classList.toggle("active", x === a));
    renderGrid();
  };
});

/* ------------------------------------------------------------------ */
/* Bring Your Own Files panel                                          */
/* ------------------------------------------------------------------ */
const byo = { files: [], artist: "", vibe: "bring-your-own", title: "" };

function openByo() {
  $("#byo-backdrop").classList.remove("hidden");
  buildArtistChips();
  buildVibeSelect();
}
function closeByo() { $("#byo-backdrop").classList.add("hidden"); }

$("#byo-open").onclick = openByo;
$("#byo-close").onclick = closeByo;
$("#byo-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "byo-backdrop") closeByo();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeByo();
});

function buildArtistChips() {
  const box = $("#artist-chips");
  box.innerHTML = "";
  const artists = [
    "Lana Del Rey", "The Neighbourhood", "Dua Lipa", "Rihanna",
    "Lady Gaga", "Other",
  ];
  for (const a of artists) {
    const chip = document.createElement("span");
    chip.className = "chip" + (a === byo.artist ? " sel" : "");
    chip.textContent = a;
    chip.onclick = () => {
      byo.artist = a;
      buildArtistChips();
      $("#byo-artist-custom").value = a === "Other" ? "" : a;
    };
    box.appendChild(chip);
  }
}

function buildVibeSelect() {
  const sel = $("#byo-vibe");
  sel.innerHTML = '<option value="bring-your-own">— none (just “My Files”) —</option>';
  for (const [key, v] of Object.entries(state.library.vibes || {})) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${v.label} (${v.style})`;
    sel.appendChild(opt);
  }
}

$("#byo-artist-custom").oninput = (e) => { byo.artist = e.target.value.trim() || byo.artist; };
$("#byo-vibe").onchange = (e) => (byo.vibe = e.target.value);
$("#byo-title").oninput = (e) => (byo.title = e.target.value.trim());

const dz = $("#dropzone");
["dragenter", "dragover"].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
["dragleave", "drop"].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
dz.addEventListener("drop", (e) => { setFiles(e.dataTransfer.files); });
$("#file-input").onchange = (e) => setFiles(e.target.files);

function setFiles(fileList) {
  byo.files = Array.from(fileList);
  $("#byo-upload").disabled = byo.files.length === 0;
  const names = byo.files.map((f) => f.name).join(", ");
  $("#byo-status").textContent = `${byo.files.length} file(s) staged: ${names.slice(0, 120)}`;
  $("#byo-progress").classList.remove("hidden");
  $("#byo-bar-fill").style.width = "0%";
}

$("#byo-upload").onclick = async () => {
  if (!byo.files.length) return;
  const form = new FormData();
  for (const f of byo.files) form.append("file", f, f.name);
  const artist = $("#byo-artist-custom").value.trim() || byo.artist || "Other";
  form.append("artist", artist);
  form.append("vibe", byo.vibe);
  form.append("title", byo.title);

  const btn = $("#byo-upload");
  btn.disabled = true;
  $("#byo-done").classList.add("hidden");
  const fill = $("#byo-bar-fill");
  const status = $("#byo-status");
  status.textContent = "Uploading…";

  try {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) fill.style.width = `${Math.round((e.loaded / e.total) * 100)}%`;
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        fill.style.width = "100%";
        status.textContent = `Uploaded ${byo.files.length} file(s) ✔`;
        $("#byo-done").classList.remove("hidden");
        loadLibrary(); // refresh track list incl. My Files
      } else {
        status.textContent = `Upload failed: ${xhr.status} ${xhr.responseText}`;
      }
      btn.disabled = false;
    };
    xhr.onerror = () => {
      status.textContent = "Upload failed (network error).";
      btn.disabled = false;
    };
    xhr.send(form);
  } catch (err) {
    status.textContent = `Upload failed: ${err}`;
    btn.disabled = false;
  }
};

$("#byo-done-refresh").onclick = (e) => { e.preventDefault(); closeByo(); loadLibrary(); };

/* ------------------------------------------------------------------ */
/* keyboard shortcuts                                                  */
/* ------------------------------------------------------------------ */
document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "select" || tag === "textarea") return;
  switch (e.key) {
    case " ":
      e.preventDefault();
      $("#btn-play").click();
      break;
    case "ArrowRight":
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      break;
    case "ArrowLeft":
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      break;
    case "ArrowUp":
      e.preventDefault();
      audio.volume = Math.min(1, audio.volume + 0.1);
      $("#volume").value = audio.volume;
      break;
    case "ArrowDown":
      e.preventDefault();
      audio.volume = Math.max(0, audio.volume - 0.1);
      $("#volume").value = audio.volume;
      break;
    case "n": nextTrack(); break;
    case "p": prevTrack(); break;
    case "s": $("#btn-shuffle").click(); break;
    case "r": $("#btn-repeat").click(); break;
    case "/":
      e.preventDefault();
      $("#search").focus();
      break;
  }
});

/* ------------------------------------------------------------------ */
loadLibrary();
