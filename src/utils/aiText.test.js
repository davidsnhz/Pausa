import { describe, expect, it } from "vitest";
import { buildChatMessages, buildSummaryMessages, cleanReply, cleanSummary, LOCAL_SYSTEM_PROMPT } from "./aiText";

describe("buildChatMessages", () => {
  it("pone las instrucciones primero y traduce los roles", () => {
    const msgs = buildChatMessages([
      { role: "ai", text: "Hola, ¿qué tal?" },
      { role: "user", text: "Bien" },
    ]);
    expect(msgs).toEqual([
      { role: "system", content: LOCAL_SYSTEM_PROMPT },
      { role: "assistant", content: "Hola, ¿qué tal?" },
      { role: "user", content: "Bien" },
    ]);
  });

  it("une dos mensajes seguidos del mismo rol y acaba en la persona", () => {
    const msgs = buildChatMessages([
      { role: "ai", text: "Hola" },
      { role: "user", text: "Uno" },
      { role: "user", text: "Dos" },
    ]);
    expect(msgs.slice(1)).toEqual([
      { role: "assistant", content: "Hola" },
      { role: "user", content: "Uno\n\nDos" },
    ]);
  });

  it("con una conversación larga se queda con lo más reciente", () => {
    const history = [];
    for (let i = 0; i < 60; i++) {
      history.push({ role: "user", text: `mensaje ${i} `.repeat(40) });
      history.push({ role: "ai", text: `respuesta ${i} `.repeat(40) });
    }
    history.push({ role: "user", text: "el último" });
    const msgs = buildChatMessages(history);
    const chars = msgs.slice(1).reduce((n, m) => n + m.content.length, 0);
    expect(chars).toBeLessThanOrEqual(2600 * 3);
    expect(msgs[msgs.length - 1]).toEqual({ role: "user", content: "el último" });
    expect(msgs.length).toBeLessThan(history.length);
  });
});

describe("buildSummaryMessages", () => {
  it("solo usa lo que escribió la persona", () => {
    const msgs = buildSummaryMessages([
      { role: "ai", text: "Hola" },
      { role: "user", text: "Hoy estoy cansada" },
      { role: "ai", text: "Te leo" },
    ]);
    expect(msgs[1].content).toContain("- Hoy estoy cansada");
    expect(msgs[1].content).not.toContain("Te leo");
  });

  it("sin mensajes de la persona no hay resumen", () => {
    expect(buildSummaryMessages([{ role: "ai", text: "Hola" }])).toBeNull();
  });
});

describe("cleanReply", () => {
  it("quita el razonamiento, el Markdown y las etiquetas de rol", () => {
    expect(cleanReply("<think>\n\n</think>\n\nPausa: **Te entiendo.**\n- Respira despacio.")).toBe(
      "Te entiendo. Respira despacio."
    );
  });

  it("mientras razona no enseña nada", () => {
    expect(cleanReply("<think>La persona dice", { partial: true })).toBe("");
    expect(cleanReply("Hola <thi", { partial: true })).toBe("Hola");
  });

  it("si se cortó por longitud, acaba en la última frase completa", () => {
    expect(cleanReply("Te entiendo. Es normal sentirse así. Quizá podrías", { truncated: true })).toBe(
      "Te entiendo. Es normal sentirse así."
    );
    expect(cleanReply("Sin punto final", { truncated: true })).toBe("Sin punto final");
  });
});

describe("cleanSummary", () => {
  it("una sola frase, sin comillas", () => {
    expect(cleanSummary('"Hoy hablaste del examen y del cansancio." Además…')).toBe(
      "Hoy hablaste del examen y del cansancio."
    );
  });

  it("recorta un resumen demasiado largo", () => {
    expect(cleanSummary("palabra ".repeat(40)).length).toBeLessThanOrEqual(140);
  });
});
