/* global React, useT, IconPlus, IconShare, IconMore, IconCaret, IconEdit, IconMapPin, IconClock, IconHeart, IconBookmark, IconPlay, IconLink, IconFlag, IconX, IconBriefcase, IconCalendar, IconBag, IconNewspaper, IconMessage, IconCheckCircle, IconGrip, IconLock, IconCamera, IconTrash, IconEye, IconEyeOff */
/* global useEditableList, useReorder, useTapOrLongPressReorder, useAddListener, useMoveMode, EditableItem, AddCard, EditDrawer, Field, TextField, NumberField, BilingualField, EditableCategorisedList */

// Placeholder helper -------------------------------------------
function Ph({ label, className = "", style }) {
  return (
    <div className={`ph ${className}`} style={style}>
      <span>{label}</span>
    </div>
  );
}

// =============================================================
//  Profile screen — the centerpiece
// =============================================================
function ProfileScreen({
  lang,
  activeTab,
  onTabChange,
  sectionsOn,
  sectionOrder,
  disabledOrder = [],
  editPanelOpen,
  editMode,
  moveMode,
  onToggleMoveMode,
  onToggleSection,
}) {
  const t = useT(lang);

  // Tabs are derived from sectionOrder × sectionsOn so edit-mode toggles take effect.
  const visibleTabs = sectionOrder.filter((id) => sectionsOn[id]);
  // Inactive sections (not added to the profile) — offered through the
  // "Ajouter" button rather than rendered as greyed-out tabs.
  const inactiveTabs = sectionOrder.filter((id) => !sectionsOn[id]);
  // In edit mode, prepend the synthetic "infos" (identity) tab.
  const tabIds = editMode
    ? ["infos", ...visibleTabs]
    : visibleTabs;

  // "Ajouter une section" menu (edit mode only)
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef(null);

  // Hide the open section → jump to another visible tab so the editor never
  // lands on an empty view.
  const handleToggleSection = (id) => {
    if (sectionsOn[id] && activeTab === id) {
      const fallback = visibleTabs.find((x) => x !== id) || "infos";
      onTabChange(fallback);
    }
    onToggleSection(id);
  };
  // Add an inactive section back: turn it on and open it.
  const handleAddSection = (id) => {
    onToggleSection(id);
    onTabChange(id);
    setAddMenuOpen(false);
  };

  // Modify-links flyout state — anchored next to "Mode édition"
  const [linksOpen, setLinksOpen] = React.useState(false);
  // Cover / avatar edit menus
  const [coverMenu, setCoverMenu] = React.useState(false);
  const [avatarMenu, setAvatarMenu] = React.useState(false);
  const coverRef = React.useRef(null);
  const avatarRef = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {
      if (coverRef.current && !coverRef.current.contains(e.target)) setCoverMenu(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarMenu(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="profile-stack fade-enter" data-screen-label="01 Profile">
      <div className={`profile-card ${editMode ? "is-edit" : ""}`}>
        <div
          ref={coverRef}
          className={`profile-banner-wrap ${editMode ? "is-edit" : ""}`}
          onClick={() => setCoverMenu((o) => !o)}
        >
          <Ph
            className="profile-banner ph--banner"
            label="banner image · 800×240"
          />
          <div className="image-edit-affordance image-edit-affordance--banner">
            <span className="image-edit-affordance__icon"><IconCamera size={16} /></span>
            <span>
              {lang === "fr" ? "Modifier la couverture" : "Edit cover"}
            </span>
          </div>
          {coverMenu && (
            <ImageActionMenu
              lang={lang}
              align="right"
              onModify={() => setCoverMenu(false)}
              onDelete={() => setCoverMenu(false)}
            />
          )}
        </div>
        <div className="profile-header-row">
          <div className="profile-id">
            <div
              ref={avatarRef}
              className={`profile-avatar-wrap ${editMode ? "is-edit" : ""}`}
              onClick={(e) => { e.stopPropagation(); setAvatarMenu((o) => !o); }}
            >
              <div className="avatar profile-avatar">LK</div>
              <div className="image-edit-affordance image-edit-affordance--avatar">
                <IconCamera size={14} />
              </div>
              {avatarMenu && (
                <ImageActionMenu
                  lang={lang}
                  align="left"
                  onModify={() => setAvatarMenu(false)}
                  onDelete={() => setAvatarMenu(false)}
                />
              )}
            </div>
            <div>
              <div className="profile-name">Le Querre Killian</div>
              <div className="profile-followers">112K {t("follower")}</div>
            </div>
          </div>

          <div className="profile-cta">
            {editMode && (
              <div style={{ position: "relative" }}>
                <button className="btn" onClick={() => setLinksOpen((o) => !o)}>
                  <IconLink size={14} />
                  <span>{lang === "fr" ? "Modifier les liens" : "Edit links"}</span>
                </button>
                {linksOpen && (
                  <LinksEditor lang={lang} onClose={() => setLinksOpen(false)} />
                )}
              </div>
            )}
            <button
              className={`btn ${moveMode ? "btn--accent" : ""}`}
              onClick={onToggleMoveMode}
              title={lang === "fr"
                ? "Activer / désactiver le déplacement des éléments"
                : "Enable / disable item reordering"}
            >
              <IconGrip size={14} />
              <span>
                {moveMode
                  ? (lang === "fr" ? "Terminer le déplacement" : "Done moving")
                  : (lang === "fr" ? "Déplacer" : "Move")}
              </span>
            </button>
          </div>
        </div>

        <div className="profile-tabs">
          {tabIds.map((id) => {
            const isInfos = id === "infos";
            const label = isInfos
              ? (lang === "fr" ? "Informations" : "Information")
              : t(id);
            return (
              <div
                key={id}
                className={`tab ${activeTab === id ? "is-active" : ""}`}
                onClick={() => onTabChange(id)}
              >
                {label}
              </div>
            );
          })}

          {editMode && (
            <div className="tab-add" ref={addMenuRef}>
              <button
                type="button"
                className="tab-add__btn"
                onClick={() => setAddMenuOpen((o) => !o)}
                disabled={inactiveTabs.length === 0}
                title={inactiveTabs.length === 0
                  ? (lang === "fr" ? "Toutes les sections sont actives" : "All sections are active")
                  : (lang === "fr" ? "Ajouter une section" : "Add a section")}
              >
                <IconPlus size={14} />
                <span>{lang === "fr" ? "Ajouter" : "Add"}</span>
              </button>
              {addMenuOpen && inactiveTabs.length > 0 && (
                <div className="tab-add__menu fade-enter">
                  <div className="tab-add__menu-label">
                    {lang === "fr" ? "Sections inactives" : "Inactive sections"}
                  </div>
                  {inactiveTabs.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="tab-add__item"
                      onClick={() => handleAddSection(id)}
                    >
                      <IconPlus size={13} />
                      <span>{t(id)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <hr className="profile-divider" />

        <div className="profile-content fade-enter" key={activeTab}>
          {editMode && activeTab !== "infos" && activeTab !== "home" && activeTab !== "histoire" && (
            <SectionEditHeader
              lang={lang}
              sectionId={activeTab}
              isOn={!!sectionsOn[activeTab]}
              onToggleVisibility={() => handleToggleSection(activeTab)}
            />
          )}
          {editMode && activeTab === "home" && (
            <SectionEditHeader
              lang={lang}
              sectionId={activeTab}
              isOn={!!sectionsOn[activeTab]}
              onToggleVisibility={() => handleToggleSection(activeTab)}
              addLabel={null}
            />
          )}
          {editMode && activeTab === "histoire" && (
            <SectionEditHeader
              lang={lang}
              sectionId={activeTab}
              isOn={!!sectionsOn[activeTab]}
              onToggleVisibility={() => handleToggleSection(activeTab)}
            />
          )}
          <ProfileSection id={activeTab} lang={lang} editMode={editMode} onNavigate={onTabChange} />
        </div>
      </div>
    </div>
  );
}

// ---- inline section header used in edit-mode for each tab ----
function SectionEditHeader({ lang, sectionId, isOn, onToggleVisibility, addLabel: addLabelProp }) {
  const addLabels = {
    news:     lang === "fr" ? "Nouvelle publication"   : "New post",
    shop:     lang === "fr" ? "Nouveau produit"        : "New product",
    service:  lang === "fr" ? "Nouveau service"        : "New service",
    event:    lang === "fr" ? "Nouvel événement"       : "New event",
    video:    lang === "fr" ? "Nouvelle vidéo"         : "New video",
    histoire: lang === "fr" ? "Nouveau paragraphe"     : "New paragraph",
  };
  const titles = {
    home:     lang === "fr" ? "Accueil"        : "Home",
    news:     "News",
    shop:     "Shop",
    service:  lang === "fr" ? "Services"       : "Services",
    event:    lang === "fr" ? "Événements"     : "Events",
    video:    lang === "fr" ? "Vidéos"         : "Videos",
    histoire: lang === "fr" ? "Histoire"       : "Story",
  };
  const addLabel = addLabelProp === null ? null : addLabels[sectionId];

  const dispatchAdd = () => {
    window.dispatchEvent(new CustomEvent("ibee:edit-add", { detail: { section: sectionId } }));
  };

  const visLabel = isOn
    ? (lang === "fr" ? "Visible" : "Visible")
    : (lang === "fr" ? "Masquée" : "Hidden");

  return (
    <div className="section-edit-header">
      {addLabel && (
        <button className="section-hbtn section-hbtn--add" onClick={dispatchAdd}>
          <IconPlus size={14} />
          <span>{addLabel}</span>
        </button>
      )}
      <button
        type="button"
        className={`section-hbtn section-hbtn--vis ${isOn ? "is-on" : "is-off"}`}
        onClick={onToggleVisibility}
        aria-pressed={isOn}
        title={isOn
          ? (lang === "fr" ? "Masquer cette section du profil public" : "Hide this section from the public profile")
          : (lang === "fr" ? "Afficher cette section sur le profil public" : "Show this section on the public profile")}
      >
        <span className="section-hbtn__icon">
          {isOn ? <IconEye size={14} /> : <IconEyeOff size={14} />}
        </span>
        <span>{visLabel}</span>
      </button>
    </div>
  );
}

// ---- visibility toggle (explicit, with label + switch) -------
function VisibilityToggle({ lang, isOn, onChange }) {
  const labelTitle = isOn
    ? (lang === "fr" ? "Section visible" : "Section visible")
    : (lang === "fr" ? "Section masquée" : "Section hidden");
  const labelSub = isOn
    ? (lang === "fr" ? "Affichée sur votre profil public" : "Shown on your public profile")
    : (lang === "fr" ? "Cachée du profil public" : "Hidden from your public profile");
  return (
    <button
      type="button"
      className={`visibility-toggle ${isOn ? "is-on" : "is-off"}`}
      onClick={onChange}
      aria-pressed={isOn}
    >
      <span className="visibility-toggle__icon">
        {isOn ? <IconEye size={16} /> : <IconEyeOff size={16} />}
      </span>
      <span className="visibility-toggle__text">
        <span className="visibility-toggle__title">{labelTitle}</span>
        <span className="visibility-toggle__sub">{labelSub}</span>
      </span>
      <span className="visibility-toggle__switch" aria-hidden>
        <span className="visibility-toggle__thumb" />
      </span>
    </button>
  );
}

// ---- Image action menu (cover + avatar) ------------------------
function ImageActionMenu({ lang, align = "left", onModify, onDelete }) {
  return (
    <div
      className={`image-action-menu image-action-menu--${align} fade-enter`}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="image-action-menu__item" onClick={onModify}>
        <IconCamera size={14} />
        <span>{lang === "fr" ? "Modifier l'image" : "Edit image"}</span>
      </button>
      <button
        className="image-action-menu__item image-action-menu__item--danger"
        onClick={onDelete}
      >
        <IconTrash size={14} />
        <span>{lang === "fr" ? "Supprimer l'image" : "Delete image"}</span>
      </button>
    </div>
  );
}

// ---- Links editor flyout (anchored to "Modifier les liens" button) -----
function LinksEditor({ lang, onClose }) {
  const ref = React.useRef(null);
  const [links, setLinks] = React.useState([
    { name: "Instagram", handle: "@killian.lq" },
    { name: "TikTok",    handle: "@killianstudio" },
    { name: lang === "fr" ? "Site perso" : "Website", handle: "killian-studio.fr" },
  ]);
  React.useEffect(() => {
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [onClose]);

  const update = (i, key, v) => setLinks((arr) => arr.map((l, k) => k === i ? { ...l, [key]: v } : l));
  const remove = (i) => setLinks((arr) => arr.filter((_, k) => k !== i));
  const add = () => setLinks((arr) => [...arr, { name: "", handle: "" }]);

  return (
    <div ref={ref} className="links-editor fade-enter">
      <div className="links-editor__head">
        <div className="links-editor__title">
          {lang === "fr" ? "Liens personnalisés" : "Custom links"}
        </div>
        <button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Close">
          <IconX size={14} />
        </button>
      </div>
      <div className="links-editor__body">
        {links.map((l, i) => (
          <div key={i} className="links-editor__row">
            <input
              className="input"
              placeholder={lang === "fr" ? "Nom" : "Name"}
              value={l.name}
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <input
              className="input"
              placeholder={lang === "fr" ? "Lien ou identifiant" : "Link or handle"}
              value={l.handle}
              onChange={(e) => update(i, "handle", e.target.value)}
            />
            <button className="editable__chip editable__chip--danger" onClick={() => remove(i)} title={lang === "fr" ? "Supprimer" : "Delete"}>
              <IconX size={13} />
            </button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={add} style={{ width: "100%", justifyContent: "center" }}>
          <IconPlus size={14} />
          <span>{lang === "fr" ? "Ajouter un lien" : "Add a link"}</span>
        </button>
      </div>
    </div>
  );
}

// =============================================================
//  Per-section content
// =============================================================
function ProfileSection({ id, lang, editMode, onNavigate }) {
  const t = useT(lang);
  switch (id) {
    case "infos":    return <InfosPersoSection lang={lang} />;
    case "home":     return <HomeSection lang={lang} editMode={editMode} onNavigate={onNavigate} />;
    case "info":     return <InfoSection lang={lang} />;
    case "bio":      return <InfoSection lang={lang} />;
    case "shop":     return <ShopSection lang={lang} editMode={editMode} />;
    case "service":  return <ServiceSection lang={lang} editMode={editMode} />;
    case "event":    return <EventSection lang={lang} editMode={editMode} />;
    case "news":     return <NewsSection lang={lang} editMode={editMode} />;
    case "video":    return <VideoSection lang={lang} editMode={editMode} />;
    case "faq":      return <FaqSection lang={lang} />;
    case "drive":    return <ProfileDriveSection lang={lang} />;
    case "parcours": return <ParcoursSection lang={lang} />;
    case "histoire": return <HistoireSection lang={lang} editMode={editMode} />;
    default:
      return (
        <div className="empty">
          <h3>{t("nothingHere")}</h3>
          <p>{t("addContent")}</p>
        </div>
      );
  }
}

// ----- Bio --------------------------------------------------
function BioSection({ lang }) {
  const t = useT(lang);
  return (
    <div>
      <div className="bio-grid">
        <div className="bio-block">
          <div className="t-muted t-sm" style={{ marginBottom: 8 }}>{t("aboutMe")}</div>
          <div>
            {lang === "fr"
              ? "Coiffeur barbier indépendant à Lyon depuis 2017. Style classique et coupes contemporaines. Je travaille sur rendez-vous, en studio et à domicile sur demande."
              : "Independent barber-stylist in Lyon since 2017. Classic styling and contemporary cuts. Available by appointment, in-studio or on-location."}
          </div>
        </div>
        <div className="bio-stats">
          <div className="t-muted t-sm">{t("stats")}</div>
          <div className="bio-stats__row">
            <span className="bio-stats__k">{t("yearsActive")}</span>
            <span className="bio-stats__v">8</span>
          </div>
          <div className="bio-stats__row">
            <span className="bio-stats__k">{t("projects")}</span>
            <span className="bio-stats__v">340</span>
          </div>
          <div className="bio-stats__row">
            <span className="bio-stats__k">{t("clients")}</span>
            <span className="bio-stats__v">112K</span>
          </div>
        </div>
      </div>

      <div className="contact-block">
        <div>
          <div className="contact-cell__label">Manager</div>
          <div className="contact-manager">
            <div
              className="avatar contact-manager__avatar"
              style={{ background: "linear-gradient(135deg, #9ab3c8, #5a82a8)" }}
            >M</div>
            <span>{t("sendMessage")}</span>
          </div>
        </div>
        <div>
          <div className="contact-cell__label">{t("professional")}</div>
          <div className="contact-cell__value t-mono">06 49 23 61 13</div>
        </div>
        <div>
          <div className="contact-cell__label">{t("professional")}</div>
          <div className="contact-cell__value t-mono">lequerrekillian@gmail.com</div>
        </div>
        <div>
          <div className="contact-cell__label">{t("location")}</div>
          <div className="contact-cell__value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconMapPin size={14} />
            Lyon, 69001
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Service ------------------------------------------------
const SERVICES_BY_CAT = {
  package: [
    { name: { fr: "Forfait complet", en: "Full package" },     desc: { fr: "Coupe + barbe + soin", en: "Cut + beard + treatment" }, dur: "1 h 15", price: 65 },
    { name: { fr: "Forfait mariage", en: "Wedding package" },  desc: { fr: "Coupe + style + photo", en: "Cut + style + photo"   }, dur: "2 h",    price: 180 },
    { name: { fr: "Forfait classique", en: "Classic package" },desc: { fr: "Coupe + shampoing", en: "Cut + shampoo"             }, dur: "45 min", price: 40 },
  ],
  haircut: [
    { name: { fr: "Coupe homme", en: "Men's cut" },    desc: { fr: "Coupe + finition", en: "Cut + finish" }, dur: "30 min", price: 28 },
    { name: { fr: "Coupe femme", en: "Women's cut" },  desc: { fr: "Coupe + brushing", en: "Cut + blow-dry" }, dur: "1 h", price: 55 },
  ],
  beard: [
    { name: { fr: "Taille barbe", en: "Beard trim" },  desc: { fr: "Sculpture précise", en: "Precise sculpting" }, dur: "20 min", price: 18 },
    { name: { fr: "Rasage traditionnel", en: "Hot-towel shave" }, desc: { fr: "Serviette chaude + huile", en: "Hot towel + oil" }, dur: "35 min", price: 32 },
  ],
  smoothing: [
    { name: { fr: "Lissage brésilien", en: "Brazilian smoothing" }, desc: { fr: "Effet 4 mois", en: "Lasts 4 months" }, dur: "2 h 30", price: 120 },
  ],
};
// flatten into an array with cat field (initial data for the stateful list)
const SERVICES = Object.entries(SERVICES_BY_CAT).flatMap(([cat, arr]) =>
  arr.map((s) => ({ cat, ...s }))
);
const SERVICE_CATEGORIES = [
  { key: "package",   label: { fr: "Forfaits",            en: "Packages" } },
  { key: "haircut",   label: { fr: "Coupe & coiffure",    en: "Cut & style" } },
  { key: "beard",     label: { fr: "Barbe",               en: "Beard" } },
  { key: "smoothing", label: { fr: "Lissages",            en: "Smoothing" } },
];

function ServiceSection({ lang, editMode }) {
  const list = useEditableList(SERVICES, () => ({
    cat: "package",
    name: { fr: "", en: "" },
    desc: { fr: "", en: "" },
    dur: "30 min",
    price: 0,
  }));
  useAddListener("service", () => list.openAdd());

  const renderItem = (s) => (
    <div className="service-item">
      <Ph className="service-item__img" label="img" />
      <div>
        <div className="service-item__name">{s.name[lang]}</div>
        <div className="service-item__desc">{s.desc[lang]}</div>
      </div>
      <div className="service-item__duration">
        <IconClock size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
        {s.dur}
      </div>
      <div className="service-item__price">€{s.price}</div>
    </div>
  );

  if (editMode) {
    return (
      <>
        <EditableCategorisedList
          lang={lang}
          list={list}
          categories={SERVICE_CATEGORIES}
          renderItem={renderItem}
          addLabel={lang === "fr" ? "Ajouter un service" : "Add a service"}
          layout="row"
        />
        <EditDrawer
          open={list.editingIdx !== null}
          title={list.editingIdx === -1
            ? (lang === "fr" ? "Nouveau service" : "New service")
            : (lang === "fr" ? "Modifier le service" : "Edit service")}
          onCancel={list.cancel}
          onSave={list.save}
        >
          {list.draft && (
            <>
              <BilingualField label={lang === "fr" ? "Nom" : "Name"}
                value={list.draft.name}
                onChange={(v) => list.setDraft({ ...list.draft, name: v })} />
              <BilingualField label={lang === "fr" ? "Description" : "Description"}
                value={list.draft.desc} multiline
                onChange={(v) => list.setDraft({ ...list.draft, desc: v })} />
              <TextField label={lang === "fr" ? "Durée" : "Duration"}
                value={list.draft.dur} placeholder="30 min"
                onChange={(v) => list.setDraft({ ...list.draft, dur: v })} />
              <NumberField label={lang === "fr" ? "Prix" : "Price"}
                value={list.draft.price} prefix="€"
                onChange={(v) => list.setDraft({ ...list.draft, price: v })} />
            </>
          )}
        </EditDrawer>
      </>
    );
  }

  return (
    <Playlist
      lang={lang}
      placeholder={lang === "fr" ? "Rechercher un service…" : "Search services…"}
      categories={SERVICE_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label[lang],
        items: list.items.filter((s) => s.cat === c.key).map((s) => ({
          ...s,
          searchText: `${s.name[lang]} ${s.desc[lang]}`,
        })),
      }))}
      renderItem={(s, i) => <React.Fragment key={i}>{renderItem(s)}</React.Fragment>}
    />
  );
}

// ----- Shop --------------------------------------------------
const SHOP_ITEMS = [
  { cat: "hair",     name: { fr: "Cire mate", en: "Matte clay"      }, price: 22, stock: { fr: "En stock", en: "In stock" } },
  { cat: "hair",     name: { fr: "Shampoing", en: "Shampoo"         }, price: 16, stock: { fr: "En stock", en: "In stock" } },
  { cat: "hair",     name: { fr: "Sérum protecteur", en: "Protect serum" }, price: 24, stock: { fr: "En stock", en: "In stock" } },
  { cat: "beard",    name: { fr: "Huile barbe", en: "Beard oil"     }, price: 18, stock: { fr: "En stock", en: "In stock" } },
  { cat: "beard",    name: { fr: "Baume à barbe", en: "Beard balm"  }, price: 20, stock: { fr: "En stock", en: "In stock" } },
  { cat: "accessory",name: { fr: "Peigne bois", en: "Wood comb"     }, price: 12, stock: { fr: "Plus que 3", en: "Only 3 left" } },
  { cat: "accessory",name: { fr: "Tablier coiffeur", en: "Apron"    }, price: 38, stock: { fr: "En stock", en: "In stock" } },
  { cat: "giftcard", name: { fr: "Bon cadeau 50€", en: "Gift card €50" }, price: 50, stock: { fr: "Numérique", en: "Digital" } },
  { cat: "giftcard", name: { fr: "Bon cadeau 100€", en: "Gift card €100" }, price: 100, stock: { fr: "Numérique", en: "Digital" } },
];
const SHOP_CATEGORIES = [
  { key: "hair",      label: { fr: "Soins cheveux",   en: "Hair care" } },
  { key: "beard",     label: { fr: "Soins barbe",     en: "Beard care" } },
  { key: "accessory", label: { fr: "Accessoires",     en: "Accessories" } },
  { key: "giftcard",  label: { fr: "Bons cadeau",     en: "Gift cards" } },
];
function ShopSection({ lang, editMode }) {
  const list = useEditableList(SHOP_ITEMS, () => ({
    cat: "hair",
    name: { fr: "", en: "" },
    price: 0,
    stock: { fr: "En stock", en: "In stock" },
  }));
  useAddListener("shop", () => list.openAdd());

  const renderItem = (s) => (
    <div className="tile">
      <Ph className="tile__img" label="product" />
      <div className="tile__body">
        <div className="tile__title">{s.name[lang]}</div>
        <div className="tile__meta">{s.stock[lang]}</div>
        <div className="tile__price">€{s.price}</div>
      </div>
    </div>
  );

  if (editMode) {
    return (
      <>
        <EditableCategorisedList
          lang={lang}
          list={list}
          categories={SHOP_CATEGORIES}
          renderItem={renderItem}
          addLabel={lang === "fr" ? "Ajouter un produit" : "Add a product"}
          layout="tile"
          columns={3}
        />
        <EditDrawer
          open={list.editingIdx !== null}
          title={list.editingIdx === -1
            ? (lang === "fr" ? "Nouveau produit" : "New product")
            : (lang === "fr" ? "Modifier le produit" : "Edit product")}
          onCancel={list.cancel}
          onSave={list.save}
        >
          {list.draft && (
            <>
              <BilingualField label={lang === "fr" ? "Nom" : "Name"}
                value={list.draft.name}
                onChange={(v) => list.setDraft({ ...list.draft, name: v })} />
              <NumberField label={lang === "fr" ? "Prix" : "Price"}
                value={list.draft.price} prefix="€"
                onChange={(v) => list.setDraft({ ...list.draft, price: v })} />
              <BilingualField label={lang === "fr" ? "Disponibilité" : "Availability"}
                value={list.draft.stock}
                onChange={(v) => list.setDraft({ ...list.draft, stock: v })} />
            </>
          )}
        </EditDrawer>
      </>
    );
  }

  return (
    <Playlist
      lang={lang}
      placeholder={lang === "fr" ? "Rechercher un produit…" : "Search products…"}
      categories={SHOP_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label[lang],
        items: list.items.filter((s) => s.cat === c.key).map((s) => ({
          ...s,
          searchText: s.name[lang],
        })),
      }))}
      gridCols={3}
      renderItem={(s, i) => <React.Fragment key={i}>{renderItem(s)}</React.Fragment>}
    />
  );
}

// ----- Event --------------------------------------------------
const EVENTS = [
  { cat: "workshop", date: "23 OCT", title: { fr: "Atelier coupe homme",   en: "Men's cut workshop"   }, place: "Lyon 1er",       spots: 6 },
  { cat: "workshop", date: "30 OCT", title: { fr: "Atelier soin barbe",    en: "Beard care workshop"  }, place: "Studio Killian", spots: 8 },
  { cat: "open",     date: "06 NOV", title: { fr: "Soirée portes ouvertes", en: "Open studio night"    }, place: "Studio Killian", spots: 24 },
  { cat: "demo",     date: "12 DEC", title: { fr: "Démo lissage",          en: "Smoothing demo"       }, place: "Salon Bellecour",spots: 12 },
  { cat: "demo",     date: "19 DEC", title: { fr: "Démo coupe femme",      en: "Women's cut demo"     }, place: "Studio Killian", spots: 10 },
];
const EVENT_CATEGORIES = [
  { key: "workshop", label: { fr: "Ateliers",            en: "Workshops" } },
  { key: "open",     label: { fr: "Soirées studio",     en: "Studio nights" } },
  { key: "demo",     label: { fr: "Démonstrations",     en: "Demos" } },
];
function EventSection({ lang, editMode }) {
  const list = useEditableList(EVENTS, () => ({
    cat: "workshop",
    date: "01 JAN",
    title: { fr: "", en: "" },
    place: "",
    spots: 10,
  }));
  useAddListener("event", () => list.openAdd());

  const renderItem = (e) => (
    <div className="news-item">
      <div className="news-item__img" style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "var(--accent-tint)",
        color: "var(--accent)",
        fontFamily: "var(--font-display)", fontWeight: 600,
      }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em" }}>{e.date.split(" ")[1]}</div>
        <div style={{ fontSize: 32, lineHeight: 1 }}>{e.date.split(" ")[0]}</div>
      </div>
      <div>
        <div className="news-item__date">{e.place}</div>
        <div className="news-item__title">{e.title[lang]}</div>
        <div className="news-item__excerpt">
          {lang === "fr" ? `${e.spots} places disponibles` : `${e.spots} spots available`}
        </div>
        <button className="btn btn--accent btn--sm" style={{ marginTop: 8 }}>
          {lang === "fr" ? "Réserver" : "Reserve"}
        </button>
      </div>
    </div>
  );

  if (editMode) {
    return (
      <>
        <EditableCategorisedList
          lang={lang}
          list={list}
          categories={EVENT_CATEGORIES}
          renderItem={renderItem}
          addLabel={lang === "fr" ? "Ajouter un événement" : "Add an event"}
          layout="row"
        />
        <EditDrawer
          open={list.editingIdx !== null}
          title={list.editingIdx === -1
            ? (lang === "fr" ? "Nouvel événement" : "New event")
            : (lang === "fr" ? "Modifier l'événement" : "Edit event")}
          onCancel={list.cancel}
          onSave={list.save}
        >
          {list.draft && (
            <>
              <BilingualField label={lang === "fr" ? "Titre" : "Title"}
                value={list.draft.title}
                onChange={(v) => list.setDraft({ ...list.draft, title: v })} />
              <TextField label="Date" value={list.draft.date}
                placeholder="23 OCT"
                onChange={(v) => list.setDraft({ ...list.draft, date: v })} />
              <TextField label={lang === "fr" ? "Lieu" : "Place"}
                value={list.draft.place}
                onChange={(v) => list.setDraft({ ...list.draft, place: v })} />
              <NumberField label={lang === "fr" ? "Places" : "Spots"}
                value={list.draft.spots}
                onChange={(v) => list.setDraft({ ...list.draft, spots: v })} />
            </>
          )}
        </EditDrawer>
      </>
    );
  }

  return (
    <Playlist
      lang={lang}
      placeholder={lang === "fr" ? "Rechercher un événement…" : "Search events…"}
      categories={EVENT_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label[lang],
        items: list.items.filter((e) => e.cat === c.key).map((e) => ({
          ...e,
          searchText: `${e.title[lang]} ${e.place}`,
        })),
      }))}
      renderItem={(e, i) => <React.Fragment key={i}>{renderItem(e)}</React.Fragment>}
    />
  );
}

// ----- News (Instagram-post style) -----------------------
const NEWS = [
  { date: "12 OCT 2025",
    title: { fr: "Nouvelle gamme automne",        en: "Fall product line" },
    excerpt: { fr: "Trois nouveaux produits de soin barbe arrivent au studio. Disponibles dès mardi prochain en boutique et sur le shop.",
               en: "Three new beard-care products land at the studio. In-shop and online starting next Tuesday." },
    aspect: "1/1",
    likes: 248,
    comments: 12,
    place: "Studio Killian" },
  { date: "28 SEP 2025",
    title: { fr: "Studio fermé du 1er au 8 nov",   en: "Studio closed Nov 1–8" },
    excerpt: { fr: "Vacances annuelles. Retour le 9 novembre. Réservations en ligne déjà ouvertes pour la semaine suivante.",
               en: "Annual leave — back November 9. Bookings already open for the week after." },
    aspect: "16/9",
    likes: 96,
    comments: 4,
    place: "Studio Killian" },
  { date: "14 SEP 2025",
    title: { fr: "Interview Elle Magazine",        en: "Featured in Elle" },
    excerpt: { fr: "Article sur les nouvelles tendances coiffure 2025. Lien dans la bio.",
               en: "Coverage of 2025 hair trends. Link in bio." },
    aspect: "1/1",
    likes: 412,
    comments: 28,
    place: "Elle Magazine" },
];

function NewsSection({ lang, editMode }) {
  const list = useEditableList(NEWS, () => ({
    date: "01 JAN 2025",
    title: { fr: "", en: "" },
    excerpt: { fr: "", en: "" },
    aspect: "1/1",
    likes: 0,
    comments: 0,
    place: "",
  }));
  const reorder = useTapOrLongPressReorder({
    onMove: list.move,
    onTap: (i) => list.openEdit(i),
  });
  useAddListener("news", () => list.openAdd());

  return (
    <>
      <div className={`news-section ${editMode ? "is-edit" : ""}`}>
        {list.items.map((n, i) => (
          <EditableItem
            key={i}
            editMode={editMode}
            layout="news"
            onDelete={() => list.remove(i)}
            dragHandlers={reorder.handlers(i)}
          >
            <NewsPost item={n} lang={lang} editMode={editMode} />
          </EditableItem>
        ))}
      </div>
      {editMode && (
        <EditDrawer
          open={list.editingIdx !== null}
          title={list.editingIdx === -1
            ? (lang === "fr" ? "Nouvelle publication" : "New post")
            : (lang === "fr" ? "Modifier la publication" : "Edit post")}
          onCancel={list.cancel}
          onSave={list.save}
        >
          {list.draft && (
            <>
              <BilingualField label={lang === "fr" ? "Titre" : "Title"}
                value={list.draft.title}
                onChange={(v) => list.setDraft({ ...list.draft, title: v })} />
              <BilingualField label={lang === "fr" ? "Légende" : "Caption"}
                value={list.draft.excerpt} multiline
                onChange={(v) => list.setDraft({ ...list.draft, excerpt: v })} />
              <TextField label="Date" value={list.draft.date}
                onChange={(v) => list.setDraft({ ...list.draft, date: v })} />
              <TextField label={lang === "fr" ? "Lieu" : "Place"}
                value={list.draft.place}
                onChange={(v) => list.setDraft({ ...list.draft, place: v })} />
              <TextField label="Aspect" value={list.draft.aspect}
                placeholder="1/1 or 16/9"
                onChange={(v) => list.setDraft({ ...list.draft, aspect: v })} />
            </>
          )}
        </EditDrawer>
      )}
    </>
  );
}

function NewsPost({ item, lang, editMode }) {
  const [liked, setLiked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  return (
    <article className="news-post">
      <header className="news-post__head">
        <div
          className="avatar"
          style={{ width: 36, height: 36, fontSize: 14 }}
        >LK</div>
        <div style={{ flex: 1 }}>
          <div className="news-post__name">Le Querre Killian</div>
          <div className="news-post__sub">
            <span>{item.place}</span>
            <span aria-hidden>·</span>
            <span className="t-mono">{item.date}</span>
          </div>
        </div>
        {!editMode && (
          <button className="btn btn--icon" style={{ background: "transparent" }} aria-label="More">
            <IconMore size={18} />
          </button>
        )}
      </header>

      <div
        className="news-post__image"
        style={{ aspectRatio: item.aspect }}
      >
        <Ph
          style={{ width: "100%", height: "100%", borderRadius: 0 }}
          label={`post image · ${item.aspect}`}
        />
      </div>

      <div className="news-post__actions">
        <button
          className="news-post__act"
          onClick={() => setLiked((l) => !l)}
          aria-label="like"
        >
          <IconHeart
            size={22}
            color={liked ? "rgb(217,85,37)" : "currentColor"}
            style={{ fill: liked ? "rgb(217,85,37)" : "transparent" }}
          />
        </button>
        <button className="news-post__act" aria-label="comment"><IconMessage size={20} /></button>
        <button className="news-post__act" aria-label="share"><IconShare size={20} /></button>
        <div style={{ flex: 1 }} />
        <button
          className="news-post__act"
          onClick={() => setSaved((s) => !s)}
          aria-label="save"
        >
          <IconBookmark
            size={20}
            color={saved ? "var(--text)" : "currentColor"}
            style={{ fill: saved ? "var(--text)" : "transparent" }}
          />
        </button>
      </div>

      <div className="news-post__body">
        <div className="news-post__likes">
          {(item.likes + (liked ? 1 : 0)).toLocaleString(lang)} {lang === "fr" ? "j'aime" : "likes"}
        </div>
        <div className="news-post__caption">
          <span className="news-post__name">Le Querre Killian</span>{" "}
          <span className="news-post__title">{item.title[lang]}</span>{" "}
          <span>{item.excerpt[lang]}</span>
        </div>
        <button className="news-post__comments">
          {lang === "fr"
            ? `Voir les ${item.comments} commentaires`
            : `View all ${item.comments} comments`}
        </button>
      </div>
    </article>
  );
}

// ----- Video --------------------------------------------------
const VIDEOS = [
  { cat: "tutorial", dur: "2:14", title: { fr: "Coupe dégradée pas à pas", en: "Fade tutorial"           } },
  { cat: "tutorial", dur: "3:42", title: { fr: "Coiffer une frange",       en: "How to style a fringe"   } },
  { cat: "routine",  dur: "5:48", title: { fr: "Routine barbe quotidienne", en: "Daily beard routine"    } },
  { cat: "routine",  dur: "4:20", title: { fr: "Routine cheveux fins",     en: "Fine hair routine"       } },
  { cat: "prepost",  dur: "1:32", title: { fr: "Avant / après mariage",    en: "Wedding before / after"  } },
  { cat: "prepost",  dur: "1:48", title: { fr: "Transformation cheveux longs", en: "Long hair transformation" } },
  { cat: "studio",   dur: "8:11", title: { fr: "Visite du studio",         en: "Studio tour"             } },
];
const VIDEO_CATEGORIES = [
  { key: "tutorial", label: { fr: "Tutoriels",         en: "Tutorials" } },
  { key: "routine",  label: { fr: "Routines",          en: "Routines" } },
  { key: "prepost",  label: { fr: "Avant / après",     en: "Before / after" } },
  { key: "studio",   label: { fr: "Studio & coulisses",en: "Studio & BTS" } },
];
function VideoSection({ lang, editMode }) {
  const list = useEditableList(VIDEOS, () => ({
    cat: "tutorial",
    dur: "0:00",
    title: { fr: "", en: "" },
  }));
  useAddListener("video", () => list.openAdd());

  const renderItem = (v) => (
    <div>
      <div className="video-tile">
        <Ph label="video thumbnail" style={{ width: "100%", height: "100%" }} />
        <div className="video-tile__play">
          <span><IconPlay size={20} /></span>
        </div>
        <div className="video-tile__duration">{v.dur}</div>
      </div>
      <div style={{ padding: "8px 4px 0", fontWeight: 500, fontSize: 14 }}>{v.title[lang]}</div>
    </div>
  );

  if (editMode) {
    return (
      <>
        <EditableCategorisedList
          lang={lang}
          list={list}
          categories={VIDEO_CATEGORIES}
          renderItem={renderItem}
          addLabel={lang === "fr" ? "Ajouter une vidéo" : "Add a video"}
          layout="tile"
          columns={2}
        />
        <EditDrawer
          open={list.editingIdx !== null}
          title={list.editingIdx === -1
            ? (lang === "fr" ? "Nouvelle vidéo" : "New video")
            : (lang === "fr" ? "Modifier la vidéo" : "Edit video")}
          onCancel={list.cancel}
          onSave={list.save}
        >
          {list.draft && (
            <>
              <BilingualField label={lang === "fr" ? "Titre" : "Title"}
                value={list.draft.title}
                onChange={(v) => list.setDraft({ ...list.draft, title: v })} />
              <TextField label={lang === "fr" ? "Durée" : "Duration"}
                value={list.draft.dur} placeholder="2:14"
                onChange={(v) => list.setDraft({ ...list.draft, dur: v })} />
            </>
          )}
        </EditDrawer>
      </>
    );
  }

  return (
    <Playlist
      lang={lang}
      placeholder={lang === "fr" ? "Rechercher une vidéo…" : "Search videos…"}
      categories={VIDEO_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label[lang],
        items: list.items.filter((v) => v.cat === c.key).map((v) => ({
          ...v,
          searchText: v.title[lang],
        })),
      }))}
      gridCols={2}
      renderItem={(v, i) => <React.Fragment key={i}>{renderItem(v)}</React.Fragment>}
    />
  );
}

// ----- Playlist primitive (search + categories + sub-tabs) -
function Playlist({ lang, placeholder, categories, renderItem, gridCols }) {
  const t = useT(lang);
  const [query, setQuery] = React.useState("");
  const [activeCat, setActiveCat] = React.useState("all");
  const q = query.trim().toLowerCase();

  const matches = (it) =>
    !q || (it.searchText && it.searchText.toLowerCase().includes(q));

  // first filter by sub-tab, then by search, then drop empty groups.
  const scoped = activeCat === "all"
    ? categories
    : categories.filter((c) => c.key === activeCat);

  const filtered = scoped
    .map((c) => ({ ...c, items: c.items.filter(matches) }))
    .filter((c) => c.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="playlist-search">
        <IconSearchInline />
        <input
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="playlist-search__clear"
            onClick={() => setQuery("")}
            aria-label="clear"
          ><IconX size={14} /></button>
        )}
      </div>

      <div className="sub-tabs">
        <button
          className={`sub-tab ${activeCat === "all" ? "is-active" : ""}`}
          onClick={() => setActiveCat("all")}
        >
          {lang === "fr" ? "Tout" : "All"}
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            className={`sub-tab ${activeCat === c.key ? "is-active" : ""}`}
            onClick={() => setActiveCat(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{lang === "fr" ? "Aucun résultat" : "No results"}</h3>
          <p>{lang === "fr" ? "Essayez un autre terme." : "Try another term."}</p>
        </div>
      ) : (
        filtered.map((c) => (
          <section key={c.key} className="playlist-section">
            {/* show the category header only when more than one category is visible */}
            {filtered.length > 1 && (
              <div className="playlist-section__head">
                <div className="playlist-section__title">{c.label}</div>
                <div className="playlist-section__count">{c.items.length}</div>
              </div>
            )}
            {gridCols ? (
              <div
                className="tile-grid"
                style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
              >
                {c.items.map((it, i) => renderItem(it, i))}
              </div>
            ) : (
              <div className="service-list">
                {c.items.map((it, i) => renderItem(it, i))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

// inline search icon used by Playlist; saves importing IconSearch from chrome
function IconSearchInline() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
         className="playlist-search__icon">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// ----- FAQ --------------------------------------------------
const FAQ = [
  { q: { fr: "Quels sont vos horaires ?", en: "What are your hours?" }, a: { fr: "Mardi à samedi, 9h–19h. Sur rendez-vous uniquement.", en: "Tuesday to Saturday, 9 am – 7 pm. By appointment only." } },
  { q: { fr: "Acceptez-vous les chèques cadeaux ?", en: "Do you accept gift cards?" }, a: { fr: "Oui, à valoir sur tout service ou produit.", en: "Yes, valid on any service or product." } },
  { q: { fr: "Faites-vous des prestations à domicile ?", en: "Do you offer at-home services?" }, a: { fr: "Oui, dans le Grand Lyon, sur demande et avec supplément.", en: "Yes, in the greater Lyon area, on request, with a surcharge." } },
  { q: { fr: "Comment annuler un rendez-vous ?", en: "How do I cancel an appointment?" }, a: { fr: "24h à l'avance par message ou téléphone.", en: "24 hours ahead via message or phone." } },
];
function FaqSection({ lang }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="faq-list">
      {FAQ.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? "is-open" : ""}`}>
          <div className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.q[lang]}</span>
            <IconCaret size={16} className="faq-q__caret" />
          </div>
          <div className="faq-a">{f.a[lang]}</div>
        </div>
      ))}
    </div>
  );
}

// ----- Parcours --------------------------------------------------
const PARCOURS = [
  { date: "2025", title: { fr: "Ouverture du studio à Bellecour", en: "Studio opens in Bellecour" }, desc: { fr: "Indépendant à temps plein, équipe de 2.", en: "Independent full-time, team of 2." } },
  { date: "2022", title: { fr: "Tournée résidence Lyon-Paris", en: "Lyon-Paris residency tour" }, desc: { fr: "12 dates, 400 clients accompagnés.", en: "12 dates, 400 clients hosted." } },
  { date: "2020", title: { fr: "Lancement Killian Care", en: "Killian Care launches" }, desc: { fr: "Marque de produits artisanaux pour barbe et cheveux.", en: "Artisan brand for beard and hair." } },
  { date: "2017", title: { fr: "Premier salon en indépendant", en: "First independent salon" }, desc: { fr: "Lyon 1er, sur RDV uniquement.", en: "Lyon 1, by appointment only." } },
];
function ParcoursSection({ lang }) {
  return (
    <div className="parcours">
      {PARCOURS.map((p, i) => (
        <div key={i} className="parcours-item">
          <div className="parcours-date">{p.date}</div>
          <div className="parcours-title">{p.title[lang]}</div>
          <div className="parcours-desc">{p.desc[lang]}</div>
        </div>
      ))}
    </div>
  );
}

// ----- Infos perso (edit-only) — identity editor for URL/name/email/phone/hours/location
function InfosPersoSection({ lang }) {
  const [identity, setIdentity] = React.useState({
    name: "Le Querre Killian",
    url: "ibee.app/killian",
    email: "lequerrekillian@gmail.com",
    phone: "06 49 23 61 13",
    location: "Lyon, 69001",
    address: "12 rue de la République",
  });
  const setField = (k, v) => setIdentity((id) => ({ ...id, [k]: v }));

  const [hours, setHours] = React.useState([]);
  const defaultHours = () =>
    (lang === "fr" ? HOURS_FR : HOURS_EN).map((h) => ({ ...h }));
  const setHourField = (i, k, v) =>
    setHours((arr) => arr.map((row, k2) => (k2 === i ? { ...row, [k]: v } : row)));
  const toggleClosed = (i) =>
    setHours((arr) => arr.map((row, k2) => {
      if (k2 !== i) return row;
      const closed = !row.closed;
      return {
        ...row,
        closed,
        h: closed ? (lang === "fr" ? "Fermé" : "Closed") : "09:00 – 19:00",
      };
    }));
  const clearHours = () => setHours([]);

  return (
    <div className="infos-section">
      <div className="infos-section__head">
        <div>
          <div className="infos-section__title">
            {lang === "fr" ? "Informations affichées" : "Displayed information"}
          </div>
          <div className="infos-section__sub">
            {lang === "fr"
              ? "Ces informations s'affichent dans l'onglet Accueil."
              : "These show on the Home tab."}
          </div>
        </div>
        <button className="btn btn--ghost btn--sm infos-section__account">
          <IconLock size={14} />
          <span>
            {lang === "fr" ? "Informations privées" : "Private information"}
          </span>
        </button>
      </div>

      <div className="infos-grid">
        <div className="infos-card">
          <div className="infos-card__label">
            {lang === "fr" ? "Identité" : "Identity"}
          </div>
          <Field label={lang === "fr" ? "Nom affiché" : "Display name"}>
            <input
              className="input field__input"
              value={identity.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label={lang === "fr" ? "URL du profil" : "Profile URL"}>
            <div className="field__urlwrap">
              <span className="field__prefix-url">ibee.app/</span>
              <input
                className="input field__input"
                value={identity.url.replace(/^ibee\.app\//, "")}
                onChange={(e) => setField("url", "ibee.app/" + e.target.value)}
              />
            </div>
          </Field>
        </div>

        <div className="infos-card">
          <div className="infos-card__label">
            {lang === "fr" ? "Contact" : "Contact"}
          </div>
          <Field label="Email">
            <input
              type="email"
              className="input field__input"
              value={identity.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Field>
          <Field label={lang === "fr" ? "Téléphone" : "Phone"}>
            <input
              className="input field__input"
              value={identity.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Field>
        </div>

        <div className="infos-card">
          <div className="infos-card__label">
            {lang === "fr" ? "Adresse" : "Address"}
          </div>
          <Field label={lang === "fr" ? "Rue" : "Street"}>
            <input
              className="input field__input"
              value={identity.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          <Field label={lang === "fr" ? "Ville & code postal" : "City & postcode"}>
            <input
              className="input field__input"
              value={identity.location}
              onChange={(e) => setField("location", e.target.value)}
            />
          </Field>
        </div>

        <div className="infos-card infos-card--hours">
          <div className="infos-card__head">
            <div className="infos-card__label">
              {lang === "fr" ? "Horaires d'ouverture" : "Opening hours"}
            </div>
            {hours.length > 0 && (
              <button
                className="infos-card__clear"
                onClick={clearHours}
                title={lang === "fr" ? "Supprimer les horaires" : "Remove hours"}
              >
                <IconX size={12} />
                <span>{lang === "fr" ? "Effacer" : "Clear"}</span>
              </button>
            )}
          </div>
          {hours.length === 0 ? (
            <button
              className="hours-add-empty"
              onClick={() => setHours(defaultHours())}
            >
              <span className="hours-add-empty__icon"><IconPlus size={18} /></span>
              <span className="hours-add-empty__label">
                {lang === "fr" ? "Ajouter des horaires" : "Add opening hours"}
              </span>
              <span className="hours-add-empty__sub">
                {lang === "fr"
                  ? "Aucun horaire renseigné pour le moment."
                  : "No hours set yet."}
              </span>
            </button>
          ) : (
            <div className="hours-edit-list">
              {hours.map((row, i) => (
                <div key={i} className="hours-edit-row">
                  <span className="hours-edit-row__day">{row.d}</span>
                  <input
                    className="input hours-edit-row__time"
                    value={row.h}
                    disabled={row.closed}
                    onChange={(e) => setHourField(i, "h", e.target.value)}
                  />
                  <button
                    className={`hours-edit-row__toggle ${row.closed ? "is-closed" : ""}`}
                    onClick={() => toggleClosed(i)}
                    title={row.closed
                      ? (lang === "fr" ? "Marquer comme ouvert" : "Mark open")
                      : (lang === "fr" ? "Marquer comme fermé" : "Mark closed")}
                  >
                    {row.closed
                      ? (lang === "fr" ? "Fermé" : "Closed")
                      : (lang === "fr" ? "Ouvert" : "Open")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function HomeSection({ lang, editMode, onNavigate }) {
  const moveMode = useMoveMode();
  // Block definitions — id + label (used in edit chrome) + render function.
  const BLOCKS = {
    hero: {
      label: lang === "fr" ? "Bannière" : "Hero",
      render: () => (
        <div
          className="bio-block"
          style={{
            padding: 24,
            background: "linear-gradient(135deg, var(--accent-tint), transparent 70%)",
          }}
        >
          <div className="t-display" style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>
            {lang === "fr" ? "Bienvenue chez Killian" : "Welcome to Killian"}
          </div>
          <div className="t-muted">
            {lang === "fr"
              ? "Coiffeur barbier indépendant à Lyon. Réservations en ligne, atelier et prestations à domicile."
              : "Independent barber-stylist in Lyon. Online booking, in-studio and on-location services."}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn--accent" onClick={() => onNavigate && onNavigate("service")}>
              {lang === "fr" ? "Réserver" : "Book a slot"}
            </button>
            <button className="btn" onClick={() => onNavigate && onNavigate("info")}>
              {lang === "fr" ? "Voir le profil" : "View profile"}
            </button>
          </div>
        </div>
      ),
    },
    featured: {
      label: lang === "fr" ? "Événement épinglé" : "Featured event",
      render: () => <FeaturedEvent lang={lang} onSeeMore={() => onNavigate && onNavigate("event")} />,
    },
    news: {
      label: "News",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Dernières publications" : "Latest posts"} onMore={() => onNavigate && onNavigate("news")} lang={lang} />
          <div className="home-posts">
            {NEWS.slice(0, 2).map((n, i) => (
              <div key={i} className="home-post" onClick={() => onNavigate && onNavigate("news")}>
                <Ph className="home-post__img" label="news image · 1:1" />
                <div className="home-post__body">
                  <div className="t-mono t-xs t-muted">{n.date}</div>
                  <div className="home-post__title">{n.title[lang]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    service: {
      label: "Services",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Services populaires" : "Popular services"} onMore={() => onNavigate && onNavigate("service")} lang={lang} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SERVICES_BY_CAT.package.slice(0, 2).map((s, i) => (
              <div key={i} className="service-item" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("service")}>
                <Ph className="service-item__img" label="img" />
                <div>
                  <div className="service-item__name">{s.name[lang]}</div>
                  <div className="service-item__desc">{s.desc[lang]}</div>
                </div>
                <div className="service-item__duration">
                  <IconClock size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {s.dur}
                </div>
                <div className="service-item__price">€{s.price}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    shop: {
      label: "Shop",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Boutique" : "Shop"} onMore={() => onNavigate && onNavigate("shop")} lang={lang} />
          <div className="tile-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {SHOP_ITEMS.slice(0, 4).map((s, i) => (
              <div key={i} className="tile" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("shop")}>
                <Ph className="tile__img" label="product" />
                <div className="tile__body">
                  <div className="tile__title">{s.name[lang]}</div>
                  <div className="tile__meta">{s.stock[lang]}</div>
                  <div className="tile__price">€{s.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    event: {
      label: lang === "fr" ? "Événements" : "Events",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Prochains événements" : "Upcoming events"} onMore={() => onNavigate && onNavigate("event")} lang={lang} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EVENTS.slice(0, 2).map((e, i) => (
              <div key={i} className="news-item" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("event")}>
                <div className="news-item__img" style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  background: "var(--accent-tint)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-display)", fontWeight: 600,
                }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.08em" }}>{e.date.split(" ")[1]}</div>
                  <div style={{ fontSize: 32, lineHeight: 1 }}>{e.date.split(" ")[0]}</div>
                </div>
                <div>
                  <div className="news-item__date">{e.place}</div>
                  <div className="news-item__title">{e.title[lang]}</div>
                  <div className="news-item__excerpt">
                    {lang === "fr" ? `${e.spots} places disponibles` : `${e.spots} spots available`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    video: {
      label: lang === "fr" ? "Vidéos" : "Videos",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Vidéos récentes" : "Recent videos"} onMore={() => onNavigate && onNavigate("video")} lang={lang} />
          <div className="tile-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {VIDEOS.slice(0, 2).map((v, i) => (
              <div key={i} style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("video")}>
                <div className="video-tile">
                  <Ph label="video thumbnail" style={{ width: "100%", height: "100%" }} />
                  <div className="video-tile__play"><span><IconPlay size={20} /></span></div>
                  <div className="video-tile__duration">{v.dur}</div>
                </div>
                <div style={{ padding: "8px 4px 0", fontWeight: 500, fontSize: 14 }}>{v.title[lang]}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    histoire: {
      label: lang === "fr" ? "Histoire" : "Story",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Notre histoire" : "Our story"} onMore={() => onNavigate && onNavigate("histoire")} lang={lang} />
          <div className="bio-block" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => onNavigate && onNavigate("histoire")}>
            <Ph style={{ width: "100%", aspectRatio: "16 / 7", borderRadius: 0 }} label="hero image · the studio in 2017" />
            <div style={{ padding: 20 }}>
              <div className="t-display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
                {lang === "fr" ? "Comment tout a commencé" : "How it all started"}
              </div>
              <div className="t-muted" style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.6,
              }}>
                {lang === "fr"
                  ? "En 2017, j'ai posé mes ciseaux dans un petit local du 1er arrondissement de Lyon. L'idée était simple : prendre le temps qu'il faut, et n'accepter qu'un seul client à la fois."
                  : "In 2017, I set up shop in a small space in the 1st arrondissement of Lyon. The idea was simple: take the time it takes, and never see more than one client at once."}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    info: {
      label: lang === "fr" ? "Infos pratiques" : "Practical info",
      render: () => (
        <div>
          <SectionHead title={lang === "fr" ? "Infos pratiques" : "Practical info"} lang={lang} />
          <HomeInfoPreview lang={lang} />
        </div>
      ),
    },
  };

  const ALL_IDS = ["hero", "featured", "news", "service", "shop", "event", "video", "histoire", "info"];
  const [order, setOrder] = React.useState(ALL_IDS);
  const [hidden, setHidden] = React.useState({});
  // Per-block content overrides — applied as a header banner above the block.
  // shape: { [id]: { title, intro, count } }
  const [overrides, setOverrides] = React.useState({});
  // User-added custom widgets (start as "empty widget" placeholders).
  // shape: [{ id, title, body }]
  const [customWidgets, setCustomWidgets] = React.useState([]);
  // Drawer state for editing a single widget.
  const [editingId, setEditingId] = React.useState(null);
  const [draft, setDraft] = React.useState(null);

  const openEdit = (id) => {
    const custom = customWidgets.find((w) => w.id === id);
    if (custom) {
      setDraft({ kind: "custom", id, title: custom.title || "", body: custom.body || "" });
    } else {
      const ov = overrides[id] || {};
      setDraft({
        kind: "preset",
        id,
        title: ov.title || "",
        intro: ov.intro || "",
        count: ov.count ?? 2,
      });
    }
    setEditingId(id);
  };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveEdit = () => {
    if (!draft) return cancelEdit();
    if (draft.kind === "custom") {
      setCustomWidgets((arr) => arr.map((w) => w.id === draft.id ? { ...w, title: draft.title, body: draft.body } : w));
    } else {
      setOverrides((o) => ({ ...o, [draft.id]: { title: draft.title, intro: draft.intro, count: draft.count } }));
    }
    cancelEdit();
  };

  const addEmptyWidget = () => {
    const id = "custom-" + Date.now();
    setCustomWidgets((arr) => [...arr, { id, title: "", body: "" }]);
    setOrder((arr) => [...arr, id]);
    // Open the drawer to fill it in straight away.
    setEditingId(id);
    setDraft({ kind: "custom", id, title: "", body: "" });
  };
  const deleteWidget = (id) => {
    if (customWidgets.find((w) => w.id === id)) {
      setCustomWidgets((arr) => arr.filter((w) => w.id !== id));
      setOrder((arr) => arr.filter((x) => x !== id));
    }
  };

  // sanity: keep order in sync if BLOCKS changes (no-op here)
  const reorder = useReorder((from, to) => {
    setOrder((arr) => {
      const next = [...arr];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  });

  const visibleIds = editMode ? order : order.filter((id) => !hidden[id]);

  const resolveBlock = (id) => {
    if (BLOCKS[id]) return BLOCKS[id];
    const custom = customWidgets.find((w) => w.id === id);
    if (custom) {
      return {
        label: lang === "fr" ? "Widget personnalisé" : "Custom widget",
        isCustom: true,
        render: () => <EmptyWidgetCard lang={lang} widget={custom} onEdit={() => openEdit(custom.id)} editMode={editMode} />,
      };
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {visibleIds.map((id, i) => {
        const block = resolveBlock(id);
        if (!block) return null;
        const isHidden = !!hidden[id];
        const ov = overrides[id];
        const hasOverride = ov && (ov.title || ov.intro);
        const body = (
          <>
            {hasOverride && !block.isCustom && (
              <div style={{ marginBottom: 12, padding: "10px 14px", borderLeft: "3px solid var(--accent)", background: "var(--accent-tint)", borderRadius: "0 8px 8px 0" }}>
                {ov.title && <div className="t-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: ov.intro ? 4 : 0 }}>{ov.title}</div>}
                {ov.intro && <div className="t-muted t-sm">{ov.intro}</div>}
              </div>
            )}
            {block.render()}
          </>
        );
        if (editMode) {
          const { className: dragClass, ...dragRest } = reorder.handlers(i);
          return (
            <div
              key={id}
              {...dragRest}
              className={`home-block ${moveMode ? "is-move" : ""} ${dragClass || ""} ${isHidden ? "is-hidden" : ""}`}
              onClick={(e) => {
                // tapping the body itself (not the chrome buttons) opens edit drawer
                if (e.target.closest && e.target.closest(".home-block__chrome")) return;
                if (e.target.closest && e.target.closest("button, a, input, select, textarea")) return;
                openEdit(id);
              }}
            >
              <div className="home-block__chrome">
                {moveMode && <span className="home-block__handle"><IconGrip size={14} /></span>}
                <span className="home-block__label">{block.label}</span>
                <button
                  className="home-block__chip"
                  onClick={(e) => { e.stopPropagation(); openEdit(id); }}
                  title={lang === "fr" ? "Modifier le widget" : "Edit widget"}
                >
                  <IconEdit size={12} />
                  <span>{lang === "fr" ? "Modifier" : "Edit"}</span>
                </button>
                <button
                  className="home-block__toggle"
                  onClick={(e) => { e.stopPropagation(); setHidden((h) => ({ ...h, [id]: !h[id] })); }}
                >
                  {isHidden
                    ? (lang === "fr" ? "Afficher" : "Show")
                    : (lang === "fr" ? "Masquer" : "Hide")}
                </button>
                {block.isCustom && (
                  <button
                    className="home-block__toggle home-block__toggle--danger"
                    onClick={(e) => { e.stopPropagation(); deleteWidget(id); }}
                    title={lang === "fr" ? "Supprimer" : "Delete"}
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>
              <div className="home-block__body">
                {body}
              </div>
            </div>
          );
        }
        return <React.Fragment key={id}>{body}</React.Fragment>;
      })}

      {editMode && (
        <button className="add-widget" onClick={addEmptyWidget}>
          <span className="add-widget__icon"><IconPlus size={18} /></span>
          <div>
            <div className="add-widget__title">
              {lang === "fr" ? "Ajouter un widget" : "Add a widget"}
            </div>
            <div className="add-widget__sub">
              {lang === "fr"
                ? "Bloc personnalisé — titre, texte ou call-to-action."
                : "Custom block — title, copy or call-to-action."}
            </div>
          </div>
        </button>
      )}

      {editMode && (
        <EditDrawer
          open={editingId !== null}
          title={
            draft && draft.kind === "custom"
              ? (lang === "fr" ? "Widget personnalisé" : "Custom widget")
              : (lang === "fr" ? "Personnaliser le widget" : "Customize widget")
          }
          onCancel={cancelEdit}
          onSave={saveEdit}
        >
          {draft && draft.kind === "custom" && (
            <>
              <div className="drawer__hint">
                {lang === "fr"
                  ? "Un widget vide attend votre contenu. Donnez-lui un titre et un message."
                  : "An empty widget is waiting for your content. Give it a title and a message."}
              </div>
              <TextField
                label={lang === "fr" ? "Titre" : "Title"}
                value={draft.title}
                placeholder={lang === "fr" ? "Ex. Promo de la rentrée" : "e.g. Back-to-school promo"}
                onChange={(v) => setDraft({ ...draft, title: v })}
              />
              <TextField
                label={lang === "fr" ? "Message" : "Message"}
                value={draft.body}
                multiline
                placeholder={lang === "fr"
                  ? "Quelques mots à mettre en avant — annonce, offre, info..."
                  : "A few words to highlight — announcement, offer, info..."}
                onChange={(v) => setDraft({ ...draft, body: v })}
              />
            </>
          )}
          {draft && draft.kind === "preset" && (
            <>
              <div className="drawer__hint">
                {lang === "fr"
                  ? "Surcharge facultative. Le contenu reste tiré de la section dédiée."
                  : "Optional override. Content is pulled from the dedicated section."}
              </div>
              <TextField
                label={lang === "fr" ? "Titre affiché" : "Display title"}
                value={draft.title}
                placeholder={lang === "fr" ? "Laisser vide pour le titre par défaut" : "Leave empty for default"}
                onChange={(v) => setDraft({ ...draft, title: v })}
              />
              <TextField
                label={lang === "fr" ? "Texte d'intro" : "Intro text"}
                value={draft.intro}
                multiline
                placeholder={lang === "fr" ? "Une phrase de contexte (facultatif)" : "One line of context (optional)"}
                onChange={(v) => setDraft({ ...draft, intro: v })}
              />
              <Field label={lang === "fr" ? "Nombre d'éléments" : "Items to show"}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className="btn btn--sm"
                      style={{
                        background: draft.count === n ? "var(--accent)" : "var(--panel)",
                        color: draft.count === n ? "#fff" : "var(--text)",
                        minWidth: 40,
                      }}
                      onClick={() => setDraft({ ...draft, count: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={lang === "fr" ? "Visibilité" : "Visibility"}>
                <button
                  className="btn"
                  onClick={() => setHidden((h) => ({ ...h, [draft.id]: !h[draft.id] }))}
                >
                  {hidden[draft.id]
                    ? (lang === "fr" ? "Réafficher ce widget" : "Show this widget")
                    : (lang === "fr" ? "Masquer ce widget" : "Hide this widget")}
                </button>
              </Field>
            </>
          )}
        </EditDrawer>
      )}
    </div>
  );
}

// ----- Empty / custom widget placeholder -----
// Shown when the user adds a free-form widget and has not yet filled it in.
function EmptyWidgetCard({ lang, widget, onEdit, editMode }) {
  const hasContent = (widget.title && widget.title.trim()) || (widget.body && widget.body.trim());
  if (hasContent) {
    return (
      <div
        className="bio-block"
        style={{
          padding: 22,
          background: "linear-gradient(135deg, var(--accent-tint), transparent 80%)",
        }}
      >
        {widget.title && (
          <div className="t-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            {widget.title}
          </div>
        )}
        {widget.body && <div className="t-muted" style={{ lineHeight: 1.55 }}>{widget.body}</div>}
      </div>
    );
  }
  return (
    <div className="empty-widget" onClick={editMode ? onEdit : undefined}>
      <div className="empty-widget__icon">
        <IconPlus size={22} />
      </div>
      <div className="empty-widget__title">
        {lang === "fr" ? "Widget vide" : "Empty widget"}
      </div>
      <div className="empty-widget__sub">
        {lang === "fr"
          ? "Cliquez pour ajouter un titre et un message."
          : "Click to add a title and a message."}
      </div>
    </div>
  );
}

function HomeInfoPreview({ lang }) {
  const hours = lang === "fr" ? HOURS_FR : HOURS_EN;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const today = hours[todayIdx];
  return (
    <div className="info-grid">
      <div className="bio-block">
        <div className="t-muted t-sm" style={{ marginBottom: 10 }}>
          {lang === "fr" ? "Aujourd'hui" : "Today"}
        </div>
        <div className="t-display" style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
          {today.closed
            ? (lang === "fr" ? "Fermé" : "Closed")
            : (lang === "fr" ? `Ouvert · ${today.h}` : `Open · ${today.h}`)}
        </div>
        <div className="t-muted t-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <IconMapPin size={14} /> Lyon, 69001
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {hours.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 13,
                fontWeight: i === todayIdx ? 600 : 400,
                color: row.closed ? "var(--text-3)" : "var(--text)",
              }}
            >
              <span>{row.d}</span>
              <span className="t-mono">{row.h}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bio-block">
        <div className="t-muted t-sm" style={{ marginBottom: 10 }}>
          {lang === "fr" ? "Contact" : "Contact"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="contact-cell__label">{lang === "fr" ? "Téléphone" : "Phone"}</div>
            <div className="contact-cell__value t-mono">06 49 23 61 13</div>
          </div>
          <div>
            <div className="contact-cell__label">Email</div>
            <div className="contact-cell__value t-mono" style={{ fontSize: 14 }}>lequerrekillian@gmail.com</div>
          </div>
          <div>
            <div className="contact-cell__label">Manager</div>
            <div className="contact-manager">
              <div className="avatar contact-manager__avatar" style={{ background: "linear-gradient(135deg, #9ab3c8, #5a82a8)" }}>M</div>
              <span>{lang === "fr" ? "Envoyer un message" : "Send a message"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, onMore, lang }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <div className="t-display" style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
      {onMore && (
        <button onClick={onMore} style={{ color: "var(--accent)", fontSize: 13, cursor: "pointer" }}>
          {lang === "fr" ? "Voir tout" : "See all"} →
        </button>
      )}
    </div>
  );
}

function FeaturedEvent({ lang, onSeeMore }) {
  const e = EVENTS[2]; // "Soirée portes ouvertes"
  return (
    <div className="featured-event" onClick={onSeeMore}>
      <Ph className="featured-event__img" label="event hero image · 16:9" />
      <div className="featured-event__overlay">
        <div className="featured-event__tag">
          {lang === "fr" ? "Prochain événement" : "Up next"}
        </div>
        <div className="featured-event__title">{e.title[lang]}</div>
        <div className="featured-event__meta">
          <span><IconCalendar size={14} /> {e.date}</span>
          <span><IconMapPin size={14} /> {e.place}</span>
        </div>
      </div>
    </div>
  );
}

// ----- Info (the old bio + contact, now with opening hours) ----
const HOURS_FR = [
  { d: "Lundi",    h: "Fermé",            closed: true },
  { d: "Mardi",    h: "09:00 – 19:00" },
  { d: "Mercredi", h: "09:00 – 19:00" },
  { d: "Jeudi",    h: "09:00 – 19:00" },
  { d: "Vendredi", h: "09:00 – 21:00" },
  { d: "Samedi",   h: "08:00 – 18:00" },
  { d: "Dimanche", h: "Fermé",            closed: true },
];
const HOURS_EN = [
  { d: "Monday",    h: "Closed",          closed: true },
  { d: "Tuesday",   h: "9 am – 7 pm" },
  { d: "Wednesday", h: "9 am – 7 pm" },
  { d: "Thursday",  h: "9 am – 7 pm" },
  { d: "Friday",    h: "9 am – 9 pm" },
  { d: "Saturday",  h: "8 am – 6 pm" },
  { d: "Sunday",    h: "Closed",          closed: true },
];

function InfoSection({ lang }) {
  const t = useT(lang);
  const hours = lang === "fr" ? HOURS_FR : HOURS_EN;
  const todayIdx = (new Date().getDay() + 6) % 7; // make Mon=0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="info-grid">
        <div className="bio-block">
          <div className="t-muted t-sm" style={{ marginBottom: 8 }}>{t("aboutMe")}</div>
          <div>
            {lang === "fr"
              ? "Coiffeur barbier indépendant à Lyon depuis 2017. Style classique et coupes contemporaines. Sur rendez-vous, en studio et à domicile sur demande."
              : "Independent barber-stylist in Lyon since 2017. Classic styling and contemporary cuts. By appointment, in-studio or on-location."}
          </div>
        </div>
        <div className="hours-block">
          <div className="t-muted t-sm" style={{ marginBottom: 10 }}>
            {lang === "fr" ? "Horaires d'ouverture" : "Opening hours"}
          </div>
          {hours.map((row, i) => (
            <div
              key={i}
              className={`hours-row ${i === todayIdx ? "is-today" : ""} ${row.closed ? "is-closed" : ""}`}
            >
              <span className="hours-row__day">{row.d}</span>
              <span className="hours-row__time">{row.h}</span>
            </div>
          ))}
          <div className="t-xs t-muted" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
            {lang === "fr"
              ? "Sur rendez-vous uniquement."
              : "By appointment only."}
          </div>
        </div>
      </div>

      <div className="contact-block">
        <div>
          <div className="contact-cell__label">Manager</div>
          <div className="contact-manager">
            <div className="avatar contact-manager__avatar" style={{ background: "linear-gradient(135deg, #9ab3c8, #5a82a8)" }}>M</div>
            <span>{t("sendMessage")}</span>
          </div>
        </div>
        <div>
          <div className="contact-cell__label">{t("location")}</div>
          <div className="contact-cell__value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconMapPin size={14} /> Lyon, 69001
          </div>
        </div>
        <div>
          <div className="contact-cell__label">{t("professional")}</div>
          <div className="contact-cell__value t-mono">06 49 23 61 13</div>
        </div>
        <div>
          <div className="contact-cell__label">Email</div>
          <div className="contact-cell__value t-mono" style={{ fontSize: 14 }}>lequerrekillian@gmail.com</div>
        </div>
      </div>
    </div>
  );
}

// ----- Widget primitives (Home tab summary cards) -----
function Widget({ title, onSeeMore, lang, children, accent }) {
  return (
    <div className="widget" style={accent ? { borderColor: "var(--accent)" } : undefined}>
      <div className="widget__head">
        <div className="widget__title">{title}</div>
        {onSeeMore && (
          <button className="widget__more" onClick={onSeeMore}>
            {lang === "fr" ? "Voir tout" : "See all"} →
          </button>
        )}
      </div>
      <div className="widget__body">{children}</div>
    </div>
  );
}

function ServiceWidget({ lang, onSeeMore }) {
  const items = (SERVICES_BY_CAT.package || []).slice(0, 3);
  return (
    <Widget title="Service" onSeeMore={onSeeMore} lang={lang}>
      {items.map((s, i) => (
        <div key={i} className="widget__row">
          <div className="widget__row-left">
            <Ph style={{ width: 32, height: 32, borderRadius: 8 }} label="" />
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name[lang]}</div>
              <div className="t-xs t-muted">{s.dur}</div>
            </div>
          </div>
          <div className="t-display" style={{ fontWeight: 600, fontSize: 14 }}>€{s.price}</div>
        </div>
      ))}
    </Widget>
  );
}

function EventWidget({ lang, onSeeMore }) {
  const items = EVENTS.slice(0, 2);
  return (
    <Widget title="Event" onSeeMore={onSeeMore} lang={lang}>
      {items.map((e, i) => (
        <div key={i} className="widget__row">
          <div className="widget__row-left">
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "var(--accent-tint)", color: "var(--accent)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 600,
            }}>
              <div style={{ fontSize: 9, lineHeight: 1 }}>{e.date.split(" ")[1]}</div>
              <div style={{ fontSize: 14, lineHeight: 1 }}>{e.date.split(" ")[0]}</div>
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{e.title[lang]}</div>
              <div className="t-xs t-muted">{e.place}</div>
            </div>
          </div>
        </div>
      ))}
    </Widget>
  );
}

function ShopWidget({ lang, onSeeMore }) {
  const items = SHOP_ITEMS.slice(0, 4);
  return (
    <Widget title="Shop" onSeeMore={onSeeMore} lang={lang}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {items.map((s, i) => (
          <div key={i}>
            <Ph style={{ width: "100%", aspectRatio: 1, borderRadius: 8 }} label="" />
            <div className="t-xs" style={{ marginTop: 4, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name[lang]}</div>
            <div className="t-xs" style={{ color: "var(--accent)", fontFamily: "var(--font-display)", fontWeight: 600 }}>€{s.price}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

function NewsWidget({ lang, onSeeMore }) {
  const items = NEWS.slice(0, 2);
  return (
    <Widget title="News" onSeeMore={onSeeMore} lang={lang}>
      {items.map((n, i) => (
        <div key={i} style={{ padding: "6px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
          <div className="t-mono t-xs t-muted">{n.date}</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{n.title[lang]}</div>
        </div>
      ))}
    </Widget>
  );
}

function VideoWidget({ lang, onSeeMore }) {
  return (
    <Widget title="Vidéo" onSeeMore={onSeeMore} lang={lang}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {VIDEOS.slice(0, 2).map((v, i) => (
          <div key={i}>
            <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden" }}>
              <Ph style={{ width: "100%", height: "100%" }} label="" />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconPlay size={12} />
                </div>
              </div>
            </div>
            <div className="t-xs" style={{ marginTop: 4, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title[lang]}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

function ParcoursWidget({ lang, onSeeMore }) {
  const items = PARCOURS.slice(0, 2);
  return (
    <Widget title={lang === "fr" ? "Parcours" : "Journey"} onSeeMore={onSeeMore} lang={lang}>
      {items.map((p, i) => (
        <div key={i} style={{ padding: "6px 0", borderTop: i === 0 ? 0 : "1px solid var(--border-soft)" }}>
          <div className="t-mono t-xs t-muted">{p.date}</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{p.title[lang]}</div>
        </div>
      ))}
    </Widget>
  );
}

function HistoireWidget({ lang, onSeeMore }) {
  return (
    <Widget title={lang === "fr" ? "Histoire" : "Story"} onSeeMore={onSeeMore} lang={lang}>
      <Ph style={{ width: "100%", aspectRatio: "16 / 7", borderRadius: 10, marginBottom: 10 }} label="hero · studio 2017" />
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        {lang === "fr" ? "Comment tout a commencé" : "How it all started"}
      </div>
      <div className="t-xs t-muted" style={{
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: 1.5,
      }}>
        {lang === "fr"
          ? "En 2017, j'ai posé mes ciseaux dans un petit local du 1er arrondissement de Lyon. L'idée était simple : prendre le temps qu'il faut, et n'accepter qu'un seul client à la fois."
          : "In 2017, I set up shop in a small space in the 1st arrondissement of Lyon. The idea was simple: take the time it takes, and never see more than one client at once."}
      </div>
    </Widget>
  );
}

function InfoWidget({ lang, onSeeMore }) {
  const hours = lang === "fr" ? HOURS_FR : HOURS_EN;
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <Widget title={lang === "fr" ? "Infos" : "Info"} onSeeMore={onSeeMore} lang={lang}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
        <IconMapPin size={14} />
        <span>Lyon, 69001</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {hours.slice(0, 4).map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12,
              fontWeight: i === todayIdx ? 600 : 400,
              color: row.closed ? "var(--text-3)" : "var(--text)",
            }}
          >
            <span>{row.d}</span>
            <span className="t-mono">{row.h}</span>
          </div>
        ))}
      </div>
      <div className="t-xs t-muted" style={{ marginTop: 10 }}>
        {lang === "fr" ? "Sur rendez-vous uniquement." : "By appointment only."}
      </div>
    </Widget>
  );
}

// ----- Histoire (long-form story) --------------------------
const HISTOIRE_INITIAL = {
  title: {
    fr: "Comment tout a commencé",
    en: "How it all started",
  },
  paragraphs: {
    fr: [
      "En 2017, j'ai posé mes ciseaux dans un petit local du 1er arrondissement de Lyon. L'idée était simple : prendre le temps qu'il faut, et n'accepter qu'un seul client à la fois. Pas de précipitation, pas de file d'attente — juste une coupe pensée pour celui qui est assis dans le fauteuil.",
      "Trois ans plus tard, le studio a déménagé près de Bellecour et l'équipe est passée à deux. Killian Care est né — une petite gamme de produits artisanaux pour barbe et cheveux, fabriqués en France.",
      "Aujourd'hui, Studio Killian accueille 340 clients par an, propose des forfaits mariage à domicile, et continue de croire qu'un bon rendez-vous coiffure ne se mesure pas en minutes.",
    ],
    en: [
      "In 2017, I set up shop in a small space in the 1st arrondissement of Lyon. The idea was simple: take the time it takes, and never see more than one client at once. No rush, no waiting room — just a cut designed for the person in the chair.",
      "Three years in, the studio moved closer to Bellecour and the team grew to two. Killian Care was born — a small line of artisan beard and hair products, made in France.",
      "Today, Studio Killian welcomes 340 clients a year, offers on-location wedding packages, and still believes a good haircut isn't measured in minutes.",
    ],
  },
};

function HistoireSection({ lang, editMode }) {
  const [story, setStory] = React.useState(HISTOIRE_INITIAL);
  const paragraphs = story.paragraphs[lang];

  const setTitle = (v) => setStory((s) => ({ ...s, title: { ...s.title, [lang]: v } }));
  const setPara = (i, v) =>
    setStory((s) => {
      const next = [...s.paragraphs[lang]];
      next[i] = v;
      return { ...s, paragraphs: { ...s.paragraphs, [lang]: next } };
    });
  const removePara = (i) =>
    setStory((s) => {
      const next = s.paragraphs[lang].filter((_, k) => k !== i);
      return { ...s, paragraphs: { ...s.paragraphs, [lang]: next } };
    });
  const movePara = (from, to) =>
    setStory((s) => {
      const next = [...s.paragraphs[lang]];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return { ...s, paragraphs: { ...s.paragraphs, [lang]: next } };
    });
  const addPara = () =>
    setStory((s) => ({
      ...s,
      paragraphs: {
        ...s.paragraphs,
        [lang]: [...s.paragraphs[lang], lang === "fr" ? "Nouveau paragraphe…" : "New paragraph…"],
      },
    }));
  useAddListener("histoire", addPara);
  const reorder = useTapOrLongPressReorder({
    onMove: movePara,
    onTap: () => {}, // tapping a paragraph focuses the textarea naturally
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className={`histoire-hero ${editMode ? "is-editable" : ""}`}>
        <Ph style={{ width: "100%", aspectRatio: "16 / 7", borderRadius: 16 }} label="hero image · the studio in 2017" />
        {editMode && (
          <button className="histoire-hero__replace">
            <IconEdit size={14} />
            <span>{lang === "fr" ? "Remplacer l'image" : "Replace image"}</span>
          </button>
        )}
      </div>

      {editMode ? (
        <input
          className="input histoire-title-input"
          value={story.title[lang]}
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : (
        <div className="t-display" style={{ fontSize: 22, fontWeight: 500 }}>
          {story.title[lang]}
        </div>
      )}

      <div className="histoire-paragraphs">
        {paragraphs.map((p, i) =>
          editMode ? (
            <EditableItem
              key={i}
              editMode={true}
              layout="histoire"
              onDelete={() => removePara(i)}
              dragHandlers={reorder.handlers(i)}
            >
              <AutoTextarea
                className="input histoire-para-input"
                value={p}
                onChange={(v) => setPara(i, v)}
              />
            </EditableItem>
          ) : (
            <p key={i} className="histoire-para-read">{p}</p>
          )
        )}
      </div>
    </div>
  );
}

// Auto-growing textarea — no manual resize handle, container hugs content.
function AutoTextarea({ value, onChange, className, placeholder }) {
  const ref = React.useRef(null);
  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);
  React.useLayoutEffect(() => { grow(); }, [value, grow]);
  React.useEffect(() => {
    window.addEventListener("resize", grow);
    return () => window.removeEventListener("resize", grow);
  }, [grow]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.target.value); grow(); }}
      rows={1}
    />
  );
}

// ----- Drive (public files visible on profile) -------------
function ProfileDriveSection({ lang }) {
  const files = [
    { name: lang === "fr" ? "Tarifs 2025.pdf"     : "Pricing 2025.pdf",     size: "184 KB", kind: "PDF" },
    { name: lang === "fr" ? "Catalogue produits.pdf" : "Product catalog.pdf", size: "5.1 MB", kind: "PDF" },
    { name: lang === "fr" ? "Plan d'accès.png"    : "How to find us.png",   size: "640 KB", kind: "IMG" },
    { name: lang === "fr" ? "Charte salon.pdf"    : "Studio guidelines.pdf",size: "92 KB",  kind: "PDF" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {files.map((f, i) => (
        <div key={i} className="news-item" style={{ gridTemplateColumns: "44px 1fr auto", alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: "var(--panel)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)",
          }}>{f.kind}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{f.name}</div>
            <div className="t-xs t-muted">{f.size}</div>
          </div>
          <button className="btn btn--sm">{lang === "fr" ? "Télécharger" : "Download"}</button>
        </div>
      ))}
    </div>
  );
}

// ----- Custom links (CTA group) -----------------------------
function CustomLinks({ lang }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [open]);

  const LINKS = [
    { name: "Instagram", handle: "@killian.lq",     url: "instagram.com/killian.lq" },
    { name: "TikTok",    handle: "@killianstudio",  url: "tiktok.com/@killianstudio" },
    { name: lang === "fr" ? "Site perso" : "Website", handle: "killian-studio.fr", url: "killian-studio.fr" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn--ghost" onClick={() => setOpen(o => !o)}>
        <IconLink size={14} />
        <span>{lang === "fr" ? "Liens" : "Links"}</span>
        <IconCaret size={12} />
      </button>
      {open && (
        <div className="app-menu fade-enter" style={{ width: 240, right: "auto", left: 0, top: "calc(100% + 6px)" }}>
          {LINKS.map((l, i) => (
            <a key={i} className="app-menu__item" href={`https://${l.url}`} target="_blank" rel="noreferrer">
              <IconLink size={14} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{l.name}</div>
                <div className="t-xs t-muted">{l.handle}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- More menu (vertical dots, no bg) ---------------------
function MoreMenu({ lang, owner = false }) {
  const t = useT(lang);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn btn--icon"
        onClick={() => setOpen(o => !o)}
        aria-label="More"
        style={{ background: "transparent" }}
      >
        <IconMore size={18} style={{ transform: "rotate(90deg)" }} />
      </button>
      {open && (
        <div className="app-menu fade-enter" style={{ width: 220, right: 0, top: "calc(100% + 6px)" }}>
          {!owner ? (
            <>
              <button className="app-menu__item app-menu__item--soft" style={{ color: "rgb(181,51,51)" }}>
                <IconFlag size={14} /><span>{t("reportAccount")}</span>
              </button>
              <button className="app-menu__item app-menu__item--soft">
                <IconX size={14} /><span>{t("blockAccount")}</span>
              </button>
            </>
          ) : (
            <button className="app-menu__item app-menu__item--soft">
              <IconX size={14} /><span>{lang === "fr" ? "Masquer ce menu" : "Hide menu"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ProfileScreen, Ph });
