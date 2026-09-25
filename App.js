   import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
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
import DateTimePicker from '@react-native-community/datetimepicker';

const supabaseUrl = 'https://ujmfvlktaxhefrqzkmdl.supabase.co';
const supabaseKey =
  'sb_publishable_zcu1n20SXR7xlizKMHWHgw_I1jNK7JS';

const supabase = createClient(supabaseUrl, supabaseKey);
const OWNER_CODE = '3653';

const DEFAULT_LUNCH = {
  Måndag: [
    'Grillad fläsknoisette med stekt potatis, champinjonsås',
    'Köttfärsbiff med kokt potatis, gräddsås, lingonsylt',
    'Panerad fiskfilé med kokt potatis, kall dillsås',
  ],
  Tisdag: [
    'Raggmunk med stekt fläsk, lingonsylt eller löksås, kokt potatis',
    'Kycklingschnitzel med stekt potatis, rödvinssås, ärtor',
    'Fiskgratäng med räkor, grönsaker, dillsås, kokt potatis',
  ],
  Onsdag: [
    'Kalvfärslimpa med potatismos, gräddsås, lingonsylt',
    'Biff Stroganoff med paprika, lök, krämig chilisås, ris',
    'Panerad fiskfilé med kokt potatis, dansk remouladsås',
  ],
  Torsdag: [
    'Grillad fläskfilé med potatisgratäng, rosmarinsås',
    'Kycklinggryta med grönsaker, currysås, ris',
    'Panerad kummel med kokt potatis, limesås',
    'Idag bjuder vi på pannkakor! Självklart med sylt och grädde!',
  ],
  Fredag: [
    'Grillad entrecôte med stekt potatis, rödvinssås, bearnaisesås',
    'Kalops med kalvkött, kokt potatis, rödbetor',
    'Panerad torskfilé med kokt potatis, remouladsås',
  ],
};

const MENU = {
Pasta: [
  ['Penne paradiso med strimlad biff, champinjoner, vitlök, gräddsås, ost', 139],
  ['Con Pollo med strimlad kycklingfilé, krämig chilisås, ost', 139],
  ['Spaghetti Carbonara med gräddsås, svart peppar, äggula, ost', 139],
],
 
 Hamburgare: [
  ['Hemlagad högrevsburgare med pommes, bearnaisesås', 139],
  ['Chili cheese burger med pommes, bearnaisesås', 139],
  ['Texas BBQ Burger med bacon, pommes, bearnaisesås', 139],
  ['Smash burger med pommes, bearnaisesås', 139],
],
Tips: [
  ['Falukorv med stekt potatis, stekt ägg', 139],
  ['Hälsotallrik med kycklingfilé, keso, avokado, sweet chili', 139],
],
 Pizza: [
  ['Hawaii med skinka, ananas, ost, tomatsås', 139],
  ['Pepparoni med salami, ost, tomatsås', 139],
  ['Kebabpizza med kebabkött, feferoni, ost', 139],
  ['Kycklingpizza med curry, ananas, ost, tomatsås', 139],
  ['Calzone med skinka, ost, tomatsås', 139],
],

 Kebab: [
  ['Kebabtallrik med pommes, tomatsås, vitlökssås', 139],
  ['Kebab med bröd, sallad, tomatsås, vitlökssås', 139],
  ['Kebabrulle med sallad, tomatsås, vitlökssås', 139],
],
Sallader: [
  ['Kycklingsallad med grillad kycklingfilé, avokado', 139],
  ['Tonfisksallad med keso, ägg, avokado, ruccola', 139],
  ['Caesarsallad med grillad kycklingfilé, ost, krutonger', 139],
],

  'Veganska maträtter': [
  ['Krispig vegoburgare med cheddar, vitlöksmajonnäs, pommes', 139],
  ['Vegoschnitzel med pommes, dipp med sweet chili, BBQ-sås', 139],
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

const ORDER_TYPES = [
  ['Äta här', 139],
  ['Ta med', 129],
  ['Endast matlåda', 119],
];

const CATEGORIES = [
  'Lunch',
  'Pasta',
  'Hamburgare',
  'Tips',
  'Pizza',
  'Kebab',
  'Sallader',
  'Veganska maträtter',
  'Frysta matlådor',
  'Frukost',
  'Catering & Festlokal',
  'Boka bord',
];

const FOOD_IMAGES = {
  Lunch: 'https://images.openai.com/static-rsc-4/Ge8HQDgbjswNeqFO9paYGYcAlsMvFjax_G5Ep-75fWiBghCT0q2TwArH1Gjuu-EIIELhLLThS-UqJDYGQY2JVA85TdmpLh6MQgf_oU24vGA4POHuuTdbFBAMAX_9cH7jv6z4mCwWuw2nElFPYfPbkE5_Ybrnxsj6oIPHr3MNIHuEPazA6Cu87ZrXnN-rYPh4?purpose=fullsize',
  Pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=82',
  Hamburgare: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=82',
  Pizza: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82',
  Kebab: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=82',
  Sallader: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=82',
  'Veganska maträtter': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82',
  Frukost: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=82',
  'Frysta matlådor': 'https://images.unsplash.com/photo-1543353071-087092ec393a?auto=format&fit=crop&w=900&q=82',
Tips: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=82',
'Catering & Festlokal': require('./assets/IMG_7712.png'),
  'Boka bord': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=82',
};
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatTime = (date) => date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

export default function App() {
  const [section, setSection] = useState('Lunch');
  const [day, setDay] = useState(() => {
    const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    const today = days[new Date().getDay()];
    return ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'].includes(today)
      ? today
      : 'Måndag';
  });

  const [weeklyLunch, setWeeklyLunch] =
    useState(DEFAULT_LUNCH);
const [fullMenu, setFullMenu] = useState(MENU);
  const [orderType, setOrderType] =
    useState('Äta här');

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] =
    useState(false);

  // Kundens beställning
  const [orderDate, setOrderDate] =
    useState('');

  const [orderTime, setOrderTime] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [showOrderTimePicker, setShowOrderTimePicker] = useState(false);

  // Boka bord
  const [bookingDate, setBookingDate] =
    useState('');

  const [bookingTime, setBookingTime] =
    useState('');

  const [bookingGuests, setBookingGuests] =
    useState('2');

  const [bookingMessage, setBookingMessage] =
    useState('');

  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [showBookingDatePicker, setShowBookingDatePicker] = useState(false);
  const [showBookingTimePicker, setShowBookingTimePicker] = useState(false);

  // Admin
  const [admin, setAdmin] =
    useState(false);

  const [adminEmail, setAdminEmail] =
    useState('');


  const [ownerCode, setOwnerCode] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const [orders, setOrders] =
    useState([]);
  const [bookings, setBookings] = useState([]);

  // Ändra lunchmeny
  const [editDay, setEditDay] =
    useState('Måndag');

  const [editDish1, setEditDish1] =
    useState('');

  const [editDish2, setEditDish2] =
    useState('');

  const [editDish3, setEditDish3] =
    useState('');

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.qty,
        0
      ),
    [cart]
  );

  const lunchPrice =
    ORDER_TYPES.find(
      (item) => item[0] === orderType
    )?.[1] || 139;

  const breakfastNames = new Set(
    (fullMenu.Frukost || []).map(([name]) => name)
  );
  const cartHasBreakfast = cart.some((item) =>
    breakfastNames.has(item.name)
  );

  useEffect(() => {
    loadWeeklyMenu();
  }, []);

  useEffect(() => {
    if (admin) {
      loadOrders();
      loadBookings();
    }
  }, [admin]);

  async function loadWeeklyMenu() {
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('day,dishes');

    if (!error && data?.length) {
      const savedMenu = data.reduce((result, row) => ({
        ...result,
        [row.day]: Array.isArray(row.dishes) ? row.dishes : [],
      }), {});
      setWeeklyLunch((old) => ({ ...old, ...savedMenu }));
    }
  }

  function addToCart(name, price) {
    setCart((old) => {
      const found = old.find(
        (item) =>
          item.name === name &&
          item.price === price
      );

      if (found) {
        return old.map((item) =>
          item.id === found.id
            ? {
                ...item,
                qty: item.qty + 1,
              }
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
            ? {
                ...item,
                qty: item.qty + amount,
              }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  async function sendOrder() {
    if (cart.length === 0) {
      Alert.alert(
        'Beställning',
        'Kundkorgen är tom.'
      );
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Beställning', 'Fyll i namn och telefonnummer.');
      return;
    }

    if (
      !orderDate.trim() ||
      !orderTime.trim()
    ) {
      Alert.alert(
        'Beställning',
        'Fyll i datum och tid när maten önskas.'
      );
      return;
    }

    const { error } = await supabase
      .from('orders')
      .insert({
        items: cart,
        message: `Kund: ${customerName.trim()}\nTelefon: ${customerPhone.trim()}${message.trim() ? `\nMeddelande: ${message.trim()}` : ''}`,
        total: total,
        status: 'Ny',

        // Dessa namn matchar Supabase
        pickup_date: orderDate.trim(),
        pickup_time: orderTime.trim(),

        order_type: orderType,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.log(error);

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
    setCustomerName('');
    setCustomerPhone('');
    setMessage('');
    setOrderDate('');
    setOrderTime('');
    setShowCart(false);
  }

  async function bookTable() {
    if (!bookingName.trim() || !bookingPhone.trim()) {
      Alert.alert('Boka bord', 'Fyll i namn och telefonnummer.');
      return;
    }

    if (
      !bookingDate.trim() ||
      !bookingTime.trim()
    ) {
      Alert.alert(
        'Boka bord',
        'Fyll i datum och tid.'
      );
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .insert({
        booking_date: bookingDate.trim(),
        booking_time: bookingTime.trim(),
        guests:
          Number(bookingGuests) || 2,
        message: `Kund: ${bookingName.trim()}\nTelefon: ${bookingPhone.trim()}${bookingMessage.trim() ? `\nMeddelande: ${bookingMessage.trim()}` : ''}`,
        status: 'Ny',
      });

    if (error) {
      console.log(error);

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

    setBookingDate('');
    setBookingTime('');
    setBookingName('');
    setBookingPhone('');
    setBookingGuests('2');
    setBookingMessage('');
  }

  async function login() {
  if (ownerCode.trim() !== OWNER_CODE) {
    Alert.alert('Admin', 'Fel ägarkod.');
    return;
  }

  if (!adminEmail.trim()) {
    Alert.alert('Admin', 'Fyll i e-post.');
    return;
  }

  setAdmin(true);
}

async function logout() {
  await supabase.auth.signOut();

  setAdmin(false);
  setOrders([]);
  setBookings([]);
}



  async function loadOrders() {
    const { data, error } =
      await supabase
        .from('orders')
        .select('*')
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      console.log(error);

      Alert.alert(
        'Beställningar',
        'Kunde inte hämta beställningar.'
      );

      return;
    }

    setOrders(data || []);
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true });

    if (!error) setBookings(data || []);
  }

  async function foodReady(order) {
    const { error } =
      await supabase
        .from('orders')
        .update({
          status: 'Maten färdig',
        })
        .eq('id', order.id);

    if (error) {
      Alert.alert(
        'Maten färdig',
        'Statusen kunde inte uppdateras.'
      );

      return;
    }

    Alert.alert(
      'Klart',
      'Beställningen är markerad som Maten färdig.'
    );

    loadOrders();
  }

  function openDayForEditing(selectedDay) {
    const dishes =
      weeklyLunch[selectedDay] || [];

    setEditDay(selectedDay);
    setEditDish1(dishes[0] || '');
    setEditDish2(dishes[1] || '');
    setEditDish3(dishes[2] || '');
  }

  async function saveMenuChanges() {
    if (!editDish1.trim()) {
      Alert.alert(
        'Meny',
        'Maträtt 1 får inte vara tom.'
      );

      return;
    }

    const newDishes = [
      editDish1.trim(),
      editDish2.trim(),
      editDish3.trim(),
    ].filter(Boolean);

    setWeeklyLunch((old) => ({
      ...old,
      [editDay]: newDishes,
    }));

    const { error } = await supabase
      .from('weekly_menu')
      .upsert({ day: editDay, dishes: newDishes }, { onConflict: 'day' });

    if (error) {
      Alert.alert('Meny', 'Menyn ändrades på mobilen men kunde inte publiceras till alla kunder.');
      return;
    }

    Alert.alert(
      'Meny publicerad',
      `${editDay} är uppdaterad för alla kunder.`
    );
  }
function updateFullMenu(category, newItems) {
  setFullMenu((old) => ({
    ...old,
    [category]: newItems,
  }));
}
    if (showCart) {
    return (
      <SafeAreaView style={styles.page}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <Header onAdminOpen={() => setShowAdminLogin(true)} />

          <Text style={styles.heading}>
            Din beställning
          </Text>

          {cart.length === 0 ? (
            <Text style={styles.empty}>
              Kundkorgen är tom.
            </Text>
          ) : (
            cart.map((item) => (
              <View
                key={item.id}
                style={styles.card}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.item}>
                    {item.name}
                  </Text>

                  <Text style={styles.muted}>
                    {item.price} kr ×{' '}
                    {item.qty}
                  </Text>
                </View>

                <View style={styles.qty}>
                  <TouchableOpacity
                    style={styles.small}
                    onPress={() =>
                      changeQty(
                        item.id,
                        -1
                      )
                    }
                  >
                    <Text
                      style={
                        styles.smallText
                      }
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={styles.qtyText}
                  >
                    {item.qty}
                  </Text>

                  <TouchableOpacity
                    style={styles.small}
                    onPress={() =>
                      changeQty(
                        item.id,
                        1
                      )
                    }
                  >
                    <Text
                      style={
                        styles.smallText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={styles.total}>
            Totalt: {total} kr
          </Text>

          {!cartHasBreakfast && (
            <>
              <Text style={styles.label}>Hur vill du ha maten?</Text>
              <View style={styles.types}>
                {ORDER_TYPES.map(([name, price]) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setOrderType(name)}
                    style={[
                      styles.type,
                      orderType === name && styles.typeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        orderType === name && styles.typeTextActive,
                      ]}
                    >
                      {name}{'\n'}{price} kr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Namn</Text>
          <TextInput
            style={styles.field}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Ditt namn"
            autoComplete="name"
          />

          <Text style={styles.label}>Telefonnummer</Text>
          <TextInput
            style={styles.field}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="T.ex. 070 123 45 67"
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={styles.label}>
            Datum 📅
          </Text>

          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowOrderDatePicker(true)}>
            <Text style={orderDate ? styles.pickerValue : styles.pickerPlaceholder}>
              {orderDate || 'Välj datum'}
            </Text>
          </TouchableOpacity>
          {showOrderDatePicker && (
            <DateTimePicker
              value={orderDate ? new Date(`${orderDate}T12:00:00`) : new Date()}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, selected) => {
                setShowOrderDatePicker(Platform.OS === 'ios');
                if (selected) setOrderDate(formatDate(selected));
              }}
            />
          )}

          <Text style={styles.label}>
            Tid 🕐
          </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
  {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00'].map((time) => (
   <TouchableOpacity
  key={time}
  style={[
    styles.pickerButton,
    orderTime === time && styles.timeButtonActive,
  ]}
  onPress={() => setOrderTime(time)}
>
  <Text style={orderTime === time ? styles.timeButtonTextActive : styles.pickerValue}>
    {time}
  </Text>
</TouchableOpacity>
  ))}
</View>  
           

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
              Ingen betalning i appen.
              Kunden betalar på
              restaurangen.
            </Text>
          </View>

          <AppButton
            title="Skicka beställning"
            onPress={sendOrder}
          />

          <AppButton
            title="Tillbaka till menyn"
            outline
            onPress={() =>
              setShowCart(false)
            }
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Header onAdminOpen={() => setShowAdminLogin(true)} />

        <View style={styles.hero}>
          <Image source={{ uri: FOOD_IMAGES.Lunch }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Hemlagad lunch i Kungens Kurva</Text>
            <Text style={styles.heroText}>Välj din mat och betala på plats.</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            Beställ i appen • Betala på
            restaurangen
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            Lunch 139 kr • Pensionär 129 kr • Mat för avhämtning 129 kr • Endast matlåda 119 kr
            {'\n'}Inkl. smör, bröd, dryck, kaffe, hembakt bröd, salladsbuffé, te, kaka och soppa
            {'\n'}Lunchhäfte: köp 10 luncher – 11:e lunchen gratis
          </Text>
        </View>


<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: 12,
}}>
  {CATEGORIES.map((category) => (
    <TouchableOpacity
      key={category}
      onPress={() => setSection(category)}
      style={{
        width: '32%',
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#0755ad',
      }}
    >
      <Image
        source={typeof FOOD_IMAGES[category] === 'string' ? { uri: FOOD_IMAGES[category] } : FOOD_IMAGES[category]}
        style={{
          width: '100%',
          height: 68,
        }}
        resizeMode="cover"
      />

      <View style={{
        backgroundColor: '#0755ad',
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 16,
          fontWeight: '800',
          textAlign: 'center',
        }}>
          {category}
        </Text>
      </View>
    </TouchableOpacity>
  ))}
</View>

        {section === 'Lunch' && (
          <>
            <Text style={styles.heading}>
              Veckans lunchmeny
            </Text>

            <View style={styles.days}>
              {Object.keys(
                weeklyLunch
              ).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() =>
                    setDay(item)
                  }
                  style={[
                   
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

            <Text style={styles.label}>
              Välj:
            </Text>

            <View style={styles.types}>
              {ORDER_TYPES.map(
                ([name, price]) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() =>
                      setOrderType(name)
                    }
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
                )
              )}
            </View>

          {weeklyLunch[day].map(
              (name, index) => (
                <Food
                  key={`${day}-${name}`}
                  number={index + 1}
                  name={name}
                  price={lunchPrice}
onAdd={() => {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const today = days[new Date().getDay()];

  if (day !== today || !['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'].includes(today)) {
    Alert.alert(
      'Veckans meny',
      'Du kan titta på andra dagars lunch, men bara beställa dagens lunch.'
    );
    return;
  }

  addToCart(name, lunchPrice);
}}
                />
              )
            )}
          </>
        )}

        {fullMenu[section] && (
          <>
            <Text style={styles.heading}>
              {section}
            </Text>

            {!!FOOD_IMAGES[section] && (
              <Image source={{ uri: FOOD_IMAGES[section] }} style={styles.sectionImage} />
            )}

            {fullMenu[section].map(
              ([name, price]) => (
                <Food
                  key={name}
                  name={name}
                  price={price}
                  onAdd={() =>
                    addToCart(
                      name,
                      price
                    )
                  }
                />
              )
            )}
      </>
        )}
{section === 'Catering & Festlokal' && (
  <>
    <Text style={styles.heading}>Catering & Festlokal</Text>

    <Text style={styles.infoText}>
      Planerar du fest, möte eller catering? Skicka en bokningsförfrågan så kontaktar vi dig.
    </Text>

    <Text style={styles.label}>Namn</Text>
    <TextInput
      style={styles.field}
      value={bookingName}
      onChangeText={setBookingName}
      placeholder="Ditt namn"
    />

    <Text style={styles.label}>Telefonnummer</Text>
    <TextInput
      style={styles.field}
      value={bookingPhone}
      onChangeText={setBookingPhone}
      placeholder="T.ex. 070 123 45 67"
      keyboardType="phone-pad"
    />

    <Text style={styles.label}>Datum 📅</Text>
    <TouchableOpacity
      style={styles.pickerButton}
      onPress={() => setShowBookingDatePicker(true)}
    >
      <Text style={bookingDate ? styles.pickerValue : styles.pickerPlaceholder}>
        {bookingDate || 'Välj datum'}
      </Text>
    </TouchableOpacity>

    {showBookingDatePicker && (
      <DateTimePicker
        value={bookingDate ? new Date(`${bookingDate}T12:00:00`) : new Date()}
        mode="date"
        minimumDate={new Date()}
        onChange={(_, selected) => {
          setShowBookingDatePicker(false);
          if (selected) setBookingDate(formatDate(selected));
        }}
      />
    )}

    <Text style={styles.label}>Tid 🕐</Text>
    <TextInput
      style={styles.field}
      value={bookingTime}
      onChangeText={setBookingTime}
      placeholder="T.ex. 18:00"
    />

    <Text style={styles.label}>Antal personer</Text>
    <TextInput
      style={styles.field}
      value={bookingGuests}
      onChangeText={setBookingGuests}
      keyboardType="number-pad"
      placeholder="Antal personer"
    />

<Text style={styles.label}>Meddelande</Text>
<TextInput
  style={styles.messageInput}
  multiline
  value={bookingMessage}
  onChangeText={setBookingMessage}
  placeholder="Berätta om catering eller festen..."
/>

<AppButton
  title="Skicka bokningsförfrågan"
  onPress={bookTable}
/>
</>
)}

{section === 'Boka bord' && (
         
          <>
            <Text style={styles.heading}>
              Boka bord
            </Text>

            <Text style={styles.label}>Namn</Text>
            <TextInput
              style={styles.field}
              value={bookingName}
              onChangeText={setBookingName}
              placeholder="Ditt namn"
              autoComplete="name"
            />

            <Text style={styles.label}>Telefonnummer</Text>
            <TextInput
              style={styles.field}
              value={bookingPhone}
              onChangeText={setBookingPhone}
              placeholder="T.ex. 070 123 45 67"
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <Text style={styles.label}>
              Datum 📅
            </Text>

            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBookingDatePicker(true)}>
              <Text style={bookingDate ? styles.pickerValue : styles.pickerPlaceholder}>
                {bookingDate || 'Välj datum'}
              </Text>
            </TouchableOpacity>
            {showBookingDatePicker && (
              <DateTimePicker
                value={bookingDate ? new Date(`${bookingDate}T12:00:00`) : new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowBookingDatePicker(Platform.OS === 'ios');
                  if (selected) setBookingDate(formatDate(selected));
                }}
              />
            )}

            <Text style={styles.label}>
              Tid 🕐
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00'].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.pickerButton,
                    bookingTime === time && styles.timeButtonActive,
                  ]}
                  onPress={() => setBookingTime(time)}
                >
                  <Text style={bookingTime === time ? styles.timeButtonTextActive : styles.pickerValue}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              Antal personer
            </Text>

            <TextInput
              style={styles.field}
              keyboardType="number-pad"
              value={bookingGuests}
              onChangeText={
                setBookingGuests
              }
              placeholder="2"
            />

            <Text style={styles.label}>
              Meddelande
            </Text>

            <TextInput
              style={styles.messageInput}
              multiline
              value={bookingMessage}
              onChangeText={
                setBookingMessage
              }
              placeholder="Skriv meddelande till restaurangen..."
            />

            <AppButton
              title="Skicka bokning"
              onPress={bookTable}
            />
          </>
        )}

        <AppButton
          title={`Kundkorg (${cart.reduce(
            (sum, item) =>
              sum + item.qty,
            0
          )}) • ${total} kr`}
          onPress={() =>
            setShowCart(true)
          }
        />

        {(showAdminLogin || admin) && (
        <View style={styles.adminBox}>
          <Text style={styles.adminTitle}>
            Restaurang / Admin
          </Text>

          {!admin ? (
            <>
              <TextInput
                style={styles.field}
                keyboardType="number-pad"
                secureTextEntry
                value={ownerCode}
                onChangeText={setOwnerCode}
                placeholder="Ägarkod"
                maxLength={4}
              />

              <TextInput
                style={styles.field}
                autoCapitalize="none"
                keyboardType="email-address"
                value={adminEmail}
                onChangeText={
                  setAdminEmail
                }
                placeholder="E-post"
              />

        

              <AppButton
                title="Logga in"
                outline
                onPress={login}
              />
            </>
          ) : (
            <>
              <Text style={styles.success}>
                ✓ Inloggad som admin
              </Text>

              <AppButton
                title="Uppdatera beställningar"
                onPress={() => {
                  loadOrders();
                  loadBookings();
                }}
              />

              <Text
                style={
                  styles.adminHeading
                }
              >
                Inkommande beställningar
              </Text>

              {orders.length === 0 && (
                <Text
                  style={styles.muted}
                >
                  Inga beställningar att
                  visa.
                </Text>
              )}

              {orders.map((order) => (
                <View
                  key={order.id}
                  style={styles.orderCard}
                >
                  <Text
                    style={
                      styles.orderTitle
                    }
                  >
                    Beställning #
                    {order.id}
                  </Text>

                  <Text
                    style={styles.muted}
                  >
                    Status:{' '}
                    {order.status ||
                      'Ny'}
                  </Text>

                  {!!order.pickup_date && (
                    <Text>
                      Datum:{' '}
                      {order.pickup_date}
                    </Text>
                  )}

                  {!!order.pickup_time && (
                    <Text>
                      Tid:{' '}
                      {order.pickup_time}
                    </Text>
                  )}

                  {!!order.order_type && (
                    <Text>
                      Typ:{' '}
                      {order.order_type}
                    </Text>
                  )}

                  {Array.isArray(
                    order.items
                  ) &&
                    order.items.map(
                      (item, index) => (
                        <Text
                          key={`${order.id}-${index}`}
                        >
                          • {item.qty} ×{' '}
                          {item.name}
                        </Text>
                      )
                    )}

                  {!!order.message && (
                    <Text
                      style={
                        styles.orderMessage
                      }
                    >
                      Meddelande:{' '}
                      {order.message}
                    </Text>
                  )}

                  <Text
                    style={
                      styles.orderTotal
                    }
                  >
                    Totalt:{' '}
                    {order.total || 0} kr
                  </Text>

                  {order.status !==
                    'Maten färdig' && (
                    <AppButton
                      title="Maten färdig"
                      onPress={() =>
                        foodReady(order)
                      }
                    />
                  )}
                </View>
              ))}

              <Text style={styles.adminHeading}>Bordsbokningar</Text>

              {bookings.length === 0 && (
                <Text style={styles.muted}>Inga bokningar att visa.</Text>
              )}

              {bookings.map((booking) => (
                <View key={booking.id} style={styles.orderCard}>
                  <Text style={styles.orderTitle}>
                    {booking.booking_date} kl. {booking.booking_time}
                  </Text>
                  <Text>{booking.guests || 2} personer</Text>
                  {!!booking.message && (
                    <Text style={styles.orderMessage}>{booking.message}</Text>
                  )}
                </View>
              ))}

              <Text
                style={
                  styles.adminHeading
                }
              >
Ändra hela menyn
              </Text>
<Text style={styles.adminHeading}>
  Ändra övriga maträtter
</Text>
           {CATEGORIES.filter((category) => category !== 'Lunch' && category !== 'Boka bord').map((category) => (
  <AppButton
    key={category}
    title={`Ändra ${category}`}
    onPress={() => setSection(category)}
  />
))}{section !== 'Lunch' && section !== 'Boka bord' && (
  <Text style={styles.adminHeading}>
    Redigerar: {section}
  </Text>
)} {section !== 'Lunch' && section !== 'Boka bord' &&
  (fullMenu[section] || []).map((food, index) => (
    <View key={`${section}-${index}`}>
      <TextInput
        style={styles.field}
        value={food[0]}
        onChangeText={(text) => {
          const newItems = [...fullMenu[section]];
          newItems[index] = [text, food[1]];
          updateFullMenu(section, newItems);
        }}
      />
      <TextInput
        style={styles.field}
        value={String(food[1])}
        keyboardType="number-pad"
        onChangeText={(text) => {
          const newItems = [...fullMenu[section]];
          newItems[index] = [food[0], Number(text) || 0];
          updateFullMenu(section, newItems);
        }}
        placeholder="Pris"
      />
    </View>
  ))
}{section !== 'Lunch' && section !== 'Boka bord' && (
  <AppButton
    title="Spara ändringar"
    onPress={() => Alert.alert('Klart', `${section} är uppdaterad.`)}
  />
)}  <View style={styles.days}>
                {Object.keys(
                  weeklyLunch
                ).map((item) => (
                  <TouchableOpacity
                    key={`edit-${item}`}
                    onPress={() =>
                      openDayForEditing(
                        item
                      )
                    }
                    style={[
                      styles.day,
                      editDay === item &&
                        styles.dayActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        editDay === item &&
                          styles.dayTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>
                {editDay}
              </Text>

              <TextInput
                style={styles.field}
                value={editDish1}
                onChangeText={
                  setEditDish1
                }
                placeholder="Maträtt 1"
              />

              <TextInput
                style={styles.field}
                value={editDish2}
                onChangeText={
                  setEditDish2
                }
                placeholder="Maträtt 2"
              />

              <TextInput
                style={styles.field}
                value={editDish3}
                onChangeText={
                  setEditDish3
                }
                placeholder="Maträtt 3"
              />

              <AppButton
                title="Spara meny"
                onPress={
                  saveMenuChanges
                }
              />

              <AppButton
                title="Logga ut"
                outline
                onPress={logout}
              />
            </>
          )}
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onAdminOpen }) {
  return (
    <Pressable style={styles.header} onLongPress={onAdminOpen} delayLongPress={2000}>
      <Image source={require('./assets/icon.png')} style={styles.logo} />
      <Text style={styles.brand}>
        Husman Lunchrestaurang
      </Text>

      <Text style={styles.open}>
        Måndag–fredag 08:00–14:00
      </Text>
    </Pressable>
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
          {number
            ? `${number}. `
            : ''}
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
        outline &&
          styles.buttonOutline,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          outline &&
            styles.buttonTextOutline,
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
    paddingBottom: 60,
  },

  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 18,
  },

  logo: {
    width: 78,
    height: 78,
    borderRadius: 18,
    marginBottom: 9,
  },

  hero: {
    height: 155,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#dbe9f5',
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(5, 33, 62, 0.76)',
  },

  heroTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  heroText: {
    color: '#eaf5ff',
    marginTop: 4,
    fontWeight: '600',
  },

  sectionImage: {
    width: '100%',
    height: 120,
    borderRadius: 18,
    marginBottom: 13,
    backgroundColor: '#dbe9f5',
  },

  brand: {
    fontSize: 27,
    fontWeight: '900',
    color: BLUE,
    textAlign: 'center',
  },

  open: {
    fontSize: 13,
    color: '#64788e',
    marginTop: 6,
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
    minHeight: 90,
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

  pickerButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbdceb',
    borderRadius: 12,
    padding: 15,
    marginBottom: 9,
  },

  pickerValue: {
    color: '#102b49',
    fontSize: 16,
    fontWeight: '700',
  },

  pickerPlaceholder: {
    color: '#7a8d9f',
    fontSize: 16,
  },

  timeButtonActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  timeButtonTextActive: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '900',
    color: '#102b49',
    marginBottom: 10,
  },

  adminHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102b49',
    marginTop: 22,
    marginBottom: 10,
  },

  success: {
    fontWeight: '900',
    color: '#167348',
    marginBottom: 8,
  },

  orderCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5e4f2',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },

  orderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102b49',
    marginBottom: 5,
  },

  orderMessage: {
    marginTop: 8,
    fontWeight: '700',
    color: '#315574',
  },

  orderTotal: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: '#102b49',
  },
});        
  
    


              
