import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECEIPTS = 'husman-lunch-draw-receipts-v1';
const localDate = value => value ? new Date(value).toLocaleString('sv-SE', { timeZone:'Europe/Stockholm', dateStyle:'short', timeStyle:'short' }) : '';
export function publicWinnerText(round) {
  const name = round.public_first_name ? String(round.winner_name || '').trim().split(/\s+/)[0] : '';
  return name ? `Grattis ${name}! 🎉 En vinnare av en lunch hos Husman är utsedd. Vill du också vara med? Delta gratis i appen – inget köp krävs.`
    : 'En lunchvinnare hos Husman är utsedd! 🎉 Vinnaren får besked separat. Delta gratis i nästa omgång i appen – inget köp krävs.';
}

export default function LunchPrizeDraw({ client, admin, styles, Button, offerRequest }) {
  const [expanded, setExpanded] = useState(false);
  const [round, setRound] = useState(null);
  const [owner, setOwner] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [publicName, setPublicName] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [code, setCode] = useState('');
  const [rules, setRules] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const run = async task => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e.message || 'Kunde inte slutföra. Försök igen.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const rpc = async (action, args={}) => {
    const { data, error: failure } = await client.rpc(action,args);
    if (failure) throw new Error(failure.code === 'PGRST202' ? 'Tävlingen är inte aktiverad ännu.' : failure.message);
    return data;
  };
  const load = async () => {
    if (admin) setOwner(await rpc('manage_lunch_draw',{p_action:'list'}));
    else {
      setRound(await rpc('lunch_draw_current'));
      const stored = JSON.parse(await AsyncStorage.getItem(RECEIPTS) || '[]');
      setReceipts(stored);
      const values = await Promise.all(stored.map(receipt => rpc('my_lunch_draw',{p_receipt:receipt})));
      setResults(values.filter(Boolean));
    }
    setClock(Date.now());
  };
  useEffect(() => {
    if (!expanded) return;
    run(load);
    const listener = AppState.addEventListener('change',state => { if (state==='active') run(load); });
    const timer = setInterval(() => run(load),60000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [expanded,admin]);
  const manage = (action,args={}) => run(async () => {
    setOwner(await rpc('manage_lunch_draw',{p_action:action,...args}));
  });
  const enter = () => run(async () => {
    if (!agreed || name.trim().length<2 || !phone.trim()) throw new Error('Fyll i namn och telefon och godkänn reglerna.');
    const receipt = await rpc('enter_lunch_draw',{p_round:round.id,p_name:name.trim(),p_phone:phone.trim(),p_public_name:publicName,p_rules:'lunch-v1'});
    const saved = [...receipts,receipt].slice(-60);
    await AsyncStorage.setItem(RECEIPTS,JSON.stringify(saved));
    setReceipts(saved);
    Alert.alert('Du är med!','Spara denna mobil för att se resultatet. Du deltar en gång i den här omgången.');
    await load();
  });
  const announce = r => Alert.alert('Publicera vinnarnotis?',publicWinnerText(r)+'\n\nSkickas till kunder som tackat ja till erbjudanden. Vinstkoden skickas separat.',[
    {text:'Avbryt',style:'cancel'}, {text:'Skicka notis',onPress:() => run(async () => {
      const result = await offerRequest({action:'send',id:r.id,title:'🎁 Husmans lunchvinnare',body:publicWinnerText(r)});
      if (result.campaign?.status !== 'completed') throw new Error('Utskicket är inte bekräftat. Tryck igen för att kontrollera samma utskick utan dubbla notiser.');
      setOwner(await rpc('manage_lunch_draw',{p_action:'announced',p_round:r.id}));
      Alert.alert('Utskick klart',`${result.campaign.accepted || 0} notiser mottagna av notistjänsten. Det garanterar inte leverans till varje telefon.`);
    })},
  ]);
  const winnerSms = r => run(async () => {
    const text = `Grattis ${r.winner_name}! Du har vunnit 1 dagens lunch att äta på plats hos Husman Lunchrestaurang. Gäller ${r.valid_from}–${r.valid_until}, öppna vardagar kl. 09–14. Öppna Husman-appen på mobilen där du deltog och visa vinsten och vinstkoden i kassan. Vinsten kan användas en gång.`;
    await Linking.openURL(`sms:${r.winner_phone}${Platform.OS==='ios'?'&':'?'}body=${encodeURIComponent(text)}`);
  });
  return <View style={styles.info}>
    <Button title={expanded ? 'Stäng lunchtävlingen' : '🎁 Vinn en lunch!'} onPress={() => setExpanded(!expanded)} />
    {expanded && <>
      <Text style={styles.heading}>{admin ? 'Lunchtävling · Ägarläge' : 'Din nästa lunch kan bli en vinst!'}</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.muted}>{error}</Text>}
      {busy && <Text style={styles.muted}>Arbetar…</Text>}
      <Button title="Uppdatera" outline onPress={() => run(load)} />
      {admin && owner && <>
        <Text style={styles.label}>Tävlingen är {owner.settings.enabled ? 'aktiv' : 'pausad'}</Text>
        <Button title={owner.settings.enabled ? 'Pausa nya deltaganden' : 'Aktivera tävlingen'} onPress={() => manage('settings',{p_enabled:!owner.settings.enabled})} />
        <Text style={styles.label}>Frekvens för nästa nya omgång</Text>
        <Text style={styles.muted}>Nu: {owner.settings.frequency==='weekly'?'En lunch varje vecka':'En lunch varje vardag'}. Pågående omgång behåller sina regler.</Text>
        <Button title="En lunch varje vecka" outline onPress={() => manage('settings',{p_frequency:'weekly'})} />
        <Button title="En lunch varje vardag" outline onPress={() => manage('settings',{p_frequency:'weekdays'})} />
        {(owner.rounds || []).map(r => <View style={styles.orderCard} key={r.id}>
          <Text style={styles.label}>Stänger {localDate(r.closes_at)}</Text>
          <Text>{r.entry_count} deltagare · {r.frequency==='weekly'?'Veckodragning':'Vardagsdragning'}</Text>
          {!r.drawn_at && new Date(r.closes_at).getTime()<=clock && Number(r.entry_count)>0 && <Button title="Dra vinnaren" onPress={() => Alert.alert('Dra vinnaren?','En vinnare väljs slumpmässigt. Resultatet sparas och kan inte dras om.',[{text:'Avbryt',style:'cancel'},{text:'Dra vinnaren',onPress:()=>manage('draw',{p_round:r.id})}])} />}
          {!!r.drawn_at && <>
            <Text style={styles.label}>Vinnare: {r.winner_name}</Text><Text>{r.winner_phone}</Text>
            <Text>Gäller {r.valid_from}–{r.valid_until}</Text>
            <Button title="Meddela vinnaren · Öppna SMS" onPress={() => winnerSms(r)} />
            <Button title={r.announced_at ? 'Vinnarnotis publicerad' : 'Publicera vinnarnotis'} outline onPress={() => !r.announced_at && announce(r)} />
            <Text>{r.redeemed_at ? '✓ Vinsten använd' : 'Vinsten ej använd'}</Text>
            {!r.redeemed_at && <>
              <TextInput accessibilityLabel="Vinstkod som kunden visar" style={styles.field} value={code} onChangeText={setCode} autoCapitalize="none" placeholder="Vinstkod från kundens mobil" />
              <Button title="Lös in en lunch" onPress={() => Alert.alert('Lös in vinsten?','Bekräfta först att kunden visar sin vinstkod i kassan.',[{text:'Avbryt',style:'cancel'},{text:'Lös in',onPress:()=>manage('redeem',{p_round:r.id,p_code:code.trim()})}])} />
            </>}
          </>}
        </View>)}
      </>}
      {!admin && <>
        <Text style={styles.infoText}>Gratis deltagande. Inget köp krävs. En vinnare får 1 dagens lunch att äta på plats.</Text>
        {round?.enabled && <>
          <Text style={styles.label}>{round.frequency==='weekly'?'En lunch varje vecka':'En lunch varje vardag'}</Text>
          <Text>Öppnar {localDate(round.opens_at)} · Stänger {localDate(round.closes_at)}</Text>
          <Text style={styles.muted}>Vinnaren dras av restaurangen efter stängning.</Text>
          {results.some(r=>r.round_id===round.id) ? <Text style={styles.success}>✓ Du deltar i denna omgång.</Text> : clock>=new Date(round.opens_at).getTime() && clock<new Date(round.closes_at).getTime() && <>
            <TextInput style={styles.field} accessibilityLabel="Ditt namn" placeholder="Ditt namn" value={name} onChangeText={setName} maxLength={80} />
            <TextInput style={styles.field} accessibilityLabel="Telefonnummer" placeholder="Telefonnummer" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} />
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Switch value={agreed} onValueChange={setAgreed} accessibilityLabel="Jag godkänner tävlingsreglerna" /><Text style={{flex:1}}>Jag godkänner tävlingsreglerna.</Text></View>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Switch value={publicName} onValueChange={setPublicName} accessibilityLabel="Mitt förnamn får visas om jag vinner, frivilligt" /><Text style={{flex:1}}>Mitt förnamn får visas om jag vinner (frivilligt).</Text></View>
            <Button title="Delta gratis" onPress={enter} />
          </>}
        </>}
        {round && !round.enabled && <Text>Tävlingen är pausad just nu.</Text>}
        {results.filter(r=>r.drawn).map(r=><View style={styles.orderCard} key={r.round_id}>
          <Text style={styles.label}>{r.winner?'🎉 Grattis! Du vann en lunch!':'Tack för att du deltog! Den här gången vann en annan deltagare.'}</Text>
          {r.winner && <><Text>Gäller {r.valid_from}–{r.valid_until}, öppna vardagar kl. 09–14.</Text><Text selectable>Vinstkod: {r.prize_code}</Text><Text>{r.redeemed?'Vinsten är använd.':'Visa koden i kassan. En användning.'}</Text></>}
        </View>)}
        <Button title={rules?'Dölj regler':'Läs tävlingsregler och personuppgifter'} outline onPress={()=>setRules(!rules)} />
        {rules && <Text style={styles.muted}>Arrangör: Husman Lunchrestaurang i Kungens Kurva. Deltagandet är gratis utan köptvång. En lott per telefonnummer och omgång. Stängningstid visas ovan, svensk tid. Ägaren drar en slumpmässig vinnare efter stängning; samma omgång kan inte dras om. Vinsten är en dagens lunch att äta på plats, värde 139 kr, giltig måndag–fredag nästa kalendervecka kl. 09–14 under restaurangens öppetdagar. Kan inte bytas mot pengar. Vinnaren får besked via telefon/SMS och kan se vinstkoden på denna mobil. Spara koden privat. Namn och telefon används för att hantera tävlingen och vinsten, inte för reklam. Ditt förnamn publiceras endast om du frivilligt tillåter det. Reklamnotiser väljer du separat i appens erbjudanden. Kontakta restaurangen för frågor eller begäran om att ta bort ditt deltagande före dragningen. Du behöver anmäla dig igen i varje ny omgång.</Text>}
      </>}
    </>}
  </View>;
}
