import React, { useEffect, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import * as FileSystem from 'expo-file-system/legacy';
import { updatePolicy } from './update-policy';

const STORE = {
  ios: 'https://apps.apple.com/se/app/id6810671155',
  android: 'https://play.google.com/store/apps/details?id=se.husman3653.lunchrestaurang',
};
// expo-file-system is already bundled by Expo SDK 54 in the existing binaries.
export function useAppUpdateNotice(client) {
  const [notice, setNotice] = useState(null);
  const [opening, setOpening] = useState(false);
  const [linkError, setLinkError] = useState(false);
  useEffect(() => {
    if (!STORE[Platform.OS] || !FileSystem.documentDirectory) return;
    let active = true, checking = false, lastCheck = 0, sessionSeen = null;
    const path = `${FileSystem.documentDirectory}husman-update-notice-${Platform.OS}.txt`;
    async function check() {
      if (!active || checking || Date.now() - lastCheck < 300000) return;
      checking = true; lastCheck = Date.now();
      try {
        // runtimeVersion uses appVersion, so OTA JS never pretends the binary was updated.
        const installed = Updates.runtimeVersion;
        const { data, error } = await client.from('app_releases')
          .select('available_version,minimum_version,published').eq('platform', Platform.OS).maybeSingle();
        if (error || !active) return;
        let seen = sessionSeen;
        if (!seen) { try { seen = await FileSystem.readAsStringAsync(path); } catch {} }
        const decision = updatePolicy(installed, data, seen);
        if (!decision || !active) return;
        sessionSeen = decision.version;
        if (!decision.required) {
          // Remember before showing: the same optional release never nags on every launch.
          try { await FileSystem.writeAsStringAsync(path, decision.version); } catch {}
        }
        if (active) setNotice(decision);
      } catch {} finally { checking = false; }
    }
    check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => { active = false; subscription.remove(); };
  }, [client]);

  async function openStore() {
    setOpening(true); setLinkError(false);
    try {
      await Linking.openURL(STORE[Platform.OS]);
      if (!notice.required) setNotice(null);
    } catch { setLinkError(true); } finally { setOpening(false); }
  }
  if (!notice) return null;
  return (
    <Modal visible transparent animationType="fade" accessibilityViewIsModal
      onRequestClose={() => { if (!notice.required) setNotice(null); }}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {notice.required ? 'Uppdatera appen för att fortsätta' : 'En ny version finns'}
          </Text>
          <Text style={styles.body}>{notice.required
            ? 'Den här versionen behöver uppdateras för att appen ska fungera. Uppdatera Husman Lunchrestaurang i appbutiken.'
            : 'En ny version av Husman Lunchrestaurang finns i appbutiken.'}</Text>
          {linkError && <Text style={styles.body}>Appbutiken kunde inte öppnas. Försök igen eller sök efter Husman Lunchrestaurang i appbutiken.</Text>}
          <Pressable accessibilityRole="button" disabled={opening} onPress={openStore} style={styles.primary}>
            <Text style={styles.primaryText}>{opening ? 'Öppnar…' : 'Uppdatera'}</Text>
          </Pressable>
          {!notice.required && <Pressable accessibilityRole="button" onPress={() => setNotice(null)} style={styles.later}>
            <Text style={styles.laterText}>Senare</Text>
          </Pressable>}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { color: '#132f45', fontSize: 23, fontWeight: '800', marginBottom: 12 },
  body: { color: '#425c6d', fontSize: 17, lineHeight: 25, marginBottom: 20 },
  primary: { backgroundColor: '#132f45', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#d4b363', fontSize: 18, fontWeight: '800' },
  later: { padding: 16, alignItems: 'center' }, laterText: { color: '#425c6d', fontSize: 17 },
});
