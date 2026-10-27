import { describe, expect, it, vi } from "vitest";

// La racha que se muestra no necesita Firebase: se sustituye por un objeto vacío.
vi.mock("./firebase", () => ({ db: {} }));
const { currentStreak } = await import("./streak");

describe("currentStreak", () => {
  const now = new Date(2026, 9, 27, 10); // martes 27 de octubre

  it("sigue viva si el último check-in fue hoy o ayer", () => {
    expect(currentStreak({ streak: 4, lastCheckIn: "2026-10-27" }, now)).toBe(4);
    expect(currentStreak({ streak: 4, lastCheckIn: "2026-10-26" }, now)).toBe(4);
  });

  it("se rompe si pasó más de un día", () => {
    expect(currentStreak({ streak: 9, lastCheckIn: "2026-10-25" }, now)).toBe(0);
  });

  it("sin perfil o sin check-ins es 0", () => {
    expect(currentStreak(null, now)).toBe(0);
    expect(currentStreak({}, now)).toBe(0);
  });
});
