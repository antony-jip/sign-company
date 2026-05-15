import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../src/utils/templateRender";

describe("renderTemplate", () => {
  it("vervangt canonical {{naam}}-placeholder", () => {
    expect(renderTemplate("Hoi {{naam}}", { naam: "Jan" })).toBe("Hoi Jan");
  });

  it("vervangt legacy {naam}-placeholder", () => {
    expect(renderTemplate("Hoi {naam}", { naam: "Jan" })).toBe("Hoi Jan");
  });

  it("ondersteunt mix van syntaxes in één template", () => {
    expect(
      renderTemplate("Beste {{naam}}, factuur {nummer} van {{bedrag}}", {
        naam: "Jan",
        nummer: "F123",
        bedrag: "€100",
      }),
    ).toBe("Beste Jan, factuur F123 van €100");
  });

  it("laat onbekende placeholders staan", () => {
    expect(renderTemplate("Hoi {{xxx}}", { naam: "Jan" })).toBe("Hoi {{xxx}}");
    expect(renderTemplate("Hoi {xxx}", { naam: "Jan" })).toBe("Hoi {xxx}");
  });

  it("rendert lege string als value leeg is", () => {
    expect(renderTemplate("|{{naam}}|", { naam: "" })).toBe("||");
  });

  it("retourneert lege template ongewijzigd", () => {
    expect(renderTemplate("", { naam: "Jan" })).toBe("");
  });

  it("raakt niet-placeholder-curlies niet aan", () => {
    expect(renderTemplate("JSON: { not a var }", { not: "x" })).toBe(
      "JSON: { not a var }",
    );
  });

  it("vervangt herhaalde placeholder in één pass", () => {
    expect(renderTemplate("{{naam}} en nogmaals {{naam}}", { naam: "Jan" })).toBe(
      "Jan en nogmaals Jan",
    );
  });

  it("voert geen html-escaping uit op values", () => {
    expect(renderTemplate("Naam: {{naam}}", { naam: "<Jan> & Co" })).toBe(
      "Naam: <Jan> & Co",
    );
  });
});
