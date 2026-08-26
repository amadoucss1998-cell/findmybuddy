// Builds dist-artifact.html — a single self-contained HTML file with all
// CSS and JS inlined. Handy for embedding, previewing, or hosting anywhere
// a single file is easiest. Run: node build-singlefile.mjs
import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync(new URL("./assets/css/styles.css", import.meta.url), "utf8");
const data = readFileSync(new URL("./assets/js/data.js", import.meta.url), "utf8");
const store = readFileSync(new URL("./assets/js/store.js", import.meta.url), "utf8");
const app = readFileSync(new URL("./assets/js/app.js", import.meta.url), "utf8");

const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8" />
<title>Find My Buddy</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
${css}
</style>
</head>
<body>
<div id="app" aria-live="polite"></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<div id="modal-root"></div>
<script>
${data}
</script>
<script>
${store}
</script>
<script>
${app}
</script>
</body>
</html>`;

writeFileSync(new URL("./dist-artifact.html", import.meta.url), html);
console.log("Wrote dist-artifact.html (" + html.length + " bytes)");
