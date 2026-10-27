import { describe, expect, it } from "vitest";
import { currentWeek, dateKey, longDate } from "./date";
import { moodScore, monthSummary } from "./mood";

describe("fechas", () => {
  it("dateKey usa la fecha local", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("la semana va de lunes a domingo, también si hoy es domingo", () => {
    const week = currentWeek(new Date(2026, 10, 1)); // domingo 1 de noviembre
    expect(week.map((d) => d.key)).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
    expect(week[0].label).toBe("Lu");
  });

  it("longDate da el título de un día", () => {
    expect(longDate("2026-10-26")).toBe("Lunes 26 de octubre");
  });
});

describe("ánimo", () => {
  it("puntúa los 5 emojis y descarta el resto", () => {
    expect(moodScore("😢")).toBe(1);
    expect(moodScore("😁")).toBe(5);
    expect(moodScore("??")).toBeNull();
  });

  it("resume solo el mes pedido", () => {
    const moods = {
      "2026-10-01": "🙂",
      "2026-10-02": "😁",
      "2026-10-03": "??", // cuenta como día registrado, no para la media
      "2026-09-30": "😢",
    };
    const s = monthSummary(moods, 2026, 9);
    expect(s.days).toBe(3);
    expect(s.scored).toBe(2);
    expect(s.avg).toBe(4.5);
    expect(s.counts).toEqual([0, 0, 0, 1, 1]);
  });

  it("sin datos no hay media", () => {
    expect(monthSummary(null, 2026, 9)).toEqual({ days: 0, counts: [0, 0, 0, 0, 0], avg: null, scored: 0 });
  });
});
