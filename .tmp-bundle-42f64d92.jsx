/* global React, useT */
/* global IconCaret, IconHome, IconChart, IconMegaphone, IconZap, IconPlug, IconSettings, IconCash, IconCard, IconImage, IconFolder, IconSearch, IconMessage, IconBell, IconSidebar, IconX, IconPlus, IconUser, IconLayout, IconBag, IconCalendar, IconBriefcase, IconNewspaper, IconPlay, IconHelp, IconRoute, IconGrip, IconLock */
/* global IconSun, IconCloud, IconRain, IconSunCloud, IconMoon, IconCreditCard, IconCheck, IconLogout, IconUsers, IconBookmark, IconHeart, IconClock, IconPulse */

const { useState, useEffect, useMemo, useRef } = React;

// -------------------------------------------------------------
//  Header — IBEE brand center, weather + time, profile dropdown
// -------------------------------------------------------------
function AppHeader({ lang, time, weather, dark, onDarkToggle, onLangToggle, onMenuNavigate, route }) {
  const t = useT(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // pick weather icon from condition code
  const WeatherIcon = ({ size = 18 }) => {
    switch (weather.cond) {
      case "rain":     return <IconRain size={size} />;
      case "cloud":    return <IconCloud size={size} />;
      case "mixed":    return <IconSunCloud size={size} />;
      case "sun":
      default:         return <IconSun size={size} />;
    }
  };

  const HEADER_MENU = [
    { id: "revenue",       labelKey: "revenue",       Icon: IconCash },
    { id: "settings",      labelKey: "settings",      Icon: IconUser },
    { id: "account-drive", labelKey: "drive",         Icon: IconFolder },
    { id: "notifications", labelKey: "notifications", Icon: IconBell },
    { id: "privacy",       labelKey: "privacy",       Icon: IconLock },
  ];

  return (
    <header className="app-header" data-screen-label="Header">
      <div className="app-header__project">
        <span>{t("project")}</span>
        <IconCaret size={16} />
      </div>

      <div className="app-header__brand">
        {t("brand")}<sup>v0.4</sup>
      </div>

      <div className="app-header__right">
        <div className="app-header__weather" title={t("weatherDesc")}>
          <WeatherIcon size={18} />
          <span className="app-header__weather-temp">{weather.temp}°</span>
        </div>
        <div className="app-header__time">{time}</div>

        <button className="btn btn--icon btn--ghost" aria-label="Notifications">
          <IconBell size={18} />
        </button>

        <div className="app-header__avatar-wrap" ref={menuRef}>
          <button
            className={`app-header__avatar ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Profile menu"
          />
          {menuOpen && (
            <div className="app-menu fade-enter" role="menu">
              <div className="app-menu__profile">
                <div className="app-menu__avatar" />
                <div>
                  <div className="app-menu__name">Le Querre Killian</div>
                  <div className="app-menu__handle t-muted t-xs">ibee.app/killian</div>
                </div>
              </div>
              <hr className="app-menu__divider" />
              {HEADER_MENU.map((m) => {
                const IconC = m.Icon;
                return (
                  <button
                    key={m.id}
                    className="app-menu__item"
                    onClick={() => { onMenuNavigate(m.id); setMenuOpen(false); }}
                  >
                    <IconC size={16} />
                    <span>{t(m.labelKey)}</span>
                  </button>
                );
              })}
              <hr className="app-menu__divider" />
              <button className="app-menu__item" onClick={onDarkToggle}>
                {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
                <span>{dark ? t("lightMode") : t("darkMode")}</span>
              </button>
              <button className="app-menu__item" onClick={onLangToggle}>
                <span style={{ width: 16, display: "inline-flex", justifyContent: "center", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                  {lang === "fr" ? "EN" : "FR"}
                </span>
                <span>{t("headerSwitchLang")}</span>
              </button>
              <hr className="app-menu__divider" />
              <button className="app-menu__item app-menu__item--soft">
                <IconLogout size={16} />
                <span>{t("logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// -------------------------------------------------------------
//  Profile sections (defines tab order + edit-panel rail)
//  Order: Home → Info → Shop → Event → Service → News → Vidéo → F.A.Q → Drive → Parcours → Histoire
//  Home is a summary widget grid; Info is bio + contact.
// -------------------------------------------------------------
// Fixed order — not reorderable. Tabs allowed:
//   Home, News, Shop, Service, Event, Video, Histoire
//   (Info content is surfaced only on the Home/Accueil tab — not a standalone menu.)
const PROFILE_SECTIONS = [
  { id: "home",     labelKey: "homeTab",  defaultOn: true,  Icon: IconHome },
  { id: "news",     labelKey: "news",     defaultOn: true,  Icon: IconNewspaper },
  { id: "shop",     labelKey: "shop",     defaultOn: true,  Icon: IconBag },
  { id: "service",  labelKey: "service",  defaultOn: true,  Icon: IconBriefcase },
  { id: "event",    labelKey: "event",    defaultOn: false, Icon: IconCalendar },
  { id: "video",    labelKey: "video",    defaultOn: false, Icon: IconPlay },
  { id: "histoire", labelKey: "histoire", defaultOn: true,  Icon: IconBookmark },
];

// -------------------------------------------------------------
//  Edit-mode panel (right rail — only visible on Profile in owner mode)
// -------------------------------------------------------------
function EditModePanel({ lang, sectionsOn, onToggle, onClose, activeTab, onSelectTab }) {
  const t = useT(lang);
  const active = PROFILE_SECTIONS.find((s) => s.id === activeTab);
  const ActiveIcon = active ? active.Icon : IconHome;

  // contextual add labels + hints per section
  const addLabel = {
    news:     lang === "fr" ? "Nouvelle publication"   : "New post",
    shop:     lang === "fr" ? "Nouveau produit"        : "New product",
    service:  lang === "fr" ? "Nouveau service"        : "New service",
    event:    lang === "fr" ? "Nouvel événement"       : "New event",
    video:    lang === "fr" ? "Nouvelle vidéo"         : "New video",
    histoire: lang === "fr" ? "Nouveau paragraphe"     : "New paragraph",
  }[activeTab];

  const sectionHint = {
    home:     lang === "fr"
      ? "Glissez les blocs pour les réordonner. Utilisez « Masquer » pour cacher un bloc."
      : "Drag blocks to reorder. Use “Hide” to remove a block from view.",
    news:     lang === "fr"
      ? "Publications affichées en flux. Glissez pour réordonner."
      : "Posts shown as a feed. Drag to reorder.",
    shop:     lang === "fr"
      ? "Produits regroupés par catégorie. Cliquez ✎ pour modifier."
      : "Products grouped by category. Click ✎ to edit.",
    service:  lang === "fr"
      ? "Prestations regroupées par catégorie. Glissez pour réordonner."
      : "Services grouped by category. Drag to reorder.",
    event:    lang === "fr"
      ? "Événements affichés par ordre chronologique."
      : "Events shown chronologically.",
    video:    lang === "fr"
      ? "Grille vidéo regroupée par thème."
      : "Video grid grouped by theme.",
    histoire: lang === "fr"
      ? "Éditez le titre et les paragraphes en cliquant directement dessus."
      : "Edit title and paragraphs by clicking directly on them.",
  }[activeTab];

  // broadcast an "add" intent — each section listens
  const dispatchAdd = () => {
    window.dispatchEvent(new CustomEvent("ibee:edit-add", { detail: { section: activeTab } }));
  };

  const activeSectionLabel = active ? t(active.labelKey) : "";
  const isOn = active ? !!sectionsOn[active.id] : false;

  return (
    <aside className="editpanel" data-screen-label="EditPanel">
      <div className="editpanel__head">
        <div>
          <div className="editpanel__eyebrow">{lang === "fr" ? "Mode édition" : "Edit mode"}</div>
          <div className="editpanel__title">
            {lang === "fr" ? `Édition — ${activeSectionLabel}` : `Editing — ${activeSectionLabel}`}
          </div>
        </div>
        {onClose && (
          <button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Horizontal section nav — icon tabs */}
      <div className="editpanel__nav">
        {PROFILE_SECTIONS.map((s) => {
          const IconC = s.Icon;
          const isActive = activeTab === s.id;
          const on = sectionsOn[s.id];
          return (
            <button
              key={s.id}
              className={`editpanel__nav-btn ${isActive ? "is-active" : ""} ${on ? "" : "is-off"}`}
              onClick={() => onSelectTab && onSelectTab(s.id)}
              title={t(s.labelKey)}
            >
              <IconC size={18} />
              <span>{t(s.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Active section editor */}
      {active && (
        <div className="editpanel__active">
          <div className="editpanel__active-head">
            <div className="editpanel__active-icon">
              <ActiveIcon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="editpanel__active-title">{activeSectionLabel}</div>
              <div className="editpanel__active-sub">
                {lang === "fr" ? "Édition de la section" : "Section editor"}
              </div>
            </div>
            <button
              className={`editpanel__visibility ${isOn ? "is-on" : "is-off"}`}
              onClick={() => onToggle(active.id)}
              title={isOn
                ? (lang === "fr" ? "Section visible — cliquer pour masquer" : "Section visible — click to hide")
                : (lang === "fr" ? "Section masquée — cliquer pour afficher" : "Section hidden — click to show")}
            >
              <span className="editpanel__visibility-dot" />
              <span>{isOn ? t("active") : t("inactive")}</span>
            </button>
          </div>

          {addLabel && (
            <button className="btn btn--accent" style={{ width: "100%", justifyContent: "center" }} onClick={dispatchAdd}>
              <IconPlus size={14} />
              <span>{addLabel}</span>
            </button>
          )}

          {sectionHint && (
            <div className="editpanel__hint">{sectionHint}</div>
          )}
        </div>
      )}

      <hr className="editpanel__hr" />

      <button className="btn btn--ghost btn--sm" style={{ width: "100%", justifyContent: "center" }}>
        <IconPlus size={14} />
        <span>{lang === "fr" ? "Ajouter une section" : "Add a section"}</span>
      </button>

      <hr className="editpanel__hr" />

      <div className="editpanel__group">
        <div className="editpanel__label">{lang === "fr" ? "Liens personnalisés" : "Custom links"}</div>
        <div className="editpanel__row">
          <div className="editpanel__row__left">
            <IconGrip size={14} />
            <span className="editpanel__label-text">Instagram</span>
          </div>
          <div className="editpanel__status is-on">@killian.lq</div>
        </div>
        <div className="editpanel__row">
          <div className="editpanel__row__left">
            <IconGrip size={14} />
            <span className="editpanel__label-text">TikTok</span>
          </div>
          <div className="editpanel__status is-on">@killianstudio</div>
        </div>
        <button className="btn btn--ghost btn--sm" style={{ width: "100%", justifyContent: "center" }}>
          <IconPlus size={14} />
          <span>{lang === "fr" ? "Ajouter un lien" : "Add a link"}</span>
        </button>
      </div>
    </aside>
  );
}

// -------------------------------------------------------------
//  Profile sidebar — page-specific left rail (Activity-Menu from Figma)
//  Items mirror the Figma "Activity-Menu" frame: Generale + Outils.
// -------------------------------------------------------------
const PROFILE_SIDEBAR_GROUPS = [
  {
    labelKey: "general",
    items: [
      { id: "profile",   labelKey: "profileWebTab", Icon: IconHome },
      { id: "analytics", labelKey: "analytics", Icon: IconChart },
    ],
  },
  {
    labelKey: "tools",
    items: [
      { id: "connector",  labelKey: "connector",  Icon: IconPlug },
      { id: "drive",      labelKey: "drive",      Icon: IconFolder },
      { id: "team",       labelKey: "team",       Icon: IconUsers },
    ],
  },
];

// -------------------------------------------------------------
//  Account sidebar — shown on Revenu + account pages.
//  Mirrors the header avatar menu: Revenu · Mon compte · Drive
//  · Notification · Confidentialité.
// -------------------------------------------------------------
const ACCOUNT_SIDEBAR = [
  { id: "revenue",       labelKey: "revenue",       Icon: IconCash },
  { id: "settings",      labelKey: "settings",      Icon: IconUser },
  { id: "account-drive", labelKey: "drive",         Icon: IconFolder },
  { id: "notifications", labelKey: "notifications", Icon: IconBell },
  { id: "privacy",       labelKey: "privacy",       Icon: IconLock },
];

function AccountSidebar({ lang, current, onNavigate }) {
  const t = useT(lang);
  return (
    <aside className="sidebar" data-screen-label="AccountSidebar">
      <div className="sidebar__section">
        <div className="sidebar__label">{t("account")}</div>
        {ACCOUNT_SIDEBAR.map((it) => {
          const IconC = it.Icon;
          const active = it.id === current;
          return (
            <div
              key={it.id}
              className={`sidebar__item ${active ? "is-active" : ""}`}
              onClick={() => onNavigate(it.id)}
            >
              <IconC size={18} />
              <span>{t(it.labelKey)}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ProfileSidebar({ lang, current, onNavigate }) {
  const t = useT(lang);
  return (
    <aside className="sidebar" data-screen-label="ProfileSidebar">
      {PROFILE_SIDEBAR_GROUPS.map((g) => (
        <div className="sidebar__section" key={g.labelKey}>
          <div className="sidebar__label">{t(g.labelKey)}</div>
          {g.items.map((it) => {
            const IconC = it.Icon;
            const active = it.id === current;
            return (
              <div
                key={it.id}
                className={`sidebar__item ${active ? "is-active" : ""}`}
                onClick={() => onNavigate(it.id)}
              >
                <IconC size={18} />
                <span>{t(it.labelKey)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// -------------------------------------------------------------
//  Floating nav-main pill — PRIMARY navigation
//  Home (feed) · Messages · Activity · Profile
// -------------------------------------------------------------
const NAV_PILL = [
  { id: "home",     Icon: IconHome,     labelKey: "homeTab" },
  { id: "messages", Icon: IconMessage,  labelKey: "messages" },
  { id: "activity", Icon: IconPulse,    labelKey: "activity" },
  { id: "profile",  Icon: IconUser,     labelKey: "headerProfile" },
];

function NavPill({ lang, current, onNavigate }) {
  const t = useT(lang);
  return (
    <div className="navpill" data-screen-label="NavPill">
      {NAV_PILL.map((b) => {
        const IconC = b.Icon;
        const active = current === b.id;
        return (
          <button
            key={b.id}
            className={`navpill__btn ${active ? "is-active" : ""}`}
            onClick={() => onNavigate(b.id)}
            aria-label={b.id}
            title={t(b.labelKey)}
          >
            <IconC size={20} />
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { AppHeader, EditModePanel, NavPill, ProfileSidebar, AccountSidebar, PROFILE_SECTIONS, NAV_PILL });
