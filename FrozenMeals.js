import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FROZEN_PACKS, FROZEN_SLOTS, frozenDishes, frozenRows, makeFrozenBundle,
  selectedFrozenItems, selectionCount, validateFrozenRows } from './frozenMeals';

export function FrozenMealPicker({ dishes, onAdd, available, styles, Button }) {
  const names = useMemo(() => frozenDishes(dishes), [dishes]);
  const [packCount, setPackCount] = useState(1);
  const [selections, setSelections] = useState({});
  const chosen = selectedFrozenItems(names, selections);
  const selected = chosen.reduce((sum, item) => sum + item.qty, 0);
  const pack = FROZEN_PACKS.find((item) => item.count === packCount);
  const bundle = makeFrozenBundle(names, selections, packCount);

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
      {!names.length && <Text style={styles.empty}>Inga frysta matlådor finns att välja just nu.</Text>}
      {names.map((name) => {
        const qty = selectionCount(selections, name);
        return <View key={name} style={frozenStyles.dish}>
          <Text style={frozenStyles.dishName}>{name}</Text>
          <View style={styles.qty}>
            <TouchableOpacity style={[frozenStyles.control, frozenStyles.minus, !qty && frozenStyles.disabled]} disabled={!qty} accessibilityRole="button"
              accessibilityLabel={`Minska antal ${name}`} onPress={() => setSelections((old) => ({ ...old, [name]: Math.max(0, selectionCount(old, name) - 1) }))}>
              <Text style={frozenStyles.minusText}>−</Text>
            </TouchableOpacity>
            <Text style={frozenStyles.quantity}>{qty}</Text>
            <TouchableOpacity style={[frozenStyles.control, (!available || selected >= packCount) && frozenStyles.disabled]}
              disabled={!available || selected >= packCount} accessibilityRole="button"
              accessibilityLabel={`Öka antal ${name}`} onPress={() => setSelections((old) => {
                const total = selectedFrozenItems(names, old).reduce((sum, item) => sum + item.qty, 0);
                return total >= packCount ? old : { ...old, [name]: selectionCount(old, name) + 1 };
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
          accessibilityState={{ disabled: !available || !bundle }}
          disabled={!available || !bundle} style={[frozenStyles.cartButton, (!available || !bundle) && frozenStyles.disabled]}
          onPress={() => { if (bundle && onAdd(bundle)) setSelections({}); }}>
          <Text style={frozenStyles.cartButtonText}>Lägg i kundkorg · {pack.price} kr</Text>
        </TouchableOpacity>
        <Text style={frozenStyles.payment}>Betalning sker på restaurangen</Text>
      </View>}
      <Text style={styles.muted}>Du kan välja flera av samma rätt.</Text>
    </View>
  );
}

export function FrozenMenuEditor({ dishes, onSave, styles, Button }) {
  const [rows, setRows] = useState(() => frozenRows(dishes));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  useEffect(() => { if (!dirty) setRows(frozenRows(dishes)); }, [dishes, dirty]);

  async function save() {
    if (lock.current) return;
    const error = validateFrozenRows(rows);
    if (error) { Alert.alert('Frysta matlådor', error); return; }
    if (frozenDishes(dishes).length > FROZEN_SLOTS) {
      Alert.alert('Frysta matlådor', 'Fler än 20 maträtter är redan sparade. Menyn kan inte ersättas med dessa 20 rader.'); return;
    }
    lock.current = true; setSaving(true);
    try {
      const saved = await onSave(rows.map((name) => name.trim()).filter(Boolean).map((name) => [name, 65]));
      if (saved) setDirty(false);
    } catch {
      Alert.alert('Frysta matlådor', 'Menyn kunde inte sparas. Dina texter finns kvar. Försök igen.');
    } finally { lock.current = false; setSaving(false); }
  }

  return (
    <View>
      <Text style={styles.adminHeading}>Frysta matlådor – 20 maträtter</Text>
      <Text style={styles.muted}>Skriv de rätter som finns i frysen. Lämna övriga rader tomma. Bara ifyllda rätter visas för kunderna efter Spara.</Text>
      <Text style={styles.infoText}>1 matlåda 65 kr • 5 matlådor 290 kr • 10 matlådor 550 kr</Text>
      {rows.map((name, index) => <View key={index}>
        <Text style={styles.label}>Maträtt {index + 1}</Text>
        <TextInput style={styles.field} value={name} maxLength={160} editable={!saving}
          accessibilityLabel={`Fryst maträtt ${index + 1}`} placeholder={`Maträtt ${index + 1}`}
          onChangeText={(text) => { setDirty(true); setRows((old) => old.map((value, slot) => slot === index ? text : value)); }} />
      </View>)}
      <Button title={saving ? 'Sparar…' : 'Spara frysta matlådor'} disabled={saving} onPress={save} />
      {dirty && <Text style={styles.muted}>Du har osparade ändringar.</Text>}
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
