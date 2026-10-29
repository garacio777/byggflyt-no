import type { InputSpec } from "./form-views.ts";

/** Field definitions for the account and catalog forms (kept as data so page code stays small). */
const secretType = "password";

export const SIGN_IN_FIELDS: readonly InputSpec[] = [
  { name: "email", label: "E-post", type: "email", autocomplete: "username", maxLength: 140 },
  { name: secretType, label: "Passord", type: secretType, autocomplete: "current-" + secretType, maxLength: 128 }
];

export const ACCOUNT_FIELDS: readonly InputSpec[] = [
  { name: "orgNr", label: "Organisasjonsnummer", maxLength: 11 },
  { name: "companyName", label: "Firmanavn", maxLength: 140 },
  { name: "email", label: "E-post", type: "email", autocomplete: "username", maxLength: 140 },
  { name: secretType, label: "Passord (minst 8 tegn)", type: secretType, autocomplete: "new-" + secretType, maxLength: 128 }
];

export const SECRET_FIELD = secretType;

export const EQUIPMENT_FIELDS: readonly InputSpec[] = [
  { name: "modelName", label: "Modell", maxLength: 140 },
  { name: "powertrainLabel", label: "Drivlinje", maxLength: 60 },
  { name: "dailyRateNok", label: "Dagpris NOK", type: "number", maxLength: 7 },
  { name: "weeklyRateNok", label: "Ukepris NOK", type: "number", maxLength: 8 },
  { name: "specsSummary", label: "Spesifikasjoner", maxLength: 280 }
];

export const ADMIN_SIGN_IN_FIELDS: readonly InputSpec[] = [
  { name: "username", label: "Brukernavn", autocomplete: "username", maxLength: 80 },
  { name: "accessCode", label: "Tilgangskode", type: secretType, autocomplete: "current-" + secretType, maxLength: 128 }
];

export const ADMIN_ROTATE_FIELDS: readonly InputSpec[] = [
  { name: "currentAccessCode", label: "Nåværende kode", type: secretType, autocomplete: "current-" + secretType, maxLength: 128 },
  { name: "newAccessCode", label: "Ny kode (minst 8 tegn)", type: secretType, autocomplete: "new-" + secretType, maxLength: 128 }
];

export const RESET_PARTNER_FIELDS: readonly InputSpec[] = [
  { name: "newPassword", label: "Nytt passord for bedriften (minst 8 tegn)", type: secretType, autocomplete: "new-" + secretType, maxLength: 128 }
];
