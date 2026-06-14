'use client'

import {
  TEAM_PERMISSION_GROUPS,
  type TeamPermissionKey,
  type TeamPermissions,
} from '@/lib/team-data'

type Props = {
  permissions: TeamPermissions
  onChange: (permissions: TeamPermissions) => void
  readOnly?: boolean
}

export function TeamPermissionEditor({ permissions, onChange, readOnly = false }: Props) {
  function toggle(key: TeamPermissionKey) {
    if (readOnly) return
    onChange({ ...permissions, [key]: !permissions[key] })
  }

  return (
    <div className="team-perm-groups">
      {TEAM_PERMISSION_GROUPS.map((group) => (
        <section key={group.id} className="team-perm-group">
          <h3 className="team-perm-group__title">{group.label}</h3>
          <div className="team-perm-group__list">
            {group.items.map((item, index) => (
              <div
                key={item.key}
                className={`team-perm-row${index === 0 ? ' team-perm-row--first' : ''}`}
              >
                <div className="team-perm-row__main">
                  <div className="team-perm-row__label">{item.label}</div>
                  <div className="team-perm-row__desc">{item.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={permissions[item.key]}
                  aria-label={`${item.label} — ${permissions[item.key] ? 'activé' : 'désactivé'}`}
                  className={`team-switch${permissions[item.key] ? ' is-on' : ''}`}
                  onClick={() => toggle(item.key)}
                  disabled={readOnly}
                >
                  <span className="team-switch__thumb" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
