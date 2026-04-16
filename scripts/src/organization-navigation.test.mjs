import assert from "node:assert/strict";
import { getVisibleNavigationKeys } from "../../artifacts/verifactu/src/lib/navigation-rules.ts";
import { canManageCertificates, normalizeOrganizationMode } from "../../artifacts/verifactu/src/lib/org-mode.ts";

assert.equal(normalizeOrganizationMode("gestoria"), "asesoria");
assert.equal(normalizeOrganizationMode("asesoria"), "asesoria");

const asesoriaAdmin = getVisibleNavigationKeys({
  organizationType: "asesoria",
  role: "admin",
  hasTaxpayer: true,
});
assert.ok(asesoriaAdmin.includes("fiscalClients"));
assert.ok(asesoriaAdmin.includes("certificates"));
assert.ok(asesoriaAdmin.includes("usersPermissions"));
assert.ok(!asesoriaAdmin.includes("digitalCertificate"));

const asesoriaReadOnly = getVisibleNavigationKeys({
  organizationType: "asesoria",
  role: "readonly",
  hasTaxpayer: true,
});
assert.ok(asesoriaReadOnly.includes("certificates"));
assert.ok(!asesoriaReadOnly.includes("usersPermissions"));
assert.equal(canManageCertificates("readonly"), false);

const empresa = getVisibleNavigationKeys({
  organizationType: "empresa",
  role: "admin",
  hasTaxpayer: true,
});
assert.ok(empresa.includes("digitalCertificate"));
assert.ok(empresa.includes("fiscalData"));
assert.ok(!empresa.includes("fiscalClients"));
assert.ok(!empresa.includes("certificates"));

const autonomoWithoutTaxpayer = getVisibleNavigationKeys({
  organizationType: "autonomo",
  role: "owner",
  hasTaxpayer: false,
});
assert.ok(autonomoWithoutTaxpayer.includes("createTaxpayer"));

console.log("Organization navigation rules tests passed");
