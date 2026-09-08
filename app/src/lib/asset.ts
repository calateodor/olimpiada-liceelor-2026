/** Prefix a public-folder path with Vite's base URL (needed when the site is served from a sub-path, e.g. GitHub Pages). */
export const asset = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;
