import React, { useState } from 'react';
import { Alert, Image, Text, TextInput, View, Button } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export function decodeBase64(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/=+$/, '');
  const output = new Uint8Array(Math.floor(clean.length * 6 / 8));
  let bits = 0, buffer = 0, index = 0;
  for (const char of clean) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Ogiltig bildfil.');
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) { bits -= 8; output[index++] = (buffer >> bits) & 255; }
  }
  return output.buffer;
}

export default function CatalogManager({ supabase, categories, images, onSaved, styles }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (error) { Alert.alert('Kunde inte spara', error.message || 'Försök igen.'); }
    finally { setBusy(false); }
  }

  async function requireOwner() {
    const { data, error } = await supabase.from('catalog_owners').select('user_id').limit(1);
    if (error || !data?.length) throw new Error('Logga in som ägare för att ändra bilder och kategorier.');
  }

  async function chooseImage(category) {
    await requireOwner();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [3, 2], quality: 0.75, base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) throw new Error('Bilden kunde inte läsas. Välj en annan bild.');
    const bytes = decodeBase64(asset.base64);
    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('Bilden är för stor. Välj en bild under 6 MB.');
    const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, bytes, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    const { data: saved, error } = await supabase.from('menu_categories')
      .upsert({ name: category, image_url: data.publicUrl }, { onConflict: 'name' }).select('name');
    if (error || !saved?.length) {
      await supabase.storage.from('menu-images').remove([path]);
      throw error || new Error('Du saknar behörighet att spara.');
    }
    await onSaved();
    Alert.alert('Sparat', 'Den nya bilden visas för kunderna.');
  }

  return <View>
    <Text style={styles.adminHeading}>Bilder och matkategorier</Text>
    <Text style={styles.muted}>Välj bilder från mobilen eller lägg till en matkategori. Ändringarna sparas för alla kunder.</Text>
    {categories.map(category => <View key={category} style={{ marginVertical: 10 }}>
      <Text style={styles.label}>{category}</Text>
      {!!images[category] && <Image source={typeof images[category] === 'string' ? { uri: images[category] } : images[category]} style={styles.sectionImage} />}
      <Button title={`Byt bild: ${category}`} disabled={busy} onPress={() => run(() => chooseImage(category))} />
    </View>)}
    <TextInput style={styles.field} placeholder="Namn på ny matkategori" accessibilityLabel="Ny matkategori" value={name} onChangeText={setName} maxLength={60} />
    <Button title={busy ? 'Sparar…' : 'Lägg till matkategori'} disabled={busy} onPress={() => run(async () => {
      await requireOwner();
      const trimmed = name.trim().replace(/\s+/g, ' ');
      if (!trimmed) throw new Error('Skriv ett namn på kategorin.');
      if (categories.some(value => value.toLocaleLowerCase('sv') === trimmed.toLocaleLowerCase('sv'))) throw new Error('Kategorin finns redan.');
      const { data, error } = await supabase.from('menu_categories').insert({ name: trimmed }).select('name');
      if (error || !data?.length) throw error || new Error('Kategorin kunde inte sparas.');
      setName(''); await onSaved(); Alert.alert('Sparat', 'Kategorin är tillagd. Lägg till maträtter under Lägg till maträtt.');
    })} />
  </View>;
}
