# Aktivera "Maten färdig"-notiser

Appen sparar kundens Expo pushadress på den order som skickas. När orderns
status ändras till `Maten färdig` skickar en databaswebhook händelsen till
Edge Function `order-ready-push`. Servern skickar notisen till just den orderns
telefon. Kunden kan fortfarande beställa om notiser inte tillåts.

Gör detta innan en ny iOS- eller Android-version publiceras:

1. Kör `supabase/migrations/20260927093000_order_push_token.sql` i **SQL Editor**
   för Supabase-projektet som appen använder (`ujmfvlktaxhefrqzkmdl`).
2. Skapa ett långt slumpmässigt värde för `ORDER_READY_WEBHOOK_SECRET` som
   **Edge Function secret**. Lägg inte värdet i appen eller GitHub.
3. Distribuera `supabase/functions/order-ready-push` till samma projekt.
   Funktionen har `verify_jwt = false` i `supabase/config.toml` och kontrollerar
   därför alltid den egna hemliga HTTP-headern.
4. Skapa en **Database Webhook** för tabellen `public.orders`, händelsen
   **UPDATE**, med Edge Function `order-ready-push` som mål. Lägg till headern
   `x-husman-webhook-secret` med exakt samma värde som i steg 2.
5. Konfigurera iOS pushcertifikat i EAS/Apple och Android FCM V1 i EAS/Google.
   Om Expo-kontot använder *Enhanced Security for Push Notifications*, skapa
   även en Expo access token och spara som Edge Function secret
   `EXPO_ACCESS_TOKEN`.
6. Bygg och installera en **ny** appversion. Testa med en fysisk telefon:
   tillåt notiser, lägg en order, kontrollera att `expo_push_token` sparats på
   ordern och tryck `Maten färdig` i adminvyn. Kontrollera att exakt en notis
   kommer. Kontrollera därefter också med nekad notisbehörighet.

Den nuvarande ägarkoden i App.js är klientkod och verifierar inte ägarens
identitet mot Supabase. Säkra admininloggning och databasens RLS innan
funktionen används i en offentlig produktionstjänst; annars kan en annan
klient potentiellt ändra orderstatus eller meny beroende på befintliga
databasregler.
