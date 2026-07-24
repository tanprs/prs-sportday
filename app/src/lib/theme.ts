// House color themes — ใช้ใน (app)/layout.tsx
// headerBg  = สี background ของ header navbar
// accent    = สีปุ่ม / hover / badge หลัก
// accentHov = hover ของ accent
// ring      = สีขอบ active nav item
// logoSrc   = path ของโลโก้ใน /public/logos/

export type HouseTheme = {
  name: string;
  headerBg: string;
  headerBorder: string;
  accent: string;
  accentHov: string;
  logoSrc: string;
  logoName: string;
};

export const HOUSE_THEMES: Record<string, HouseTheme> = {
  red: {
    name: "สีแดง · LEONIX",
    headerBg: "#7f1d1d",
    headerBorder: "#991b1b",
    accent: "#ef4444",
    accentHov: "#dc2626",
    logoSrc: "/logos/red.jpg",
    logoName: "LEONIX",
  },
  blue: {
    name: "สีน้ำเงิน · RAVENCLAW",
    headerBg: "#1e3a5f",
    headerBorder: "#1d4ed8",
    accent: "#3b82f6",
    accentHov: "#2563eb",
    logoSrc: "/logos/blue.jpg",
    logoName: "RAVENCLAW",
  },
  green: {
    name: "สีเขียว · SLYTHERIN",
    headerBg: "#14532d",
    headerBorder: "#15803d",
    accent: "#22c55e",
    accentHov: "#16a34a",
    logoSrc: "/logos/green.jpg",
    logoName: "SLYTHERIN",
  },
  yellow: {
    name: "สีเหลือง · STARLIGHT",
    headerBg: "#78350f",
    headerBorder: "#92400e",
    accent: "#f59e0b",
    accentHov: "#d97706",
    logoSrc: "/logos/yellow.jpg",
    logoName: "STARLIGHT",
  },
};

// Default = ไม่มี house_color (admin, teacher, referee)
export const DEFAULT_THEME: HouseTheme = {
  name: "กีฬาสี PRS 2569",
  headerBg: "#1e1b4b",
  headerBorder: "#312e81",
  accent: "#6366f1",
  accentHov: "#4f46e5",
  logoSrc: "/logos/school.jpg",
  logoName: "PRS",
};

export function getTheme(house_color?: string | null): HouseTheme {
  if (house_color && house_color in HOUSE_THEMES) return HOUSE_THEMES[house_color];
  return DEFAULT_THEME;
}
