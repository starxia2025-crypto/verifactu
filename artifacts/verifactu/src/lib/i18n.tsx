import { createContext, useContext, useEffect, useState } from "react";

export type Language = "es" | "en";

const STORAGE_KEY = "verifactu_language";

const translations = {
  es: {
    "app.currentContext": "Contexto actual",
    "app.menu": "Menú",
    "app.dashboard": "Panel",
    "app.organizations": "Organizaciones",
    "app.newOrganization": "Nueva organización",
    "app.createTaxpayer": "Crear contribuyente",
    "app.invoices": "Facturas",
    "app.clients": "Clientes",
    "app.products": "Productos y servicios",
    "app.settings": "Configuración",
    "app.logout": "Cerrar sesión",
    "app.language": "Idioma",
    "app.spanish": "Español",
    "app.english": "Inglés",
    "app.gestoriaOverview": "Resumen gestoría",
    "app.incidents": "Incidencias",
    "layout.sandboxBanner": "ENTORNO DE PRUEBAS - Las facturas se enviarán al entorno sandbox de la AEAT",

    "auth.loginTitle": "Iniciar sesión",
    "auth.registerTitle": "Crear cuenta",
    "auth.tagline": "Facturación fiscal española",
    "auth.email": "Email",
    "auth.password": "Contraseña",
    "auth.fullName": "Nombre completo",
    "auth.signIn": "Entrar",
    "auth.signingIn": "Entrando...",
    "auth.createAccount": "Crear cuenta",
    "auth.creatingAccount": "Creando cuenta...",
    "auth.noAccount": "¿No tienes cuenta?",
    "auth.hasAccount": "¿Ya tienes cuenta?",
    "auth.registerLink": "Regístrate",
    "auth.loginLink": "Inicia sesión",
    "auth.loginSuccess": "Sesión iniciada correctamente",
    "auth.loginFailed": "No se pudo iniciar sesión",
    "auth.checkCredentials": "Revisa tus credenciales e inténtalo de nuevo",
    "auth.registerSuccess": "Cuenta creada correctamente",
    "auth.registerFailed": "No se pudo crear la cuenta",
    "auth.nameMin": "El nombre debe tener al menos 2 caracteres",
    "auth.emailInvalid": "Introduce un email válido",
    "auth.passwordMin": "La contraseña debe tener al menos 6 caracteres",

    "dashboard.title": "Panel",
    "dashboard.setupTitle": "Completa la configuración",
    "dashboard.setupDescription": "Tu cuenta está lista, pero todavía necesitas crear un perfil fiscal antes de emitir facturas o usar VERI*FACTU.",
    "dashboard.setupHelp": "Crea el perfil fiscal de la organización desde la que vas a facturar. Después podrás usar el resto de secciones con datos reales.",
    "dashboard.viewOrganizations": "Ver organizaciones",
    "dashboard.openSettings": "Abrir configuración",
    "dashboard.totalInvoices": "Facturas totales",
    "dashboard.revenue": "Ingresos",
    "dashboard.aeatAccepted": "AEAT aceptadas",
    "dashboard.aeatErrors": "AEAT rechazadas/errores",

    "organizations.title": "Organizaciones",
    "organizations.typeAutonomo": "AUTÓNOMO",
    "organizations.typeEmpresa": "EMPRESA",
    "organizations.typeGestoria": "GESTORÍA",
    "organizations.nif": "NIF",
    "organizations.active": "Activa",
    "organizations.switch": "Cambiar a esta",
    "organizations.details": "Datos de la organización",
    "organizations.name": "Nombre de la organización",
    "organizations.type": "Tipo",
    "organizations.nifOptional": "NIF / CIF (opcional)",
    "organizations.create": "Crear organización",
    "organizations.creating": "Creando...",
    "organizations.created": "Organización creada correctamente",
    "organizations.createFailed": "No se pudo crear la organización",

    "taxpayer.title": "Crear perfil fiscal",
    "taxpayer.description": "Este perfil identifica a la entidad emisora de facturas VERI*FACTU dentro de {organization}.",
    "taxpayer.requiredTitle": "Se necesita una organización",
    "taxpayer.requiredDescription": "Necesitas una organización antes de crear un perfil fiscal.",
    "taxpayer.fiscalInfo": "Información fiscal",
    "taxpayer.legalName": "Razón social / nombre legal",
    "taxpayer.tradeName": "Nombre comercial",
    "taxpayer.documentType": "Tipo de documento",
    "taxpayer.nif": "NIF / CIF",
    "taxpayer.address": "Dirección",
    "taxpayer.city": "Ciudad",
    "taxpayer.province": "Provincia",
    "taxpayer.postalCode": "Código postal",
    "taxpayer.country": "País",
    "taxpayer.phone": "Teléfono",
    "taxpayer.defaultVatRate": "IVA por defecto (%)",
    "taxpayer.back": "Volver",
    "taxpayer.create": "Crear contribuyente",
    "taxpayer.creating": "Creando...",
    "taxpayer.created": "Perfil fiscal creado correctamente",
    "taxpayer.createFailed": "No se pudo crear el perfil fiscal",
    "taxpayer.reviewForm": "Revisa el formulario e inténtalo de nuevo.",

    "settings.title": "Configuración",
    "settings.taxpayerRequired": "Se necesita perfil fiscal",
    "settings.taxpayerRequiredDescription": "Crea primero un perfil fiscal para configurar el entorno AEAT y los datos de facturación.",
    "settings.taxpayerProfile": "Perfil fiscal",
    "settings.name": "Nombre",
    "settings.aeatEnvironment": "Entorno AEAT",
    "settings.sandbox": "Sandbox (pruebas)",
    "settings.production": "Producción",
    "settings.save": "Guardar configuración",
    "settings.saving": "Guardando...",
    "settings.saved": "Configuración guardada correctamente",
    "settings.saveFailed": "No se pudo guardar la configuración",

    "clients.title": "Clientes",
    "clients.new": "Nuevo cliente",
    "clients.createTitle": "Crear nuevo cliente",
    "clients.name": "Nombre / razón social",
    "clients.idType": "Tipo de documento",
    "clients.idNumber": "Número de documento",
    "clients.phone": "Teléfono",
    "clients.save": "Guardar cliente",
    "clients.saving": "Guardando...",
    "clients.created": "Cliente creado correctamente",
    "clients.createFailed": "No se pudo crear el cliente",
    "clients.loading": "Cargando clientes...",
    "clients.status": "Estado",
    "clients.active": "Activo",
    "clients.inactive": "Inactivo",
    "clients.empty": "No hay clientes. Pulsa \"Nuevo cliente\" para añadir uno.",

    "products.title": "Productos y servicios",
    "products.new": "Nuevo producto",
    "products.createTitle": "Crear nuevo producto",
    "products.name": "Nombre",
    "products.description": "Descripción",
    "products.unitPrice": "Precio unitario (€)",
    "products.vatRate": "IVA (%)",
    "products.save": "Guardar producto",
    "products.saving": "Guardando...",
    "products.created": "Producto creado correctamente",
    "products.createFailed": "No se pudo crear el producto",
    "products.loading": "Cargando productos...",
    "products.empty": "No hay productos.",

    "invoices.title": "Facturas",
    "invoices.create": "Crear factura",
    "invoices.createTitle": "Nueva factura",
    "invoices.taxpayerRequired": "Crea primero un contribuyente para poder emitir facturas.",
    "invoices.invoiceData": "Datos de la factura",
    "invoices.selectClient": "Seleccionar cliente",
    "invoices.noClient": "Sin cliente",
    "invoices.issueDate": "Fecha de emisión",
    "invoices.notes": "Notas",
    "invoices.line": "Línea de factura",
    "invoices.description": "Descripción",
    "invoices.quantity": "Cantidad",
    "invoices.unitPrice": "Precio unitario",
    "invoices.vatRate": "IVA",
    "invoices.discount": "Descuento",
    "invoices.emitImmediately": "Emitir inmediatamente",
    "invoices.saveDraft": "Guardar borrador",
    "invoices.saving": "Guardando...",
    "invoices.created": "Factura creada correctamente",
    "invoices.createFailed": "No se pudo crear la factura",
    "invoices.all": "Todas las facturas",
    "invoices.loading": "Cargando...",
    "invoices.number": "Número",
    "invoices.date": "Fecha",
    "invoices.client": "Cliente",
    "invoices.amount": "Importe",
    "invoices.status": "Estado",
    "invoices.draft": "Borrador",
    "invoices.emitted": "Emitida",
    "invoices.cancelled": "Anulada",
    "invoices.rectified": "Rectificada",
    "invoices.view": "Ver",
    "invoices.empty": "No hay facturas.",

    "common.email": "Email",
    "common.optional": "Opcional",
    "common.loading": "Cargando...",
    "common.notFound": "Página no encontrada",
    "common.notFoundHelp": "Puede que esta sección todavía no esté conectada al router.",
  },
  en: {
    "app.currentContext": "Current Context",
    "app.menu": "Menu",
    "app.dashboard": "Dashboard",
    "app.organizations": "Organizations",
    "app.newOrganization": "New Organization",
    "app.createTaxpayer": "Create Taxpayer",
    "app.invoices": "Invoices",
    "app.clients": "Clients",
    "app.products": "Products & Services",
    "app.settings": "Settings",
    "app.logout": "Logout",
    "app.language": "Language",
    "app.spanish": "Spanish",
    "app.english": "English",
    "app.gestoriaOverview": "Gestoria Overview",
    "app.incidents": "Incidents",
    "layout.sandboxBanner": "TEST ENVIRONMENT - Invoices will be sent to the AEAT sandbox",

    "auth.loginTitle": "Sign in",
    "auth.registerTitle": "Create account",
    "auth.tagline": "Premium Spanish tax invoicing",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.signIn": "Sign in",
    "auth.signingIn": "Signing in...",
    "auth.createAccount": "Create account",
    "auth.creatingAccount": "Creating account...",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.registerLink": "Register",
    "auth.loginLink": "Sign in",
    "auth.loginSuccess": "Signed in successfully",
    "auth.loginFailed": "Login failed",
    "auth.checkCredentials": "Check your credentials and try again",
    "auth.registerSuccess": "Account created successfully",
    "auth.registerFailed": "Could not create account",
    "auth.nameMin": "Name must be at least 2 characters",
    "auth.emailInvalid": "Invalid email address",
    "auth.passwordMin": "Password must be at least 6 characters",

    "dashboard.title": "Dashboard",
    "dashboard.setupTitle": "Complete the setup",
    "dashboard.setupDescription": "Your account is ready, but you still need a taxpayer profile before you can issue invoices or use VERI*FACTU.",
    "dashboard.setupHelp": "Create the fiscal profile for the organization you want to invoice from. After that, the rest of the sections will become usable with real data.",
    "dashboard.viewOrganizations": "View organizations",
    "dashboard.openSettings": "Open settings",
    "dashboard.totalInvoices": "Total Invoices",
    "dashboard.revenue": "Revenue",
    "dashboard.aeatAccepted": "AEAT Accepted",
    "dashboard.aeatErrors": "AEAT Rejected/Errors",

    "organizations.title": "Organizations",
    "organizations.typeAutonomo": "FREELANCER",
    "organizations.typeEmpresa": "COMPANY",
    "organizations.typeGestoria": "ACCOUNTING FIRM",
    "organizations.nif": "NIF",
    "organizations.active": "Active",
    "organizations.switch": "Switch to this",
    "organizations.details": "Organization Details",
    "organizations.name": "Organization Name",
    "organizations.type": "Type",
    "organizations.nifOptional": "NIF / CIF (Optional)",
    "organizations.create": "Create Organization",
    "organizations.creating": "Creating...",
    "organizations.created": "Organization created successfully",
    "organizations.createFailed": "Failed to create organization",

    "taxpayer.title": "Create Taxpayer Profile",
    "taxpayer.description": "This profile identifies the invoicing entity that will issue VERI*FACTU invoices inside {organization}.",
    "taxpayer.requiredTitle": "Organization required",
    "taxpayer.requiredDescription": "You need an organization before creating a taxpayer profile.",
    "taxpayer.fiscalInfo": "Fiscal information",
    "taxpayer.legalName": "Legal name",
    "taxpayer.tradeName": "Trade name",
    "taxpayer.documentType": "Document type",
    "taxpayer.nif": "NIF / CIF",
    "taxpayer.address": "Address",
    "taxpayer.city": "City",
    "taxpayer.province": "Province",
    "taxpayer.postalCode": "Postal code",
    "taxpayer.country": "Country",
    "taxpayer.phone": "Phone",
    "taxpayer.defaultVatRate": "Default VAT rate (%)",
    "taxpayer.back": "Back",
    "taxpayer.create": "Create taxpayer",
    "taxpayer.creating": "Creating...",
    "taxpayer.created": "Taxpayer profile created successfully",
    "taxpayer.createFailed": "Failed to create taxpayer",
    "taxpayer.reviewForm": "Please review the form and try again.",

    "settings.title": "Settings",
    "settings.taxpayerRequired": "Taxpayer profile required",
    "settings.taxpayerRequiredDescription": "Create a taxpayer profile first to configure AEAT environment and invoicing data.",
    "settings.taxpayerProfile": "Taxpayer Profile",
    "settings.name": "Name",
    "settings.aeatEnvironment": "AEAT Environment",
    "settings.sandbox": "Sandbox (Testing)",
    "settings.production": "Production",
    "settings.save": "Save Settings",
    "settings.saving": "Saving...",
    "settings.saved": "Settings updated successfully",
    "settings.saveFailed": "Failed to update settings",

    "clients.title": "Clients",
    "clients.new": "New Client",
    "clients.createTitle": "Create New Client",
    "clients.name": "Name / Company Name",
    "clients.idType": "ID Type",
    "clients.idNumber": "ID Number",
    "clients.phone": "Phone",
    "clients.save": "Save Client",
    "clients.saving": "Saving...",
    "clients.created": "Client created successfully",
    "clients.createFailed": "Failed to create client",
    "clients.loading": "Loading clients...",
    "clients.status": "Status",
    "clients.active": "Active",
    "clients.inactive": "Inactive",
    "clients.empty": "No clients found. Click \"New Client\" to add one.",

    "products.title": "Products & Services",
    "products.new": "New Product",
    "products.createTitle": "Create New Product",
    "products.name": "Name",
    "products.description": "Description",
    "products.unitPrice": "Unit Price (€)",
    "products.vatRate": "VAT Rate (%)",
    "products.save": "Save Product",
    "products.saving": "Saving...",
    "products.created": "Product created successfully",
    "products.createFailed": "Failed to create product",
    "products.loading": "Loading products...",
    "products.empty": "No products found.",

    "invoices.title": "Invoices",
    "invoices.create": "Create Invoice",
    "invoices.createTitle": "New invoice",
    "invoices.taxpayerRequired": "Create a taxpayer first before issuing invoices.",
    "invoices.invoiceData": "Invoice data",
    "invoices.selectClient": "Select client",
    "invoices.noClient": "No client",
    "invoices.issueDate": "Issue date",
    "invoices.notes": "Notes",
    "invoices.line": "Invoice line",
    "invoices.description": "Description",
    "invoices.quantity": "Quantity",
    "invoices.unitPrice": "Unit price",
    "invoices.vatRate": "VAT",
    "invoices.discount": "Discount",
    "invoices.emitImmediately": "Emit immediately",
    "invoices.saveDraft": "Save draft",
    "invoices.saving": "Saving...",
    "invoices.created": "Invoice created successfully",
    "invoices.createFailed": "Failed to create invoice",
    "invoices.all": "All Invoices",
    "invoices.loading": "Loading...",
    "invoices.number": "Number",
    "invoices.date": "Date",
    "invoices.client": "Client",
    "invoices.amount": "Amount",
    "invoices.status": "Status",
    "invoices.draft": "Draft",
    "invoices.emitted": "Emitted",
    "invoices.cancelled": "Cancelled",
    "invoices.rectified": "Rectified",
    "invoices.view": "View",
    "invoices.empty": "No invoices found.",

    "common.email": "Email",
    "common.optional": "Optional",
    "common.loading": "Loading...",
    "common.notFound": "Page not found",
    "common.notFoundHelp": "Did you forget to add the page to the router?",
  },
} as const;

type TranslationKey = keyof typeof translations.es;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : "es";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "es" ? "es-ES" : "en";
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  };

  const t = (key: TranslationKey, variables?: Record<string, string | number>) => {
    let value: string = translations[language][key] ?? translations.es[key] ?? key;

    if (variables) {
      Object.entries(variables).forEach(([name, replacement]) => {
        value = value.replaceAll(`{${name}}`, String(replacement));
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
