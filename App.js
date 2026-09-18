import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujmfvlktaxhefrqzkmdl.supabase.co';
const supabaseKey =
  'sb_publishable_zcu1n2OSXR7xlizKMHWHgw_IljNK7JS';

const supabase = createClient(supabaseUrl, supabaseKey);

const weeklyLunch = {
  Måndag: [
    'Piccata milanese med ris, tomatsås',
    'Hackad biff med stekt potatis, krämig paprikasås',
    'Panerad fiskfilé med kokt potatis, remouladsås',
  ],
  Tisdag: [
    'Raggmunk med stekt fläsk, lingonsylt eller löksås, kokt potatis',
    'Kyckling bourguignon med grönsaker, ris, vitlökskräm',
    'Panerad flundrafilé med kokt potatis, kall dillsås',
  ],
  Onsdag: [
    'Wallenbergare med potatismos, gräddsås, lingonsylt',
    'Korv stroganoff med paprika, lök, krämig chilisås, ris',
    'Panerad rödspättafilé med kokt potatis, avokadoröra',
  ],
  Torsdag: [
    'Fläskschnitzel med stekt potatis och sås',
    'Dagens husmanskost',
    'Dagens fisk',
  ],
  Fredag: [
    'Dagens husmanskost',
    'Dagens alternativ',
    'Dagens fisk',
  ],
};

const menu = {
  Pasta: [
    ['Penne Paradiso', 139],
    ['Con Pollo', 139],
    ['Carbonara', 139],
    ['Delizie', 139],
    ['Cannelloni', 139],
  ],
  Hamburgare: [
    ['Hemlagad högrevsburgare', 139],
    ['Chili Cheese Burger', 139],
    ['Texas BBQ Burger', 139],
  ],
  Pizza: [
    ['Kycklingpizza', 139],
    ['Calzone', 139],
  ],
  Kebab: [
    ['Kebabtallrik', 139],
    ['Kebabrulle', 139],
  ],
  Sallader: [
    ['Kycklingsallad', 139],
    ['Tonfisksallad', 139],
    ['Caesarsallad', 139],
  ],
  'Veganska maträtter': [
    ['Vegoburgare', 139],
    ['Vegoschnitzel', 139],
  ],
  Frukost: [
    ['Kokt ägg', 10],
    ['Fralla med ost', 25],
    ['Fralla med ost och skinka', 25],
    ['Fralla, kaffe och kokt ägg', 49],
    ['Kaffe', 25],
  ],
  'Frysta matlådor': [
    ['1 matlåda', 65],
    ['5 matlådor', 290],
    ['10 matlådor', 550],
  ],
};

const orderTypes = [
  ['Äta här', 139],
  ['Ta med', 129],
  ['Endast matlåda', 119],
];

const categories = [
  'Lunch',
  'Pasta',
  'Hamburgare',
  'Pizza',
  'Kebab',
  'Sallader',
  'Veganska maträtter',
  'Frysta matlådor',
  'Frukost',
  'Boka bord',
];

export default function App() {
  const [section, setSection] = useState('Lunch');
  const [day, setDay] = useState('Måndag');
  const [orderType, setOrderType] = useState('Äta här');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [message, setMessage] = useState('');

  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingGuests, setBookingGuests] = useState('2');

  const [admin, setAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
async function login() {
  if (!adminEmail || !adminPassword) {
    Alert.alert('Inloggning', 'Fyll i e-post och lösenord.');
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail.trim(),
    password: adminPassword,
  });

  if (error) {
    Alert.alert('Inloggning', 'Fel e-post eller lösenord.');
    return;
  }

  setAdmin(true);
  Alert.alert('Klart', 'Du är nu inloggad.');
}


  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const lunchPrice =
    orderTypes.find((item) => item[0] === orderType)?.[1] || 139;

  function addToCart(name, price) {
    setCart((old) => {
      const found = old.find(
        (item) => item.name === name && item.price === price
      );

      if (found) {
        return old.map((item) =>
          item.id === found.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...old,
        {
          id: Date.now() + Math.random(),
          name,
          price,
          qty: 1,
        },
      ];
    });
  }

  function changeQty(id, amount) {
    setCart((old) =>
      old
        .map((item) =>
          item.id === id
            ? { ...item, qty: item.qty + amount }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  async function sendOrder() {
    if (cart.length === 0) {
      Alert.alert('Kundkorgen är tom');
      return;
    }

    const { error } = await supabase.from('orders').insert({
      items: cart,
      message,
      total,
      status: 'Ny',
      created_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert(
        'Beställning',
        'Beställningen kunde inte skickas just nu.'
      );
      return;
    }

    Alert.alert(
      'Tack!',
      'Beställningen är skickad till restaurangen. Betalning sker på restaurangen.'
    );

    setCart([]);
    setMessage('');
    setShowCart(false);
  }

  async function bookTable() {
    if (!bookingDate || !bookingTime) {
      Alert.alert('Boka bord', 'Fyll i datum och tid.');
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      date: bookingDate,
      time: bookingTime,
      guests: Number(bookingGuests) || 2,
      status: 'Ny',
    });

    if (error) {
      Alert.alert(
        'Boka bord',
        'Bokningen kunde inte skickas just nu.'
      );
      return;
    }

    Alert.alert(
      'Boka bord',
      'Din bokningsförfrågan är skickad.'
    );
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      Alert.alert('Admin', 'Fel e-post eller lösenord.');
      return;
    }

    setAdmin(true);
  }

  if (showCart) {
    return (
      <SafeAreaView style={styles.page}>
        <StatusBar style="dark" />

        <ScrollView contentContainerStyle={styles.content}>
          <Header />

          <Text style={styles.heading}>Din beställning</Text>

          {cart.length === 0 && (
            <Text style={styles.empty}>
              Kundkorgen är tom.
            </Text>
          )}

          {cart.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.item}>
                  {item.name}
                </Text>

                <Text style={styles.muted}>
                  {item.price} kr × {item.qty}
                </Text>
              </View>

              <View style={styles.qty}>
                <TouchableOpacity
                  style={styles.small}
                  onPress={() => changeQty(item.id, -1)}
                >
                  <Text style={styles.smallText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.qtyText}>
                  {item.qty}
                </Text>

                <TouchableOpacity
                  style={styles.small}
                  onPress={() => changeQty(item.id, 1)}
                >
                  <Text style={styles.smallText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={styles.total}>
            Totalt: {total} kr
          </Text>

          <Text style={styles.label}>
            Meddelande till restaurangen
          </Text>

          <TextInput
            style={styles.messageInput}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Skriv meddelande här..."
          />

          <View style={styles.info}>
            <Text style={styles.infoText}>
              Betalning sker på restaurangen.
              Ingen kort- eller Swishbetalning i appen.
            </Text>
          </View>

          <AppButton
            title="Skicka beställning"
            onPress={sendOrder}
          />

          <AppButton
            title="Tillbaka till menyn"
            outline
            onPress={() => setShowCart(false)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Header />

        <View style={styles.info}>
          <Text style={styles.infoText}>
            Beställ i appen • Betala på restaurangen
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSection(category)}
              style={[
                styles.tab,
                section === category && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  section === category &&
                    styles.tabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {section === 'Lunch' && (
          <>
            <Text style={styles.heading}>
              Veckans lunchmeny
            </Text>

            <View style={styles.days}>
              {Object.keys(weeklyLunch).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setDay(item)}
                  style={[
                    styles.day,
                    day === item && styles.dayActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      day === item &&
                        styles.dayTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.types}>
              {orderTypes.map(([name, price]) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setOrderType(name)}
                  style={[
                    styles.type,
                    orderType === name &&
                      styles.typeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      orderType === name &&
                        styles.typeTextActive,
                    ]}
                  >
                    {name}
                    {'\n'}
                    {price} kr
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {weeklyLunch[day].map((name, index) => (
              <Food
                key={name}
                number={index + 1}
                name={name}
                price={lunchPrice}
                onAdd={() =>
                  addToCart(name, lunchPrice)
                }
              />
            ))}
          </>
        )}

        {menu[section] && (
          <>
            <Text style={styles.heading}>
              {section}
            </Text>

            {menu[section].map(([name, price]) => (
              <Food
                key={name}
                name={name}
                price={price}
                onAdd={() =>
                  addToCart(name, price)
                }
              />
            ))}
          </>
        )}

        {section === 'Boka bord' && (
          <>
            <Text style={styles.heading}>
              Boka bord
            </Text>

            <TextInput
              style={styles.field}
              value={bookingDate}
              onChangeText={setBookingDate}
              placeholder="Datum, t.ex. 2026-09-20"
            />

            <TextInput
              style={styles.field}
              value={bookingTime}
              onChangeText={setBookingTime}
              placeholder="Tid, t.ex. 12:30"
            />

            <TextInput
              style={styles.field}
              keyboardType="number-pad"
              value={bookingGuests}
              onChangeText={setBookingGuests}
              placeholder="Antal personer"
            />

            <AppButton
              title="Skicka bokning"
              onPress={bookTable}
            />
          </>
        )}

        <AppButton
          title={`Kundkorg (${cart.reduce(
            (sum, item) => sum + item.qty,
            0
          )}) • ${total} kr`}
          onPress={() => setShowCart(true)}
        />

        <View style={styles.adminBox}>
          <Text style={styles.adminTitle}>
            Restaurang / Admin
          </Text>

          {admin ? (
            <>
              <Text style={styles.success}>
                ✓ Inloggad
              </Text>

              <Text style={styles.muted}>
                Här kan restaurangen hantera meny
                och inkommande beställningar.
              </Text>

              <AppButton
                title="Logga ut"
                outline
                onPress={() => {
                  supabase.auth.signOut();
                  setAdmin(false);
                }}
              />
            </>
          ) : (
            <>
              <TextInput
                style={styles.field}
                autoCapitalize="none"
                keyboardType="email-address"
                value={adminEmail}
                onChangeText={setAdminEmail}
                placeholder="E-post"
              />

              <TextInput
                style={styles.field}
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Lösenord"
              />

              <AppButton
                title="Logga in"
                outline
                onPress={login}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>
        HUSMAN3653
      </Text>

      <Text style={styles.subtitle}>
        Husman Lunchrestaurang
      </Text>

      <Text style={styles.open}>
        Måndag–fredag 08:00–14:00
      </Text>
    </View>
  );
}

function Food({
  name,
  price,
  onAdd,
  number,
}) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.item}>
          {number ? `${number}. ` : ''}
          {name}
        </Text>

        <Text style={styles.muted}>
          {price} kr
        </Text>
      </View>

      <TouchableOpacity
        style={styles.add}
        onPress={onAdd}
      >
        <Text style={styles.addText}>
          + Lägg till
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AppButton({
  title,
  onPress,
  outline,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        outline && styles.buttonOutline,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          outline && styles.buttonTextOutline,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const BLUE = '#0865bd';

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f9ff',
  },

  content: {
    padding: 16,
    paddingBottom: 50,
  },

  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 18,
  },

  brand: {
    fontSize: 31,
    fontWeight: '900',
    color: BLUE,
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#173b60',
    marginTop: 3,
  },

  open: {
    fontSize: 13,
    color: '#64788e',
    marginTop: 5,
  },

  info: {
    backgroundColor: '#e5f1ff',
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },

  infoText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#17466f',
  },

  heading: {
    fontSize: 23,
    fontWeight: '900',
    color: '#102b49',
    marginVertical: 12,
  },

  categoryScroll: {
    marginBottom: 12,
  },

  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d2e2f1',
    marginRight: 8,
  },

  tabActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  tabText: {
    fontWeight: '700',
    color: '#315574',
  },

  tabTextActive: {
    color: '#ffffff',
  },

  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  day: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5e4f2',
    marginRight: 7,
    marginBottom: 7,
  },

  dayActive: {
    backgroundColor: '#163e68',
  },

  dayText: {
    fontWeight: '700',
    color: '#315574',
  },

  dayTextActive: {
    color: '#ffffff',
  },

  types: {
    flexDirection: 'row',
    marginBottom: 13,
  },

  type: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bdd5eb',
    marginRight: 6,
  },

  typeActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  typeText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '800',
    color: '#315574',
  },

  typeTextActive: {
    color: '#ffffff',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#e0eaf4',
  },

  item: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102b49',
    paddingRight: 8,
  },

  muted: {
    color: '#6b7f91',
    marginTop: 5,
  },

  add: {
    backgroundColor: '#e5f1ff',
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 10,
  },

  addText: {
    fontWeight: '900',
    color: BLUE,
  },

  button: {
    backgroundColor: BLUE,
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
  },

  buttonOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BLUE,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  buttonTextOutline: {
    color: BLUE,
  },

  qty: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  small: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e5f1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },

  smallText: {
    fontSize: 22,
    fontWeight: '800',
    color: BLUE,
  },

  qtyText: {
    fontWeight: '900',
    minWidth: 18,
    textAlign: 'center',
  },

  total: {
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'right',
    color: '#102b49',
    marginVertical: 14,
  },

  label: {
    fontWeight: '800',
    fontSize: 16,
    color: '#102b49',
    marginBottom: 7,
  },

  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbdceb',
    borderRadius: 13,
    padding: 13,
    fontSize: 16,
    marginBottom: 12,
  },

  field: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbdceb',
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
    marginBottom: 9,
  },

  empty: {
    textAlign: 'center',
    padding: 25,
    color: '#6b7f91',
  },

  adminBox: {
    marginTop: 28,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#eef5fc',
    borderWidth: 1,
    borderColor: '#d4e3f1',
  },

  adminTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102b49',
    marginBottom: 10,
  },

  success: {
    fontWeight: '900',
    color: '#167348',
    marginBottom: 8,
  },
});
