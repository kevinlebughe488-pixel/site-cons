// Film de lancement Tribune Supporters.
// Toute l'animation est une timeline GSAP en pause, calée sur la voix off (build/timeline.js).
// Le rendu appelle window.seek(t) image par image ; window.SFX liste les bruitages à mixer.
(async () => {
  // Les polices doivent être chargées avant de découper les textes en lettres.
  await Promise.all(
    ["900", "800", "700", "600"].map((w) => document.fonts.load(`${w} 100px "Barlow Condensed"`))
      .concat(["700", "600", "400"].map((w) => document.fonts.load(`${w} 20px "Source Sans 3"`))),
  );
  gsap.registerPlugin(SplitText, DrawSVGPlugin, CustomEase);
  const T = window.TIMELINE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const line = (id) => T.lines[id];
  const at = (id, i = 0) => T.lines[id].parts[i].start;
  const end = (id, i) => {
    const p = T.lines[id].parts;
    return (i === undefined ? p[p.length - 1] : p[i]).end;
  };
  const scene = (n) => T.scenes[n];
  const SFX = [];
  const sfx = (t, name, gain = 1) => SFX.push({ t: +t.toFixed(3), name, gain });
  window.SFX = SFX;

  // Hasard reproductible : chaque rendu donne exactement les mêmes images.
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => rng(n * 7919 + 13)();
  const money = (v) => Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ") + " $";

  CustomEase.create("punch", "M0,0 C0.1,0.9 0.25,1.04 0.5,1.01 0.75,0.99 0.9,1 1,1");

  // ------------------------------------------------------------------ construction du décor
  function inlineLogo(svg) {
    const sym = $("#i-logo");
    svg.setAttribute("viewBox", sym.getAttribute("viewBox"));
    svg.innerHTML = sym.innerHTML;
  }
  $$("svg.mark").forEach(inlineLogo);

  const lamps = [330, 760, 1160, 1590].map((x) => {
    const beam = document.createElement("div");
    beam.className = "beam";
    beam.style.left = x + "px";
    beam.style.transform = `rotate(${((x - 960) / 960) * 24}deg)`;
    const lamp = document.createElement("div");
    lamp.className = "lamp";
    lamp.style.left = x + "px";
    lamp.innerHTML = '<div class="core"></div><div class="grid"></div>';
    $("#lights").append(beam, lamp);
    return { lamp, beam };
  });

  const rand = rng(42);
  const particles = Array.from({ length: 70 }, () => {
    const el = document.createElement("i");
    const big = rand() < 0.18;
    const size = big ? 18 + rand() * 40 : 2 + rand() * 7;
    el.style.width = el.style.height = size + "px";
    el.style.opacity = big ? 0.12 + rand() * 0.15 : 0.35 + rand() * 0.6;
    if (big) el.style.filter = "blur(4px)";
    $("#particles").append(el);
    return { el, x: rand() * 1920, y: rand() * 1080, v: 8 + rand() * 30, a: 10 + rand() * 40, f: 0.2 + rand() * 0.6, p: rand() * 6.28 };
  });

  // Tribune : trois rangées de supporters en contre-jour, écharpes et drapeaux.
  const crowd = (() => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 2000 560");
    svg.innerHTML = `<defs>
      <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd083" stop-opacity="0"/><stop offset=".35" stop-color="#f2dc9a" stop-opacity=".35"/><stop offset="1" stop-color="#ecd083" stop-opacity=".08"/></linearGradient>
      <pattern id="drc" width="120" height="80" patternUnits="userSpaceOnUse"><rect width="120" height="80" fill="#0a86e6"/><path d="M-10 86 130 -6" stroke="#f7d618" stroke-width="30"/><path d="M-10 86 130 -6" stroke="#ce1021" stroke-width="20"/><use href="#i-star" x="6" y="6" width="26" height="26"/></pattern>
    </defs><rect x="0" y="90" width="2000" height="470" fill="url(#glow)"/>`;
    const r = rng(7);
    const scarves = [], flags = [], arms = [];
    const rows = [
      { base: 330, s: 0.62, fill: "#06120b", n: 30 },
      { base: 440, s: 0.82, fill: "#030a06", n: 24 },
      { base: 575, s: 1.08, fill: "#010402", n: 18 },
    ];
    const palettes = [["#0a86e6", "#f7d618", "#ce1021"], ["#1d5237", "#ecd083", "#1d5237"], ["#ce1021", "#f7d618", "#0a86e6"]];
    rows.forEach((row, ri) => {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("fill", row.fill);
      let html = "";
      const step = 2000 / row.n;
      for (let i = 0; i < row.n; i++) {
        const x = i * step + step / 2 + (r() - 0.5) * step * 0.5;
        const s = row.s * (0.9 + r() * 0.2);
        const b = row.base + (r() - 0.5) * 16;
        const roll = r();
        if (roll < 0.22 && ri < 2) {
          // écharpe tendue au-dessus de la tête
          const pal = palettes[Math.floor(r() * palettes.length)];
          const w = 120 * s, h = 26 * s, y = b - 225 * s;
          scarves.push({ id: `sc${ri}_${i}`, x, y: y + h / 2, ph: r() * 6.28 });
          html += `<g id="sc${ri}_${i}"><path d="M${x - 40 * s} ${b - 90 * s}L${x - w / 2 + 6 * s} ${y + h}M${x + 40 * s} ${b - 90 * s}L${x + w / 2 - 6 * s} ${y + h}" stroke="${row.fill}" stroke-width="${13 * s}" stroke-linecap="round"/>
            <rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${3 * s}" fill="${pal[0]}"/><rect x="${x - w / 2}" y="${y + h * 0.36}" width="${w}" height="${h * 0.28}" fill="${pal[1]}"/>
            <path d="M${x - w / 2} ${y + h}v${10 * s}M${x - w / 2 + 8 * s} ${y + h}v${10 * s}M${x + w / 2} ${y + h}v${10 * s}M${x + w / 2 - 8 * s} ${y + h}v${10 * s}" stroke="${pal[2]}" stroke-width="${3 * s}"/></g>`;
        } else if (roll < 0.3 && ri > 0) {
          // drapeau de la RDC sur un mât
          const fx = x + 10 * s, top = b - 330 * s;
          flags.push({ id: `fl${ri}_${i}`, x: fx, y: top, ph: r() * 6.28 });
          html += `<path d="M${fx} ${b - 90 * s}V${top}" stroke="#2a2f2b" stroke-width="${5 * s}"/><path d="M${x - 30 * s} ${b - 90 * s}L${fx} ${b - 160 * s}" stroke="${row.fill}" stroke-width="${13 * s}" stroke-linecap="round"/>
            <rect id="fl${ri}_${i}" x="${fx}" y="${top}" width="${120 * s}" height="${80 * s}" fill="url(#drc)" transform-origin="${fx} ${top + 40 * s}"/>`;
        } else if (roll < 0.62) {
          // bras levés
          const side = r() < 0.5 ? -1 : 1;
          arms.push({ id: `ar${ri}_${i}`, x: x + side * 34 * s, y: b - 80 * s, ph: r() * 6.28, side });
          html += `<path id="ar${ri}_${i}" d="M${x + side * 34 * s} ${b - 80 * s}l${side * 22 * s} ${-110 * s}" stroke="${row.fill}" stroke-width="${14 * s}" stroke-linecap="round"/>`;
        }
        html += `<circle cx="${x}" cy="${b - 132 * s}" r="${27 * s}"/><path d="M${x - 52 * s} ${b + 40}V${b - 50 * s}Q${x - 50 * s} ${b - 98 * s} ${x} ${b - 100 * s}Q${x + 50 * s} ${b - 98 * s} ${x + 52 * s} ${b - 50 * s}V${b + 40}Z"/>`;
      }
      g.innerHTML = html;
      svg.append(g);
    });
    $("#crowd").append(svg);
    const flashes = Array.from({ length: 16 }, (_, i) => {
      const f = document.createElement("div");
      f.className = "flashbulb";
      f.style.left = 80 + hash(i + 1) * 1760 + "px";
      f.style.top = 640 + hash(i + 50) * 260 + "px";
      $("#s-intro").append(f);
      return f;
    });
    return {
      scarves: scarves.map((s) => ({ ...s, el: svg.getElementById(s.id) })),
      flags: flags.map((s) => ({ ...s, el: svg.getElementById(s.id) })),
      arms: arms.map((s) => ({ ...s, el: svg.getElementById(s.id) })),
      flashes,
    };
  })();

  // Billets qui s'envolent (le problème).
  const notes = Array.from({ length: 9 }, (_, i) => {
    const n = document.createElement("div");
    n.className = "note";
    n.innerHTML = "<span>$</span>";
    $("#notes").append(n);
    return n;
  });

  // Téléphone : la liste des campagnes, comme dans l'application.
  const camps = [
    { t: "Nouvelle pelouse du stade", raised: 8640, goal: 12000, c1: "#1d5237", c2: "#ecd083", n: 412 },
    { t: "Chaussures pour les U17", raised: 2310, goal: 3500, c1: "#7a1f2b", c2: "#f3d36b", n: 167 },
    { t: "Un bus pour les déplacements", raised: 15800, goal: 40000, c1: "#123a6b", c2: "#e9eef5", n: 655 },
  ];
  $("#mlist").innerHTML = camps
    .map((c) => {
      const p = Math.round((c.raised / c.goal) * 100);
      return `<div class="mcard"><div class="cov"><svg viewBox="0 0 320 70" preserveAspectRatio="xMidYMid slice"><rect width="320" height="70" fill="${c.c1}"/>
        <g fill="rgba(255,255,255,.06)"><rect width="40" height="70"/><rect x="80" width="40" height="70"/><rect x="160" width="40" height="70"/><rect x="240" width="40" height="70"/></g>
        <g fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.5"><path d="M160 0v70"/><circle cx="160" cy="35" r="20"/></g>
        <path transform="translate(149 18)" d="M11 0 22 4v9c0 7-4 11-11 14C4 24 0 20 0 13V4Z" fill="${c.c1}" stroke="${c.c2}" stroke-width="2"/></svg></div>
        <div class="bd"><div class="club"><svg width="14" height="16" viewBox="0 0 22 27"><path d="M11 0 22 4v9c0 7-4 11-11 14C4 24 0 20 0 13V4Z" fill="${c.c1}" stroke="${c.c2}" stroke-width="2"/></svg>Votre club</div>
        <h4>${c.t}</h4><div class="mbar"><i style="width:${p}%"></i></div>
        <div class="mfig"><span><b>${money(c.raised)}</b> sur ${money(c.goal)}</span><span>${c.n} supporters</span></div></div><span class="ring"></span></div>`;
    })
    .join("");

  // Registre : des contributions qui s'ajoutent.
  const ops = ["M-Pesa", "Airtel Money", "Orange Money"];
  const lr = rng(99);
  $("#ledger-track").innerHTML = Array.from({ length: 26 }, (_, i) => {
    const amount = [5, 10, 20, 20, 50, 10, 100, 20][Math.floor(lr() * 8)];
    const ref = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(lr() * 32)]).join("");
    const min = 59 - Math.floor(i * 2.1);
    return `<div class="row"><span class="t">14:${String(Math.max(min, 1)).padStart(2, "0")}</span><span class="w">Contribution<small>${ops[Math.floor(lr() * 3)]} · Réf. TRB-${ref}</small></span><span class="a">+${amount} $</span></div>`;
  }).join("");

  // La RDC : les 26 chefs-lieux de province (latitude, longitude).
  const capitals = [
    ["Kinshasa", -4.32, 15.31, "k"], ["Lubumbashi", -11.66, 27.48, "l"], ["Goma", -1.68, 29.22, "g"], ["Matadi", -5.82, 13.46, "m"],
    ["Kisangani", 0.52, 25.19, "ks"], ["Mbuji-Mayi", -6.14, 23.6, "mm"],
    ["Kenge", -4.8, 16.9], ["Bandundu", -3.32, 17.38], ["Inongo", -1.95, 18.27], ["Tshikapa", -6.42, 20.8], ["Kananga", -5.9, 22.42],
    ["Kabinda", -6.13, 24.48], ["Lusambo", -4.97, 23.44], ["Kindu", -2.95, 25.92], ["Bukavu", -2.51, 28.86], ["Bunia", 1.57, 30.25],
    ["Isiro", 2.77, 27.62], ["Buta", 2.8, 24.73], ["Gbadolite", 4.28, 21.01], ["Lisala", 2.15, 21.51], ["Gemena", 3.25, 19.77],
    ["Mbandaka", 0.05, 18.26], ["Boende", -0.28, 20.88], ["Kalemie", -5.95, 29.19], ["Kamina", -8.74, 25.0], ["Kolwezi", -10.72, 25.47],
  ].map(([name, lat, lon, key]) => ({ name, key, x: (lon - 12) * 48 + 10, y: (5.6 - lat) * 48 }));
  const map = (() => {
    const edges = new Set();
    capitals.forEach((a, i) => {
      capitals
        .map((b, j) => [Math.hypot(a.x - b.x, a.y - b.y), j])
        .sort((p, q) => p[0] - q[0])
        .slice(1, 3)
        .forEach(([, j]) => edges.add([Math.min(i, j), Math.max(i, j)].join("-")));
    });
    const route = ["k", "l", "g", "m", "ks", "mm"].map((k) => capitals.find((c) => c.key === k));
    let html = `<svg viewBox="0 0 940 940"><g class="net" stroke="rgba(236,208,131,.5)" stroke-width="2" fill="none">${[...edges]
      .map((e) => {
        const [a, b] = e.split("-").map((n) => capitals[n]);
        return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;
      })
      .join("")}</g>
      <g class="route" stroke="#f7d618" stroke-width="4" fill="none" stroke-linecap="round">${route
        .slice(1)
        .map((b, i) => `<path d="M${route[i].x} ${route[i].y}Q${(route[i].x + b.x) / 2} ${Math.min(route[i].y, b.y) - 60} ${b.x} ${b.y}"/>`)
        .join("")}</g>`;
    capitals.forEach((c, i) => {
      const named = !!c.key;
      html += `<g class="city${named ? " named" : ""}" data-i="${i}" transform="translate(${c.x} ${c.y})">
        <circle class="pulse" r="10" fill="none" stroke="#f7d618" stroke-width="3" opacity="0"/>
        <circle class="pt" r="${named ? 12 : 7}" fill="${named ? "#f7d618" : "#ecd083"}"/>
        ${named ? `<text x="${c.key === "m" ? -22 : 22}" y="9" font-size="34" fill="#f3f5ef" text-anchor="${c.key === "m" ? "end" : "start"}">${c.name}</text>` : ""}</g>`;
    });
    $("#map").innerHTML = html + "</svg>";
    return { route: $$("#map .route path"), net: $$("#map .net path") };
  })();

  // ------------------------------------------------------------------ timeline
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out", duration: 0.8 } });
  const show = (sel, from, to) => {
    tl.set(sel, { visibility: "visible" }, from);
    if (to !== undefined) tl.set(sel, { visibility: "hidden" }, to);
  };
  const split = (sel, type = "chars") => SplitText.create(sel, { type: type === "chars" ? "words,chars" : "words", mask: type === "chars" ? undefined : "words" });
  const counters = [];
  const counter = (el, t0, t1, from, to, fmt) => counters.push({ el: $(el), t0, t1, from, to, fmt });

  const tIntro = 0;
  const tPB = scene("probleme").start - 0.9;
  const tRev = line("change").start - 0.5;
  const tTout = line("change").start + 0.46 * (line("change").end - line("change").start);
  const tHow = scene("fonctionnement").start - 0.8;
  const tTrust = scene("confiance").start - 0.45;
  const tNation = scene("nation").start - 0.9;
  const tFinal = scene("final").start - 0.9;
  const D = T.duration;

  gsap.set(".scene", { visibility: "hidden" });
  gsap.set(["#particles", "#haze"], { opacity: 0 });
  gsap.set("#phone", { transformPerspective: 1800 });
  gsap.set(["#scr2 .rad", "#scr2 .pin i"], { "--on": 0 });
  tl.to("#fade", { opacity: 0, duration: 1.4, ease: "power1.inOut" }, 0.15);

  // -------- 1 · ouverture : le stade s'allume
  show("#s-intro", tIntro, tPB + 1);
  lamps.forEach(({ lamp, beam }, i) => {
    const t = 0.55 + i * 0.38;
    tl.to(lamp, { keyframes: { opacity: [0, 1, 0.2, 1] }, duration: 0.28, ease: "none" }, t);
    tl.to(beam, { opacity: 0.85, duration: 0.5, ease: "power2.out" }, t + 0.05);
    sfx(t, "clunk", 0.9 - i * 0.05);
  });
  tl.to("#haze", { opacity: 1, duration: 1.5 }, 0.9);
  tl.to("#particles", { opacity: 0.75, duration: 2 }, 1);

  tl.fromTo("#s-intro .star", { scale: 0, rotation: -120, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.3, ease: "back.out(1.7)" }, 2.0);
  sfx(2.0, "shimmer", 0.8);

  const adr = line("adresse");
  const peuple = split("#t-peuple");
  tl.from(peuple.chars, { yPercent: 110, opacity: 0, rotationX: -80, transformOrigin: "50% 100%", stagger: 0.028, duration: 0.7, ease: "back.out(1.6)" }, adr.start - 0.05);
  sfx(adr.start, "hit", 0.7);
  const tCompat = adr.start + 0.5 * (adr.end - adr.start);
  tl.from("#t-compat", { opacity: 0, letterSpacing: "0.75em", duration: 1.4, ease: "power2.out" }, tCompat);
  tl.to(["#s-intro .star", "#t-peuple", "#t-compat"], { y: -90, opacity: 0, duration: 0.6, ease: "power2.in", stagger: 0.05 }, line("jeu").start - 0.55);

  const jeu = line("jeu");
  tl.fromTo(".ball", { y: -420, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "bounce.out" }, jeu.start - 0.35);
  tl.fromTo(".ball .spin", { rotation: -200, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 1.3, ease: "power2.out" }, jeu.start - 0.35);
  sfx(jeu.start + 0.15, "kick", 0.7);
  tl.from("#t-jeu .a", { y: 40, opacity: 0, duration: 0.6 }, jeu.start);
  const jeuB = split("#t-jeu .b", "words");
  tl.from(jeuB.words, { yPercent: 105, duration: 0.6, stagger: 0.07 }, jeu.start + 1.05);
  tl.fromTo("#t-jeu .gold", { scale: 1 }, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }, jeu.end - 0.35);
  tl.to(["#t-jeu", ".ball"], { y: -70, opacity: 0, duration: 0.45, ease: "power2.in" }, line("passion").start - 0.4);

  const pas = line("passion");
  tl.from("#t-passion .a", { y: 40, opacity: 0, duration: 0.6 }, pas.start);
  const pasB = split("#t-passion em", "words");
  tl.from(pasB.words, { yPercent: 105, duration: 0.6, stagger: 0.08 }, pas.start + 1.35);
  tl.to("#t-passion .uline", { scaleX: 1, duration: 0.7, ease: "power3.inOut" }, pas.start + 1.75);
  sfx(pas.start + 1.35, "swoosh", 0.5);
  tl.to("#t-passion", { y: -70, opacity: 0, duration: 0.45, ease: "power2.in" }, line("tribunes").start - 0.35);

  const trib = line("tribunes");
  tl.from("#crowd", { y: 560, duration: 1.6, ease: "power2.out" }, trib.start - 0.45);
  tl.to(lamps.map((l) => l.beam), { opacity: 1, duration: 1 }, trib.start);
  sfx(trib.start - 0.45, "crowd", 1);
  const nous = $$("#t-nous div");
  [end("tribunes", 0) - 0.78, at("tribunes", 1), at("tribunes", 2)].forEach((t, i) => {
    tl.from(nous[i], { scale: 1.6, opacity: 0, filter: "blur(16px)", duration: 0.45, ease: "expo.out" }, t);
    sfx(t, "boom", 0.8);
  });

  // -------- 2 · le problème : les projecteurs s'éteignent
  [3, 1, 2, 0].forEach((li, i) => {
    tl.to([lamps[li].lamp, lamps[li].beam], { opacity: 0, duration: 0.12, ease: "none" }, tPB + i * 0.16);
    sfx(tPB + i * 0.16, "clunk", 0.75);
  });
  tl.to(["#t-nous", "#crowd"], { opacity: 0, y: 40, duration: 0.6, ease: "power2.in" }, tPB);
  tl.to("#haze", { opacity: 0, duration: 0.6 }, tPB);
  tl.to("#particles", { opacity: 0.25, duration: 1 }, tPB);
  tl.to("#bg-grey", { opacity: 1, duration: 1.2, ease: "power1.inOut" }, tPB + 0.3);
  show("#s-pb", tPB + 0.5, tRev + 0.7);

  const moy = line("moyens");
  const moyW = split("#t-moyens", "words");
  tl.from(moyW.words, { yPercent: 105, duration: 0.6, stagger: 0.07 }, moy.start);
  tl.to("#t-moyens", { y: -175, scale: 0.7, duration: 0.7, ease: "power3.inOut" }, line("manques").start - 0.45);
  $$(".pcard").forEach((card, i) => {
    const t = at("manques", i);
    tl.fromTo(card, { y: 90, opacity: 0, rotationX: 35, transformPerspective: 1200 }, { y: 0, opacity: 1, rotationX: 0, duration: 0.6, ease: "back.out(1.4)" }, t - 0.05);
    tl.from($$('path[stroke="#c8432f"]', card), { drawSVG: "0%", duration: 0.45, ease: "power2.inOut" }, t + 0.35);
    sfx(t - 0.05, "thud", 0.9);
  });
  const arg = line("argent");
  tl.to(".pcard", { y: 70, opacity: 0, duration: 0.45, stagger: 0.06, ease: "power2.in" }, arg.start - 0.4);
  tl.to("#t-moyens", { opacity: 0, duration: 0.4 }, arg.start - 0.4);
  const nr = rng(5);
  notes.forEach((n, i) => {
    const left = i % 2 === 0;
    const t0 = arg.start + 0.05 + i * 0.09;
    gsap.set(n, { x: left ? -300 - nr() * 200 : 2000 + nr() * 200, y: 120 + nr() * 700, rotation: (nr() - 0.5) * 80, opacity: 0 });
    tl.to(n, { opacity: 1, duration: 0.12 }, t0);
    tl.to(n, { x: 855 + (nr() - 0.5) * 60, y: 330 + (nr() - 0.5) * 60, rotation: (nr() - 0.5) * 720, scale: 0.15, duration: 1.15, ease: "power2.in" }, t0);
    tl.to(n, { opacity: 0, duration: 0.2 }, t0 + 0.95);
  });
  sfx(arg.start, "whoosh", 0.8);
  tl.from("#qmark .q", { drawSVG: "0%", duration: 1.2, ease: "power2.inOut" }, arg.start + 0.6);
  tl.from("#qmark .qdot", { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(3)" }, arg.start + 1.7);
  tl.from("#t-argent .a", { y: 30, opacity: 0, duration: 0.6 }, arg.start + 0.1);
  const argB = split("#t-argent .b", "words");
  tl.from(argB.words, { yPercent: 105, duration: 0.6, stagger: 0.07 }, arg.start + 1.3);
  sfx(arg.start + 1.3, "drone", 0.9);

  // -------- 3 · révélation
  sfx(arg.end, "riser", 1);
  tl.to("#qmark", { scale: 0, rotation: 200, opacity: 0, duration: 0.55, ease: "back.in(2)" }, tRev);
  tl.to("#t-argent", { opacity: 0, y: 30, duration: 0.4, ease: "power2.in" }, tRev);
  show("#s-rev", tRev, tHow + 1);
  tl.from("#t-change .a", { y: 40, opacity: 0, duration: 0.5 }, line("change").start + 0.05);
  tl.set("#flash", { opacity: 0.95 }, tTout);
  tl.to("#flash", { opacity: 0, duration: 0.9, ease: "power2.out" }, tTout);
  tl.set("#bg-pitch", { opacity: 1 }, tTout);
  tl.set(["#bg-grey", "#bg-night"], { opacity: 0 }, tTout);
  tl.set(["#particles"], { opacity: 0.85 }, tTout);
  tl.from("#t-change .b", { scale: 1.7, opacity: 0, duration: 0.55, ease: "expo.out" }, tTout);
  tl.to("#rays", { opacity: 1, duration: 1.2 }, tTout);
  tl.to("#s-rev", { keyframes: { x: [0, -14, 11, -7, 4, 0], y: [0, 8, -6, 4, -2, 0] }, duration: 0.4, ease: "none" }, tTout);
  sfx(tTout, "impact", 1);

  const voi = line("voici");
  tl.to("#t-change", { y: -70, opacity: 0, duration: 0.45, ease: "power2.in" }, voi.start - 0.4);
  tl.from("#logo .lg-box", { drawSVG: "0%", duration: 0.9, ease: "power2.inOut" }, voi.start - 0.1);
  tl.from("#logo .lg-mid", { drawSVG: "50% 50%", duration: 0.5, ease: "power2.out" }, voi.start + 0.45);
  tl.from("#logo .lg-ring", { drawSVG: "0%", rotation: -90, svgOrigin: "17 17", duration: 0.6, ease: "power2.out" }, voi.start + 0.7);
  tl.fromTo("#logo .mark", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, voi.start + 1.15);
  const word = split("#logo .word");
  tl.from(word.chars, { yPercent: 100, opacity: 0, duration: 0.6, stagger: 0.045, ease: "back.out(1.8)" }, voi.start + 0.75);
  tl.from("#logo .tag", { opacity: 0, letterSpacing: "1.2em", duration: 1.1, ease: "power3.out" }, voi.start + 1.35);
  sfx(voi.start + 0.75, "logo", 1);
  tl.to("#rays", { opacity: 0.7, duration: 1 }, voi.start + 2);
  const plat = line("plateforme");
  const platW = split("#t-plateforme .a", "words");
  tl.from(platW.words, { yPercent: 100, opacity: 0, duration: 0.5, stagger: 0.035 }, plat.start + 0.05);

  // -------- 4 · comment ça marche (fond clair, comme l'application)
  tl.fromTo("#bg-paper", { opacity: 1, clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 0.95, ease: "power3.inOut" }, tHow);
  tl.to(["#logo", "#t-plateforme"], { scale: 0.85, opacity: 0, duration: 0.6, ease: "power2.in" }, tHow);
  tl.to("#rays", { opacity: 0, duration: 0.6 }, tHow);
  tl.to("#particles", { opacity: 0, duration: 0.5 }, tHow + 0.3);
  sfx(tHow, "whoosh", 0.9);
  show("#s-how", tHow + 0.2, tTrust + 0.8);
  tl.fromTo("#phone", { opacity: 0, y: 260, rotationY: -28, rotationX: 10 }, { opacity: 1, y: 0, rotationY: -9, rotationX: 3, duration: 1.2, ease: "power3.out" }, tHow + 0.35);
  tl.to("#bug", { opacity: 1, duration: 0.6 }, tHow + 0.6);
  tl.set("#scr1", { opacity: 1 }, tHow);

  const prj = line("projet");
  tl.set("#st1", { opacity: 1 }, prj.start - 0.4);
  tl.from(["#st1 .num", "#st1 h2"], { x: -70, opacity: 0, duration: 0.6, stagger: 0.1 }, prj.start - 0.4);
  const chips1 = $$("#st1 .chip"), rings = $$("#mlist .ring");
  [1, 2, 3].forEach((p, i) => {
    const t = at("projet", p);
    tl.to(chips1[i], { opacity: 1, duration: 0.01 }, t - 0.05);
    tl.from(chips1[i], { x: -60, scale: 0.85, duration: 0.5, ease: "back.out(2)" }, t - 0.05);
    tl.to(rings[i], { opacity: 1, duration: 0.25 }, t - 0.05);
    tl.fromTo($$("#mlist .mcard")[i], { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 }, t - 0.05);
    if (i) tl.to(rings[i - 1], { opacity: 0, duration: 0.25 }, t - 0.05);
    sfx(t - 0.05, "pop", 0.9);
  });

  const pay = line("payez");
  tl.to("#st1", { x: -60, opacity: 0, duration: 0.4, ease: "power2.in" }, pay.start - 0.45);
  tl.set("#st2", { opacity: 1 }, pay.start - 0.1);
  tl.from(["#st2 .num", "#st2 h2"], { x: -70, opacity: 0, duration: 0.6, stagger: 0.1 }, pay.start - 0.1);
  tl.fromTo("#scr2", { opacity: 1, xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: "power3.inOut" }, pay.start - 0.3);
  tl.to("#scr1", { xPercent: -30, duration: 0.6, ease: "power3.inOut" }, pay.start - 0.3);
  sfx(pay.start - 0.3, "swipe", 0.7);
  const chips2 = $$("#st2 .chip"), opts = $$("#scr2 .opt");
  [end("payez", 0) - 0.55, at("payez", 1), at("payez", 2) + 0.15].forEach((t, i) => {
    tl.to(chips2[i], { opacity: 1, duration: 0.01 }, t);
    tl.from(chips2[i], { x: -60, scale: 0.85, duration: 0.5, ease: "back.out(2)" }, t);
    tl.to(opts[i].querySelector(".rad"), { "--on": 1, duration: 0.2 }, t);
    tl.to(opts[i].querySelector(".hl"), { opacity: 1, duration: 0.2 }, t);
    if (i) {
      tl.to(opts[i - 1].querySelector(".rad"), { "--on": 0, duration: 0.2 }, t);
      tl.to(opts[i - 1].querySelector(".hl"), { opacity: 0, duration: 0.2 }, t);
    }
    sfx(t, "click", 0.9);
  });

  const val = line("valider");
  tl.to("#st2", { x: -60, opacity: 0, duration: 0.4, ease: "power2.in" }, val.start - 0.45);
  tl.set("#st3", { opacity: 1 }, val.start - 0.1);
  tl.from(["#st3 .num", "#st3 h2"], { x: -70, opacity: 0, duration: 0.6, stagger: 0.1 }, val.start - 0.1);
  tl.fromTo("#scr2 .pay", { scale: 1 }, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, val.start - 0.2);
  sfx(val.start - 0.2, "click", 0.8);
  tl.to("#scr2 .ussd", { opacity: 1, duration: 0.3 }, val.start + 0.25);
  tl.from("#scr2 .ussd .box", { y: 60, scale: 0.92, duration: 0.45, ease: "back.out(1.6)" }, val.start + 0.25);
  sfx(val.start + 0.25, "notif", 1);
  $$("#scr2 .pin i").forEach((dot, i) => {
    const t = at("valider", 1) + 0.55 + i * 0.27;
    tl.to(dot, { "--on": 1, duration: 0.1 }, t);
    sfx(t, "tick", 0.8);
  });
  const fait = at("valider", 2) - 0.12;
  tl.to("#scr3", { opacity: 1, duration: 0.3 }, fait);
  tl.from("#scr3 .chk .c", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.2)" }, fait);
  tl.from("#scr3 .chk .k", { drawSVG: "0%", duration: 0.4, ease: "power2.out" }, fait + 0.2);
  tl.from(["#scr3 h3", "#scr3 p", "#scr3 .ref", "#scr3 .mini"], { y: 20, opacity: 0, duration: 0.4, stagger: 0.06 }, fait + 0.15);
  tl.to("#done-word", { opacity: 1, duration: 0.01 }, fait);
  tl.from("#done-word", { scale: 1.5, filter: "blur(12px)", duration: 0.45, ease: "expo.out" }, fait);
  tl.to("#mini-bar", { width: "73%", duration: 0.8 }, fait + 0.4);
  counter("#mini-raised", fait + 0.4, fait + 1.1, 8640, 8660, money);
  counter("#mini-pct", fait + 0.4, fait + 1.1, 72, 73, (v) => Math.round(v) + " %");
  sfx(fait, "success", 1);

  // -------- 5 · confiance
  tl.to(["#how-left", "#phone"], { x: -120, opacity: 0, duration: 0.45, ease: "power2.in", stagger: 0.05 }, tTrust - 0.05);
  sfx(tTrust - 0.05, "whoosh", 0.6);
  show("#s-trust", tTrust + 0.2, tNation + 1);
  tl.from("#trust-head > *", { x: -70, opacity: 0, duration: 0.6, stagger: 0.1 }, tTrust + 0.25);
  const gs = $$(".g");
  const guarantee = (i, t) => {
    tl.to(gs[i], { opacity: 1, duration: 0.01 }, t);
    tl.from(gs[i], { x: -50, duration: 0.5, ease: "back.out(1.8)" }, t);
    tl.from(gs[i].querySelector(".tick"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, t);
  };
  const panel = (sel, t, prev) => {
    if (prev) tl.to(prev, { y: -50, opacity: 0, duration: 0.35, ease: "power2.in" }, t - 0.3);
    tl.fromTo(sel, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" }, t - 0.05);
  };
  const stamp = (sel, t) => {
    tl.fromTo(sel, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.22, ease: "power4.in" }, t);
    sfx(t + 0.2, "stamp", 1);
  };

  const ver = line("verifie");
  panel("#p-club", ver.start);
  tl.from("#p-club .shield", { scale: 0, duration: 0.6, ease: "back.out(1.8)" }, ver.start + 0.05);
  tl.from("#p-club .ck", { drawSVG: "0%", duration: 0.4 }, ver.start + 0.5);
  stamp("#p-club .stamp", end("verifie", 0) - 0.45);
  guarantee(0, end("verifie", 0) - 0.25);
  panel("#p-camp", at("verifie", 1), "#p-club");
  $$("#p-camp .checks div").forEach((d, i) => {
    const t = at("verifie", 1) + 0.45 + i * 0.32;
    tl.to(d, { opacity: 1, duration: 0.2 }, t);
    tl.to(d.querySelector("i"), { backgroundColor: "#2c7a4f", borderColor: "#2c7a4f", duration: 0.2 }, t);
    sfx(t, "tick", 0.6);
  });
  stamp("#p-camp .stamp", end("verifie", 1) - 0.35);
  guarantee(1, end("verifie", 1) - 0.15);

  const reg = line("registre");
  panel("#p-ledger", reg.start, "#p-camp");
  tl.fromTo("#ledger-track", { y: -18 * 72 }, { y: 0, duration: reg.end - reg.start + 1.2, ease: "power1.inOut" }, reg.start);
  counter("#ledger-total", reg.start, reg.end + 1, 8640, 9185, money);
  counter("#ledger-count", reg.start, reg.end + 1, 412, 437, (v) => Math.round(v) + " contributions");
  for (let t = reg.start + 0.2; t < reg.end + 0.8; t += 0.28) sfx(t, "coin", 0.35);
  guarantee(2, reg.start + 0.6);

  const tra = line("tranches");
  panel("#p-tranches", tra.start, "#p-ledger");
  tl.from("#p-tranches .mil", { opacity: 0, x: 40, duration: 0.4, stagger: 0.1 }, tra.start + 0.1);
  guarantee(3, tra.start + 0.9);
  const mils = $$("#p-tranches .mil");
  [[0, at("tranches", 1) + 0.3, at("tranches", 2) + 0.05], [1, at("tranches", 2) + 0.75, at("tranches", 2) + 0.85]].forEach(([i, tDone, tProof]) => {
    tl.to(mils[i].querySelector(".fill"), { scale: 1, duration: 0.4, ease: "back.out(2.5)" }, tDone);
    tl.to(mils[i].querySelector(".proofb"), { opacity: 1, duration: 0.01 }, tProof);
    tl.from(mils[i].querySelector(".proofb"), { scale: 0.5, duration: 0.4, ease: "back.out(2.5)" }, tProof);
    sfx(tDone, "ding", 0.8);
  });

  const rem = line("rembourse");
  panel("#p-refund", rem.start, "#p-tranches");
  tl.to("#refund-bar", { width: "64%", duration: 1.3, ease: "power2.out" }, rem.start + 0.3);
  tl.to("#p-refund .toast", { opacity: 1, duration: 0.01 }, at("rembourse", 1));
  tl.from("#p-refund .toast", { y: 40, scale: 0.9, duration: 0.5, ease: "back.out(2)" }, at("rembourse", 1));
  sfx(at("rembourse", 1), "success", 0.8);
  guarantee(4, at("rembourse", 1) + 0.2);

  // -------- 6 · la nation : le drapeau, puis les 26 provinces
  tl.to(["#trust-head", "#guarantees", "#trust-right"], { x: -90, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.in" }, tNation - 0.2);
  tl.to("#bug", { opacity: 0, duration: 0.3 }, tNation);
  tl.fromTo("#bg-flag", { opacity: 1, clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 0.75, ease: "power3.inOut" }, tNation);
  tl.from("#bg-flag .band i", { scaleX: 0, duration: 0.8, ease: "power3.out" }, tNation + 0.3);
  tl.from("#bg-flag .star", { scale: 0, rotation: -180, duration: 0.9, ease: "back.out(1.7)" }, tNation + 0.45);
  sfx(tNation, "whoosh", 1);
  sfx(tNation + 0.45, "flag", 1);
  tl.set("#bg-paper", { opacity: 0 }, tNation + 0.8);
  const vil = line("villes");
  tl.to("#bg-flag .shade", { opacity: 1, duration: 0.9, ease: "power2.inOut" }, vil.start - 0.2);
  tl.to("#particles", { opacity: 0.55, duration: 1 }, vil.start);
  show("#s-nation", vil.start - 0.2, tFinal + 1);

  const cls = $$("#cities-text .cl");
  const cityEl = (key) => $(`#map .city[data-i="${capitals.findIndex((c) => c.key === key)}"]`);
  const ping = (key, t) => {
    const g = cityEl(key);
    tl.from(g.querySelector(".pt"), { scale: 0, transformOrigin: "50% 50%", duration: 0.45, ease: "back.out(3)" }, t);
    tl.set(g.querySelector(".pulse"), { attr: { r: 10 }, opacity: 1 }, t);
    tl.to(g.querySelector(".pulse"), { attr: { r: 70 }, opacity: 0, duration: 1, ease: "power2.out" }, t);
    tl.from(g.querySelector("text"), { opacity: 0, x: key === "m" ? 15 : -15, duration: 0.4 }, t + 0.1);
    sfx(t, "ping", 0.8);
  };
  const cityLine = (el, t) => {
    tl.to(el, { opacity: 1, duration: 0.01 }, t);
    tl.from(el, { x: -60, filter: "blur(10px)", duration: 0.5, ease: "power3.out" }, t);
  };
  const vt = [at("villes", 0) + 0.05, end("villes", 0) - 0.75, at("villes", 1), end("villes", 1) - 0.55, at("villes", 2), end("villes", 2) - 0.8];
  cityLine(cls[0], vt[0]); ping("k", vt[0] + 0.2);
  cityLine(cls[1], vt[1]); ping("l", vt[1] + 0.15);
  cityLine(cls[2], vt[2]); ping("g", vt[2] + 0.15); ping("m", vt[3]);
  cityLine(cls[3], vt[4]); ping("ks", vt[4] + 0.2);
  cityLine(cls[4], vt[5]); ping("mm", vt[5] + 0.15);
  map.route.forEach((p, i) => tl.from(p, { drawSVG: "0%", duration: 0.6, ease: "power2.inOut" }, [vt[1], vt[2] + 0.05, vt[3], vt[4] + 0.05, vt[5]][i]));

  const pro = line("provinces");
  tl.to(cls, { x: -60, opacity: 0, duration: 0.4, stagger: 0.04, ease: "power2.in" }, pro.start - 0.5);
  tl.from("#prov .n", { opacity: 0, scale: 0.7, duration: 0.5, ease: "back.out(1.6)" }, pro.start - 0.1);
  counter("#prov .n", pro.start - 0.1, pro.start + 1.25, 0, 26, (v) => String(Math.round(v)));
  const others = $$("#map .city:not(.named) .pt");
  tl.from(others, { scale: 0, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(3)", stagger: { each: 0.06, from: "random" } }, pro.start - 0.1);
  sfx(pro.start - 0.1, "counter", 0.9);
  tl.from("#prov .p", { y: 40, opacity: 0, duration: 0.5 }, pro.start + 0.25);
  tl.from("#prov .s", { y: 40, opacity: 0, duration: 0.5 }, at("provinces", 1) - 0.05);
  tl.from(map.net, { drawSVG: "0%", duration: 1.1, ease: "power2.inOut", stagger: 0.012 }, at("provinces", 1) - 0.1);
  sfx(at("provinces", 1) - 0.05, "shimmer", 0.9);

  const ens = line("ensemble");
  tl.to("#prov", { opacity: 0, y: -40, duration: 0.45, ease: "power2.in" }, ens.start - 0.45);
  tl.to("#map", { opacity: 0.2, scale: 0.92, x: -420, duration: 1.1, ease: "power3.inOut" }, ens.start - 0.45);
  tl.to("#map text", { opacity: 0, duration: 0.5 }, ens.start - 0.45);
  tl.from("#t-ensemble .a", { y: 30, opacity: 0, duration: 0.5 }, ens.start);
  const ensB = split("#t-ensemble .b", "words");
  tl.from(ensB.words, { yPercent: 105, duration: 0.55, stagger: 0.07 }, ens.start + 0.95);
  sfx(ens.start + 0.95, "swoosh", 0.6);

  // -------- 7 · final : retour au stade
  tl.to(["#s-nation"], { opacity: 0, duration: 0.5 }, tFinal);
  tl.to("#bg-flag", { opacity: 0, duration: 0.8 }, tFinal);
  tl.set("#flash", { opacity: 0.6 }, tFinal + 0.3);
  tl.to("#flash", { opacity: 0, duration: 0.8 }, tFinal + 0.3);
  lamps.forEach(({ lamp, beam }, i) => {
    const t = tFinal + 0.1 + i * 0.12;
    tl.to(lamp, { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.2, ease: "none" }, t);
    tl.to(beam, { opacity: 0.7, duration: 0.4 }, t);
    if (i % 2 === 0) sfx(t, "clunk", 0.7);
  });
  tl.to("#haze", { opacity: 1, duration: 1 }, tFinal);
  tl.to("#particles", { opacity: 0.9, duration: 1 }, tFinal + 0.3);
  show("#s-final", tFinal + 0.3);

  const nom = line("nom");
  tl.from("#f-logo .lg-box", { drawSVG: "0%", duration: 0.7, ease: "power2.inOut" }, nom.start - 0.45);
  tl.from("#f-logo .lg-mid", { drawSVG: "50% 50%", duration: 0.4 }, nom.start - 0.05);
  tl.from("#f-logo .lg-ring", { drawSVG: "0%", duration: 0.5 }, nom.start + 0.1);
  const fword = split("#f-logo .word");
  tl.from(fword.chars, { yPercent: 100, opacity: 0, duration: 0.55, stagger: 0.04, ease: "back.out(1.8)" }, nom.start - 0.05);
  tl.from("#f-logo .tag", { opacity: 0, letterSpacing: "1.2em", duration: 1, ease: "power3.out" }, nom.start + 0.55);
  sfx(nom.start - 0.05, "logo", 0.9);

  const vous = line("vous");
  const vousW = split("#t-vous", "words");
  tl.from(vousW.words.slice(0, 2), { yPercent: 105, duration: 0.5, stagger: 0.08 }, vous.start);
  tl.from(vousW.words.slice(2), { yPercent: 105, duration: 0.5, stagger: 0.08, ease: "back.out(1.6)" }, vous.start + 0.7);
  sfx(vous.start + 0.7, "boom", 0.9);
  const dol = line("dollar");
  tl.from("#t-dollar", { y: 30, opacity: 0, duration: 0.6 }, dol.start);
  const bie = line("bientot");
  tl.to("#t-bientot", { opacity: 1, duration: 0.01 }, bie.start - 0.05);
  tl.from("#t-bientot", { scale: 0.5, duration: 0.7, ease: "back.out(1.8)" }, bie.start - 0.05);
  tl.from("#t-bientot svg", { rotation: -180, scale: 0, duration: 0.8, ease: "back.out(2)" }, bie.start + 0.1);
  tl.to("#f-ops", { opacity: 1, duration: 0.8 }, bie.start + 0.7);
  tl.to("#rays", { opacity: 0.6, duration: 1.2 }, bie.start);
  sfx(bie.start - 0.05, "impact", 0.9);
  sfx(bie.start, "crowd", 0.9);
  tl.to("#fade", { opacity: 1, duration: 1.4, ease: "power1.in" }, D - 1.5);
  tl.set({}, {}, D);

  // ------------------------------------------------------------------ mouvements continus
  const rays = $("#rays"), grain = $("#grain");
  const tribStart = line("tribunes").start - 0.5;
  function ambient(t) {
    particles.forEach((p) => {
      const y = (((p.y - t * p.v) % 1180) + 1180) % 1180 - 50;
      const x = p.x + Math.sin(t * p.f + p.p) * p.a;
      p.el.style.transform = `translate(${x}px,${y}px)`;
    });
    rays.style.transform = `rotate(${t * 5}deg)`;
    const f = Math.floor(t * 30);
    grain.style.backgroundPosition = `${Math.floor(hash(f) * 300)}px ${Math.floor(hash(f + 1e5) * 300)}px`;
    lamps.forEach(({ lamp }, i) => (lamp.style.transform = `scale(${1 + 0.025 * Math.sin(t * 9 + i * 2)})`));
    if (t > tribStart && t < tPB + 1) {
      const k = Math.min(1, (t - tribStart) / 1.5);
      crowd.scarves.forEach((s) => s.el.setAttribute("transform", `translate(0 ${Math.sin(t * 5 + s.ph) * 7 * k}) rotate(${Math.sin(t * 2.6 + s.ph) * 7 * k} ${s.x} ${s.y})`));
      crowd.flags.forEach((s) => s.el.setAttribute("transform", `skewY(${Math.sin(t * 4 + s.ph) * 6 * k}) scale(${1 - 0.06 * Math.abs(Math.sin(t * 3 + s.ph))} 1)`));
      crowd.arms.forEach((s) => s.el.setAttribute("transform", `rotate(${Math.sin(t * 6 + s.ph) * 9 * k} ${s.x} ${s.y})`));
      crowd.flashes.forEach((el, i) => (el.style.opacity = t < tPB && hash(Math.floor(t * 15) * 31 + i) > 0.965 ? 1 : 0));
    }
    counters.forEach((c) => {
      const k = gsap.utils.clamp(0, 1, (t - c.t0) / (c.t1 - c.t0));
      c.el.textContent = c.fmt(c.from + (c.to - c.from) * (1 - Math.pow(1 - k, 3)));
    });
  }

  window.seek = (t) => {
    tl.seek(t);
    ambient(t);
  };
  window.DURATION = D;
  // Repères de montage pour la musique (motion/audio.py).
  window.MARKS = { pb: tPB, tout: tTout, how: tHow, trust: tTrust, nation: tNation, final: tFinal, end: D,
    adresseEnd: adr.end, tribunes: trib.start, argent: arg.start, argentEnd: arg.end, voici: voi.start, bientot: bie.start };
  window.READY = true;

  // Aperçu dans un navigateur : ?t=12.5 fige une image, ?play joue le film avec le son.
  const q = new URLSearchParams(location.search);
  if (q.has("t")) window.seek(parseFloat(q.get("t")));
  else window.seek(0);
  if (q.has("play")) {
    document.body.classList.add("preview");
    const audio = new Audio(q.get("play") || "../build/mix.wav");
    document.body.addEventListener("click", () => {
      audio.play();
      const loop = () => {
        window.seek(audio.currentTime);
        if (!audio.paused) requestAnimationFrame(loop);
      };
      loop();
    });
  }
})();
