# Erbjudanden via appnotiser

Utgångspunkt: diagnostic/ios-startup-90, commit 101efa1704d097b4dbae4af91e8e22d35df382a6.
Senast publicerad uppdatering: 99879ba6-bee4-4824-87cc-2161f93275bd,
production, runtime 1.0.9, båda plattformar. App.js utgår från samma
tangentbordsfix (5081789741fbccc593bcfcc190a082e3928012df).

## Koppla in innan OTA-publicering

1. Kör supabase/migrations/20261010100500_offer_notifications.sql i det
   befintliga projektet qryynhzavlevuejpdtos. Migrationen skapar bara nya
   tabeller/funktioner. Den ändrar inga menyer, priser, order eller bokningar.
2. Publicera offer-notifications med verify_jwt=false. Funktionen verifierar
   ägarens JWT och befintliga is_restaurant_admin på servern innan utskick.
   SUPABASE_URL, SUPABASE_ANON_KEY och SUPABASE_SERVICE_ROLE_KEY finns normalt
   redan i Supabase Edge-miljön. Om Expo push security används krävs dess
   befintliga EXPO_ACCESS_TOKEN även här; skapa inte en ny nyckel i appen.
3. Verifiera anonymt: audience/send nekas. Kontrollera opt-in, opt-out,
   dubbeltryck och nekad ägarbehörighet med testtoken utan riktiga utskick.
4. Publicera via projektets befintliga Expo-uppdateringsflöde till production,
   runtime 1.0.9, Android och iOS. Ändra inte package.json/app.json eller
   native inställningar. Ingen ny build behövs för den här kodändringen.
5. På mobil: kontrollera att frivilligt kundval och adminredigerare visas,
   att avregistrering består efter omstart och att befintliga order fungerar.
   Skicka ett riktigt test endast till en uttryckligen godkänd testmottagare.

## Beteende

Kunder måste aktivt tacka ja till erbjudanden, separat från operativsystemets
notisbehörighet. Godkännandet sparas per Expo push-token. Avregistrering
stoppar framtida erbjudanden, inte ordernotiser. Ingen gammal ordertoken
kopieras till mottagarlistan. Inga telefonnummer samlas för denna funktion.

Endast ägare får se antalet mottagare och skicka. Texten granskas med en
bekräftelseruta före utskick. En beständig utskicksidentitet skyddar mot
dubbeltryck och nätverksretry. Vänta fem minuter mellan separata utskick.
Expo-acceptans räknas, aldrig garanterad leverans. Oklar status skickas inte
automatiskt igen. Mottagare kontrolleras igen före varje grupp om 100.
Gamla pushkvitton kontrolleras när ägaren uppdaterar mottagarantalet;
DeviceNotRegistered stänger av den berörda registreringen.

## Återställning

Återpublicera den tidigare Expo-gruppen om appkontrollen visar problem.
De nya tabellerna kan lämnas kvar och påverkar inte den tidigare appkoden.
