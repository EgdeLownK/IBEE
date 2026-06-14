/* global React, useT, Ph, IconSearch, IconChart, IconCard, IconFolder, IconImage, IconZap, IconPlug, IconSettings, IconMegaphone, IconPlus, IconMore, IconUpload, IconFile, IconFilter, IconMapPin, IconHeart, IconClock, IconUser, IconCash, IconCalendar, IconCheck, IconCaret, IconBriefcase, IconBag, IconNewspaper, IconLayout */

// =============================================================
//  Activity / dashboard
// =============================================================
const DASH_METRICS_FR = [
  { label: "Visites du profil", value: "12 480", delta: "+12,4%", up: true },
  { label: "Nouveaux abonnés",  value: "1 204",  delta: "+8,1%",  up: true },
  { label: "Revenu (30j)",      value: "€8 240", delta: "+22%",   up: true },
  { label: "Taux d'engagement", value: "4,8%",   delta: "-0,3%",  up: false },
];
const DASH_METRICS_EN = [
  { label: "Profile visits",      value: "12,480", delta: "+12.4%", up: true },
  { label: "New followers",       value: "1,204",  delta: "+8.1%",  up: true },
  { label: "Revenue (30d)",       value: "$8,240", delta: "+22%",   up: true },
  { label: "Engagement rate",     value: "4.8%",   delta: "-0.3%",  up: false },
];
const FEED_FR = [
  { icon: "user",     who: "Sofia M.",   what: "vous a suivi",                              when: "il y a 2 min" },
  { icon: "calendar", who: "Lucas R.",   what: "a réservé Forfait complet pour le 24 oct.", when: "il y a 18 min" },
  { icon: "heart",    who: "Mehdi B.",   what: "a aimé votre publication « Coupe dégradée »", when: "il y a 1 h" },
  { icon: "cash",     who: "Studio Killian", what: "a reçu un paiement de €65 de Lucas R.", when: "il y a 1 h" },
  { icon: "user",     who: "Emma G.",    what: "s'est abonnée",                            when: "il y a 3 h" },
  { icon: "calendar", who: "Théo D.",    what: "a annulé son RDV du 22 oct.",              when: "hier" },
];
const FEED_EN = [
  { icon: "user",     who: "Sofia M.",   what: "followed you",                              when: "2 min ago" },
  { icon: "calendar", who: "Lucas R.",   what: "booked Full Package for Oct 24",            when: "18 min ago" },
  { icon: "heart",    who: "Mehdi B.",   what: "liked your post “Fade tutorial”",           when: "1 h ago" },
  { icon: "cash",     who: "Studio Killian", what: "received a payment of $65 from Lucas R.",when: "1 h ago" },
  { icon: "user",     who: "Emma G.",    what: "subscribed",                                when: "3 h ago" },
  { icon: "calendar", who: "Théo D.",    what: "cancelled their Oct 22 appointment",        when: "yesterday" },
];

function ActivityScreen({ lang }) {
  const t = useT(lang);
  const metrics = lang === "fr" ? DASH_METRICS_FR : DASH_METRICS_EN;
  const feed = lang === "fr" ? FEED_FR : FEED_EN;
  const FeedIcon = (k) => ({
    user: <IconUser size={16} />, calendar: <IconCalendar size={16} />,
    heart: <IconHeart size={16} />, cash: <IconCash size={16} />,
  }[k]);

  return (
    <div className="fade-enter" data-screen-label="02 Activity">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        {lang === "fr" ? "Vue d'ensemble" : "Overview"}
      </h1>

      <div className="dash-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric">
            <div className="metric__label">{m.label}</div>
            <div className="metric__value">{m.value}</div>
            <div className={`metric__delta ${m.up ? "is-up" : "is-down"}`}>
              {m.delta} · {lang === "fr" ? "vs 30j" : "vs 30d"}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <div className="chart-card__title">
            {lang === "fr" ? "Trafic du profil — 14 jours" : "Profile traffic — 14 days"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="chip is-on">14J</button>
            <button className="chip">30J</button>
            <button className="chip">90J</button>
          </div>
        </div>
        <SparkBars />
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <div className="chart-card__title">
            {lang === "fr" ? "Activité récente" : "Recent activity"}
          </div>
          <button className="btn btn--sm">{lang === "fr" ? "Tout voir" : "View all"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {feed.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
              <div style={{ width: 36, height: 36, background: "var(--panel)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}>
                {FeedIcon(f.icon)}
              </div>
              <div style={{ flex: 1, fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{f.who}</span>{" "}<span className="t-muted">{f.what}</span>
              </div>
              <div className="t-mono t-xs t-muted">{f.when}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SparkBars() {
  const data = [42, 48, 39, 52, 60, 55, 70, 65, 72, 80, 78, 90, 85, 96];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${v}%`,
            background: i === data.length - 1 ? "var(--accent)" : "var(--panel-2)",
            borderRadius: "6px 6px 0 0",
            transition: "background 160ms",
          }}
          title={`Day ${i + 1}: ${v}`}
        />
      ))}
    </div>
  );
}

// =============================================================
//  Analytics — UNIFIED page with period switcher + scope switcher
//  Layout follows /Main/Activit---Analyics in Figma:
//  Header (title + Semaine|Mois|Année + Exporter)
//  → Scope tabs (Profil web · Service · Shop · Event · News)
//  → KPI row (3 cards + "Visiteur IA" mini card)
//  → Big chart card (bars by day)
//  → Bottom row: Localisation map card + Top-items list
//
//  KPIs, chart label, map points and the top-items list all switch
//  contextually based on the selected scope.
// =============================================================
function AnalyticsScreen({ lang }) {
  const [period, setPeriod] = React.useState("week"); // week|month|year
  const [scope, setScope]   = React.useState("web");
  const [selectedDay, setSelectedDay] = React.useState(null);

  const SCOPES = [
    { id: "web",     labelFr: "Profil web", labelEn: "Web profile", Icon: IconLayout },
    { id: "service", labelFr: "Service",    labelEn: "Service",     Icon: IconBriefcase },
    { id: "shop",    labelFr: "Shop",       labelEn: "Shop",        Icon: IconBag },
    { id: "event",   labelFr: "Event",      labelEn: "Event",       Icon: IconCalendar },
    { id: "news",    labelFr: "News",       labelEn: "News",        Icon: IconNewspaper },
  ];

  // ---- per-scope content config ----
  // Each scope owns its own KPIs, chart metric, top-list and ranking title.
  const CONFIG = {
    web: {
      metric:  lang === "fr" ? "Visiteurs" : "Visitors",
      kpis: [
        { k: lang === "fr" ? "Visiteurs"  : "Visitors",     v: "14 280", d: "+12%", up: true },
        { k: lang === "fr" ? "Membres"    : "Members",      v: "412",    d: "+8%",  up: true },
        { k: lang === "fr" ? "Désabonnés" : "Unsubscribed", v: "23",     d: "-4%",  up: false },
      ],
      bars: [120, 92, 145, 168, 134, 178, 102],
      ranking: {
        title: lang === "fr" ? "Sections les plus vues" : "Top sections",
        items: [
          { k: "Service",  v: "32%", n: "4 820" },
          { k: "Shop",     v: "21%", n: "3 120" },
          { k: lang === "fr" ? "Vidéo" : "Video", v: "14%", n: "2 040" },
          { k: lang === "fr" ? "Histoire" : "Story", v: "11%", n: "1 620" },
        ],
      },
    },
    service: {
      metric: lang === "fr" ? "Réservations" : "Bookings",
      kpis: [
        { k: lang === "fr" ? "Réservations"  : "Bookings",     v: "186",  d: "+9%",  up: true },
        { k: lang === "fr" ? "Taux conversion" : "Conv. rate", v: "6.8%", d: "+1.1%", up: true },
        { k: lang === "fr" ? "No-show"       : "No-shows",     v: "4",    d: "-2",   up: true },
      ],
      bars: [22, 18, 31, 26, 34, 42, 13],
      stats: [
        { l: lang === "fr" ? "Taux de remplissage du planning" : "Schedule fill rate",   v: "82 %" },
        { l: lang === "fr" ? "Nombre d'annulation"             : "Cancellations",        v: "4"    },
        { l: lang === "fr" ? "Nombre de rendez-vous effectué"  : "Appointments completed", v: "186" },
      ],
      ranking: {
        title: lang === "fr" ? "Top services" : "Top services",
        items: [
          { k: lang === "fr" ? "Forfait complet" : "Full package", v: "32%", n: "60" },
          { k: lang === "fr" ? "Coupe homme"     : "Men's cut",    v: "27%", n: "50" },
          { k: lang === "fr" ? "Coupe femme"     : "Women's cut",  v: "19%", n: "35" },
          { k: lang === "fr" ? "Rasage"          : "Hot shave",    v: "12%", n: "22" },
        ],
      },
    },
    shop: {
      metric: lang === "fr" ? "Ventes" : "Sales",
      kpis: [
        { k: lang === "fr" ? "Revenu"          : "Revenue",        v: "€3 240", d: "+22%", up: true },
        { k: lang === "fr" ? "Panier moyen"    : "Avg. basket",    v: "€34",    d: "+€2",  up: true },
        { k: lang === "fr" ? "Paniers abandon." : "Abandoned",     v: "11",     d: "-3",   up: true },
      ],
      bars: [320, 280, 410, 388, 460, 540, 220],
      stats: [
        { l: lang === "fr" ? "Unités vendus"      : "Units sold",       v: "312"  },
        { l: lang === "fr" ? "Panier moyen"       : "Avg. basket",     v: "€34"  },
        { l: lang === "fr" ? "Taux de conversion" : "Conversion rate", v: "3,8 %" },
      ],
      ranking: {
        title: lang === "fr" ? "Top produits" : "Top products",
        items: [
          { k: lang === "fr" ? "Cire mate"      : "Matte clay",    v: "28%", n: "48" },
          { k: lang === "fr" ? "Shampoing"      : "Shampoo",       v: "22%", n: "37" },
          { k: lang === "fr" ? "Huile à barbe"  : "Beard oil",     v: "18%", n: "31" },
          { k: lang === "fr" ? "Peigne bois"    : "Wood comb",     v: "12%", n: "20" },
        ],
      },
    },
    event: {
      metric: lang === "fr" ? "Inscriptions" : "Sign-ups",
      kpis: [
        { k: lang === "fr" ? "Inscriptions"     : "Sign-ups",        v: "78",  d: "+14", up: true },
        { k: lang === "fr" ? "Taux remplissage" : "Fill rate",       v: "82%", d: "+6%", up: true },
        { k: lang === "fr" ? "Annulations"      : "Cancellations",   v: "4",   d: "0",   up: true },
      ],
      bars: [8, 14, 22, 18, 28, 34, 10],
      stats: [
        { l: lang === "fr" ? "Billets vendus"            : "Tickets sold",            v: "78"        },
        { l: lang === "fr" ? "Taux de remplissage"       : "Fill rate",               v: "82 %"      },
        { l: lang === "fr" ? "Vitesse de vente moyenne"  : "Avg. sell-through speed", v: "14 / jour" },
      ],
      ranking: {
        title: lang === "fr" ? "Top événements" : "Top events",
        items: [
          { k: lang === "fr" ? "Portes ouvertes"   : "Open studio",   v: "42%", n: "33" },
          { k: lang === "fr" ? "Atelier barbe"     : "Beard workshop", v: "28%", n: "22" },
          { k: lang === "fr" ? "Soirée privée"     : "Private night", v: "18%", n: "14" },
          { k: lang === "fr" ? "Pop-up shop"       : "Pop-up shop",   v: "12%", n: "9"  },
        ],
      },
    },
    news: {
      metric: lang === "fr" ? "Vues" : "Views",
      kpis: [
        { k: lang === "fr" ? "Vues"      : "Views",       v: "8 420", d: "+11%", up: true },
        { k: lang === "fr" ? "Likes"     : "Likes",       v: "562",   d: "+18%", up: true },
        { k: lang === "fr" ? "Partages"  : "Shares",      v: "112",   d: "+9%",  up: true },
      ],
      bars: [180, 220, 290, 240, 310, 380, 160],
      ranking: {
        title: lang === "fr" ? "Top publications" : "Top posts",
        items: [
          { k: lang === "fr" ? "Lancement collection" : "Collection drop",   v: "31%", n: "2 610" },
          { k: lang === "fr" ? "Coulisses studio"     : "Behind the scenes", v: "24%", n: "2 020" },
          { k: lang === "fr" ? "Tendances hiver"      : "Winter trends",     v: "18%", n: "1 515" },
          { k: lang === "fr" ? "Interview Elle"       : "Elle feature",      v: "11%", n: "925"   },
        ],
      },
    },
  };

  const cfg = CONFIG[scope];
  const PERIODS = [
    { id: "week",  fr: "Semaine", en: "Week"  },
    { id: "month", fr: "Mois",    en: "Month" },
    { id: "year",  fr: "Année",   en: "Year"  },
  ];
  const DAY_LABELS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAYS = lang === "fr" ? DAY_LABELS_FR : DAY_LABELS_EN;
  const maxBar = Math.max(...cfg.bars);

  // Range label under chart heading
  const rangeLabel = period === "week"
    ? (lang === "fr" ? "17 Juin – 23 Juin 2025" : "Jun 17 – Jun 23, 2025")
    : period === "month"
      ? (lang === "fr" ? "Juin 2025" : "June 2025")
      : (lang === "fr" ? "Année 2025" : "Year 2025");

  return (
    <div className="fade-enter" data-screen-label="03 Analytics">
      {/* ============ Header row ============ */}
      <div className="anal-head">
        <h1 className="anal-head__title">
          {lang === "fr" ? "Analyse globale" : "Global analytics"}
        </h1>
        <div className="anal-period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`anal-period__btn ${period === p.id ? "is-on" : ""}`}
              onClick={() => setPeriod(p.id)}
            >
              {lang === "fr" ? p.fr : p.en}
            </button>
          ))}
        </div>
        <button className="btn anal-export">
          <IconUpload size={14} />
          <span>{lang === "fr" ? "Exporter" : "Export"}</span>
          <IconCaret size={10} />
        </button>
      </div>

      {/* ============ Scope tabs ============ */}
      <div className="anal-scope">
        {SCOPES.map((s) => {
          const IconC = s.Icon;
          return (
            <button
              key={s.id}
              className={`anal-scope__tab ${scope === s.id ? "is-on" : ""}`}
              onClick={() => { setScope(s.id); setSelectedDay(null); }}
            >
              <IconC size={14} />
              <span>{lang === "fr" ? s.labelFr : s.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ============ KPI row ============ */}
      <div className="anal-kpis">
        {cfg.kpis.map((k, i) => (
          <div key={i} className="anal-kpi">
            <div className="anal-kpi__label">{k.k}</div>
            <div className="anal-kpi__value">{k.v}</div>
            <div className={`anal-kpi__delta ${k.up ? "is-up" : "is-down"}`}>
              {k.d}
              <span className="t-muted t-xs" style={{ marginLeft: 6 }}>
                vs. {period === "week" ? (lang === "fr" ? "sem. dernière" : "last week")
                    : period === "month" ? (lang === "fr" ? "mois dernier" : "last month")
                    : (lang === "fr" ? "an dernier" : "last year")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ============ Chart card ============ */}
      <div className="anal-chart">
        <div className="anal-chart__head">
          <div>
            <div className="anal-chart__title">
              <span style={{ fontWeight: 500 }}>
                {lang === "fr" ? "Graphique" : "Chart"} —
              </span>{" "}
              <span style={{ color: "var(--text-2)" }}>{cfg.metric}</span>
            </div>
            <div className="anal-chart__range">
              <IconCalendar size={13} />
              <span>{rangeLabel}</span>
            </div>
          </div>
          <button className="btn btn--sm anal-chart__filter">
            <span>{lang === "fr" ? "Actuel" : "Current"}</span>
            <IconCaret size={10} />
          </button>
        </div>
        <div className="anal-chart__bars">
          {cfg.bars.map((v, i) => {
            const h = Math.round((v / maxBar) * 100);
            const isOn = selectedDay === i;
            return (
              <button
                key={i}
                className={`anal-bar ${isOn ? "is-on" : ""}`}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                title={`${DAYS[i]} — ${v}`}
              >
                <div className="anal-bar__value">{v}</div>
                <div className="anal-bar__fill" style={{ height: `${h}%` }} />
                <div className="anal-bar__day">{DAYS[i]}</div>
              </button>
            );
          })}
        </div>
        <div className="anal-chart__hint">
          {lang === "fr"
            ? "Vous pouvez sélectionner une barre du graphique."
            : "Click any bar to drill in."}
        </div>
        {cfg.stats && (
          <div className="anal-chart__stats">
            {cfg.stats.map((s, i) => (
              <div key={i} className="anal-stat">
                <div className="anal-stat__label">{s.l}</div>
                <div className="anal-stat__value">{s.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ Bottom row: Top items ============ */}
      <div className="anal-bottom">
        <TopItemsCard lang={lang} ranking={cfg.ranking} metric={cfg.metric} />
      </div>
    </div>
  );
}

// ---- Visiteur IA mini-card (placed inside the KPI row) ----
function AIVisitorCard({ lang }) {
  const series = [
    { k: "ChatGPT",    v: 62 },
    { k: "Gemini",     v: 24 },
    { k: "Perplexity", v: 9  },
    { k: "Claude",     v: 5  },
  ];
  return (
    <div className="anal-kpi anal-kpi--ai">
      <div className="anal-kpi__head">
        <div className="anal-kpi__label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconChart size={13} />
          <span>{lang === "fr" ? "Visiteurs IA" : "AI visitors"}</span>
        </div>
        <span className="anal-kpi__delta is-up" style={{ marginTop: 0 }}>+20%</span>
      </div>
      <div className="anal-ai__rows">
        {series.map((s) => (
          <div key={s.k} className="anal-ai__row">
            <span className="anal-ai__label">{s.k}</span>
            <div className="anal-ai__track">
              <div className="anal-ai__fill" style={{ width: `${s.v}%` }} />
            </div>
            <span className="anal-ai__pct t-mono">{s.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Localisation card (simplified: France map abstraction with city dots) ----
function LocalisationCard({ lang }) {
  const CITIES = [
    { name: "Lyon",       x: 58,  y: 60, w: 42 },
    { name: "Paris",      x: 49,  y: 30, w: 28 },
    { name: "Marseille",  x: 60,  y: 80, w: 14 },
    { name: "Lille",      x: 51,  y: 14, w:  8 },
    { name: "Bordeaux",   x: 38,  y: 70, w:  6 },
    { name: "Strasbourg", x: 78,  y: 32, w:  2 },
  ];
  return (
    <div className="anal-card">
      <div className="anal-card__head">
        <div className="anal-card__title">
          {lang === "fr" ? "Localisation" : "Locations"}
        </div>
        <button className="anal-card__filter">
          <span>{lang === "fr" ? "France" : "France"}</span>
          <IconCaret size={10} />
        </button>
      </div>
      <div className="anal-map" aria-hidden="true">
        {/* abstract pentagon-ish France silhouette */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <path
            d="M 38 8 L 60 6 L 78 22 L 82 42 L 76 64 L 68 86 L 50 92 L 36 86 L 22 70 L 18 48 L 24 28 Z"
            fill="var(--panel)"
            stroke="var(--border)"
            strokeWidth="0.4"
          />
        </svg>
        {CITIES.map((c) => {
          const size = 6 + Math.sqrt(c.w) * 4;
          return (
            <div key={c.name} className="anal-map__dot" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
              <span
                className="anal-map__pulse"
                style={{ width: size, height: size }}
              />
              <span className="anal-map__core" />
              <span className="anal-map__label">{c.name} · {c.w}%</span>
            </div>
          );
        })}
      </div>
      <div className="anal-map__legend">
        {CITIES.slice(0, 4).map((c) => (
          <div key={c.name} className="anal-map__legend-row">
            <span>{c.name}</span>
            <span className="t-mono">{c.w}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Top items (right card) ----
function TopItemsCard({ lang, ranking, metric }) {
  return (
    <div className="anal-card">
      <div className="anal-card__head">
        <div className="anal-card__title">{ranking.title}</div>
        <span className="t-muted t-xs">{metric}</span>
      </div>
      <div className="anal-top">
        {ranking.items.map((r, i) => (
          <button key={i} className="anal-top__row">
            <span className="anal-top__rank">{i + 1}</span>
            <div className="anal-top__col">
              <div className="anal-top__name">{r.k}</div>
              <div className="anal-top__bar">
                <div className="anal-top__fill" style={{ width: r.v }} />
              </div>
            </div>
            <div className="anal-top__nums">
              <div className="anal-top__pct">{r.v}</div>
              <div className="anal-top__count t-mono">{r.n}</div>
            </div>
          </button>
        ))}
      </div>
      <button className="anal-card__more">
        {lang === "fr" ? "Afficher plus" : "Show more"}
      </button>
    </div>
  );
}

// =============================================================
//  Marketing
// =============================================================
function MarketingScreen({ lang }) {
  return (
    <div className="fade-enter" data-screen-label="04 Marketing">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        Marketing
      </h1>
      <div className="dash-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { k: lang === "fr" ? "Campagnes actives" : "Active campaigns", v: "3" },
          { k: lang === "fr" ? "Impressions"        : "Impressions",     v: "84K" },
          { k: lang === "fr" ? "Coût d'acquisition" : "Cost per acquisition", v: "€2.40" },
        ].map((m, i) => (
          <div key={i} className="metric">
            <div className="metric__label">{m.k}</div>
            <div className="metric__value">{m.v}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-card__head">
          <div className="chart-card__title">{lang === "fr" ? "Campagnes en cours" : "Live campaigns"}</div>
          <button className="btn btn--accent btn--sm"><IconPlus size={14}/> {lang === "fr" ? "Nouvelle campagne" : "New campaign"}</button>
        </div>
        {[
          { name: "Promo Forfait Mariage", reach: "12,4K", spent: "€420", status: "active" },
          { name: "Re-engagement abonnés", reach: "8,1K",  spent: "€180", status: "active" },
          { name: "Boost Vidéo Tutoriel",  reach: "3,2K",  spent: "€60",  status: "paused" },
        ].map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 40px", gap: 16, alignItems: "center", padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
            <div>
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div className="t-xs t-muted">Facebook · Instagram · IBEE</div>
            </div>
            <div className="t-mono t-sm">{c.reach}</div>
            <div className="t-mono t-sm">{c.spent}</div>
            <div className="chip" style={{ background: c.status === "active" ? "rgba(44,141,74,0.12)" : "var(--panel)", color: c.status === "active" ? "rgb(44,141,74)" : "var(--text-2)" }}>
              {c.status === "active" ? (lang === "fr" ? "Active" : "Active") : (lang === "fr" ? "En pause" : "Paused")}
            </div>
            <button className="btn btn--icon" aria-label="More"><IconMore size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
//  Revenu
// =============================================================
function RevenuScreen({ lang }) {
  const fr = lang === "fr";
  // ----- weekly data (matches Figma "Revenu" page — week of 17–23 Jun 2025) -----
  const days   = fr ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
                    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates  = ["17 Juin", "18 Juin", "19 Juin", "20 Juin", "21 Juin", "22 Juin", "23 Juin"];
  const datesEn = ["Jun 17", "Jun 18", "Jun 19", "Jun 20", "Jun 21", "Jun 22", "Jun 23"];
  const values = [185, 240, 0, 320, 410, 510, 0];          // € per day
  const max    = Math.max(...values, 1);
  const total  = values.reduce((a, b) => a + b, 0);

  const [sel, setSel]     = React.useState(null);          // selected bar index | null
  const [range, setRange] = React.useState("week");        // week | year

  const fmt = (n) => n.toLocaleString(fr ? "fr-FR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  const headAmount = sel == null ? total : values[sel];
  const headLabel  = sel == null
    ? (fr ? "17 Juin - 23 Juin 2025" : "Jun 17 - Jun 23, 2025")
    : (fr ? dates[sel] + " 2025" : datesEn[sel] + ", 2025");

  const transfers = [
    { date: fr ? "23/06/2025" : "06/23/2025", label: fr ? "Virement SEPA"   : "SEPA transfer",   amount: "+ 510,00 €" },
    { date: fr ? "20/06/2025" : "06/20/2025", label: fr ? "Virement SEPA"   : "SEPA transfer",   amount: "+ 320,00 €" },
    { date: fr ? "16/06/2025" : "06/16/2025", label: fr ? "Virement SEPA"   : "SEPA transfer",   amount: "+ 425,00 €" },
    { date: fr ? "09/06/2025" : "06/09/2025", label: fr ? "Virement SEPA"   : "SEPA transfer",   amount: "+ 280,00 €" },
  ];

  const card = {
    background: "var(--surface)",
    borderRadius: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: "1px solid var(--border-soft)",
  };

  return (
    <div className="fade-enter" data-screen-label="05 Revenue">
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 22px" }}>
        <h1 className="t-display" style={{ fontSize: 26, fontWeight: 500, margin: 0, color: "var(--text-2)" }}>
          {fr ? "Revenus" : "Revenue"}
        </h1>
        <button type="button" style={{
          ...card, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 20,
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "11px 20px", fontFamily: "var(--font-body)", fontSize: 15,
          color: "var(--text)", cursor: "pointer",
        }}>
          {fr ? "Exporter" : "Export"}
          <svg width="12" height="7" viewBox="0 0 12 7" fill="none"><path d="M1 1l5 5 5-5" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* graph card */}
      <div style={{ ...card, padding: "20px 24px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, color: "var(--text-2)", marginBottom: 8 }}>{headLabel}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--text)" }}>{fmt(headAmount)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* week / year toggle */}
            <div style={{ display: "inline-flex", background: "var(--panel)", borderRadius: 10, padding: 2 }}>
              {[["week", fr ? "Semaine" : "Week"], ["year", fr ? "Année" : "Year"]].map(([k, lbl]) => (
                <button key={k} type="button" onClick={() => setRange(k)} style={{
                  border: "none", cursor: "pointer", borderRadius: 8, padding: "7px 16px",
                  fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13,
                  background: range === k ? "var(--surface)" : "transparent",
                  boxShadow: range === k ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  color: range === k ? "var(--text)" : "var(--text-2)",
                }}>{lbl}</button>
              ))}
            </div>
            {/* current period dropdown */}
            <button type="button" style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              background: "var(--panel)", border: "none", borderRadius: 10,
              padding: "7px 14px", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--text)",
            }}>
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M4 0L0 5h8z" fill="var(--text-3)" /></svg>
              {fr ? "Actuel" : "Current"}
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M4 5L0 0h8z" fill="var(--text-3)" /></svg>
            </button>
          </div>
        </div>

        {/* bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 218, marginTop: 26 }}>
          {values.map((v, i) => {
            const active = sel === i;
            return (
              <div key={i} onClick={() => setSel(active ? null : i)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", cursor: "pointer" }}>
                <div style={{
                  position: "relative", width: "100%", height: 188,
                  display: "flex", alignItems: "flex-end",
                  borderRadius: "10px 10px 0 0",
                  background: "rgb(249,250,251)",
                }}>
                  <div style={{
                    width: "100%",
                    height: `${Math.max((v / max) * 100, v === 0 ? 0 : 6)}%`,
                    borderRadius: "10px 10px 0 0",
                    background: active
                      ? "var(--accent)"
                      : "linear-gradient(rgb(209,213,219) 0%, rgb(152,159,171) 100%)",
                    transition: "background 140ms",
                  }} />
                  {active && (
                    <div style={{
                      position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
                      background: "var(--text)", color: "var(--surface)", borderRadius: 6,
                      padding: "3px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                      fontFamily: "var(--font-mono)",
                    }}>{fmt(v)}</div>
                  )}
                </div>
                <span style={{ marginTop: 9, fontSize: 15, fontWeight: 500, color: active ? "var(--text)" : "var(--text-2)" }}>{days[i]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 15, color: "var(--text-2)", marginTop: 16 }}>
          {fr ? "Vous pouvez sélectionner une barre du graphique" : "You can select a bar on the chart"}
        </div>
      </div>

      {/* current balance card */}
      <div style={{ ...card, padding: "19px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)" }}>{fr ? "Solde actuel" : "Current balance"}</div>
          <div style={{ fontSize: 15, color: "var(--text-2)", marginTop: 6 }}>
            {fr ? "Encaissement automatique le 24 Juin" : "Automatic payout on Jun 24"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--text)" }}>{fmt(1235)}</span>
          <button type="button" style={{
            display: "inline-flex", alignItems: "center", gap: 9,
            background: "var(--panel)", border: "1px solid var(--border-soft)", borderRadius: 10,
            padding: "9px 16px", cursor: "pointer",
            fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text)",
          }}>
            <svg width="15" height="17" viewBox="0 0 15 17" fill="none">
              <path d="M7.5 1v10M3.5 7l4 4 4-4M1 15h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {fr ? "Encaisser" : "Cash out"}
          </button>
        </div>
      </div>

      {/* transfers list */}
      <div style={{ ...card, padding: "19px 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
          {fr ? "Liste des virements" : "Transfers"}
        </div>
        {transfers.map((tr, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto", alignItems: "center", gap: 16,
            padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)",
          }}>
            <span style={{ fontSize: 16, color: "var(--text)" }}>{tr.date}</span>
            <span style={{ fontSize: 16, color: "var(--text-2)" }}>{tr.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "rgb(44,141,74)" }}>{tr.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
//  Paiement
// =============================================================
function PaiementScreen({ lang }) {
  const t = useT(lang);
  const [def, setDef] = React.useState(0);
  const cards = [
    { brand: "VISA",  last: "4242", exp: "08/27", holder: "Killian Le Querre" },
    { brand: "AMEX",  last: "1004", exp: "12/26", holder: "Killian Le Querre" },
    { brand: "MASTERCARD", last: "0023", exp: "03/28", holder: "Studio Killian" },
  ];
  return (
    <div className="fade-enter" data-screen-label="06 Payment">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>{t("payment")}</h1>

      <div className="chart-card">
        <div className="chart-card__head">
          <div className="chart-card__title">{lang === "fr" ? "Méthodes enregistrées" : "Saved methods"}</div>
          <button className="btn btn--accent btn--sm"><IconPlus size={14}/> {t("addCard")}</button>
        </div>
        {cards.map((c, i) => (
          <div key={i} className={`pay-method ${def === i ? "is-default" : ""}`} onClick={() => setDef(i)}>
            <div className="pay-method__icon">{c.brand}</div>
            <div>
              <div className="pay-method__num">•••• •••• •••• {c.last}</div>
              <div className="pay-method__meta">{c.holder} · {t("expires")} {c.exp}</div>
            </div>
            {def === i && <div className="pay-method__default-tag"><IconCheck size={12} style={{verticalAlign:"-2px"}}/> {t("defaultCard")}</div>}
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <div className="chart-card__title">{lang === "fr" ? "Coordonnées bancaires (versements)" : "Payout details"}</div>
          <button className="btn btn--sm">{lang === "fr" ? "Modifier" : "Edit"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, fontSize: 14 }}>
          <div className="t-muted">IBAN</div><div className="t-mono">FR76 3000 4002 1500 0123 4567 890</div>
          <div className="t-muted">BIC</div><div className="t-mono">BNPAFRPPXXX</div>
          <div className="t-muted">{lang === "fr" ? "Titulaire" : "Holder"}</div><div>Killian Le Querre</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
//  Drive
// =============================================================
const DRIVE_FOLDERS = [
  { name: "Photos clients", count: 142 },
  { name: "Factures 2025",  count: 38 },
  { name: "Contrats",       count: 12 },
  { name: "Branding",       count: 24 },
];
const DRIVE_FILES = [
  { name: "Plan studio 2025.pdf",        size: "2.4 MB", mod: "il y a 2 j", by: "Killian" },
  { name: "Devis - Mariage Octobre.docx", size: "184 KB", mod: "il y a 5 j", by: "Killian" },
  { name: "Logo - vector.svg",           size: "32 KB",  mod: "21 oct.",    by: "Manager" },
  { name: "Catalogue produits.pdf",      size: "5.1 MB", mod: "18 oct.",    by: "Killian" },
  { name: "Liste prestations.xlsx",      size: "44 KB",  mod: "15 oct.",    by: "Manager" },
];

function DriveScreen({ lang }) {
  const t = useT(lang);
  return (
    <div className="fade-enter" data-screen-label="07 Drive">
      <div className="drive-toolbar">
        <div style={{ flex: 1 }}>
          <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{t("drive")}</h1>
          <div className="drive-scope">
            <span className="drive-scope__chip">
              <IconLayout size={13} />
              {lang === "fr" ? "Profil web" : "Web profile"}
            </span>
            <span className="t-sm t-muted">
              {lang === "fr"
                ? "Fichiers propres à ce profil · Studio Killian"
                : "Files specific to this profile · Studio Killian"}
            </span>
          </div>
        </div>
        <button className="btn btn--ghost"><IconFolder size={14}/> {t("newFolder")}</button>
        <button className="btn btn--accent"><IconUpload size={14}/> {t("upload")}</button>
      </div>

      <div className="drive-folders">
        {DRIVE_FOLDERS.map((f, i) => (
          <div key={i} className="drive-folder">
            <div style={{ color: "var(--accent)" }}><IconFolder size={28}/></div>
            <div>
              <div className="drive-folder__name">{f.name}</div>
              <div className="drive-folder__meta">{f.count} {lang === "fr" ? "fichiers" : "files"}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="drive-files">
        <div className="drive-row drive-row__head">
          <div>{t("fileName")}</div><div>{t("fileSize")}</div><div>{t("fileModified")}</div><div>{t("fileOwner")}</div>
        </div>
        {DRIVE_FILES.map((f, i) => (
          <div key={i} className="drive-row">
            <div className="drive-row__name"><IconFile size={16}/> {f.name}</div>
            <div className="t-mono t-sm t-muted">{f.size}</div>
            <div className="t-sm t-muted">{f.mod}</div>
            <div className="t-sm">{f.by}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
//  Account Drive — aggregates the drives of every web profile
//  owned by the account (vs. DriveScreen which is per-profile).
// =============================================================
const ACCOUNT_PROFILES = [
  { id: "studio",   name: "Studio Killian",   role: { fr: "Barbier · Lyon",   en: "Barber · Lyon"    }, used: 8.4, files: 216, color: "var(--accent)" },
  { id: "care",     name: "Killian Care",     role: { fr: "Marque produits",  en: "Product brand"    }, used: 5.1, files: 132, color: "var(--nav-dark)" },
  { id: "academie", name: "Académie Killian", role: { fr: "Formation",        en: "Training"         }, used: 3.2, files: 74,  color: "rgb(168, 168, 168)" },
];
const ACCOUNT_QUOTA = 50; // Go

const ACCT_RECENT_FR = [
  { name: "Contrat bail studio.pdf",     profile: "Studio Killian",   size: "2,4 Mo", mod: "il y a 1 j" },
  { name: "Packaging cire mate.ai",      profile: "Killian Care",     size: "18 Mo",  mod: "il y a 2 j" },
  { name: "Support formation J1.pptx",   profile: "Académie Killian", size: "9,7 Mo", mod: "il y a 3 j" },
  { name: "Photos campagne automne.zip", profile: "Killian Care",     size: "240 Mo", mod: "il y a 5 j" },
  { name: "Planning équipe.xlsx",        profile: "Studio Killian",   size: "82 Ko",  mod: "21 oct." },
];
const ACCT_RECENT_EN = [
  { name: "Studio lease.pdf",            profile: "Studio Killian",   size: "2.4 MB", mod: "1 d ago" },
  { name: "Matte clay packaging.ai",     profile: "Killian Care",     size: "18 MB",  mod: "2 d ago" },
  { name: "Training deck D1.pptx",       profile: "Académie Killian", size: "9.7 MB", mod: "3 d ago" },
  { name: "Fall campaign photos.zip",    profile: "Killian Care",     size: "240 MB", mod: "5 d ago" },
  { name: "Team schedule.xlsx",          profile: "Studio Killian",   size: "82 KB",  mod: "Oct 21" },
];

function AccountDriveScreen({ lang, onOpenProfileDrive }) {
  const fr = lang === "fr";
  const totalUsed = ACCOUNT_PROFILES.reduce((a, p) => a + p.used, 0);
  const recent = fr ? ACCT_RECENT_FR : ACCT_RECENT_EN;
  const profileById = Object.fromEntries(ACCOUNT_PROFILES.map((p) => [p.name, p]));
  const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const fmtGo = (n) => `${n.toLocaleString(fr ? "fr-FR" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${fr ? "Go" : "GB"}`;

  return (
    <div className="fade-enter" data-screen-label="13 Account Drive">
      <div className="drive-toolbar">
        <div style={{ flex: 1 }}>
          <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{fr ? "Drive" : "Drive"}</h1>
          <div className="drive-scope">
            <span className="drive-scope__chip drive-scope__chip--account">
              <IconUser size={13} />
              {fr ? "Compte" : "Account"}
            </span>
            <span className="t-sm t-muted">
              {fr
                ? "Espace partagé entre tous vos profils web"
                : "Shared space across all your web profiles"}
            </span>
          </div>
        </div>
        <button className="btn btn--accent"><IconUpload size={14}/> {fr ? "Importer" : "Upload"}</button>
      </div>

      {/* ---- combined storage across profiles ---- */}
      <div className="acct-storage">
        <div className="acct-storage__head">
          <div className="acct-storage__title">{fr ? "Stockage du compte" : "Account storage"}</div>
          <div className="acct-storage__nums">
            <span className="acct-storage__used">{fmtGo(totalUsed)}</span>
            <span className="t-muted"> / {fmtGo(ACCOUNT_QUOTA)}</span>
          </div>
        </div>
        <div className="acct-storage__bar">
          {ACCOUNT_PROFILES.map((p) => (
            <div
              key={p.id}
              className="acct-storage__seg"
              style={{ width: `${(p.used / ACCOUNT_QUOTA) * 100}%`, background: p.color }}
              title={`${p.name} — ${fmtGo(p.used)}`}
            />
          ))}
        </div>
        <div className="acct-storage__legend">
          {ACCOUNT_PROFILES.map((p) => (
            <div key={p.id} className="acct-storage__legend-row">
              <span className="acct-storage__dot" style={{ background: p.color }} />
              <span>{p.name}</span>
              <span className="t-mono t-muted">{fmtGo(p.used)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- per-profile drive cards ---- */}
      <div className="acct-drive-label">{fr ? "Drives par profil" : "Drives by profile"}</div>
      <div className="acct-drive-grid">
        {ACCOUNT_PROFILES.map((p) => (
          <div key={p.id} className="acct-drive-card">
            <div className="acct-drive-card__head">
              <div className="acct-drive-card__avatar" style={{ background: p.color }}>{initials(p.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="acct-drive-card__name">{p.name}</div>
                <div className="acct-drive-card__role">{p.role[lang]}</div>
              </div>
            </div>
            <div className="acct-drive-card__stats">
              <div>
                <div className="acct-drive-card__stat-v">{fmtGo(p.used)}</div>
                <div className="acct-drive-card__stat-k">{fr ? "utilisés" : "used"}</div>
              </div>
              <div>
                <div className="acct-drive-card__stat-v">{p.files}</div>
                <div className="acct-drive-card__stat-k">{fr ? "fichiers" : "files"}</div>
              </div>
            </div>
            <button className="btn btn--ghost btn--sm acct-drive-card__open" onClick={onOpenProfileDrive}>
              <IconFolder size={14}/> {fr ? "Ouvrir le drive" : "Open drive"}
            </button>
          </div>
        ))}
      </div>

      {/* ---- recent files across all profiles ---- */}
      <div className="acct-drive-label">{fr ? "Récents · tous profils" : "Recent · all profiles"}</div>
      <div className="drive-files">
        <div className="drive-row drive-row__head drive-row--acct">
          <div>{fr ? "Nom" : "Name"}</div><div>{fr ? "Profil" : "Profile"}</div><div>{fr ? "Taille" : "Size"}</div><div>{fr ? "Modifié" : "Modified"}</div>
        </div>
        {recent.map((f, i) => {
          const p = profileById[f.profile];
          return (
            <div key={i} className="drive-row drive-row--acct">
              <div className="drive-row__name"><IconFile size={16}/> {f.name}</div>
              <div>
                <span className="acct-profile-tag">
                  <span className="acct-profile-tag__dot" style={{ background: p ? p.color : "var(--text-3)" }} />
                  {f.profile}
                </span>
              </div>
              <div className="t-mono t-sm t-muted">{f.size}</div>
              <div className="t-sm t-muted">{f.mod}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
//  Portfolio
// =============================================================
function PortfolioScreen({ lang }) {
  return (
    <div className="fade-enter" data-screen-label="08 Portfolio">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        Portfolio
      </h1>
      <div className="portfolio-grid">
        {Array.from({ length: 14 }).map((_, i) => (
          <Ph key={i} label={`work ${String(i + 1).padStart(2, "0")}`} />
        ))}
      </div>
    </div>
  );
}

// =============================================================
//  Automation
// =============================================================
function AutomationScreen({ lang }) {
  return (
    <div className="fade-enter" data-screen-label="09 Automation">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        Automation
      </h1>
      {[
        { trigger: lang === "fr" ? "Nouveau RDV" : "New booking", steps: [lang === "fr" ? "Envoyer SMS de confirmation" : "Send confirmation SMS", lang === "fr" ? "Bloquer créneau Calendar" : "Block Calendar slot", lang === "fr" ? "Notifier Manager" : "Notify Manager"], status: "active" },
        { trigger: lang === "fr" ? "Paiement reçu" : "Payment received", steps: [lang === "fr" ? "Émettre reçu PDF" : "Issue PDF receipt", lang === "fr" ? "Marquer facture payée" : "Mark invoice paid"], status: "active" },
        { trigger: lang === "fr" ? "RDV annulé < 24h" : "Cancellation < 24h", steps: [lang === "fr" ? "Facturer 50% du forfait" : "Charge 50% of package", lang === "fr" ? "Notifier client" : "Notify client"], status: "paused" },
      ].map((w, i) => (
        <div key={i} className="chart-card">
          <div className="chart-card__head">
            <div className="chart-card__title">{w.trigger}</div>
            <div className="chip" style={{ background: w.status === "active" ? "rgba(44,141,74,0.12)" : "var(--panel)", color: w.status === "active" ? "rgb(44,141,74)" : "var(--text-2)" }}>
              {w.status === "active" ? (lang === "fr" ? "Active" : "Active") : (lang === "fr" ? "En pause" : "Paused")}
            </div>
          </div>
          <div className="auto-flow">
            <div className="auto-node">
              <div className="auto-node__type">{lang === "fr" ? "Déclencheur" : "Trigger"}</div>
              <div>{w.trigger}</div>
            </div>
            {w.steps.map((s, j) => (
              <React.Fragment key={j}>
                <div className="auto-arrow">→</div>
                <div className="auto-node">
                  <div className="auto-node__type">{lang === "fr" ? `Étape ${j + 1}` : `Step ${j + 1}`}</div>
                  <div>{s}</div>
                </div>
              </React.Fragment>
            ))}
            <div className="auto-arrow">→</div>
            <button className="auto-node" style={{ borderStyle: "dashed", color: "var(--text-2)", cursor: "pointer" }}>
              <IconPlus size={14}/> {lang === "fr" ? "Ajouter" : "Add"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================
//  Connector
// =============================================================
function ConnectorScreen({ lang }) {
  const conns = [
    { name: "Google Calendar", desc: lang === "fr" ? "Sync des rendez-vous" : "Sync bookings", on: true },
    { name: "Stripe",          desc: lang === "fr" ? "Paiement en ligne"   : "Online payments", on: true },
    { name: "Instagram",       desc: lang === "fr" ? "Cross-post du contenu" : "Cross-post content", on: true },
    { name: "Mailchimp",       desc: lang === "fr" ? "Newsletters et campagnes" : "Newsletters & campaigns", on: false },
    { name: "QuickBooks",      desc: lang === "fr" ? "Comptabilité"        : "Bookkeeping", on: false },
    { name: "WhatsApp Business", desc: lang === "fr" ? "Messages clients"  : "Client messaging", on: true },
  ];
  return (
    <div className="fade-enter" data-screen-label="10 Connector">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        {lang === "fr" ? "Connecteurs" : "Connectors"}
      </h1>
      <div className="dash-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {conns.map((c, i) => (
          <div key={i} className="metric" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--panel)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}>
              <IconPlug size={20}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div className="t-xs t-muted">{c.desc}</div>
            </div>
            <button className={`btn ${c.on ? "btn--ghost" : "btn--accent"} btn--sm`}>
              {c.on ? (lang === "fr" ? "Connecté" : "Connected") : (lang === "fr" ? "Connecter" : "Connect")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
//  Settings
// =============================================================
function SettingsScreen({ lang, theme, onTheme, fontPair, onFontPair }) {
  const t = useT(lang);
  return (
    <div className="fade-enter" data-screen-label="11 Settings">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>{t("settings")}</h1>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{lang === "fr" ? "Profil" : "Account"}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, fontSize: 14 }}>
          <div className="t-muted">{lang === "fr" ? "Nom" : "Name"}</div><div>Killian Le Querre</div>
          <div className="t-muted">Email</div><div>lequerrekillian@gmail.com</div>
          <div className="t-muted">{lang === "fr" ? "Téléphone" : "Phone"}</div><div>+33 6 49 23 61 13</div>
          <div className="t-muted">URL IBEE</div><div className="t-mono">ibee.app/killian</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{lang === "fr" ? "Préférences" : "Preferences"}</div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 500 }}>{lang === "fr" ? "Mode sombre" : "Dark mode"}</div>
              <div className="t-xs t-muted">{lang === "fr" ? "Bientôt disponible" : "Coming soon"}</div>
            </div>
            <div className="chip">{lang === "fr" ? "Bientôt" : "Soon"}</div>
          </div>
          <hr className="divider" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 500 }}>{lang === "fr" ? "Profil public" : "Public profile"}</div>
              <div className="t-xs t-muted">{lang === "fr" ? "Visible dans la recherche IBEE" : "Visible in IBEE search"}</div>
            </div>
            <div className="chip is-on"><IconCheck size={12}/></div>
          </div>
          <hr className="divider" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 500 }}>{lang === "fr" ? "Notifications" : "Notifications"}</div>
              <div className="t-xs t-muted">{lang === "fr" ? "Push + email" : "Push + email"}</div>
            </div>
            <div className="chip is-on"><IconCheck size={12}/></div>
          </div>
        </div>
      </div>

      <div className="empty t-xs">
        IBEE v0.4 · {lang === "fr" ? "© 2026 Ibbe" : "© 2026 Ibbe"}
      </div>
    </div>
  );
}

// =============================================================
//  Switch — reusable toggle used by Privacy & Notifications
// =============================================================
function Switch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
        padding: 0, position: "relative", flexShrink: 0,
        background: on ? "var(--accent)" : "var(--border)",
        transition: "background 160ms",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 20 : 2,
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 160ms",
      }} />
    </button>
  );
}

// A labelled settings row: title + sub + a control on the right.
function SettingRow({ title, sub, children, first }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      padding: "16px 0", borderTop: first ? 0 : "1px solid var(--border-soft)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 15 }}>{title}</div>
        {sub && <div className="t-xs t-muted" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// =============================================================
//  Confidentialité (Privacy)
// =============================================================
function PrivacyScreen({ lang }) {
  const fr = lang === "fr";
  const [v, setV] = React.useState({
    publicProfile: true, searchable: true, showRevenue: false,
    showLocation: true, analyticsTracking: true, thirdParty: false,
  });
  const tg = (k) => setV((s) => ({ ...s, [k]: !s[k] }));

  const [whoMessages, setWhoMessages] = React.useState("everyone");
  const whoOpts = fr
    ? [["everyone", "Tout le monde"], ["clients", "Mes clients"], ["nobody", "Personne"]]
    : [["everyone", "Everyone"], ["clients", "My clients"], ["nobody", "Nobody"]];

  const blocked = [
    { name: "compte_spam_22", when: fr ? "Bloqué le 12 mai" : "Blocked May 12" },
    { name: "promo.deals.fr", when: fr ? "Bloqué le 3 avr." : "Blocked Apr 3" },
  ];

  return (
    <div className="fade-enter" data-screen-label="12 Privacy">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>
        {fr ? "Confidentialité" : "Privacy"}
      </h1>
      <p className="t-muted" style={{ margin: "0 0 22px", fontSize: 15 }}>
        {fr ? "Gérez qui peut voir votre profil et comment vos données sont utilisées."
            : "Manage who can see your profile and how your data is used."}
      </p>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Visibilité du profil" : "Profile visibility"}</div></div>
        <SettingRow first title={fr ? "Profil public" : "Public profile"} sub={fr ? "Visible par tous sur ibee.app/killian" : "Visible to anyone at ibee.app/killian"}>
          <Switch on={v.publicProfile} onChange={() => tg("publicProfile")} />
        </SettingRow>
        <SettingRow title={fr ? "Apparaître dans la recherche" : "Show in search"} sub={fr ? "Indexé dans la recherche IBEE et Google" : "Indexed in IBEE & Google search"}>
          <Switch on={v.searchable} onChange={() => tg("searchable")} />
        </SettingRow>
        <SettingRow title={fr ? "Afficher le chiffre d'affaires" : "Show revenue"} sub={fr ? "Visible sur votre profil public" : "Displayed on your public profile"}>
          <Switch on={v.showRevenue} onChange={() => tg("showRevenue")} />
        </SettingRow>
        <SettingRow title={fr ? "Qui peut m'envoyer un message" : "Who can message me"}>
          <div style={{ display: "inline-flex", background: "var(--panel)", borderRadius: 10, padding: 2 }}>
            {whoOpts.map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setWhoMessages(k)} style={{
                border: "none", cursor: "pointer", borderRadius: 8, padding: "7px 13px",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13,
                background: whoMessages === k ? "var(--surface)" : "transparent",
                boxShadow: whoMessages === k ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                color: whoMessages === k ? "var(--text)" : "var(--text-2)",
              }}>{lbl}</button>
            ))}
          </div>
        </SettingRow>
      </div>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Données & autorisations" : "Data & permissions"}</div></div>
        <SettingRow first title={fr ? "Partager ma localisation" : "Share my location"} sub={fr ? "Affiche votre ville sur le profil" : "Shows your city on the profile"}>
          <Switch on={v.showLocation} onChange={() => tg("showLocation")} />
        </SettingRow>
        <SettingRow title={fr ? "Suivi analytique" : "Analytics tracking"} sub={fr ? "Statistiques de visites anonymisées" : "Anonymized visit statistics"}>
          <Switch on={v.analyticsTracking} onChange={() => tg("analyticsTracking")} />
        </SettingRow>
        <SettingRow title={fr ? "Partage avec des tiers" : "Third-party sharing"} sub={fr ? "Partenaires marketing et publicitaires" : "Marketing & ad partners"}>
          <Switch on={v.thirdParty} onChange={() => tg("thirdParty")} />
        </SettingRow>
      </div>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Comptes bloqués" : "Blocked accounts"}</div></div>
        {blocked.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}><IconLock size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{b.name}</div>
              <div className="t-xs t-muted">{b.when}</div>
            </div>
            <button className="btn btn--ghost btn--sm">{fr ? "Débloquer" : "Unblock"}</button>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Vos données" : "Your data"}</div></div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn--ghost"><IconUpload size={14}/> {fr ? "Exporter mes données" : "Export my data"}</button>
          <button className="btn btn--ghost" style={{ color: "#c63b3b" }}><IconTrash size={14}/> {fr ? "Supprimer mon compte" : "Delete my account"}</button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
//  Notification
// =============================================================
function NotificationsScreen({ lang }) {
  const fr = lang === "fr";
  const channelDefs = fr
    ? [["push", "Push"], ["email", "Email"], ["sms", "SMS"]]
    : [["push", "Push"], ["email", "Email"], ["sms", "SMS"]];

  const initialRows = [
    { id: "booking",  title: fr ? "Nouvelle réservation" : "New booking",      sub: fr ? "Un client réserve un créneau" : "A client books a slot",      v: { push: true,  email: true,  sms: true  } },
    { id: "payment",  title: fr ? "Paiement reçu" : "Payment received",         sub: fr ? "Un paiement est encaissé" : "A payment is collected",        v: { push: true,  email: true,  sms: false } },
    { id: "message",  title: fr ? "Nouveau message" : "New message",            sub: fr ? "Un client vous écrit" : "A client messages you",             v: { push: true,  email: false, sms: false } },
    { id: "review",   title: fr ? "Nouvel avis" : "New review",                 sub: fr ? "Un client laisse un avis" : "A client leaves a review",       v: { push: true,  email: false, sms: false } },
    { id: "cancel",   title: fr ? "Annulation" : "Cancellation",                sub: fr ? "Un rendez-vous est annulé" : "A booking is cancelled",        v: { push: true,  email: true,  sms: true  } },
    { id: "marketing",title: fr ? "Nouveautés & conseils" : "News & tips",      sub: fr ? "Actualités produit IBEE" : "IBEE product updates",            v: { push: false, email: true,  sms: false } },
  ];
  const [rows, setRows] = React.useState(initialRows);
  const [pause, setPause] = React.useState(false);

  const toggle = (rowId, ch) => setRows((rs) => rs.map((r) =>
    r.id === rowId ? { ...r, v: { ...r.v, [ch]: !r.v[ch] } } : r));

  return (
    <div className="fade-enter" data-screen-label="13 Notifications">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>
        {fr ? "Notifications" : "Notifications"}
      </h1>
      <p className="t-muted" style={{ margin: "0 0 22px", fontSize: 15 }}>
        {fr ? "Choisissez comment et quand IBEE vous prévient." : "Choose how and when IBEE notifies you."}
      </p>

      <div className="chart-card">
        <SettingRow first title={fr ? "Pause des notifications" : "Pause all notifications"} sub={fr ? "Aucune alerte ne sera envoyée" : "No alerts will be sent"}>
          <Switch on={pause} onChange={() => setPause(!pause)} />
        </SettingRow>
      </div>

      <div className="chart-card" style={{ opacity: pause ? 0.45 : 1, pointerEvents: pause ? "none" : "auto", transition: "opacity 160ms" }}>
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Par activité" : "By activity"}</div></div>

        {/* header row with channel labels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--border-soft)" }}>
          <div />
          {channelDefs.map(([k, lbl]) => (
            <div key={k} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{lbl}</div>
          ))}
        </div>

        {rows.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px", alignItems: "center", gap: 8, padding: "14px 0", borderTop: "1px solid var(--border-soft)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{r.title}</div>
              <div className="t-xs t-muted" style={{ marginTop: 3 }}>{r.sub}</div>
            </div>
            {channelDefs.map(([k]) => (
              <div key={k} style={{ display: "flex", justifyContent: "center" }}>
                <Switch on={r.v[k]} onChange={() => toggle(r.id, k)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ opacity: pause ? 0.45 : 1, pointerEvents: pause ? "none" : "auto", transition: "opacity 160ms" }}>
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Résumé quotidien" : "Daily digest"}</div></div>
        <SettingRow first title={fr ? "Email récapitulatif" : "Summary email"} sub={fr ? "Chaque matin à 8h00" : "Every morning at 8:00 AM"}>
          <Switch on={true} onChange={() => {}} />
        </SettingRow>
      </div>
    </div>
  );
}

// =============================================================
//  Équipe (Team)
// =============================================================
function TeamScreen({ lang }) {
  const fr = lang === "fr";
  const roleColors = {
    owner:   { bg: "var(--accent-tint)", fg: "var(--accent)" },
    manager: { bg: "rgba(44,141,74,0.12)", fg: "rgb(44,141,74)" },
    member:  { bg: "var(--panel-2)", fg: "var(--text-2)" },
  };
  const roleLabel = (r) => ({
    owner:   fr ? "Propriétaire" : "Owner",
    manager: fr ? "Gérant" : "Manager",
    member:  fr ? "Membre" : "Member",
  }[r]);

  const members = [
    { name: "Killian Le Querre", email: "lequerrekillian@gmail.com", role: "owner",   since: fr ? "Depuis jan. 2023" : "Since Jan 2023", online: true },
    { name: "Sarah Moreau",      email: "sarah.moreau@studio.fr",    role: "manager", since: fr ? "Depuis mars 2023" : "Since Mar 2023", online: true },
    { name: "Hugo Bernard",      email: "hugo.b@studio.fr",          role: "member",  since: fr ? "Depuis sept. 2024" : "Since Sep 2024", online: false },
    { name: "Léa Martin",        email: "lea.martin@studio.fr",      role: "member",  since: fr ? "Depuis janv. 2025" : "Since Jan 2025", online: true },
    { name: "Camille Roux",      email: "camille.roux@studio.fr",    role: "member",  since: fr ? "Depuis avril 2025" : "Since Apr 2025", online: false },
  ];

  const pending = [
    { email: "nouveau.barbier@gmail.com", role: "member" },
  ];

  return (
    <div className="fade-enter" data-screen-label="14 Team">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px" }}>
        <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{fr ? "Équipe" : "Team"}</h1>
        <button className="btn btn--accent"><IconPlus size={14}/> {fr ? "Inviter un membre" : "Invite member"}</button>
      </div>
      <p className="t-muted" style={{ margin: "0 0 22px", fontSize: 15 }}>
        {fr ? `${members.length} membres · gérez les accès et les rôles de votre studio.`
            : `${members.length} members · manage your studio's access and roles.`}
      </p>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Membres" : "Members"}</div></div>
        {members.map((m, i) => {
          const rc = roleColors[m.role];
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 16, alignItems: "center", padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
              <div style={{ position: "relative" }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{m.name.charAt(0)}</div>
                {m.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 11, height: 11, borderRadius: "50%", background: "rgb(44,141,74)", border: "2px solid var(--surface)" }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{m.name}</div>
                <div className="t-xs t-muted">{m.email} · {m.since}</div>
              </div>
              <div className="chip" style={{ height: 26, fontSize: 12, fontWeight: 500, background: rc.bg, color: rc.fg }}>{roleLabel(m.role)}</div>
              <button className="btn btn--icon btn--ghost" aria-label="More"><IconMore size={16}/></button>
            </div>
          );
        })}
      </div>

      <div className="chart-card">
        <div className="chart-card__head"><div className="chart-card__title">{fr ? "Invitations en attente" : "Pending invites"}</div></div>
        {pending.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 16, alignItems: "center", padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: "var(--panel-2)", color: "var(--text-3)" }}><IconUser size={18}/></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{p.email}</div>
              <div className="t-xs t-muted">{fr ? "En attente d'acceptation" : "Awaiting acceptance"}</div>
            </div>
            <div className="chip" style={{ height: 26, fontSize: 12, fontWeight: 500, background: "var(--panel-2)", color: "var(--text-2)" }}>{roleLabel(p.role)}</div>
            <button className="btn btn--ghost btn--sm">{fr ? "Renvoyer" : "Resend"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ActivityScreen, AnalyticsScreen, MarketingScreen, RevenuScreen,
  PaiementScreen, DriveScreen, AccountDriveScreen, AutomationScreen,
  ConnectorScreen, SettingsScreen, PrivacyScreen, NotificationsScreen, TeamScreen,
});
