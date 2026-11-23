import { describe, expect, it } from "vitest";
import {
  buildChatMessages,
  buildSummaryMessages,
  cleanReply,
  cleanSummary,
  hasSentences,
  LOCAL_SYSTEM_PROMPT,
} from "./aiText";

describe("buildChatMessages", () => {
  it("pone las instrucciones primero, sin la bienvenida, y traduce los roles", () => {
    const msgs = buildChatMessages([
      { role: "ai", text: "Hola, Alex. Este es tu espacio." },
      { role: "user", text: "Estoy cansada" },
      { role: "ai", text: "Te leo." },
      { role: "user", text: "Mucho" },
    ]);
    expect(msgs).toEqual([
      { role: "system", content: LOCAL_SYSTEM_PROMPT },
      { role: "user", content: "Estoy cansada" },
      { role: "assistant", content: "Te leo." },
      { role: "user", content: "Mucho" },
    ]);
  });

  it("une dos mensajes seguidos del mismo rol y acaba en la persona", () => {
    const msgs = buildChatMessages([
      { role: "ai", text: "Hola" },
      { role: "user", text: "Uno" },
      { role: "user", text: "Dos" },
    ]);
    expect(msgs.slice(1)).toEqual([{ role: "user", content: "Uno\n\nDos" }]);
  });

  it("solo ve los últimos turnos, con los anteriores recortados", () => {
    const history = [{ role: "ai", text: "Bienvenida" }];
    for (let i = 0; i < 20; i++) {
      history.push({ role: "user", text: `mensaje ${i} `.repeat(100) });
      history.push({ role: "ai", text: `respuesta ${i}` });
    }
    const last = "lo último que escribo ".repeat(50).trim();
    history.push({ role: "user", text: last });
    const msgs = buildChatMessages(history).slice(1);
    expect(msgs.length).toBeLessThanOrEqual(5);
    expect(msgs[0].role).toBe("user");
    expect(msgs[msgs.length - 1]).toEqual({ role: "user", content: last });
    for (const m of msgs.slice(0, -1)) expect(m.content.length).toBeLessThanOrEqual(401);
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
    expect(cleanReply("Te leo <thi", { partial: true })).toBe("Te leo");
  });

  it("quita el saludo del principio (también mientras se escribe)", () => {
    expect(cleanReply("Hola, David. Lo que sientes es humano.")).toBe("Lo que sientes es humano.");
    expect(cleanReply("Hola, David.", { partial: true })).toBe("");
    expect(cleanReply("Hola.")).toBe("Hola.");
  });

  it("como mucho tres frases, también mientras se escribe", () => {
    const text = "Uno. Dos. Tres. Cuatro. Cinco.";
    expect(cleanReply(text)).toBe("Uno. Dos. Tres.");
    expect(cleanReply(text, { partial: true })).toBe("Uno. Dos. Tres.");
    expect(hasSentences("Uno. Dos. Tres")).toBe(false);
    expect(hasSentences("Uno. Dos. Tres.")).toBe(true);
    expect(cleanReply("Tengo 3.5 horas libres. Bien.")).toBe("Tengo 3.5 horas libres. Bien.");
  });

  it("si se cortó, acaba en la última frase completa", () => {
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
