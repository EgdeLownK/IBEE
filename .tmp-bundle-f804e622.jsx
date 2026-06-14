/* global React, IconGrip, IconEdit, IconX, IconPlus */
// Edit-mode primitives shared by every section.
// - useEditableList: list state + reorder/add/update/remove helpers
// - EditableItem:    drag handle + edit/delete chips overlaid on children
// - AddCard:         dashed "+ Add" card at the end of the list
// - EditDrawer:      right-side slide-over with form fields
// - Field:           generic labeled input for the drawer
//
// All scoped to the prototype: state lives in each section, no persistence.

const { useState, useRef, useEffect } = React;

// ---------- "move mode" context ----------------------------------
// Drag/reorder is opt-in: only enabled when the user toggles "Déplacer".
const MoveModeContext = React.createContext(false);
const useMoveMode = () => React.useContext(MoveModeContext);

// ---------- list state hook --------------------------------------
function useEditableList(initial, makeBlank) {
  const [items, setItems] = useState(initial);
  // editing index — null when drawer closed, -1 when adding a new item
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState(null);

  const openEdit = (i) => {
    setEditingIdx(i);
    setDraft(JSON.parse(JSON.stringify(items[i])));
  };
  const openAdd = (overrides = {}) => {
    setEditingIdx(-1);
    setDraft({ ...(makeBlank ? makeBlank() : {}), ...overrides });
  };
  const cancel = () => { setEditingIdx(null); setDraft(null); };

  const save = () => {
    if (editingIdx === -1) setItems((arr) => [...arr, draft]);
    else setItems((arr) => arr.map((it, i) => (i === editingIdx ? draft : it)));
    cancel();
  };

  const remove = (i) => setItems((arr) => arr.filter((_, k) => k !== i));

  const move = (from, to) => {
    setItems((arr) => {
      const next = [...arr];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  return { items, setItems, editingIdx, draft, setDraft, openEdit, openAdd, cancel, save, remove, move };
}

// ---------- tap-or-long-press drag-to-reorder hook --------------
// Pointer-based interaction model (no HTML5 drag):
//   • short tap on item     → calls onTap(i)  (used to open the edit drawer)
//   • press & hold ≥ 1 s    → enters live drag mode for that item; subsequent
//                              pointer movement reorders by hit-testing.
//   • move during press     → before long-press fires, motion > tolerance
//                              cancels the press (treat as scroll / unintended).
//
// While dragging, each pointermove hit-tests the topmost element with a
// data-reorder-idx attribute under the cursor; if it's a different index, the
// list is reordered LIVE (onMove called).
function useTapOrLongPressReorder({ onTap, onMove, threshold = 1000, moveTolerance = 8 }) {
  const moveMode = useMoveMode();
  // when the explicit "Déplacer" toggle is on, we shortcut the long-press
  // (any pointermove past the tolerance starts dragging immediately).
  const [draggingIdx, setDraggingIdx] = useState(null);
  const stateRef = useRef({
    pressIdx: null,
    timer: null,
    startX: 0,
    startY: 0,
    moved: false,
    isDragging: false,
  });

  const clearTimer = () => {
    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }
  };

  // Window-level pointermove/pointerup while a press or drag is active.
  useEffect(() => {
    const onPointerMove = (e) => {
      const s = stateRef.current;
      if (s.pressIdx == null && !s.isDragging) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.isDragging) {
        // before drag starts: significant motion cancels the press (scroll/etc.)
        // EXCEPT in explicit moveMode where motion starts a drag immediately.
        if (Math.hypot(dx, dy) > moveTolerance) {
          if (moveMode) {
            clearTimer();
            s.isDragging = true;
            setDraggingIdx(s.pressIdx);
          } else {
            clearTimer();
            s.pressIdx = null;
            s.moved = true;
          }
        }
        return;
      }
      // active drag: hit-test
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetItem = el && el.closest && el.closest("[data-reorder-idx]");
      if (targetItem) {
        const j = Number(targetItem.dataset.reorderIdx);
        const cur = stateRef.current.pressIdx;
        if (!isNaN(j) && cur != null && j !== cur) {
          onMove(cur, j);
          stateRef.current.pressIdx = j;
          setDraggingIdx(j);
        }
      }
    };

    const onPointerUp = (e) => {
      const s = stateRef.current;
      if (s.pressIdx == null && !s.isDragging) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const wasDrag = s.isDragging;
      const tapped = !wasDrag && s.timer != null && !s.moved && Math.hypot(dx, dy) < moveTolerance;
      const tappedIdx = s.pressIdx;
      clearTimer();
      s.pressIdx = null;
      s.moved = false;
      s.isDragging = false;
      setDraggingIdx(null);
      if (tapped && tappedIdx != null) onTap && onTap(tappedIdx);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onMove, onTap, moveTolerance, moveMode]);

  const handlers = (i) => ({
    "data-reorder-idx": i,
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // clicks on interactive children (chips, links, selects) should pass through unmolested;
      // inputs/textareas ARE allowed to start a press (so paragraphs in Histoire can be long-pressed to drag).
      if (e.target.closest && e.target.closest("button, a, select, [data-no-tap]")) return;
      const s = stateRef.current;
      s.pressIdx = i;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.moved = false;
      s.isDragging = false;
      clearTimer();
      s.timer = setTimeout(() => {
        s.timer = null;
        s.isDragging = true;
        setDraggingIdx(s.pressIdx);
      }, threshold);
    },
    className: draggingIdx === i ? "is-dragging" : "",
  });

  return { handlers, draggingIdx };
}

// Back-compat: keep useReorder as an alias for sections that import it.
const useReorder = (onMove) => useTapOrLongPressReorder({ onMove, onTap: () => {} });

// ---------- editable wrapper -------------------------------------
function EditableItem({ editMode, onEdit, onDelete, dragHandlers = {}, children, layout = "block" }) {
  const moveMode = useMoveMode();
  if (!editMode) return <>{children}</>;
  const { className: dragClass, ...dragRest } = dragHandlers;
  return (
    <div
      {...dragRest}
      className={`editable editable--${layout} ${moveMode ? "is-move" : ""} ${dragClass || ""}`}
    >
      {moveMode && (
        <div className="editable__handle" title="Déplacer">
          <IconGrip size={14} />
        </div>
      )}
      <div className="editable__actions">
        {onEdit && (
          <button className="editable__chip" onClick={onEdit} title="Modifier">
            <IconEdit size={13} />
          </button>
        )}
        {onDelete && (
          <button className="editable__chip editable__chip--danger" onClick={onDelete} title="Supprimer">
            <IconX size={13} />
          </button>
        )}
      </div>
      <div className="editable__body">{children}</div>
    </div>
  );
}

// ---------- add card ---------------------------------------------
function AddCard({ label, onClick, layout = "block" }) {
  return (
    <button className={`add-card add-card--${layout}`} onClick={onClick}>
      <span className="add-card__icon"><IconPlus size={16} /></span>
      <span>{label}</span>
    </button>
  );
}

// ---------- right-side drawer ------------------------------------
function EditDrawer({ open, title, onCancel, onSave, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  // Portal the drawer into .app so it's positioned relative to the app shell
  // (NOT the browser chrome window). Without this, the drawer overlaps the
  // tab bar and URL bar of the surrounding ChromeWindow.
  const target = typeof document !== "undefined" ? document.querySelector(".app") : null;
  const content = (
    <>
      <div className="drawer__backdrop" onClick={onCancel} />
      <aside className="drawer fade-enter">
        <header className="drawer__head">
          <div className="drawer__title">{title}</div>
          <button className="btn btn--icon btn--ghost" onClick={onCancel} aria-label="Close">
            <IconX size={16} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        <footer className="drawer__foot">
          <button className="btn" onClick={onCancel}>Annuler</button>
          <button className="btn btn--accent" onClick={onSave}>Enregistrer</button>
        </footer>
      </aside>
    </>
  );
  return target ? ReactDOM.createPortal(content, target) : content;
}

// ---------- form fields ------------------------------------------
function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}
function TextField({ label, value, onChange, placeholder, multiline }) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          className="input field__input"
          rows={4}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input field__input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
}
function NumberField({ label, value, onChange, prefix }) {
  return (
    <Field label={label}>
      <div className="field__numwrap">
        {prefix && <span className="field__prefix">{prefix}</span>}
        <input
          type="number"
          className="input field__input"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
    </Field>
  );
}

function BilingualField({ label, value, onChange, multiline }) {
  return (
    <div className="field field--bi">
      <span className="field__label">{label}</span>
      <div className="field__bilingual">
        <div>
          <span className="field__sublabel">FR</span>
          {multiline ? (
            <textarea
              className="input field__input"
              rows={3}
              value={(value && value.fr) || ""}
              onChange={(e) => onChange({ ...(value || {}), fr: e.target.value })}
            />
          ) : (
            <input
              className="input field__input"
              value={(value && value.fr) || ""}
              onChange={(e) => onChange({ ...(value || {}), fr: e.target.value })}
            />
          )}
        </div>
        <div>
          <span className="field__sublabel">EN</span>
          {multiline ? (
            <textarea
              className="input field__input"
              rows={3}
              value={(value && value.en) || ""}
              onChange={(e) => onChange({ ...(value || {}), en: e.target.value })}
            />
          ) : (
            <input
              className="input field__input"
              value={(value && value.en) || ""}
              onChange={(e) => onChange({ ...(value || {}), en: e.target.value })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- categorised list (edit-mode view) -----------------
// Renders list.items grouped by item.cat into `categories`, with edit chips,
// drag-to-reorder, and an "Add" card at the end of each group.
function EditableCategorisedList({ lang, list, categories, renderItem, addLabel, layout = "row", columns }) {
  const reorder = useTapOrLongPressReorder({
    onMove: list.move,
    onTap: (i) => list.openEdit(i),
  });
  const labelOf = (c) => (typeof c.label === "string" ? c.label : c.label[lang]);
  return (
    <div className="edit-stack">
      {categories.map((cat) => {
        const catItems = list.items
          .map((it, idx) => ({ it, idx }))
          .filter((x) => x.it.cat === cat.key);
        const gridStyle = columns
          ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
          : undefined;
        const wrapperClass = columns ? "tile-grid edit-grid" : "service-list edit-list";
        return (
          <section key={cat.key} className="playlist-section">
            <div className="playlist-section__head">
              <div className="playlist-section__title">{labelOf(cat)}</div>
              <div className="playlist-section__count">{catItems.length}</div>
            </div>
            <div className={wrapperClass} style={gridStyle}>
              {catItems.map(({ it, idx }) => (
                <EditableItem
                  key={idx}
                  editMode={true}
                  layout={layout}
                  onDelete={() => list.remove(idx)}
                  dragHandlers={reorder.handlers(idx)}
                >
                  {renderItem(it, idx)}
                </EditableItem>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// listen for the panel's contextual "add" event, scoped to a section id
function useAddListener(sectionId, openAdd) {
  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail && e.detail.section === sectionId) openAdd();
    };
    window.addEventListener("ibee:edit-add", handler);
    return () => window.removeEventListener("ibee:edit-add", handler);
  }, [sectionId, openAdd]);
}

Object.assign(window, {
  useEditableList, useReorder, useTapOrLongPressReorder, useAddListener, useMoveMode,
  MoveModeContext,
  EditableItem, AddCard, EditDrawer,
  Field, TextField, NumberField, BilingualField,
});


