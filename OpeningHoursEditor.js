import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { HOURS_DAYS, validHours } from './opening-hours';
export default function OpeningHoursEditor({ client, current, notice, onSaved, styles, Button }) {
 const [draft,setDraft]=useState(null),[note,setNote]=useState(''),[saving,setSaving]=useState(false);
 const patch=(i,values)=>setDraft(old=>old.map((h,j)=>j===i?{...h,...values}:h));
 if(!draft)return <Button title="Ändra öppettider" outline onPress={()=>{setDraft(current.map(h=>({...h})));setNote(notice)}} />;
 const save=async()=>{
  if(saving)return;
  if(!validHours(draft)||note.length>1000){Alert.alert('Öppettider','Ange tider som HH:MM och stängning efter öppning. Meddelandet får vara högst 1 000 tecken.');return;}
  setSaving(true);
  try {
   const {data,error}=await client.from('restaurant_opening_hours').update({hours:draft,notice:note}).eq('id',1).select('id');
   if(error||!data?.length)throw error||Error();
   await onSaved?.();setDraft(null);Alert.alert('Sparat','Öppettiderna är sparade för appen och hemsidan. Visningen uppdateras automatiskt.');
  }catch{Alert.alert('Öppettider','Kunde inte spara. Dina ändringar finns kvar. Kontrollera att du är inloggad som ägare och försök igen.');}
  finally{setSaving(false)}
 };
 return <View><Text style={styles.adminHeading}>Öppettider</Text><Text style={styles.muted}>Samma tider gäller för appen och hemsidan. Catering och fest kan bokas utanför öppettiderna.</Text>
 {draft.map((h,i)=><View key={i}><Text style={styles.label}>{HOURS_DAYS[i]}</Text><Button title={h.closed?'Stängt • tryck för att öppna':'Öppet • tryck för att stänga'} outline onPress={()=>{if(!saving)patch(i,{closed:!h.closed})}} />{!h.closed&&<View><Text>Öppnar (HH:MM)</Text><TextInput accessibilityLabel={HOURS_DAYS[i]+' öppnar'} style={styles.field} value={h.open} editable={!saving} maxLength={5} onChangeText={open=>patch(i,{open})} /><Text>Stänger (HH:MM)</Text><TextInput accessibilityLabel={HOURS_DAYS[i]+' stänger'} style={styles.field} value={h.close} editable={!saving} maxLength={5} onChangeText={close=>patch(i,{close})} /></View>}</View>)}
 <Text style={styles.label}>Meddelande om helgdagar eller semester</Text><TextInput style={styles.field} value={note} editable={!saving} maxLength={1000} multiline onChangeText={setNote} />
 <Button title={saving?'Sparar…':'Spara öppettider'} onPress={save} /><Button title="Avbryt" outline onPress={()=>{if(!saving)setDraft(null)}} /></View>;
}
