import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { stockCount, cartFrozenCounts } from './frozenStock';
import { FROZEN_PACKS, FROZEN_SLOTS, frozenDishes, frozenRows, makeFrozenBundle,
  selectedFrozenItems, selectionCount, validateFrozenRows } from './frozenMeals';

export function FrozenMealPicker({ dishes, onAdd, available, styles, Button, inventory, cart }) {
  const names = useMemo(() => frozenDishes(dishes), [dishes]);
  const [packCount, setPackCount] = useState(1);
  const [selections, setSelections] = useState({});
  const inCart = cartFrozenCounts(cart);
  const remaining = (name) => Math.max(0, stockCount(inventory.stock, name) - (inCart[name] || 0));
  const chosen = selectedFrozenItems(names, selections);
  const selected = chosen.reduce((sum, item) => sum + item.qty, 0);
  const pack = FROZEN_PACKS.find((item) => item.count === packCount);
  const bundle = makeFrozenBundle(names, selections, packCount);
  const stockValid = inventory.loaded && chosen.every(item => item.qty <= remaining(item.name));

  useEffect(() => {
    setSelections((old) => Object.fromEntries(Object.entries(old).filter(([name]) => names.includes(name))));
  }, [names]);

  return (
    <View>
      <Text style={frozenStyles.intro}>Välj själv och blanda dina favoriter</Text>
      <View style={[styles.types, { marginTop: 12 }]}>
        {FROZEN_PACKS.map((item) => <TouchableOpacity key={item.count}
          accessibilityRole="button" accessibilityLabel={`${item.count} matlådor, ${item.price} kronor`}
          accessibilityState={{ selected: packCount === item.count }}
          onPress={() => { if (packCount !== item.count) { setPackCount(item.count); setSelections({}); } }}
          style={[styles.type, frozenStyles.pack, packCount === item.count && frozenStyles.packActive]}>
          <Text style={[styles.typeText, frozenStyles.packText, packCount === item.count && frozenStyles.goldText]}>
            {item.count} {item.count === 1 ? 'matlåda' : 'matlådor'}{'\n'}{item.price} kr
          </Text>
        </TouchableOpacity>)}
      </View>
      <View style={frozenStyles.selectionHeader}>
        <Text style={frozenStyles.heading}>Välj {packCount} {packCount === 1 ? 'matlåda' : 'matlådor'}</Text>
        <Text style={frozenStyles.progress} accessibilityLiveRegion="polite">{selected} av {packCount} valda</Text>
      </View>
      {!inventory.loaded && <Text style={styles.muted}>Hämtar lagersaldo. Beställning öppnar när lagret har kontrollerats.</Text>}
      {!names.length && <Text style={styles.empty}>Inga frysta matlådor finns att välja just nu.</Text>}
      {names.map((name) => {
        const qty = selectionCount(selections, name);
        return <View key={name} style={frozenStyles.dish}>
          <Text style={frozenStyles.dishName}>{name}</Text>
          <Text style={{ color: remaining(name) ? '#596b7e' : '#a52e2e', fontWeight: '700' }}>
            {!inventory.loaded ? 'Lagersaldo kan inte bekräftas' : remaining(name) > 0 ? `${remaining(name)} kvar att välja` : 'Slut i lager'}
          </Text>
          <View style={styles.qty}>
            <TouchableOpacity style={[frozenStyles.control, frozenStyles.minus, !qty && frozenStyles.disabled]} disabled={!qty} accessibilityRole="button"
              accessibilityLabel={`Minska antal ${name}`} onPress={() => setSelections((old) => ({ ...old, [name]: Math.max(0, selectionCount(old, name) - 1) }))}>
              <Text style={frozenStyles.minusText}>−</Text>
            </TouchableOpacity>
            <Text style={frozenStyles.quantity}>{qty}</Text>
            <TouchableOpacity style={[frozenStyles.control, (!available || !inventory.loaded || qty >= remaining(name) || selected >= packCount) && frozenStyles.disabled]}
              disabled={!available || !inventory.loaded || qty >= remaining(name) || selected >= packCount} accessibilityRole="button"
              accessibilityLabel={`Öka antal ${name}`} onPress={() => setSelections((old) => {
                const total = selectedFrozenItems(names, old).reduce((sum, item) => sum + item.qty, 0);
                return !inventory.loaded || selectionCount(old, name) >= remaining(name) || total >= packCount ? old : { ...old, [name]: selectionCount(old, name) + 1 };
              })}>
              <Text style={frozenStyles.plusText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>;
      })}
      {!!names.length && <View style={frozenStyles.summary}>
        <Text style={frozenStyles.summaryTitle} accessibilityLiveRegion="polite">{selected} av {packCount} valda</Text>
        <Text style={frozenStyles.summaryText}>{selected < packCount ? `Välj ${packCount - selected} till` : 'Dina matlådor är valda'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Lägg i kundkorg, ${pack.price} kronor`}
          accessibilityState={{ disabled: !available || !bundle || !stockValid }}
          disabled={!available || !bundle || !stockValid} style={[frozenStyles.cartButton, (!available || !bundle || !stockValid) && frozenStyles.disabled]}
          onPress={() => { if (bundle && stockValid && onAdd(bundle)) setSelections({}); }}>
          <Text style={frozenStyles.cartButtonText}>Lägg i kundkorg · {pack.price} kr</Text>
        </TouchableOpacity>
        <Text style={frozenStyles.payment}>Betalning sker på restaurangen</Text>
      </View>}
      {!stockValid && selected > 0 && inventory.loaded && <Text style={styles.muted}>Lagret har ändrats. Minska antalet för de rätter som inte räcker.</Text>}
      <Text style={styles.muted}>Du kan välja flera av samma rätt.</Text>
    </View>
  );
}

export function FrozenMenuEditor({ dishes, onSave, styles, Button, inventory }) {
  const [rows, setRows] = useState(() => frozenRows(dishes));
  const [quantities, setQuantities] = useState(() => frozenRows(dishes).map(name => String(stockCount(inventory.stock, name))));
  const [expectedStock, setExpectedStock] = useState(inventory.stock);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!dirty) {
      setRows(frozenRows(dishes));
      setQuantities(frozenRows(dishes).map(name => String(stockCount(inventory.stock, name))));
      setExpectedStock(inventory.stock);
    }
  }, [dishes, dirty, inventory.stock]);

  async function save() {
    if (lock.current || !inventory.loaded) return;
    const error = validateFrozenRows(rows);
    if (rows.some((name, index) => name.trim() && (!/^\d{1,5}$/.test(quantities[index]) || Number(quantities[index]) > 99999))) {
      Alert.alert('Lagersaldo', 'Skriv ett helt antal mellan 0 och 99999 för varje maträtt.'); return;
    }
    if (error) { Alert.alert('Frysta matlådor', error); return; }
    if (frozenDishes(dishes).length > FROZEN_SLOTS) {
      Alert.alert('Frysta matlådor', 'Fler än 20 maträtter är redan sparade. Menyn kan inte ersättas med dessa 20 rader.'); return;
    }
    lock.current = true; setSaving(true);
    try {
      const items = rows.map((name, index) => ({ name: name.trim(), quantity: Number(quantities[index]) })).filter(item => item.name);
      const saved = await onSave(items.map(item => [item.name, 65]), Object.fromEntries(items.map(item => [item.name, item.quantity])), expectedStock);
      if (saved) setDirty(false);
    } catch {
      Alert.alert('Frysta matlådor', 'Menyn kunde inte sparas. Dina texter finns kvar. Försök igen.');
    } finally { lock.current = false; setSaving(false); }
  }

  return (
    <View>
      <Text style={styles.adminHeading}>Frysta matlådor – 20 maträtter</Text>
      <Text style={styles.muted}>Skriv de rätter som finns i frysen. Lämna övriga rader tomma. Skriv antal lådor i lager. 0 betyder Slut i lager. Antalet minskar när en beställning skickas. Bara ifyllda rätter visas för kunderna efter Spara.</Text>
      <Text style={styles.infoText}>1 matlåda 65 kr • 5 matlådor 290 kr • 10 matlådor 550 kr</Text>
      {!inventory.loaded && <Text style={styles.muted}>Lagersaldo kunde inte hämtas. Vänta innan du sparar.</Text>}
      {rows.map((name, index) => <View key={index}>
        <Text style={styles.label}>Maträtt {index + 1}</Text>
        <TextInput style={styles.field} value={name} maxLength={160} editable={!saving}
          accessibilityLabel={`Fryst maträtt ${index + 1}`} placeholder={`Maträtt ${index + 1}`}
          onChangeText={(text) => { setDirty(true); setRows((old) => old.map((value, slot) => slot === index ? text : value)); }} />
        <Text style={styles.label}>Antal i lager</Text>
        <TextInput style={styles.field} value={quantities[index]} keyboardType="number-pad" maxLength={5}
          editable={!saving && !!name.trim() && inventory.loaded} accessibilityLabel={`Antal i lager för maträtt ${index + 1}`}
          onChangeText={text => { setDirty(true); setQuantities(old => old.map((value, slot) => slot === index ? text.replace(/[^0-9]/g, '') : value)); }} />
      </View>)}
      <Button title={saving ? 'Sparar…' : 'Spara frysta matlådor'} disabled={saving || !inventory.loaded} onPress={save} />
      {dirty && <Text style={styles.muted}>Du har osparade ändringar.</Text>}
      {dirty && inventory.loaded && <Button title="Hämta aktuellt lager till raderna" outline onPress={() => {
        Alert.alert('Hämta aktuellt lager', 'Antalen i dina rader ersätts med aktuellt lager. Maträttsnamnen behålls.', [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Hämta lager', onPress: () => { setQuantities(rows.map(name => String(stockCount(inventory.stock, name.trim())))); setExpectedStock(inventory.stock); } },
        ]);
      }} /> }
    </View>
  );
}

const NAVY = '#142b45';
const GOLD = '#d6b46b';
const frozenStyles = StyleSheet.create({
  intro: { color: '#596b7e', fontSize: 17, lineHeight: 25, textAlign: 'center', marginBottom: 6 },
  pack: { paddingVertical: 16, minHeight: 76, justifyContent: 'center', borderColor: '#dce2e9', borderWidth: 2 },
  packActive: { backgroundColor: NAVY, borderColor: GOLD },
  packText: { fontSize: 15, lineHeight: 23, color: NAVY },
  goldText: { color: GOLD },
  selectionHeader: { marginTop: 10, marginBottom: 16, gap: 5 },
  heading: { color: NAVY, fontSize: 23, fontWeight: '900' },
  progress: { color: '#596b7e', fontSize: 16 },
  dish: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ee', padding: 16, marginBottom: 12, gap: 14 },
  dishName: { color: NAVY, fontSize: 19, lineHeight: 27, fontWeight: '800' },
  control: { backgroundColor: NAVY, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  minus: { backgroundColor: '#edf0f4' },
  minusText: { color: NAVY, fontSize: 28, fontWeight: '700' },
  plusText: { color: '#ffffff', fontSize: 28, fontWeight: '700' },
  quantity: { color: NAVY, fontWeight: '900', fontSize: 23, minWidth: 52, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  summary: { backgroundColor: NAVY, padding: 20, borderRadius: 20, marginTop: 12 },
  summaryTitle: { color: '#ffffff', fontSize: 25, fontWeight: '900' },
  summaryText: { color: '#dbe4ed', fontSize: 17, marginTop: 4, marginBottom: 18 },
  cartButton: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 17, paddingHorizontal: 10, minHeight: 54, alignItems: 'center' },
  cartButtonText: { color: NAVY, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  payment: { color: '#dbe4ed', fontSize: 13, marginTop: 14, textAlign: 'center' },
});
