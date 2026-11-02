# Bilder, kategorier och svenska

Arbetsversionen byter standardbilden för Frysta matlådor och lägger till ägarverktyg för alla befintliga kategoribilder, inklusive startsidans lunchbild. Ägaren väljer foton från mobilen och kan skapa nya matkategorier. Bilder och kategorier lagras i Supabase och hämtas av kundernas appar vid start, återgång till appen och var 30:e sekund. Nya maträtter läggs till med befintlig menyredigering. Alla nya texter är svenska.

## Status 2026-11-02

Källan har uppdaterats mot driftsatt commit 7fdc4a6 med frysta matlådor, lagerhantering och stängda dagar. Versionen är 1.0.10. Databastabeller, bildbucket och ägarregistrering har skapats och verifierats i befintligt projekt. iOS- och Android-exporter och tester för frysta matlådor och stängda dagar har passerat. Native-byggen, enhetstest av bildväljaren och butikspublicering återstår.

## Ursprunglig installationschecklista

1. Kör `supabase-catalog.sql` i befintliga Supabase-projektet.
2. Skapa eller bekräfta ägarens konto i Supabase Auth. Lägg bara den verifierade ägarens UUID i `public.catalog_owners` via SQL-editorn. Den befintliga ägarinloggningen använder serververifierad kod och samma bekräftade Supabase-session för bilderna.
3. Kontrollera att befintliga `menu_items`-regler tillåter den ägaren att redigera menyn och nya kategorier. Utöka inte skrivrättigheter till anonyma kunder.
4. Installera beroenden, bygg och testa iOS och Android på riktiga enheter: bildväljare, avbrutet val, felaktig inloggning, för stor bild, ny kategori och ny maträtt. Kontrollera från en annan kundtelefon att sparade uppgifter syns.
5. Höj version/build enligt butikernas senast publicerade versioner. Källans app.json säger 1.0.7/build 6 och får inte antas motsvara butikernas nuvarande version.
6. Skicka nya binärer till butikerna. Bildväljaren tillför en native-modul; skicka inte denna version som enbart OTA-uppdatering. iOS deklarerar nu svenska med CFBundleLocalizations och CFBundleDevelopmentRegion; verifiera språkfältet efter Apples behandling.

## Begränsningar

Databasmigreringen och ägarkontot är nu klara. Butikspubliceringen är ännu inte klar. Den driftsatta kodbasens ägarinloggning verifieras via owner-login och is_restaurant_admin. De nya katalogfunktionerna använder samma Supabase-session och serverkontrollerade ägarrättigheter. Befintliga äldre funktioners åtkomstregler behöver granskas separat. Tidigare uppladdade bilder behålls för att inte bryta äldre klienters bildlänkar.

Generella verify:fixes-harnessen är föråldrad för driftversionens owner-login (saknar ownerLoginInProgress i testkontexten). Den kontrollen passerade inte. Tester för frysta matlådor samt stängda dagar inklusive PostgreSQL-integrationen passerade.

iOS-bygget hittade en befintlig filnamnskollision mellan FrozenMeals.js och frozenMeals.js på macOS. UI-filen döps till FrozenMealViews.js.
