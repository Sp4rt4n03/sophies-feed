# Pinterest-catalogusfeed — Sophies Label

TSV-datasource voor `pinterest.com/infosophieslabel`. Gebaseerd op de SOP van
2026-09-24, aangepast voor deze store en dit account.

**Status:** de bestanden zijn compleet. Wat rest is de repo aanmaken, het token
als secret zetten en de datasource in Pinterest toevoegen — zie "Wat jij moet
doen" onderaan.

## Wat er al is ingevuld

| | |
|---|---|
| Store | `yxf7rt-pg.myshopify.com` |
| Publiek domein | `sophieslabel.com` (geclaimd in Pinterest, naast `yxf7rt-pg`) |
| Merk in de feed | Sophies Label |
| Valuta | USD |
| Standaardcategorie | `Apparel & Accessories > Clothing > Dresses` |
| Out-of-stock | weggelaten |

## Omvang: de volledige catalogus

De feed bevat **alle actieve producten**. Op 2026-09-24 waren dat 770 producten
en 8.752 rijen (één per variant).

Twee knoppen als je het later wil doseren, in te stellen als repo-variable zonder
het script aan te raken:

- `MAX_PRODUCTS` — bovengrens, bv. `150`. De selectie is gesorteerd op product-id,
  dus verhogen **voegt toe** en haalt niets weg. Verlagen wél, en producten die in
  en uit een feed knipperen is zelf een slecht signaal — dus verlaag liever niet.
- `FEED_TAG` — alleen producten met die tag, bv. `bestseller`.

## Schema

Elke 6 uur (UTC), zoals de SOP. Plus een handmatige knop in de Actions-tab.
Pinterest haalt daarnaast zelf dagelijks op, dus de feed is altijd vers.

## Wat jij moet doen

1. **Repo aanmaken** op GitHub, deze map erin (zonder `secrets.local.ps1` —
   `.gitignore` regelt dat). De repo moet **publiek** zijn, anders is de
   feed-URL niet bereikbaar. Je productlijst en prijzen staan dan openbaar; voor
   een webshop is dat geen probleem, maar weet het.
2. **Secret zetten**: Settings → Secrets and variables → Actions → New
   repository secret → `SHOPIFY_ADMIN_TOKEN` = het `shpat_`-token uit
   `secrets.local.ps1`. Zet het token **nooit** in een bestand in de repo.
3. **Eén keer handmatig draaien**: Actions-tab → pinterest-feed → Run workflow.
   Controleer daarna dat `pinterest-feed.tsv` in de repo staat en klopt.
4. **Feed-URL** wordt dan:
   `https://raw.githubusercontent.com/<user>/<repo>/main/pinterest-feed.tsv`
5. **In Pinterest**: Zakelijk → Catalogussen → datasource toevoegen → die URL,
   tab-gescheiden, USD, land US. **Blijf van het Shopify-blok af** op de pagina
   "Koppelen met Pinterest" — dat is de automatische koppeling die bij Rosies
   ~99% van het bereik gaf en vrijwel zeker de ban.
6. **Wacht de eerste verwerking af** (kan uren duren) en lees de
   diagnostiek-tab. Los de warnings op vóór je het schema aanzet.

## Onderhoud

- De feed pakt automatisch nieuwe producten mee, dus de lopende Q4-import hoeft
  niet afgewacht te worden. Tijdens het opzetten groeide de store van 632 naar 656.
- Controleer de diagnostiek in Pinterest na elke grote catalogus-wijziging.
- Regenereer `rosies-overlap-handles.txt` als je `EXCLUDE_FILE` ooit aanzet.

## Open punt: AI-disclosure

De productfoto's van Sophies zijn deels AI-gegenereerd (Higgsfield). Bij je
handmatige pins zet je "door AI aangepast" plus het subvakje aan. **Een
catalogusfeed heeft daar geen veld voor**, dus honderden AI-beelden zouden
ongelabeld als product pins verschijnen. Niet-gelabeld AI-beeld is zelf een
ban-risico. Uitzoeken vóór stap 5: of Pinterest AI-disclosure op catalogusniveau
ondersteunt, of anders alleen producten met échte modelfoto's in de feed zetten
(de Lauren-import, tag `lauren-import-2026-09`, heeft echte foto's).
