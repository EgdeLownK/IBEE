/* global React, useT, Ph, IconHeart, IconBookmark, IconShare, IconMessage, IconCalendar, IconUsers, IconBriefcase, IconCheckCircle, IconMapPin, IconClock, IconStar, IconPlus, IconCash, IconBag, IconCheck, IconNewspaper, IconPlay, IconMore, IconZap, IconFile, IconMegaphone, IconPulse, IconX, IconHome */

// =============================================================
//  Home feed — Instagram-like but ACTIVE: things you can act on
//  (recruitment, event, profile rec, appointment, article)
//  Goal: mix formats while keeping a coherent rhythm.
// =============================================================

const FEED_ITEMS_FR = [
  {
    kind: "appointment",
    when: "Aujourd'hui · 14h00",
    title: "Lucas R. arrive dans 1h30",
    sub: "Forfait complet · Studio Killian",
    actions: [{ key: "confirm", label: "Confirmer" }, { key: "reschedule", label: "Décaler" }],
  },
  {
    kind: "recommend",
    label: "Recommandé pour vous",
    profile: {
      name: "Atelier Marin",
      tags: ["Photographe", "Lyon", "Mariage"],
      rating: 4.8,
      reason: "Souvent réservé avec votre forfait mariage",
    },
  },
  {
    kind: "recruit",
    by: "Salon Bellecour",
    where: "Lyon 2e",
    title: "Cherche apprenti·e barbier",
    body: "Apprentissage 24 mois, contrat dès septembre. Studio reconnu, équipe de 4.",
    salary: "SMIC + pourboires",
    when: "Posté il y a 2 j",
  },
  {
    kind: "event",
    date: { d: "06", m: "NOV" },
    title: "Soirée portes ouvertes Studio Killian",
    where: "Studio Killian, Lyon 1er · 19h",
    spots: 24,
    spotsTaken: 18,
    body: "Découverte des nouveaux soins, démo lissage en direct.",
  },
  {
    kind: "article",
    by: "Elle Magazine",
    avatar: "EM",
    when: "Hier",
    title: "Les 5 tendances coiffure de l'hiver 2025",
    body: "Interview de plusieurs studios indépendants, dont Le Querre Killian. À lire pour cadrer la saison.",
  },
  {
    kind: "appointment",
    when: "Demain · 11h00",
    title: "Emma G. — Coupe femme",
    sub: "Première visite · 1h",
    actions: [{ key: "confirm", label: "Confirmer" }, { key: "remind", label: "Envoyer rappel" }],
  },
];

const FEED_ITEMS_EN = [
  {
    kind: "appointment",
    when: "Today · 2:00 pm",
    title: "Lucas R. arrives in 1h 30",
    sub: "Full package · Studio Killian",
    actions: [{ key: "confirm", label: "Confirm" }, { key: "reschedule", label: "Reschedule" }],
  },
  {
    kind: "recommend",
    label: "Recommended for you",
    profile: {
      name: "Atelier Marin",
      tags: ["Photographer", "Lyon", "Weddings"],
      rating: 4.8,
      reason: "Often booked alongside your wedding package",
    },
  },
  {
    kind: "recruit",
    by: "Salon Bellecour",
    where: "Lyon 2e",
    title: "Hiring a barber apprentice",
    body: "24-month apprenticeship, contract starts September. Reputable studio, team of 4.",
    salary: "Minimum wage + tips",
    when: "2 days ago",
  },
  {
    kind: "event",
    date: { d: "06", m: "NOV" },
    title: "Open studio night — Studio Killian",
    where: "Studio Killian, Lyon 1 · 7 pm",
    spots: 24,
    spotsTaken: 18,
    body: "New product line preview, live smoothing demo.",
  },
  {
    kind: "article",
    by: "Elle Magazine",
    avatar: "EM",
    when: "Yesterday",
    title: "The 5 winter hair trends to know",
    body: "Several independent studios interviewed, including Le Querre Killian. A useful set for the season.",
  },
  {
    kind: "appointment",
    when: "Tomorrow · 11:00 am",
    title: "Emma G. — Women's cut",
    sub: "First visit · 1h",
    actions: [{ key: "confirm", label: "Confirm" }, { key: "remind", label: "Send reminder" }],
  },
];

function HomeFeedScreen({ lang, onOpenProfile }) {
  const t = useT(lang);
  const items = lang === "fr" ? FEED_ITEMS_FR : FEED_ITEMS_EN;

  const [filter, setFilter] = React.useState("all");
  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const FILTERS = [
    { id: "all",         label: lang === "fr" ? "Tout"             : "All" },
    { id: "appointment", label: lang === "fr" ? "Rendez-vous"      : "Bookings" },
    { id: "event",       label: lang === "fr" ? "Événements"       : "Events" },
    { id: "recruit",     label: lang === "fr" ? "Recrutements"     : "Hiring" },
    { id: "recommend",   label: lang === "fr" ? "Recommandations"  : "For you" },
    { id: "article",     label: lang === "fr" ? "Articles"         : "Articles" },
  ];

  return (
    <div className="fade-enter" data-screen-label="00 Home feed">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
          {lang === "fr" ? "Bonjour Killian" : "Good morning, Killian"}
        </h1>
        <div className="t-muted t-sm">
          {lang === "fr" ? "Tout ce qui demande votre attention." : "Everything that needs your attention."}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? "is-on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((it, i) => <FeedCard key={i} item={it} lang={lang} onOpenProfile={onOpenProfile} />)}
        {filtered.length === 0 && (
          <div className="empty"><h3>{t("nothingHere")}</h3></div>
        )}
      </div>
    </div>
  );
}

// =============================================================
//  Per-format cards. Each format owns its own visual rhythm
//  while sharing the same card chrome.
// =============================================================
function FeedCard({ item, lang, onOpenProfile }) {
  switch (item.kind) {
    case "appointment": return <FeedAppointment item={item} lang={lang} />;
    case "recommend":   return <FeedRecommend item={item} lang={lang} onOpenProfile={onOpenProfile} />;
    case "recruit":     return <FeedRecruit item={item} lang={lang} />;
    case "event":       return <FeedEvent item={item} lang={lang} />;
    case "article":     return <FeedArticle item={item} lang={lang} />;
    default: return null;
  }
}

function CardShell({ tag, tagColor = "var(--accent)", children, className = "" }) {
  return (
    <div className={`feed-card ${className}`}>
      <div className="feed-card__tag" style={{ color: tagColor }}>
        <span style={{ background: tagColor }} />
        {tag}
      </div>
      {children}
    </div>
  );
}

// ----- Appointment -----
function FeedAppointment({ item, lang }) {
  const [confirmed, setConfirmed] = React.useState(false);
  return (
    <CardShell tag={lang === "fr" ? "Rendez-vous" : "Booking"} tagColor="rgb(44,141,74)">
      <Ph className="feed-card__hero" label="client portrait · 16:9" />
      <div className="feed-card__row">
        <div className="feed-card__col">
          <div className="t-mono t-xs t-muted" style={{ marginBottom: 4 }}>{item.when}</div>
          <div className="feed-card__title">{item.title}</div>
          <div className="t-muted t-sm">{item.sub}</div>
        </div>
        {confirmed ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgb(44,141,74)", fontSize: 14, fontWeight: 500 }}>
            <IconCheckCircle size={18} />
            <span>{lang === "fr" ? "Confirmé" : "Confirmed"}</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            {item.actions.map((a, i) => (
              <button
                key={a.key}
                className={`btn ${i === 0 ? "btn--accent" : "btn--ghost"} btn--sm`}
                onClick={() => i === 0 && setConfirmed(true)}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ----- Recommend -----
function FeedRecommend({ item, lang, onOpenProfile }) {
  return (
    <CardShell tag={item.label} tagColor="rgb(151,71,255)">
      <Ph className="feed-card__hero" label="profile cover · 16:9" />
      <div className="feed-card__row">
        <Ph style={{ width: 64, height: 64, borderRadius: 16, flexShrink: 0, marginTop: -36, border: "3px solid var(--surface)" }} label="" />
        <div className="feed-card__col">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="feed-card__title">{item.profile.name}</div>
            <div className="t-xs t-muted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <IconStar size={12} color="rgb(217,85,37)" /> {item.profile.rating.toFixed(1)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {item.profile.tags.map((t, i) => (
              <span key={i} className="result-card__tag">{t}</span>
            ))}
          </div>
          <div className="t-xs t-muted" style={{ marginTop: 6 }}>↳ {item.profile.reason}</div>
        </div>
        <button className="btn btn--sm" onClick={onOpenProfile}>
          {lang === "fr" ? "Voir" : "View"}
        </button>
      </div>
    </CardShell>
  );
}

// ----- Recruit -----
function FeedRecruit({ item, lang }) {
  return (
    <CardShell tag={lang === "fr" ? "Recrutement" : "Hiring"} tagColor="rgb(42,74,107)">
      <Ph className="feed-card__hero" label="workplace photo · 16:9" />
      <div className="feed-card__row" style={{ alignItems: "flex-start" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "rgba(42,74,107,0.10)",
          color: "rgb(42,74,107)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          marginTop: -28, border: "3px solid var(--surface)",
        }}>
          <IconBriefcase size={20} />
        </div>
        <div className="feed-card__col">
          <div className="feed-card__title">{item.title}</div>
          <div className="t-xs t-muted" style={{ marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>{item.by}</span><span>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconMapPin size={11} />{item.where}</span><span>·</span>
            <span>{item.when}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
            {item.body}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span className="chip" style={{ background: "var(--panel)", cursor: "default" }}>
              <IconUsers size={12} /> {item.salary}
            </span>
            <div style={{ flex: 1 }} />
            <button className="btn btn--ghost btn--sm">{lang === "fr" ? "Plus tard" : "Later"}</button>
            <button className="btn btn--accent btn--sm">{lang === "fr" ? "Postuler" : "Apply"}</button>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

// ----- Event -----
function FeedEvent({ item, lang }) {
  const [going, setGoing] = React.useState(false);
  const pct = Math.round(((item.spotsTaken + (going ? 1 : 0)) / item.spots) * 100);
  return (
    <CardShell tag={lang === "fr" ? "Événement" : "Event"} tagColor="rgb(217,85,37)">
      <div className="feed-card__hero feed-card__hero--event">
        <Ph style={{ width: "100%", height: "100%", borderRadius: 0 }} label="event hero · 16:9" />
        <div className="feed-card__hero-date">
          <div className="t-mono t-xs">{item.date.m}</div>
          <div className="t-display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{item.date.d}</div>
        </div>
      </div>
      <div className="feed-card__row" style={{ alignItems: "flex-start" }}>
        <div className="feed-card__col">
          <div className="feed-card__title">{item.title}</div>
          <div className="t-xs t-muted" style={{ marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconMapPin size={11} /> {item.where}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--text-2)" }}>{item.body}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="t-xs t-muted" style={{ marginBottom: 4 }}>
                {item.spotsTaken + (going ? 1 : 0)} / {item.spots} {lang === "fr" ? "places" : "spots"}
              </div>
              <div style={{ height: 6, background: "var(--panel)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
              </div>
            </div>
            <button
              className={`btn btn--sm ${going ? "" : "btn--accent"}`}
              onClick={() => setGoing(g => !g)}
            >
              {going ? (lang === "fr" ? "Inscrit ✓" : "Going ✓") : (lang === "fr" ? "Je viens" : "I'll come")}
            </button>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

// ----- Article -----
function FeedArticle({ item, lang }) {
  const [saved, setSaved] = React.useState(false);
  return (
    <CardShell tag={lang === "fr" ? "Article" : "Article"} tagColor="rgb(107,114,128)">
      <Ph className="feed-card__hero" label="article cover · 16:9" />
      <div className="feed-card__row" style={{ alignItems: "flex-start" }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: "linear-gradient(135deg,#2a2a2a,#4d4d4d)", marginTop: -22, border: "3px solid var(--surface)", flexShrink: 0 }}>
          {item.avatar}
        </div>
        <div className="feed-card__col">
          <div className="t-xs t-muted">{item.by} · {item.when}</div>
          <div className="feed-card__title" style={{ marginTop: 2 }}>{item.title}</div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
            {item.body}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, color: "var(--text-2)" }}>
            <button className="btn btn--icon" style={{ background: "transparent" }} aria-label="like"><IconHeart size={16} /></button>
            <button className="btn btn--icon" style={{ background: "transparent" }} aria-label="comment"><IconMessage size={16} /></button>
            <button className="btn btn--icon" style={{ background: "transparent" }} aria-label="share"><IconShare size={16} /></button>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn--icon"
              style={{ background: "transparent", color: saved ? "var(--accent)" : "currentColor" }}
              onClick={() => setSaved(s => !s)}
            >
              <IconBookmark size={16} style={{ fill: saved ? "var(--accent)" : "transparent" }} />
            </button>
            <button className="btn btn--sm">{lang === "fr" ? "Lire" : "Read"}</button>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

// =============================================================
//  Activity — "manage your day" today view
//  Modular: each block only shows if its corresponding profile
//  section is enabled (sectionsOn prop, threaded from App).
//  Sections: service (schedule), shop (orders + stock),
//  event (next event prep + signups), news/video (publishing queue).
// =============================================================
// Mocked "today" date line (Tuesday Oct 21 style), reused by the home view.
function actDateLine(lang) {
  const today = new Date();
  const FR_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const FR_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = lang === "fr" ? FR_DAYS : EN_DAYS;
  const months = lang === "fr" ? FR_MONTHS : EN_MONTHS;
  const dayName = days[today.getDay()];
  return lang === "fr"
    ? `${dayName} ${today.getDate()} ${months[today.getMonth()]}`
    : `${dayName} ${months[today.getMonth()]} ${today.getDate()}`;
}

function ActivityTodayScreen({ lang, sectionsOn = {} }) {
  const on = (id) => sectionsOn[id] !== false; // default ON when unspecified
  const [done, setDone] = React.useState({});
  const toggle = (k) => setDone((d) => ({ ...d, [k]: !d[k] }));
  const [view, setView] = React.useState("home");

  // ---- badge counts (kept in sync with the blocks they summarise) ----
  const tasksCount = 1 + (on("service") ? 2 : 0) + (on("shop") ? 1 : 0) + (on("news") ? 1 : 0) + (on("event") ? 1 : 0);
  const publishCount = (on("news") ? 2 : 0) + (on("video") ? 2 : 0);
  const counts = { service: 4, shop: 3, event: 3, publish: publishCount, clients: 5, tasks: tasksCount };

  // ---- category menu, grouped like the profile-web sidebar ----
  const groups = [
    { label: lang === "fr" ? "Général" : "General", items: [
      { id: "home", label: lang === "fr" ? "Accueil" : "Home", Icon: IconHome, show: true },
    ] },
    { label: lang === "fr" ? "Catégories" : "Categories", items: [
      { id: "service", label: lang === "fr" ? "Rendez-vous"  : "Bookings", Icon: IconClock,     show: on("service"), count: counts.service },
      { id: "shop",    label: lang === "fr" ? "Boutique"     : "Shop",     Icon: IconBag,       show: on("shop"),    count: counts.shop },
      { id: "event",   label: lang === "fr" ? "Événements"   : "Events",   Icon: IconCalendar,  show: on("event"),   count: counts.event },
      { id: "publish", label: lang === "fr" ? "Publications" : "Posts",    Icon: IconNewspaper, show: on("news") || on("video"), count: counts.publish },
    ] },
    { label: lang === "fr" ? "Suivi" : "Tracking", items: [
      { id: "clients", label: lang === "fr" ? "Clients" : "Clients",  Icon: IconUsers, show: true, count: counts.clients },
      { id: "tasks",   label: lang === "fr" ? "Tâches"  : "To-do",    Icon: IconCheck, show: true, count: counts.tasks },
    ] },
  ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
  const menu = groups.flatMap((g) => g.items);

  // if the active view's section got turned off, fall back to Accueil
  React.useEffect(() => {
    if (!menu.some((m) => m.id === view)) setView("home");
  }, [sectionsOn]); // eslint-disable-line

  const TITLES = {
    home:    { t: lang === "fr" ? "Aujourd'hui"  : "Today",    s: actDateLine(lang) },
    service: { t: lang === "fr" ? "Rendez-vous"  : "Bookings", s: lang === "fr" ? "Planning et réservations" : "Schedule & bookings" },
    shop:    { t: lang === "fr" ? "Boutique"     : "Shop",     s: lang === "fr" ? "Commandes et stock" : "Orders & stock" },
    event:   { t: lang === "fr" ? "Événements"   : "Events",   s: lang === "fr" ? "Préparation et inscrits" : "Prep & sign-ups" },
    publish: { t: lang === "fr" ? "Publications" : "Posts",    s: lang === "fr" ? "File de publication" : "Publishing queue" },
    clients: { t: lang === "fr" ? "Clients"      : "Clients",  s: lang === "fr" ? "Nouvelles personnes" : "New people" },
    tasks:   { t: lang === "fr" ? "Tâches"       : "To-do",    s: lang === "fr" ? "À faire aujourd'hui" : "Due today" },
  };
  const head = TITLES[view];
  const showSlot = view === "home" || view === "service";

  return (
    <div className="fade-enter act2" data-screen-label="00 Activity">
      <div className="act2-body">
        {/* ---- category menu (profile-web sidebar style) ---- */}
        <aside className="sidebar act2-sidebar" data-screen-label="Activity menu">
          {groups.map((g) => (
            <div className="sidebar__section" key={g.label}>
              <div className="sidebar__label">{g.label}</div>
              {g.items.map((m) => {
                const Ic = m.Icon;
                return (
                  <div
                    key={m.id}
                    className={`sidebar__item ${view === m.id ? "is-active" : ""}`}
                    onClick={() => setView(m.id)}
                  >
                    <Ic size={18} />
                    <span className="act2-menu__text">{m.label}</span>
                    {m.count != null && <span className="sidebar__badge">{m.count}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ---- content ---- */}
        <div className="act2-content">
          <div className="act2-head">
            <div className="act2-head__col">
              <h1 className="act2-head__title">{head.t}</h1>
              <div className="act2-head__sub">{head.s}</div>
            </div>
            <div className="act-head__actions">
              {showSlot && (
                <button className="btn"><IconPlus size={14} /><span>{lang === "fr" ? "Créneau" : "Slot"}</span></button>
              )}
              <button className="btn"><IconPlus size={14} /><span>{lang === "fr" ? "Tâche" : "Task"}</span></button>
              <button className="btn btn--accent"><IconCash size={14} /><span>{lang === "fr" ? "Encaisser" : "Take payment"}</span></button>
            </div>
          </div>

          {view === "home" && (
            <React.Fragment>
              <ActivityKPIs lang={lang} sectionsOn={sectionsOn} />
              <div className="act-layout">
                <div className="act-main">
                  {on("service") && <ScheduleBlock lang={lang} />}
                  <TasksBlock lang={lang} done={done} toggle={toggle} sectionsOn={sectionsOn} />
                </div>
                <div className="act-side">
                  <ActivityFeed lang={lang} sectionsOn={sectionsOn} />
                  <QuickActions lang={lang} sectionsOn={sectionsOn} />
                </div>
              </div>
            </React.Fragment>
          )}

          {view === "service" && (
            <div className="act-layout">
              <div className="act-main"><ScheduleBlock lang={lang} /></div>
              <div className="act-side"><UpcomingBookings lang={lang} /></div>
            </div>
          )}

          {view === "shop" && (
            <div className="act-layout">
              <div className="act-main"><ShopTodayBlock lang={lang} /></div>
              <div className="act-side"><QuickActions lang={lang} sectionsOn={sectionsOn} /></div>
            </div>
          )}

          {view === "event" && (
            <div className="act-layout">
              <div className="act-main"><EventPrepBlock lang={lang} /></div>
              <div className="act-side"><ActivityFeed lang={lang} sectionsOn={sectionsOn} /></div>
            </div>
          )}

          {view === "publish" && (
            <div className="act-single"><PublishQueueBlock lang={lang} sectionsOn={sectionsOn} /></div>
          )}

          {view === "clients" && (
            <div className="act-layout">
              <div className="act-main"><ClientsBlock lang={lang} /></div>
              <div className="act-side"><ActivityFeed lang={lang} sectionsOn={sectionsOn} /></div>
            </div>
          )}

          {view === "tasks" && (
            <div className="act-layout">
              <div className="act-main"><TasksBlock lang={lang} done={done} toggle={toggle} sectionsOn={sectionsOn} /></div>
              <div className="act-side"><QuickActions lang={lang} sectionsOn={sectionsOn} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Upcoming bookings (service side rail) ----
function UpcomingBookings({ lang }) {
  const items = lang === "fr" ? [
    { day: "Demain", time: "10:00", who: "Inès F.",  what: "Coupe femme" },
    { day: "Demain", time: "15:30", who: "Karim B.", what: "Forfait complet" },
    { day: "Jeu.",   time: "09:00", who: "Paul R.",  what: "Taille barbe" },
    { day: "Ven.",   time: "11:00", who: "Léa M.",   what: "Coloration" },
  ] : [
    { day: "Tomorrow", time: "10:00", who: "Inès F.",  what: "Women's cut" },
    { day: "Tomorrow", time: "15:30", who: "Karim B.", what: "Full package" },
    { day: "Thu",      time: "09:00", who: "Paul R.",  what: "Beard trim" },
    { day: "Fri",      time: "11:00", who: "Léa M.",   what: "Coloring" },
  ];
  return (
    <section className="act-side-block">
      <BlockHead icon={<IconCalendar size={14} />} title={lang === "fr" ? "À venir" : "Upcoming"} meta={null} action={null} />
      <div className="act-feed">
        {items.map((it, i) => (
          <div key={i} className="act-feed__item">
            <div className="act-feed__icon" style={{ color: "var(--accent)", background: "var(--panel)" }}>
              <IconClock size={12} />
            </div>
            <div className="act-feed__col">
              <div className="act-feed__line">
                <span style={{ fontWeight: 500 }}>{it.who}</span>{" "}
                <span className="t-muted t-sm">· {it.what}</span>
              </div>
              <div className="act-feed__when t-mono t-xs">{it.day} · {it.time}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- New clients block ----
function ClientsBlock({ lang }) {
  const people = lang === "fr" ? [
    { name: "Marion K.",  via: "Événement",   when: "il y a 2 h", isNew: true },
    { name: "Lucas P.",   via: "Réservation", when: "ce matin",   isNew: true },
    { name: "Sarah M.",   via: "Boutique",    when: "hier" },
    { name: "Antoine L.", via: "Profil",      when: "hier" },
    { name: "Camille D.", via: "Service",     when: "il y a 2 j" },
  ] : [
    { name: "Marion K.",  via: "Event",       when: "2h ago",     isNew: true },
    { name: "Lucas P.",   via: "Booking",     when: "this morning", isNew: true },
    { name: "Sarah M.",   via: "Shop",        when: "yesterday" },
    { name: "Antoine L.", via: "Profile",     when: "yesterday" },
    { name: "Camille D.", via: "Service",     when: "2d ago" },
  ];
  return (
    <section className="act-block">
      <BlockHead
        icon={<IconUsers size={15} />}
        title={lang === "fr" ? "Nouveaux clients" : "New clients"}
        meta={lang === "fr" ? `${people.length} cette semaine` : `${people.length} this week`}
        action={<button className="btn btn--sm">{lang === "fr" ? "Tous les clients" : "All clients"} →</button>}
      />
      <div className="act-clients">
        {people.map((p, i) => (
          <div key={i} className="act-client">
            <div className="act-client__avatar">{p.name.charAt(0)}</div>
            <div className="act-client__col">
              <div className="act-client__name">
                {p.name}
                {p.isNew && <span className="act-client__new">{lang === "fr" ? "Nouveau" : "New"}</span>}
              </div>
              <div className="act-client__meta">
                {lang === "fr" ? "Via" : "Via"} {p.via} · {p.when}
              </div>
            </div>
            <button className="act-row__icon" aria-label="message"><IconMessage size={14} /></button>
            <button className="btn btn--sm">{lang === "fr" ? "Profil" : "Profile"}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- KPI strip ----
function ActivityKPIs({ lang, sectionsOn = {} }) {
  const items = [
    { k: lang === "fr" ? "Encaissé aujourd'hui" : "Collected today", v: "€186",  sub: lang === "fr" ? "3 paiements" : "3 payments",  Icon: IconCash, when: true },
    { k: lang === "fr" ? "RDV restants"         : "Bookings left",   v: "4",     sub: lang === "fr" ? "sur 6"        : "of 6",        Icon: IconClock, when: sectionsOn.service !== false },
    { k: lang === "fr" ? "Messages non lus"     : "Unread messages", v: "3",     sub: lang === "fr" ? "2 prioritaires" : "2 priority", Icon: IconMessage, when: true },
    { k: lang === "fr" ? "Commandes à expédier" : "Orders to ship",  v: "2",     sub: lang === "fr" ? "+1 prête"     : "+1 ready",    Icon: IconBag,   when: sectionsOn.shop !== false },
    { k: lang === "fr" ? "Inscrits événement"   : "Event sign-ups",  v: "18/24", sub: lang === "fr" ? "6 j restant"  : "6 days left", Icon: IconCalendar, when: sectionsOn.event !== false },
  ].filter((it) => it.when);

  return (
    <div className="act-kpis" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((m, i) => {
        const Ic = m.Icon;
        return (
          <div key={i} className="act-kpi">
            <div className="act-kpi__icon"><Ic size={16} /></div>
            <div className="act-kpi__col">
              <div className="act-kpi__label">{m.k}</div>
              <div className="act-kpi__value">{m.v}</div>
              <div className="act-kpi__sub">{m.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Schedule block (service) ----
function ScheduleBlock({ lang }) {
  const schedule = lang === "fr" ? [
    { time: "09:00", who: "Théo D.",  what: "Taille barbe",         dur: "20 min", state: "done" },
    { time: "10:00", who: "Sofia M.", what: "Coupe homme",          dur: "30 min", state: "done" },
    { time: "11:00", who: "Emma G.",  what: "Coupe femme",          dur: "1 h"   },
    { time: "14:00", who: "Lucas R.", what: "Forfait complet",      dur: "1 h 15", flagged: true, price: "€85" },
    { time: "16:00", who: "Mehdi B.", what: "Rasage traditionnel",  dur: "35 min", price: "€32" },
    { time: "18:00", who: "—",        what: "Atelier équipe",       dur: "1 h",    internal: true },
  ] : [
    { time: "09:00", who: "Théo D.",  what: "Beard trim",     dur: "20 min", state: "done" },
    { time: "10:00", who: "Sofia M.", what: "Men's cut",      dur: "30 min", state: "done" },
    { time: "11:00", who: "Emma G.",  what: "Women's cut",    dur: "1 h"   },
    { time: "14:00", who: "Lucas R.", what: "Full package",   dur: "1 h 15", flagged: true, price: "€85" },
    { time: "16:00", who: "Mehdi B.", what: "Hot-towel shave", dur: "35 min", price: "€32" },
    { time: "18:00", who: "—",        what: "Team workshop",  dur: "1 h",    internal: true },
  ];

  const doneCount = schedule.filter((s) => s.state === "done").length;
  // Now indicator at 11:00 (between item 2 and 3)
  const NOW_AT_INDEX = 2;

  return (
    <section className="act-block">
      <BlockHead
        icon={<IconClock size={15} />}
        title={lang === "fr" ? "Planning du jour" : "Today's schedule"}
        meta={lang === "fr" ? `${doneCount}/${schedule.length} effectués` : `${doneCount}/${schedule.length} done`}
        action={
          <button className="btn btn--sm">
            <IconPlus size={12} />
            <span>{lang === "fr" ? "Ajouter" : "Add"}</span>
          </button>
        }
      />
      <div className="act-timeline">
        {schedule.map((s, i) => (
          <React.Fragment key={i}>
            {i === NOW_AT_INDEX && (
              <div className="act-now">
                <span className="act-now__dot" />
                <span className="act-now__line" />
                <span className="act-now__label">{lang === "fr" ? "Maintenant · 11:00" : "Now · 11:00"}</span>
              </div>
            )}
            <div className={`act-row ${s.state === "done" ? "is-done" : ""}`}>
              <div className="act-row__time t-mono">{s.time}</div>
              <div className={`act-row__chip ${s.internal ? "is-internal" : ""}`}>
                {s.internal ? <IconUsers size={14} /> : s.who.charAt(0)}
              </div>
              <div className="act-row__col">
                <div className="act-row__title">
                  {s.who} · <span style={{ color: "var(--text-2)" }}>{s.what}</span>
                </div>
                <div className="act-row__meta">
                  <span>{s.dur}</span>
                  {s.price && <span>· {s.price}</span>}
                </div>
              </div>
              <div className="act-row__tags">
                {s.flagged && (
                  <span className="act-tag act-tag--warn">
                    {lang === "fr" ? "À confirmer" : "Confirm"}
                  </span>
                )}
                {s.state === "done" && (
                  <span className="act-tag act-tag--ok">
                    <IconCheckCircle size={11} /> {lang === "fr" ? "Fait" : "Done"}
                  </span>
                )}
              </div>
              <button className="act-row__icon" aria-label="message"><IconMessage size={14} /></button>
              <button className="act-row__icon" aria-label="more"><IconMore size={14} /></button>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

// ---- Tasks block ----
function TasksBlock({ lang, done, toggle, sectionsOn = {} }) {
  // tasks include a `requires` field: only show if that section is enabled.
  // When the section is OFF, the task is irrelevant and gets filtered out.
  const tasks = lang === "fr" ? [
    { id: "t1", label: "Confirmer Lucas R. pour 14h",            tag: "Service", requires: "service", prio: 1 },
    { id: "t2", label: "Préparer kit forfait mariage du 12 nov", tag: "Service", requires: "service" },
    { id: "t3", label: "Répondre au devis Atelier Marin",        tag: "Message" },
    { id: "t4", label: "Renouveler stock cire mate",             tag: "Shop",    requires: "shop" },
    { id: "t5", label: "Programmer post — tendances hiver",      tag: "News",    requires: "news" },
    { id: "t6", label: "Relancer inscrits portes ouvertes",      tag: "Event",   requires: "event" },
  ] : [
    { id: "t1", label: "Confirm Lucas R. for 2 pm",              tag: "Service", requires: "service", prio: 1 },
    { id: "t2", label: "Prep Nov 12 wedding-package kit",        tag: "Service", requires: "service" },
    { id: "t3", label: "Reply to Atelier Marin quote",           tag: "Message" },
    { id: "t4", label: "Re-order matte clay stock",              tag: "Shop",    requires: "shop" },
    { id: "t5", label: "Schedule winter-trends post",            tag: "News",    requires: "news" },
    { id: "t6", label: "Follow up on open-studio sign-ups",      tag: "Event",   requires: "event" },
  ];
  const visible = tasks.filter((t) => !t.requires || sectionsOn[t.requires] !== false);

  return (
    <section className="act-block">
      <BlockHead
        icon={<IconCheck size={15} />}
        title={lang === "fr" ? "Tâches" : "To-do"}
        meta={lang === "fr"
          ? `${visible.filter((t) => done[t.id]).length}/${visible.length} terminées`
          : `${visible.filter((t) => done[t.id]).length}/${visible.length} done`}
        action={<button className="btn btn--sm"><IconPlus size={12} /><span>{lang === "fr" ? "Tâche" : "Task"}</span></button>}
      />
      <div className="act-tasks">
        {visible.map((task) => (
          <button
            key={task.id}
            onClick={() => toggle(task.id)}
            className={`act-task ${done[task.id] ? "is-done" : ""}`}
          >
            <span className="act-task__box">
              {done[task.id] && <IconCheck size={12} />}
            </span>
            {task.prio === 1 && <span className="act-task__flag" title="Prioritaire" />}
            <span className="act-task__label">{task.label}</span>
            <span className={`act-task__tag act-task__tag--${(task.requires || "msg")}`}>{task.tag}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---- Shop today (only if shop section ON) ----
function ShopTodayBlock({ lang }) {
  const orders = lang === "fr" ? [
    { id: "#1247", who: "Camille D.",  items: 2, total: "€48", state: "ready",   ago: "il y a 1 h" },
    { id: "#1246", who: "Antoine L.",  items: 1, total: "€22", state: "to-ship", ago: "il y a 3 h" },
    { id: "#1245", who: "Sarah M.",    items: 3, total: "€72", state: "paid",    ago: "ce matin" },
  ] : [
    { id: "#1247", who: "Camille D.",  items: 2, total: "€48", state: "ready",   ago: "1h ago" },
    { id: "#1246", who: "Antoine L.",  items: 1, total: "€22", state: "to-ship", ago: "3h ago" },
    { id: "#1245", who: "Sarah M.",    items: 3, total: "€72", state: "paid",    ago: "this morning" },
  ];
  const stock = lang === "fr" ? [
    { name: "Cire mate 100ml",   qty: 2,  threshold: 10 },
    { name: "Huile à barbe 30ml", qty: 4, threshold: 12 },
  ] : [
    { name: "Matte clay 100ml",  qty: 2,  threshold: 10 },
    { name: "Beard oil 30ml",    qty: 4,  threshold: 12 },
  ];
  const stateLabels = lang === "fr"
    ? { ready: "Prête",   "to-ship": "À expédier", paid: "Payée" }
    : { ready: "Ready",   "to-ship": "To ship",    paid: "Paid"  };

  return (
    <section className="act-block">
      <BlockHead
        icon={<IconBag size={15} />}
        title={lang === "fr" ? "Boutique aujourd'hui" : "Shop today"}
        meta={lang === "fr" ? `${orders.length} commandes · ${stock.length} alertes stock` : `${orders.length} orders · ${stock.length} stock alerts`}
        action={<button className="btn btn--sm">{lang === "fr" ? "Toutes les commandes" : "All orders"} →</button>}
      />
      <div className="act-shop">
        <div className="act-shop__col">
          <div className="act-shop__label">
            {lang === "fr" ? "Commandes en attente" : "Pending orders"}
          </div>
          {orders.map((o, i) => (
            <div key={i} className="act-order">
              <div className="act-order__id t-mono">{o.id}</div>
              <div className="act-order__col">
                <div className="act-order__who">{o.who}</div>
                <div className="act-order__meta">
                  {o.items} {lang === "fr" ? "article(s)" : "item(s)"} · {o.ago}
                </div>
              </div>
              <div className="act-order__total">{o.total}</div>
              <span className={`act-tag act-tag--${o.state}`}>{stateLabels[o.state]}</span>
            </div>
          ))}
        </div>
        <div className="act-shop__col">
          <div className="act-shop__label">
            {lang === "fr" ? "Stock faible" : "Low stock"}
          </div>
          {stock.map((s, i) => {
            const pct = Math.max(8, Math.round((s.qty / s.threshold) * 100));
            return (
              <div key={i} className="act-stock">
                <div className="act-stock__row">
                  <span className="act-stock__name">{s.name}</span>
                  <span className="act-stock__qty t-mono">{s.qty} / {s.threshold}</span>
                </div>
                <div className="act-stock__bar">
                  <div className="act-stock__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <button className="act-shop__action">
            <IconPlus size={13} />
            <span>{lang === "fr" ? "Commander un réassort" : "Reorder stock"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ---- Event prep (only if event section ON) ----
function EventPrepBlock({ lang }) {
  const days = 6; // days until next event
  const filled = 18, capacity = 24;
  const checklist = lang === "fr" ? [
    { id: "e1", label: "Confirmer la liste finale (24)", done: true },
    { id: "e2", label: "Préparer kit démo lissage",      done: true },
    { id: "e3", label: "Envoyer rappel à J-3",           done: false },
    { id: "e4", label: "Vérifier playlist et boissons",  done: false },
    { id: "e5", label: "Briefer l'équipe (16h)",         done: false },
  ] : [
    { id: "e1", label: "Confirm final list (24)",        done: true },
    { id: "e2", label: "Prep smoothing-demo kit",        done: true },
    { id: "e3", label: "Send T-3 reminder",              done: false },
    { id: "e4", label: "Check playlist & drinks",        done: false },
    { id: "e5", label: "Brief team (4 pm)",              done: false },
  ];
  const recentSignups = ["Lucas P.", "Marion K.", "Théo S."];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((filled / capacity) * 100);

  return (
    <section className="act-block">
      <BlockHead
        icon={<IconCalendar size={15} />}
        title={lang === "fr" ? "Préparation événement" : "Event prep"}
        meta={lang === "fr" ? `Portes ouvertes · J-${days}` : `Open studio · T-${days}`}
        action={<button className="btn btn--sm">{lang === "fr" ? "Voir l'événement" : "Open event"} →</button>}
      />
      <div className="act-event">
        <div className="act-event__col">
          <div className="act-event__title">{lang === "fr" ? "Soirée portes ouvertes" : "Open studio night"}</div>
          <div className="act-event__when t-muted t-sm">
            <IconClock size={11} /> 6 nov · 19:00 — 22:00
          </div>
          <div className="act-event__capacity">
            <div className="act-event__cap-row">
              <span className="t-sm">{lang === "fr" ? "Inscrits" : "Sign-ups"}</span>
              <span className="t-mono t-sm">{filled} / {capacity}</span>
            </div>
            <div className="act-stock__bar">
              <div className="act-stock__fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
            </div>
            <div className="act-event__recent">
              <span className="t-xs t-muted">{lang === "fr" ? "Récents" : "Recent"} :</span>
              {recentSignups.map((n, i) => (
                <span key={i} className="act-event__chip">{n}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="act-event__col">
          <div className="act-shop__label" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{lang === "fr" ? "Checklist" : "Checklist"}</span>
            <span className="t-mono t-xs">{doneCount}/{checklist.length}</span>
          </div>
          <div className="act-checklist">
            {checklist.map((c) => (
              <label key={c.id} className={`act-task ${c.done ? "is-done" : ""}`} style={{ cursor: "default" }}>
                <span className="act-task__box">
                  {c.done && <IconCheck size={12} />}
                </span>
                <span className="act-task__label">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Publishing queue (news + video) ----
function PublishQueueBlock({ lang, sectionsOn = {} }) {
  const items = [
    { kind: "post",  when: lang === "fr" ? "Demain · 10:00" : "Tomorrow · 10:00", state: "scheduled", title: lang === "fr" ? "Tendances hiver 2025" : "Winter trends 2025",  requires: "news" },
    { kind: "post",  when: lang === "fr" ? "Brouillon"      : "Draft",            state: "draft",     title: lang === "fr" ? "Coulisses du studio" : "Behind the scenes",   requires: "news" },
    { kind: "video", when: lang === "fr" ? "À vérifier"     : "Needs review",     state: "review",    title: lang === "fr" ? "Vidéo tutoriel barbe" : "Beard tutorial",     requires: "video" },
    { kind: "video", when: lang === "fr" ? "Publié hier"    : "Published yest.",  state: "live",      title: lang === "fr" ? "Démo coupe homme" : "Men's cut demo",         requires: "video" },
  ].filter((it) => sectionsOn[it.requires] !== false);
  const stateLabels = lang === "fr"
    ? { scheduled: "Programmé", draft: "Brouillon", review: "À relire", live: "En ligne" }
    : { scheduled: "Scheduled", draft: "Draft",     review: "Review",   live: "Live"     };
  const stateClass = { scheduled: "warn", draft: "muted", review: "warn", live: "ok" };

  return (
    <section className="act-block">
      <BlockHead
        icon={<IconNewspaper size={15} />}
        title={lang === "fr" ? "À publier" : "Publishing queue"}
        meta={lang === "fr" ? `${items.length} en file` : `${items.length} in queue`}
        action={<button className="btn btn--sm"><IconPlus size={12} /><span>{lang === "fr" ? "Nouveau" : "New"}</span></button>}
      />
      <div className="act-publish">
        {items.map((it, i) => (
          <div key={i} className="act-pub">
            <div className="act-pub__thumb">
              {it.kind === "video" ? <IconPlay size={16} /> : <IconNewspaper size={16} />}
            </div>
            <div className="act-pub__col">
              <div className="act-pub__title">{it.title}</div>
              <div className="act-pub__when t-muted t-xs">{it.when}</div>
            </div>
            <span className={`act-tag act-tag--${stateClass[it.state]}`}>{stateLabels[it.state]}</span>
            <button className="act-row__icon" aria-label="more"><IconMore size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Activity feed (right side) ----
function ActivityFeed({ lang, sectionsOn = {} }) {
  const ALL = [
    { ago: "10:42", kind: "payment", who: "Sofia M.",   txt: lang === "fr" ? "a payé 35€"                : "paid €35",                requires: null },
    { ago: "10:31", kind: "message", who: "Atelier M.", txt: lang === "fr" ? "a envoyé un devis"         : "sent a quote",            requires: null },
    { ago: "10:08", kind: "booking", who: "Lucas R.",   txt: lang === "fr" ? "a réservé pour 14:00"      : "booked for 2 pm",         requires: "service" },
    { ago: "09:55", kind: "review",  who: "Théo D.",    txt: lang === "fr" ? "a laissé un avis 5★"       : "left a 5★ review",        requires: null },
    { ago: "09:30", kind: "shop",    who: "Camille D.", txt: lang === "fr" ? "a commandé 2 articles"     : "ordered 2 items",         requires: "shop" },
    { ago: "09:12", kind: "event",   who: "Marion K.",  txt: lang === "fr" ? "s'est inscrite à l'événement" : "signed up for the event", requires: "event" },
    { ago: "Hier",  kind: "news",    who: "vous",       txt: lang === "fr" ? "avez publié un article"    : "published an article",    requires: "news" },
  ].filter((it) => !it.requires || sectionsOn[it.requires] !== false);
  const ICONS = {
    payment: <IconCash size={12} />,
    message: <IconMessage size={12} />,
    booking: <IconCalendar size={12} />,
    review:  <IconStar size={12} />,
    shop:    <IconBag size={12} />,
    event:   <IconCalendar size={12} />,
    news:    <IconNewspaper size={12} />,
  };
  const COLORS = {
    payment: "rgb(44,141,74)",
    message: "var(--accent)",
    booking: "var(--nav-dark)",
    review:  "rgb(217,148,37)",
    shop:    "var(--accent)",
    event:   "var(--nav-dark)",
    news:    "rgb(107,114,128)",
  };

  return (
    <section className="act-side-block">
      <BlockHead
        icon={<IconPulse size={14} />}
        title={lang === "fr" ? "Flux d'activité" : "Activity feed"}
        meta={null}
        action={null}
      />
      <div className="act-feed">
        {ALL.map((it, i) => (
          <div key={i} className="act-feed__item">
            <div className="act-feed__icon" style={{ color: COLORS[it.kind], background: "var(--panel)" }}>
              {ICONS[it.kind]}
            </div>
            <div className="act-feed__col">
              <div className="act-feed__line">
                <span style={{ fontWeight: 500 }}>{it.who}</span>{" "}
                <span className="t-muted t-sm">{it.txt}</span>
              </div>
              <div className="act-feed__when t-mono t-xs">{it.ago}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Quick actions (right side) ----
function QuickActions({ lang, sectionsOn = {} }) {
  const actions = [
    { id: "payment", label: lang === "fr" ? "Encaissement"   : "Take payment",  Icon: IconCash,    color: "rgb(44,141,74)",     requires: null },
    { id: "invoice", label: lang === "fr" ? "Nouvelle facture": "New invoice",   Icon: IconFile,    color: "var(--nav-dark)",    requires: null },
    { id: "block",   label: lang === "fr" ? "Bloquer créneau" : "Block slot",    Icon: IconClock,   color: "var(--accent)",      requires: "service" },
    { id: "closed",  label: lang === "fr" ? "Marquer fermé"   : "Mark closed",   Icon: IconX,       color: "rgb(181,51,51)",     requires: null },
    { id: "promo",   label: lang === "fr" ? "Lancer promo"    : "Run promo",     Icon: IconMegaphone, color: "rgb(217,148,37)",  requires: "shop" },
    { id: "post",    label: lang === "fr" ? "Publier post"    : "Publish post",  Icon: IconNewspaper, color: "var(--nav-dark)",  requires: "news" },
  ].filter((a) => !a.requires || sectionsOn[a.requires] !== false);

  return (
    <section className="act-side-block">
      <BlockHead
        icon={<IconZap size={14} />}
        title={lang === "fr" ? "Actions rapides" : "Quick actions"}
        meta={null}
        action={null}
      />
      <div className="act-quick">
        {actions.map((a) => {
          const Ic = a.Icon;
          return (
            <button key={a.id} className="act-quick__btn">
              <span className="act-quick__icon" style={{ color: a.color }}>
                <Ic size={16} />
              </span>
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---- Block head ----
function BlockHead({ icon, title, meta, action }) {
  return (
    <div className="act-block__head">
      <div className="act-block__title">
        <span className="act-block__icon">{icon}</span>
        <span>{title}</span>
        {meta && <span className="act-block__meta">{meta}</span>}
      </div>
      {action && <div className="act-block__action">{action}</div>}
    </div>
  );
}

window.HomeFeedScreen = HomeFeedScreen;
window.ActivityTodayScreen = ActivityTodayScreen;
