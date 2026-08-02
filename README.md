# IBC Ahmedabad — International Business Centre

Marketing site for the virtual office and GST registration address business operated by
**Jai Shivmayam Trading Company Private Limited** (formerly Jai-Shivmaya Trading Company
Private Limited) at 424–425, Fourth Floor, Iscon Emporio, Satellite, Ahmedabad – 380015.

## Stack

Static HTML, CSS and vanilla JavaScript. No framework, no build step, no dependencies.

```
index.html          Single-page site
css/style.css       Design system + all styles
js/main.js          Scroll animations, gallery, nav, accordion
assets/img/         Photography
assets/video/       Walkthrough video
serve.js            Local dev server (not used in production)
```

## Run locally

```bash
node serve.js       # → http://localhost:4321
```

Or open `index.html` directly in a browser.

## Deploy

Static site — no build command, no output directory. Serve the repository root.

## Notes

- Fonts load from Google Fonts (Fraunces + Inter Tight).
- All motion respects `prefers-reduced-motion`.
- Under Section 12 of the Companies Act, the former company name must be displayed
  alongside the current name until **26 March 2027**. It is in the footer — do not remove it.
- Prices shown are exclusive of 18% GST. Statutory documentation charges are passed
  through at actuals.
