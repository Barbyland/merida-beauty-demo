import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readExportedHome = () =>
  readFile(new URL("../out/index.html", import.meta.url), "utf8");

test("renders the MERIDA portfolio demo", async () => {
  const html = await readExportedHome();
  assert.match(html, /<html[^>]+lang="es"/i);
  assert.match(html, /<title>MERIDA Beauty Studio \| Demo web<\/title>/i);
  assert.match(html, /Demo de portfolio/);
  assert.match(html, /Simular reserva/);
  assert.match(html, /5491171079672/);
  assert.doesNotMatch(html, /Building your site|Starter Project/i);
});

test("discloses illustrative availability and prepares WhatsApp", async () => {
  const html = await readExportedHome();
  const component = await readFile(
    new URL("../app/MeridaDemo.tsx", import.meta.url),
    "utf8",
  );

  assert.match(html, /La reserva es una simulación y no genera un turno real/);
  assert.match(html, /Disponibilidad de ejemplo/);
  assert.match(component, /Confirmar por WhatsApp/);
  assert.match(component, /no crea un turno automático/);
  assert.match(component, /vi la demo web y quisiera consultar disponibilidad/);
});
