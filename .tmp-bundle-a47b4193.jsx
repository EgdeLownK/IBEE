/* global React, useT, Ph, IconSearch, IconMapPin, IconHeart, IconBookmark, IconMore */

// =============================================================
//  Research / Discover screen
// =============================================================
const RESEARCH_RESULTS = [
  { name: "Le Querre Killian", tags: ["Coiffeur", "Lyon",     "Forfait"], rating: 4.9, owner: true },
  { name: "Atelier Marin",     tags: ["Photographe", "Paris", "Mariage"], rating: 4.8 },
  { name: "Studio Hold-On",    tags: ["Coach sport", "Bordeaux"],         rating: 4.7 },
  { name: "Pauline Méric",     tags: ["Naturopathe", "Marseille"],        rating: 4.9 },
  { name: "Café Robert",       tags: ["Restaurant", "Lyon"],              rating: 4.6 },
  { name: "Sigma Yoga",        tags: ["Yoga", "Lille",      "Atelier"],   rating: 4.8 },
];

const RESEARCH_TRENDS = [
  { fr: "Coiffeurs Lyon",      en: "Stylists Lyon" },
  { fr: "Photographe mariage", en: "Wedding photographer" },
  { fr: "Coach sportif",       en: "Personal trainer" },
  { fr: "Naturopathe",         en: "Naturopath" },
  { fr: "Yoga Paris",          en: "Yoga Paris" },
];

function ResearchScreen({ lang, onOpenProfile }) {
  const t = useT(lang);
  const [query, setQuery] = React.useState("");
  const [favs, setFavs] = React.useState({});
  const toggleFav = (id) => setFavs((f) => ({ ...f, [id]: !f[id] }));

  const filtered = query
    ? RESEARCH_RESULTS.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : RESEARCH_RESULTS;

  return (
    <div className="fade-enter" data-screen-label="12 Research">
      <div className="research-hero">
        <h1>{t("discover")}</h1>
        <p className="t-muted">{t("discoverSub")}</p>
        <div className="research-search">
          <IconSearch size={20} className="research-search__icon" />
          <input
            className="input"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn--accent research-search__btn">{t("searchBtn")}</button>
        </div>
        <div className="research-suggest">
          {RESEARCH_TRENDS.map((tr, i) => (
            <div
              key={i}
              className="chip"
              onClick={() => setQuery(tr[lang])}
            >
              {tr[lang]}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 14px" }}>
          <div className="t-display" style={{ fontSize: 18, fontWeight: 500 }}>
            {query
              ? (lang === "fr" ? `Résultats pour « ${query} »` : `Results for “${query}”`)
              : t("trending")}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div className="chip is-on">{lang === "fr" ? "Tous" : "All"}</div>
            <div className="chip">{lang === "fr" ? "Proche" : "Nearby"}</div>
            <div className="chip">{lang === "fr" ? "Mieux notés" : "Top rated"}</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <h3>{lang === "fr" ? "Aucun résultat" : "No results"}</h3>
            <p>{lang === "fr" ? "Essayez un autre terme." : "Try another term."}</p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <div
              key={i}
              className="result-card"
              onClick={() => r.owner && onOpenProfile && onOpenProfile()}
            >
              <Ph className="result-card__img" label="img" />
              <div>
                <div className="result-card__name">{r.name}</div>
                <div className="t-xs t-muted" style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  ★ {r.rating.toFixed(1)} · <IconMapPin size={11} /> {r.tags.find((t) => t.length < 12) || r.tags[0]}
                </div>
                <div className="result-card__tags">
                  {r.tags.map((tag, j) => (
                    <span key={j} className="result-card__tag">{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn--icon"
                  onClick={(e) => { e.stopPropagation(); toggleFav(i); }}
                  aria-label="favourite"
                >
                  <IconHeart
                    size={16}
                    color={favs[i] ? "rgb(217,85,37)" : "currentColor"}
                    style={{ fill: favs[i] ? "rgb(217,85,37)" : "transparent" }}
                  />
                </button>
                {r.owner && (
                  <button className="btn btn--sm">{lang === "fr" ? "Ouvrir" : "Open"}</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================
//  Messages screen
// =============================================================
const THREADS_FR = [
  { name: "Lucas R.",  last: "Top, à demain 14h !",        when: "12:04", unread: false },
  { name: "Emma G.",   last: "Tu as une dispo samedi ?",   when: "11:18", unread: true },
  { name: "Sofia M.",  last: "J'ai adoré la coupe 💜",     when: "Hier",  unread: false },
  { name: "Théo D.",   last: "Désolé pour l'annulation",   when: "Hier",  unread: false },
  { name: "Manager",   last: "Devis envoyé.",              when: "Lun",   unread: false },
];
const THREADS_EN = [
  { name: "Lucas R.",  last: "Great, see you tomorrow 2pm!", when: "12:04", unread: false },
  { name: "Emma G.",   last: "Any slot Saturday?",          when: "11:18", unread: true },
  { name: "Sofia M.",  last: "Loved the cut 💜",             when: "Yest.", unread: false },
  { name: "Théo D.",   last: "Sorry about the cancellation", when: "Yest.", unread: false },
  { name: "Manager",   last: "Quote sent.",                  when: "Mon",   unread: false },
];

const SAMPLE_THREAD_FR = [
  { who: "them", text: "Salut Killian, j'ai un mariage le 12 nov, tu serais dispo ?" },
  { who: "me",   text: "Oui, je note ! Forfait mariage à 180€, 2h sur place. Ça te va ?" },
  { who: "them", text: "Parfait. Tu peux venir au Domaine de la Pierre Bleue ?" },
  { who: "me",   text: "Pas de souci. Je te confirme par mail avec un acompte de 30%." },
  { who: "them", text: "Top, à demain 14h !" },
];
const SAMPLE_THREAD_EN = [
  { who: "them", text: "Hey Killian, I've got a wedding on Nov 12 — are you free?" },
  { who: "me",   text: "Yes, noted! Wedding package is €180, 2h on-site. Sound good?" },
  { who: "them", text: "Perfect. Can you come to Domaine de la Pierre Bleue?" },
  { who: "me",   text: "No problem. I'll confirm by email with a 30% deposit." },
  { who: "them", text: "Great, see you tomorrow 2pm!" },
];

function MessagesScreen({ lang }) {
  const t = useT(lang);
  const threads = lang === "fr" ? THREADS_FR : THREADS_EN;
  const [active, setActive] = React.useState(0);
  const [thread, setThread] = React.useState(
    lang === "fr" ? SAMPLE_THREAD_FR : SAMPLE_THREAD_EN
  );
  const [draft, setDraft] = React.useState("");
  React.useEffect(() => {
    setThread(lang === "fr" ? SAMPLE_THREAD_FR : SAMPLE_THREAD_EN);
  }, [lang, active]);

  const send = () => {
    if (!draft.trim()) return;
    setThread((th) => [...th, { who: "me", text: draft.trim() }]);
    setDraft("");
  };

  return (
    <div className="fade-enter" data-screen-label="13 Messages">
      <h1 className="t-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>
        {t("messages")}
      </h1>

      <div className="msg-layout">
        <div className="msg-list scroll-y">
          {threads.map((m, i) => (
            <div
              key={i}
              className={`msg-list__item ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
                {m.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="msg-list__name">{m.name}</div>
                  <div className="t-xs t-muted">{m.when}</div>
                </div>
                <div className="msg-list__preview">{m.last}</div>
              </div>
              {m.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 8 }} />}
            </div>
          ))}
        </div>

        <div className="msg-thread">
          <div className="msg-thread__head">
            <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>{threads[active].name.charAt(0)}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{threads[active].name}</div>
              <div className="t-xs t-muted">{lang === "fr" ? "En ligne" : "Online"}</div>
            </div>
          </div>
          <div className="msg-thread__body scroll-y">
            {thread.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.who === "me" ? "is-me" : "is-them"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="msg-thread__compose">
            <input
              className="input"
              placeholder={t("typeMessage")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn--accent" onClick={send}>{t("send")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ResearchScreen, MessagesScreen });
