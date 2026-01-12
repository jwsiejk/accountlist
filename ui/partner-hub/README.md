# Partner Hub (Energy Tool exports)

## Local development
1. `cd ui/partner-hub`
2. `npm install`
3. `npm run dev`
4. Visit `http://localhost:3000/tools/energy`
5. Use **Export…** to download PDF, PPTX, CSV, or JSON.

## API export examples
Use the JSON export payload as the POST body.

```bash
curl -X POST http://localhost:3000/api/exports/presales/pdf \
  -H "Content-Type: application/json" \
  -d @payload.json \
  --output energy-presales.pdf

curl -X POST http://localhost:3000/api/exports/presales/pptx \
  -H "Content-Type: application/json" \
  -d @payload.json \
  --output energy-presales.pptx
```
