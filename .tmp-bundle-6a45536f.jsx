/* global React */
// Icons — Lucide-style outline, 1.5px stroke. Inline so the prototype is self-contained.

const Icon = ({ children, size = 20, stroke = 1.5, color = "currentColor", ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

const IconHome      = (p) => <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Icon>;
const IconBag       = (p) => <Icon {...p}><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></Icon>;
const IconCalendar  = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>;
const IconBriefcase = (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></Icon>;
const IconNewspaper = (p) => <Icon {...p}><path d="M4 6h13a2 2 0 0 1 2 2v11l-2-1-2 1-2-1-2 1-2-1-2 1-2-1V8a2 2 0 0 1 2-2Z" /><path d="M8 9h7M8 13h7M8 17h4" /></Icon>;
const IconPlay      = (p) => <Icon {...p}><polygon points="6 4 20 12 6 20 6 4" /></Icon>;
const IconUser      = (p) => <Icon {...p}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></Icon>;
const IconPulse     = (p) => <Icon {...p}><path d="M3 12h4l2-7 4 14 2-5 2 2h4" /></Icon>;
const IconHelp      = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" /><circle cx="12" cy="17" r=".5" fill="currentColor" /></Icon>;
const IconFolder    = (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></Icon>;
const IconRoute     = (p) => <Icon {...p}><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M6 16V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H9a3 3 0 0 0-3 3v1" /></Icon>;
const IconChart     = (p) => <Icon {...p}><path d="M4 20V4M4 20h16M8 16V11M12 16V8M16 16V13" /></Icon>;
const IconMegaphone = (p) => <Icon {...p}><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V7L6 11H5a2 2 0 0 0-2 2v0Z" /><path d="M10 7l9-3v16l-9-3" /></Icon>;
const IconLayout    = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h18" /></Icon>;
const IconZap       = (p) => <Icon {...p}><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" /></Icon>;
const IconPlug      = (p) => <Icon {...p}><path d="M9 2v6M15 2v6M5 8h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V8Z" /><path d="M12 16v6" /></Icon>;
const IconSettings  = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.27.62.84 1.03 1.5 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" /></Icon>;
const IconCash      = (p) => <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></Icon>;
const IconCard      = (p) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Icon>;
const IconImage     = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icon>;
const IconMessage   = (p) => <Icon {...p}><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-3a8 8 0 0 1 0-16h6a8 8 0 0 1 8 8Z" /></Icon>;
const IconSearch    = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>;
const IconPlus      = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const IconShare     = (p) => <Icon {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" /></Icon>;
const IconMore      = (p) => <Icon {...p}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Icon>;
const IconHeart     = (p) => <Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></Icon>;
const IconBookmark  = (p) => <Icon {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" /></Icon>;
const IconCaret     = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
const IconCheck     = (p) => <Icon {...p}><path d="m5 13 4 4L19 7" /></Icon>;
const IconX         = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
const IconSidebar   = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Icon>;
const IconEdit      = (p) => <Icon {...p}><path d="M14 3a2.83 2.83 0 1 1 4 4L7 18l-4 1 1-4Z" /></Icon>;
const IconClock     = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const IconMapPin    = (p) => <Icon {...p}><path d="M12 22s8-7.58 8-13a8 8 0 0 0-16 0c0 5.42 8 13 8 13Z" /><circle cx="12" cy="9" r="3" /></Icon>;
const IconFile      = (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></Icon>;
const IconUpload    = (p) => <Icon {...p}><path d="M12 17V3M5 10l7-7 7 7M3 21h18" /></Icon>;
const IconGrip      = (p) => <Icon {...p}><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" /></Icon>;
const IconFilter    = (p) => <Icon {...p}><path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" /></Icon>;
const IconBell      = (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>;
const IconSun       = (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Icon>;
const IconCloud     = (p) => <Icon {...p}><path d="M18 17h-9a4 4 0 1 1 .5-7.97A6 6 0 0 1 21 11.5 3.5 3.5 0 0 1 18 17Z" /></Icon>;
const IconRain      = (p) => <Icon {...p}><path d="M18 13h-9a4 4 0 1 1 .5-7.97A6 6 0 0 1 21 7.5 3.5 3.5 0 0 1 18 13Z" /><path d="M9 17v3M13 17v3M17 17v3" /></Icon>;
const IconSunCloud  = (p) => <Icon {...p}><path d="M12 3v1M5.6 5.6l.7.7M3 12h1M19.4 5.6l-.7.7" /><circle cx="12" cy="10" r="3" /><path d="M18 19h-7a3 3 0 0 1-.4-5.96A4 4 0 0 1 18 13.5 2.75 2.75 0 0 1 18 19Z" /></Icon>;
const IconCreditCard= (p) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h3" /></Icon>;
const IconMoon      = (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Icon>;
const IconLink      = (p) => <Icon {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>;
const IconFlag      = (p) => <Icon {...p}><path d="M4 3v18M4 4h13l-3 4 3 4H4" /></Icon>;
const IconLogout    = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Icon>;
const IconStar      = (p) => <Icon {...p}><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2" /></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></Icon>;
const IconUsers     = (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M17 5a4 4 0 0 1 0 8M21 21a6 6 0 0 0-6-6" /></Icon>;
const IconLock      = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
const IconTrash     = (p) => <Icon {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></Icon>;
const IconCamera    = (p) => <Icon {...p}><path d="M9 4h6l1.5 2.5H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1h3.5L9 4Z" /><circle cx="12" cy="13" r="4" /></Icon>;
const IconEye       = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>;
const IconEyeOff    = (p) => <Icon {...p}><path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17.2 17.2 0 0 1-3.2 4.06M6.5 6.5A17.2 17.2 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.85-1.18" /><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2M3 3l18 18" /></Icon>;

Object.assign(window, {
  Icon, IconHome, IconBag, IconCalendar, IconBriefcase, IconNewspaper, IconPlay,
  IconUser, IconHelp, IconFolder, IconRoute, IconChart, IconMegaphone, IconLayout,
  IconZap, IconPlug, IconSettings, IconCash, IconCard, IconImage, IconMessage,
  IconSearch, IconPlus, IconShare, IconMore, IconHeart, IconBookmark, IconCaret,
  IconCheck, IconX, IconSidebar, IconEdit, IconClock, IconMapPin, IconFile,
  IconUpload, IconGrip, IconFilter, IconBell,
  IconSun, IconCloud, IconRain, IconSunCloud, IconCreditCard, IconMoon,
  IconLink, IconFlag, IconLogout, IconStar, IconCheckCircle, IconUsers,
  IconPulse, IconLock, IconTrash, IconCamera, IconEye, IconEyeOff,
});
