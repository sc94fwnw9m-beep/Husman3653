import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { closureForDate, closureText, readClosures, stockholmDate, validateClosure } from './closures';

export function useClosedDays(client) {
  const [closures, setClosures] = useState([]);
  const [error, setError] = useState(false);
  const [today, setToday] = useState(stockholmDate);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const data = await readClosures(client);
      if (mounted.current) { setClosures(data); setError(false); setToday(stockholmDate()); }
      return data;
    } catch (cause) {
      if (mounted.current) { setError(true); setToday(stockholmDate()); }
      return null;
    }
  }, [client]);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 30000);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const channel = client.channel('restaurant-closures-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_closures' }, refresh)
      .subscribe();
    return () => {
      mounted.current = false;
      clearInterval(timer); foreground.remove(); client.removeChannel(channel);
    };
  }, [client, refresh]);
  return { closures, error, today, refresh };
}

export function ClosedDaysNotice({ closures, error, today, date, styles, refresh }) {
  const list = date ? [closureForDate(closures, date)].filter(Boolean)
    : closures.filter((item) => item.end_date >= today);
  if (!error && !list.length) return null;
  return (
    <View style={styles.info} accessibilityLiveRegion="polite">
      {error && (
        <TouchableOpacity onPress={refresh} accessibilityRole="button">
          <Text style={styles.infoText}>Öppettiderna kunde inte uppdateras. Tryck för att försöka igen.</Text>
        </TouchableOpacity>
      )}
      {list.map((item) => (
        <Text key={item.id} style={styles.infoText}>
          {item.start_date <= today && today <= item.end_date ? 'Stängt idag: ' : ''}{closureText(item)}
        </Text>
      ))}
    </View>
  );
}

function CalendarField({ label, value, onChange, styles }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setOpen(!open)} accessibilityRole="button">
        <Text style={styles.pickerValue}>{value || 'Välj datum'}</Text>
      </TouchableOpacity>
      {open && <DateTimePicker value={value ? new Date(`${value}T12:00:00`) : new Date()}
        mode="date" onChange={(event, selected) => {
          if (Platform.OS !== 'ios' || event.type === 'dismissed') setOpen(false);
          if (event.type !== 'dismissed' && selected) {
            const pad = (n) => String(n).padStart(2, '0');
            onChange(`${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`);
          }
        }} />}
      {open && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.pickerButton} onPress={() => setOpen(false)}>
          <Text style={styles.pickerValue}>Klart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ClosedDaysAdmin({ client, closures, refresh, styles, Button }) {
  const [expanded, setExpanded] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('Stängt');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const today = stockholmDate();

  function reset() { setEditing(null); setStart(''); setEnd(''); setMessage('Stängt'); }

  async function save() {
    if (mutation.current) return;
    const validation = validateClosure(start, end, message);
    if (validation) { Alert.alert('Stängda dagar', validation); return; }
    mutation.current = true; setBusy(true);
    try {
      const row = { start_date: start, end_date: end, message: message.trim() };
      const query = editing == null ? client.from('restaurant_closures').insert(row)
        : client.from('restaurant_closures').update(row).eq('id', editing);
      const { data, error } = await query.select('id');
      if (error || !data?.length) throw new Error('Kunde inte spara. Kontrollera din behörighet och försök igen.');
      reset();
      const loaded = await refresh();
      Alert.alert('Sparat', loaded
        ? 'Stängningsperioden är sparad. Den gäller till och med tilldatumet.'
        : 'Perioden är sparad, men listan kunde inte uppdateras. Tryck på Uppdatera listan.');
    } catch (cause) { Alert.alert('Stängda dagar', cause.message); }
    finally { mutation.current = false; setBusy(false); }
  }

  async function remove(item) {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      const { data, error } = await client.from('restaurant_closures').delete().eq('id', item.id).select('id');
      if (error || !data?.length) throw new Error('Perioden kunde inte tas bort.');
      if (editing === item.id) reset();
      await refresh();
    } catch (cause) { Alert.alert('Stängda dagar', cause.message); }
    finally { mutation.current = false; setBusy(false); }
  }

  return (
    <View>
      <Button title="Öppettider & stängda dagar" outline onPress={() => setExpanded(!expanded)} />
      {expanded && <>
        <Text style={styles.adminHeading}>Stängda dagar & semester</Text>
        <Text style={styles.muted}>Välj samma datum för en dag, eller från- och tilldatum för semester. Båda datumen ingår. Vanliga öppettider gäller igen efter perioden.</Text>
          <CalendarField label="Från datum" value={start} onChange={(value) => {
            setStart(value); if (!end || end < value) setEnd(value);
          }} styles={styles} />
          <CalendarField label="Till och med" value={end} onChange={setEnd} styles={styles} />
          <TextInput style={styles.field} value={message} onChangeText={setMessage} maxLength={160}
            placeholder="T.ex. Semesterstängt" />
          <Button title={busy ? 'Sparar…' : editing == null ? 'Spara stängda dagar' : 'Spara ändring'}
            disabled={busy} onPress={save} />
          {editing != null && <Button title="Avbryt ändring" outline disabled={busy} onPress={reset} />}
        <Button title="Uppdatera listan" outline onPress={refresh} />
        {closures.filter((item) => item.end_date >= today).map((item) => <View key={item.id} style={styles.orderCard}>
          <Text style={styles.orderTitle}>{item.message}</Text>
          <Text>{item.start_date}–{item.end_date} (till och med)</Text>
          <>
            <Button title="Ändra" outline disabled={busy} onPress={() => {
              setEditing(item.id); setStart(item.start_date); setEnd(item.end_date); setMessage(item.message);
            }} />
            <Button title="Ta bort stängning" outline disabled={busy} onPress={() => Alert.alert(
              'Ta bort stängning?', 'Vanliga öppettider kommer att gälla för perioden om ingen annan stängning finns.',
              [{ text: 'Avbryt', style: 'cancel' }, { text: 'Ta bort', style: 'destructive', onPress: () => remove(item) }],
            )} />
          </>
        </View>)}
      </>}
    </View>
  );
}
