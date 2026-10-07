# Quiz Bot Simulator

Static website (no build step, no backend). Original single `index.html` ko alag-alag files mein toda gaya hai -
logic/functions bilkul same hain, sirf files alag hain.

## Structure
```
index.html          -> sirf HTML (page ka dhancha) + scripts/styles ke links
css/                -> 5 CSS files (layout, chat, quiz cards, converter/groups, keyboard HUD)
js/00-*.js          -> template loader (neeche dekho)
js/01..24-*.js      -> main app (firebase, groups, chat, quiz engine, exports, PDF parsers)
js/30..34-*.js      -> extras (keyboard shortcuts, blitz/survival modes, stats, particles, mindmap PDF)
templates/          -> 4 bade templates (classroom css/js, 2 video players) - ab alag files hain
```
**Script ka order important hai** (`index.html` mein likha hai) - order mat badalna.

## Local run
```
npx serve .        # ya: python3 -m http.server 3000
```
(file:// se direct khol ke mat chalana, templates fetch hote hain - server chahiye.)

## Deploy
**Vercel:** GitHub repo import karo -> Framework "Other" -> Build Command khali, Output Directory khali -> Deploy.

**Render:** New + -> Static Site -> repo select -> Build Command khali, Publish Directory `.`
(ya `render.yaml` se Blueprint use karo).

## Update karte waqt
Browser purani file cache kar sakta hai (1 ghanta). Naya deploy dekhne ke liye Ctrl+Shift+R.
