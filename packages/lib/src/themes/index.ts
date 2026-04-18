import { darkTheme } from "./dark.css.js";
import { lightTheme } from "./light.css.js";
import { professionalLightTheme } from "./professional-light.css.js";

export { lightTheme, darkTheme, professionalLightTheme };

export type AuraTheme = "light" | "dark" | "professional-light" | "auto";

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  "professional-light": professionalLightTheme,
};
