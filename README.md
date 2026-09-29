# ROLL BAR Vaučer

Digitalni sistem za ROLL BAR vaučere.

## Verzija 1

- provera koda
- status AKTIVAN / ISKORIŠĆEN / ISTEKAO
- automatski QR kod
- lokalni admin za testiranje
- mobilni responsive dizajn
- pripremljena Supabase šema

## Test

Otvoriti `index.html` ili uključiti GitHub Pages.

Lokalni admin koristi localStorage i služi samo za testiranje. Za produkciju treba povezati Supabase i sigurnu server-side/Edge Function administraciju. Tajni ključevi ne smeju biti u javnom repozitorijumu.

SQL se nalazi u `supabase/schema.sql`.