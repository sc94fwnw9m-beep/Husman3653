import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      <Text style={styles.infoText}>Välj antal matlådor och blanda dina favoriträtter.</Text>
      <View style={[styles.types, { marginTop: 12 }]}>
        {FROZEN_PACKS.map((item) => <TouchableOpacity key={item.count}
          accessibilityRole="button" accessibilityLabel={`${item.count} matlådor, ${item.price} kronor`}
          accessibilityState={{ selected: packCount === item.count }}
          onPress={() => { if (packCount !== item.count) { setPackCount(item.count); setSelections({}); } }}
          style={[styles.type, packCount === item.count && styles.typeActive]}>
          <Text style={[styles.typeText, packCount === item.count && styles.typeTextActive]}>
            {item.count} {item.count === 1 ? 'matlåda' : 'matlådor'}{'\n'}{item.price} kr
          </Text>
        </TouchableOpacity>)}
      </View>
      <Text style={styles.label} accessibilityLiveRegion="polite">Valt {selected} av {packCount} matlådor</Text>
      {!names.length && <Text style={styles.empty}>Inga frysta matlådor finns att välja just nu.</Text>}
      {names.map((name) => {
        const qty = selectionCount(selections, name);
        return <View key={name} style={styles.card}>
          <Text style={[styles.item, { flex: 1 }]}>{name}</Text>
          <View style={styles.qty}>
            <TouchableOpacity style={styles.small} disabled={!qty} accessibilityRole="button"
              accessibilityLabel={`Minska antal ${name}`} onPress={() => setSelections((old) => ({ ...old, [name]: Math.max(0, selectionCount(old, name) - 1) }))}>
              <Text style={styles.smallText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity style={[styles.small, selected >= packCount && { opacity: 0.4 }]}
              disabled={!available || selected >= packCount} accessibilityRole="button"
              accessibilityLabel={`Öka antal ${name}`} onPress={() => setSelections((old) => {
                const total = selectedFrozenItems(names, old).reduce((sum, item) => sum + item.qty, 0);
                return total >= packCount ? old : { ...old, [name]: selectionCount(old, name) + 1 };
              })}>
              <Text style={styles.smallText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>;
      })}
      {!!names.length && <Button title={`Lägg valda matlådor i kundkorgen • ${pack.price} kr`}
        disabled={!available || !bundle} onPress={() => {
          if (bundle && onAdd(bundle)) setSelections({});
        }} />}
      <Text style={styles.muted}>Välj exakt {packCount} {packCount === 1 ? 'matlåda' : 'matlådor'}. Du kan välja flera av samma rätt.</Text>
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
