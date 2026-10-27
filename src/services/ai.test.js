import { describe, expect, it } from "vitest";
import { classify, getChatSummary } from "./ai";

// Respuestas sin IA: el tipo de respuesta debe encajar con el mensaje.
describe("classify", () => {
  it.each([
    ["Hoy he dormido mejor", "positive"],
    ["Estoy contenta porque he conseguido el trabajo", "positive"],
    ["No ha estado mal el día", "positive"],
    ["No estoy bien", "difficult"],
    ["Me siento fatal", "difficult"],
    ["No he dormido nada bien", "tired"],
    ["Estoy agotada del trabajo", "tired"],
    ["Tengo mucha ansiedad por el examen de mañana", "anxiety"],
    ["Me siento triste y no sé por qué", "sadness"],
    ["Echo de menos a mi abuela", "sadness"],
    ["Me he enfadado con mi hermano", "anger"],
    ["Hola", "greeting"],
    ["Gracias por escucharme", "thanks"],
    ["Hoy fui al cine con mis amigos", "neutral"],
    ["Sueño con viajar a Japón", "neutral"],
  ])("«%s» → %s", (text, kind) => {
    expect(classify(text)).toBe(kind);
  });

  it("detecta frases de crisis (con o sin tildes)", () => {
    expect(classify("A veces pienso que no quiero vivir")).toBe("crisis");
    expect(classify("no puedo mas")).toBe("crisis");
    expect(classify("Me muero de risa con mi perro")).not.toBe("crisis");
  });
});

describe("getChatSummary (sin IA)", () => {
  it("usa el primer mensaje de la persona, recortado", async () => {
    const long = "a".repeat(120);
    const summary = await getChatSummary([
      { role: "ai", text: "Hola" },
      { role: "user", text: long },
      { role: "user", text: "otro" },
    ]);
    expect(summary).toHaveLength(88);
    expect(summary.endsWith("…")).toBe(true);
  });
});
