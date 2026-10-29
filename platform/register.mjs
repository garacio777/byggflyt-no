// Runtime resolver for the platform servers (Node >= 22.18 native type stripping).
// The shared `src/` modules use Astro/Vite-style `./file.js` specifiers that point at
// `./file.ts` sources. Node does not rewrite those, so this synchronous hook retries a
// failed relative `.js` resolution with the `.ts` extension. No transpiler is involved.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const isRelativeJs =
        (specifier.startsWith("./") || specifier.startsWith("../")) && specifier.endsWith(".js");
      if (!isRelativeJs) {
        throw error;
      }
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
  }
});
