# UI sources

The app ships local assets in app/src/main/assets. `ui/app.js` is the readable original. JavaScript is transformed with esbuild 0.25.0 targeting Chrome 51 to avoid syntax errors on older Android WebViews. Modern WebView is still recommended for full CSS support.

```sh
npm install --no-save esbuild@0.25.0
npx esbuild ui/app.js --target=chrome51 --outfile=app/src/main/assets/app.js
```

Lucide 0.468.0 UMD is bundled with its license and transformed to the same target. Fonts are bundled. Native Java operations are only exposed through the restricted local WebViewAssetLoader origin. Web content must never navigate to remote sites while the JavaScript interface is enabled.
