/* global React, ReactDOM, useT */
/* global AppHeader, EditModePanel, NavPill, ProfileSidebar, AccountSidebar, PROFILE_SECTIONS */
/* global ProfileScreen */
/* global HomeFeedScreen, ActivityTodayScreen */
/* global MessagesScreen, ResearchScreen */
/* global PaiementScreen, RevenuScreen, SettingsScreen, AnalyticsScreen, MarketingScreen, AutomationScreen, ConnectorScreen, PrivacyScreen, NotificationsScreen, DriveScreen, AccountDriveScreen, TeamScreen */
/* global TweaksPanel, useTweaks, TweakSection, TweakColor, TweakRadio, TweakToggle */
/* global ChromeWindow */
/* global MoveModeContext */

const { useState, useEffect, useMemo, useRef } = React;

// Tweak defaults — single block in this file, picked up by host & saved across sessions.
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "terracotta",
  "showNavPill": true
}/*EDITMODE-END*/;

// Coherent accent palettes — same chroma, varied hue. Each pairs an accent with a nav-dark tone.
const PALETTES = {
  terracotta: { name: "Terracotta", accent: "rgb(217, 85, 37)",  accentSoft: "rgba(217,85,37,0.10)", navDark: "rgb(42, 74, 107)" },
  sage:       { name: "Sage",       accent: "rgb(107, 142, 90)", accentSoft: "rgba(107,142,90,0.12)", navDark: "rgb(46, 74, 56)"  },
  indigo:     { name: "Indigo",     accent: "rgb(79, 91, 213)",  accentSoft: "rgba(79,91,213,0.10)",  navDark: "rgb(42, 52, 117)" },
  plum:       { name: "Plum",       accent: "rgb(156, 75, 110)", accentSoft: "rgba(156,75,110,0.10)", navDark: "rgb(74, 42, 69)"  },
  charcoal:   { name: "Charcoal",   accent: "rgb(60, 60, 60)",   accentSoft: "rgba(60,60,60,0.10)",   navDark: "rgb(20, 20, 19)"  },
};

const WEATHER = { cond: "sun", temp: 21 }; // mocked

// =============================================================
//  Root App
// =============================================================
function App() {
  // Routing — 4 primary routes from the floating nav-pill,
  // plus a handful of secondary routes reachable from the header avatar menu.
  const [route, setRoute] = useState("profile");          // home | messages | activity | profile | revenue | payment | settings
  const [lang, setLang]   = useState("fr");
  const [dark, setDark]   = useState(false);
  const [activeTab, setActiveTab] = useState("home");      // profile section

  // Profile sections — visibility only; order is fixed (defined in chrome.jsx).
  const sectionOrder = PROFILE_SECTIONS.map((s) => s.id);
  const [sectionsOn, setSectionsOn] = useState(
    Object.fromEntries(PROFILE_SECTIONS.map((s) => [s.id, s.defaultOn]))
  );
  // disabledOrder tracks the order in which sections were toggled OFF
  // (most-recently-disabled FIRST). Hidden tabs render at the end of the
  // tab list in this order, so a freshly hidden item sits right behind
  // the last visible item.
  const [disabledOrder, setDisabledOrder] = useState([]);

  // Edit mode is the PRIMARY view now — always on.
  // "Déplacer" toggle gates drag-and-drop reordering separately.
  const editPanelOpen = true;
  const [moveMode, setMoveMode] = useState(false);

  // tweaks
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const palette = PALETTES[tweaks.palette] || PALETTES.terracotta;

  // apply palette + dark mode to root CSS vars
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent",      palette.accent);
    r.style.setProperty("--accent-tint", palette.accentSoft);
    r.style.setProperty("--nav-dark",    palette.navDark);
  }, [palette]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // ----- handlers -----
  const toggleSection = (id) => {
    setSectionsOn((on) => {
      const next = !on[id];
      setDisabledOrder((dq) => {
        if (next) return dq.filter((x) => x !== id);     // turning on -> remove from disabled queue
        return [id, ...dq.filter((x) => x !== id)];      // turning off -> push to FRONT (most-recent first)
      });
      return { ...on, [id]: next };
    });
  };

  // keep activeTab valid when sections change
  useEffect(() => {
    // "infos" is a synthetic edit-only tab — always valid in edit mode
    if (activeTab === "infos") {
      if (!editPanelOpen) {
        const firstOn = sectionOrder.find((id) => sectionsOn[id]);
        if (firstOn) setActiveTab(firstOn);
      }
      return;
    }
    // in edit mode, allow staying on a hidden tab so the user can see/edit it
    if (editPanelOpen) return;
    if (!sectionsOn[activeTab]) {
      const firstOn = sectionOrder.find((id) => sectionsOn[id]);
      if (firstOn) setActiveTab(firstOn);
    }
  }, [sectionsOn, sectionOrder, activeTab, editPanelOpen]);

  // include the side-tools screens (used by profile sidebar)
  const screens = {
    home:       { Cmp: HomeFeedScreen,       props: { onOpenProfile: () => setRoute("profile") } },
    messages:   { Cmp: MessagesScreen },
    activity:   { Cmp: ActivityTodayScreen, props: { sectionsOn } },
    profile:    { Cmp: ProfileScreen,        props: {
                     activeTab, onTabChange: setActiveTab,
                     sectionsOn, sectionOrder, disabledOrder,
                     editPanelOpen,
                     editMode: editPanelOpen,
                     moveMode,
                     onToggleMoveMode: () => setMoveMode(m => !m),
                     onToggleSection: toggleSection,
                   } },
    revenue:    { Cmp: RevenuScreen },
    payment:    { Cmp: PaiementScreen },
    settings:   { Cmp: SettingsScreen,       props: { theme: tweaks.palette, onTheme: (v) => setTweak("palette", v) } },
    privacy:    { Cmp: PrivacyScreen },
    notifications: { Cmp: NotificationsScreen },
    drive:      { Cmp: DriveScreen },
    "account-drive": { Cmp: AccountDriveScreen, props: { onOpenProfileDrive: () => setRoute("drive") } },
    team:       { Cmp: TeamScreen },
    discover:   { Cmp: ResearchScreen,       props: { onOpenProfile: () => setRoute("profile") } },
    analytics:  { Cmp: AnalyticsScreen },
    marketing:  { Cmp: MarketingScreen },
    automation: { Cmp: AutomationScreen },
    connector:  { Cmp: ConnectorScreen },
  };

  const navPillCurrent =
    ["home", "messages", "activity", "profile"].includes(route) ? route : "";

  const current = screens[route] || screens.home;
  const ScreenCmp = current.Cmp;
  const screenProps = { lang, ...(current.props || {}) };

  // sidebar is page-specific. Two rails:
  //  • account rail  — Revenu + account pages (header avatar menu mirror)
  //  • profile rail  — the profile-web management pages
  const ACCOUNT_ROUTES      = ["revenue", "settings", "account-drive", "notifications", "privacy"];
  const PROFILE_MGMT_ROUTES = ["profile", "analytics", "marketing", "automation", "connector", "team", "drive"];
  const showAccountSidebar  = ACCOUNT_ROUTES.includes(route);
  const showProfileSidebar  = PROFILE_MGMT_ROUTES.includes(route);
  const showSidebar = showAccountSidebar || showProfileSidebar;
  // edit panel removed — edit mode now lives inline within profile sections.
  const showEditPanel = false;
  // Routes that fill the full stage width (instead of the 800px column).
  const WIDE_ROUTES = ["messages", "activity", "home", "analytics", "marketing", "drive", "account-drive"];
  const isWide = WIDE_ROUTES.includes(route);

  // viewport-fit scaling for the 1440px app inside the chrome window
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const W = 1440 + 4;
      const H = 1024 + 86;
      const s = Math.min(
        (window.innerWidth  - 24) / W,
        (window.innerHeight - 24) / H,
        1
      );
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const tabTitle = `IBEE — ${route === "profile" ? "Le Querre Killian" : route}`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      background: "#1a1a1a",
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        width: 1440,
        height: 1024 + 86,
      }}>
        <ChromeWindow
          tabs={[
            { title: tabTitle },
            { title: lang === "fr" ? "Aperçu client" : "Public preview" },
          ]}
          activeIndex={0}
          url={`ibee.app/${route === "profile" ? "killian" : route}`}
          width={1440}
          height={1024 + 86}
        >
          <div className="app">
            <AppHeader
              lang={lang}
              time={timeStr}
              weather={WEATHER}
              dark={dark}
              onDarkToggle={() => setDark(d => !d)}
              onLangToggle={() => setLang(l => l === "fr" ? "en" : "fr")}
              onMenuNavigate={(id) => setRoute(id)}
              route={route}
            />

            <div className={`app-main ${showSidebar ? "app-main--with-sidebar" : ""} ${showEditPanel ? "" : "app-main--no-rail"}`}>
              {showAccountSidebar ? (
                <AccountSidebar
                  lang={lang}
                  current={route}
                  onNavigate={setRoute}
                />
              ) : showProfileSidebar ? (
                <ProfileSidebar
                  lang={lang}
                  current={route === "profile" ? "profile" : route}
                  onNavigate={setRoute}
                />
              ) : <div />}

              <div className="stage scroll-y">
                <div className={`stage__inner ${isWide ? "stage__inner--wide" : ""}`}>
                  <MoveModeContext.Provider value={moveMode}>
                    <ScreenCmp {...screenProps} />
                  </MoveModeContext.Provider>
                  <div style={{ height: 90 }} />
                </div>
              </div>

              {/* edit panel removed — primary view is now edit mode itself */}
              <div />
            </div>

            {tweaks.showNavPill && (
              <NavPill
                lang={lang}
                current={navPillCurrent}
                onNavigate={setRoute}
              />
            )}
          </div>
        </ChromeWindow>
      </div>

      <AppTweaks
        tweaks={tweaks}
        setTweak={setTweak}
        palettes={PALETTES}
      />
    </div>
  );
}

// =============================================================
//  Tweaks panel
// =============================================================
function AppTweaks({ tweaks, setTweak, palettes }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme">
        <TweakColor
          label="Accent palette"
          value={palettes[tweaks.palette].accent}
          options={Object.values(palettes).map((p) => p.accent)}
          onChange={(v) => {
            const key = Object.entries(palettes).find(([, p]) => p.accent === v)?.[0];
            if (key) setTweak("palette", key);
          }}
        />
      </TweakSection>

      <TweakSection label="Layout">
        <TweakToggle
          label="Floating nav pill"
          value={!!tweaks.showNavPill}
          onChange={(v) => setTweak("showNavPill", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
