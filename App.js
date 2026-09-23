import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
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

const MENU = {
  Pasta: [
    ['Penne Paradiso med strimlad biff, champinjoner, vitlök, gräddsås, ost', 139],
    ['Con Pollo med strimlad kycklingfilé, krämig chilisås, ost', 139],
    ['Spaghetti Carbonara med gräddsås, svartpeppar, äggula, ost', 139],
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
  'Boka bord',
];

const FOOD_IMAGES = {
  Lunch:
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=82',
  Pasta:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=82',
  Hamburgare:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=82',
  Pizza:
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82',
  Kebab:
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=82',
  Sallader:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=82',
  'Veganska maträtter':
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82',
  Frukost:
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=82',
  'Frysta matlådor':
    'https://images.unsplash.com/photo-1543353071-087092ec393a?auto=format&fit=crop&w=900&q=82',
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (date) =>
  date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function App() {
  const [section, setSection] = useState('Lunch');
  const [day, setDay] = useState('Måndag');

  const [weeklyLunch, setWeeklyLunch] = useState(DEFAULT_LUNCH);
  const [fullMenu, setFullMenu] = useState(MENU);
  const [orderType, setOrderType] = useState('Äta här');

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // Kundens beställning
  const [orderDate, setOrderDate] = useState('');
  const [orderTime, setOrderTime] = useState('');
  const [message, setMessage] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [showOrderDatePicker, setShowOrderDatePicker] =
    useState(false);

  const [showOrderTimePicker, setShowOrderTimePicker] =
    useState(false);

  // Boka bord
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingGuests, setBookingGuests] = useState('2');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');

  const [showBookingDatePicker, setShowBookingDatePicker] =
    useState(false);

  const [showBookingTimePicker, setShowBookingTimePicker] =
    useState(false);

  // Admin
  const [admin, setAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [ownerCode, setOwnerCode] = useState('');

  // Dold ägarinloggning
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);

  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Ändra lunchmeny
  const [editDay, setEditDay] = useState('Måndag');
  const [editDish1, setEditDish1] = useState('');
  const [editDish2, setEditDish2] = useState('');
  const [editDish3, setEditDish3] = useState('');
  // Redigering av övriga menyer
  const [editingCategory, setEditingCategory] = useState('Pasta');

  useEffect(() => {
    loadWeeklyMenu();
    loadFullMenu();
  }, []);

  useEffect(() => {
    if (admin) {
      loadOrders();
      loadBookings();
    }
  }, [admin]);

  useEffect(() => {
    const dishes = weeklyLunch[editDay] || [];
    setEditDish1(dishes[0] || '');
    setEditDish2(dishes[1] || '');
    setEditDish3(dishes[2] || '');
  }, [editDay, weeklyLunch]);

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.qty),
        0
      ),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.qty), 0),
    [cart]
  );

  async function loadWeeklyMenu() {
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('day,dishes');

    if (!error && data?.length) {
      const savedMenu = data.reduce(
        (result, row) => ({
          ...result,
          [row.day]: Array.isArray(row.dishes) ? row.dishes : [],
        }),
        {}
      );

      setWeeklyLunch((old) => ({
        ...old,
        ...savedMenu,
      }));
    }
  }

  async function loadFullMenu() {
    const { data, error } = await supabase
      .from('app_menu')
      .select('category,items');

    if (error) {
      console.log('Kunde inte läsa app_menu:', error.message);
      return;
    }

    if (data?.length) {
      const savedMenu = data.reduce(
        (result, row) => ({
          ...result,
          [row.category]: Array.isArray(row.items)
            ? row.items
            : [],
        }),
        {}
      );

      setFullMenu((old) => ({
        ...old,
        ...savedMenu,
      }));
    }
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data || []);
    }
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setBookings(data || []);
    }
  }

  function addToCart(name, price) {
    setCart((old) => {
      const found = old.find((item) => item.name === name);

      if (found) {
        return old.map((item) =>
          item.name === name
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...old,
        {
          name,
          price: Number(price),
          qty: 1,
        },
      ];
    });
  }

  function increaseItem(name) {
    setCart((old) =>
      old.map((item) =>
        item.name === name
          ? { ...item, qty: item.qty + 1 }
          : item
      )
    );
  }

  function decreaseItem(name) {
    setCart((old) =>
      old
        .map((item) =>
          item.name === name
            ? { ...item, qty: item.qty - 1 }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(name) {
    setCart((old) => old.filter((item) => item.name !== name));
  }

  function clearCart() {
    setCart([]);
  }

  async function sendOrder() {
    if (!cart.length) {
      Alert.alert('Beställning', 'Varukorgen är tom.');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('Beställning', 'Fyll i ditt namn.');
      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert('Beställning', 'Fyll i telefonnummer.');
      return;
    }

    if (!orderDate.trim()) {
      Alert.alert('Beställning', 'Välj datum.');
      return;
    }

    if (!orderTime.trim()) {
      Alert.alert('Beställning', 'Välj tid.');
      return;
    }

    const orderItems = cart.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    const { error } = await supabase.from('orders').insert({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      pickup_date: orderDate.trim(),
      pickup_time: orderTime.trim(),
      message: message.trim(),
      order_type: orderType,
      items: orderItems,
      total: cartTotal,
      status: 'Ny',
    });

    if (error) {
      Alert.alert(
        'Beställning',
        'Beställningen kunde inte skickas. Försök igen.'
      );
      return;
    }

    Alert.alert(
      'Tack!',
      'Din beställning är skickad till restaurangen.'
    );

    setCart([]);
    setMessage('');
    setOrderDate('');
    setOrderTime('');
    setShowCart(false);
  }

  async function sendBooking() {
    if (!bookingName.trim()) {
      Alert.alert('Boka bord', 'Fyll i ditt namn.');
      return;
    }

    if (!bookingPhone.trim()) {
      Alert.alert('Boka bord', 'Fyll i telefonnummer.');
      return;
    }

    if (!bookingDate.trim()) {
      Alert.alert('Boka bord', 'Välj datum.');
      return;
    }

    if (!bookingTime.trim()) {
      Alert.alert('Boka bord', 'Välj tid.');
      return;
    }

    const guests = Number(bookingGuests);

    if (!guests || guests < 1) {
      Alert.alert('Boka bord', 'Ange antal gäster.');
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      customer_name: bookingName.trim(),
      customer_phone: bookingPhone.trim(),
      booking_date: bookingDate.trim(),
      booking_time: bookingTime.trim(),
      guests,
      message: bookingMessage.trim(),
      status: 'Ny',
    });

    if (error) {
      Alert.alert(
        'Boka bord',
        'Bokningen kunde inte skickas. Försök igen.'
      );
      return;
    }

    Alert.alert(
      'Bokning skickad',
      'Tack! Restaurangen har fått din bokning.'
    );

    setBookingName('');
    setBookingPhone('');
    setBookingDate('');
    setBookingTime('');
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
    setShowOwnerLogin(false);
    setOwnerCode('');
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log(error);
    }

    setAdmin(false);
    setShowOwnerLogin(false);
    setOwnerCode('');
    setAdminEmail('');
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
      .upsert(
        {
          day: editDay,
          dishes: newDishes,
        },
        {
          onConflict: 'day',
        }
      );

    if (error) {
      Alert.alert(
        'Meny',
        'Menyn ändrades på mobilen men kunde inte publiceras till alla kunder.'
      );
      return;
    }

    Alert.alert(
      'Meny publicerad',
      `${editDay} är uppdaterad för alla kunder.`
    );
  }

  function changeMenuItem(category, index, field, value) {
    setFullMenu((old) => {
      const items = [...(old[category] || [])];
      const current = items[index] || ['', 0];

      if (field === 'name') {
        items[index] = [value, current[1]];
      } else {
        const cleaned = value.replace(/[^0-9]/g, '');
        items[index] = [
          current[0],
          cleaned === '' ? '' : Number(cleaned),
        ];
      }

      return {
        ...old,
        [category]: items,
      };
    });
  }

  function addMenuItem(category) {
    setFullMenu((old) => ({
      ...old,
      [category]: [
        ...(old[category] || []),
        ['Ny maträtt', 139],
      ],
    }));
  }

  function deleteMenuItem(category, index) {
    Alert.alert(
      'Ta bort maträtt',
      'Vill du ta bort maträtten?',
      [
        {
          text: 'Avbryt',
          style: 'cancel',
        },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => {
            setFullMenu((old) => ({
              ...old,
              [category]: (old[category] || []).filter(
                (_, itemIndex) => itemIndex !== index
              ),
            }));
          },
        },
      ]
    );
  }

  async function saveFullMenuCategory(category) {
    const items = (fullMenu[category] || [])
      .map(([name, price]) => [
        String(name || '').trim(),
        Number(price || 0),
      ])
      .filter(([name]) => name);

    if (!items.length) {
      Alert.alert(
        'Meny',
        'Kategorin måste innehålla minst en maträtt.'
      );
      return;
    }

    const { error } = await supabase
      .from('app_menu')
      .upsert(
        {
          category,
          items,
        },
        {
          onConflict: 'category',
        }
      );

    if (error) {
      Alert.alert(
        'Meny',
        'Kunde inte publicera ändringarna till kunderna.'
      );
      return;
    }

    setFullMenu((old) => ({
      ...old,
      [category]: items,
    }));

    Alert.alert(
      'Meny publicerad',
      `${category} är uppdaterad för alla kunder.`
    );
  }

  async function updateOrderStatus(id, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      Alert.alert(
        'Beställning',
        'Status kunde inte ändras.'
      );
      return;
    }

    setOrders((old) =>
      old.map((order) =>
        order.id === id
          ? { ...order, status }
          : order
      )
    );
  }

  async function updateBookingStatus(id, status) {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (error) {
      Alert.alert(
        'Bokning',
        'Status kunde inte ändras.'
      );
      return;
    }

    setBookings((old) =>
      old.map((booking) =>
        booking.id === id
          ? { ...booking, status }
          : booking
      )
    );
  }
  function Header({ onOwnerAccess }) {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={onOwnerAccess}
          delayLongPress={1500}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>H</Text>
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantName}>
            Husman Lunchrestaurang
          </Text>
          <Text style={styles.restaurantSub}>
            God husmanskost • Kungens Kurva
          </Text>
        </View>

        {!admin && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.cartButtonText}>
              🛒 {cartCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function AppButton({
    title,
    onPress,
    outline = false,
    danger = false,
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.button,
          outline && styles.buttonOutline,
          danger && styles.buttonDanger,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            outline && styles.buttonOutlineText,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  function Food({ name, price, onAdd }) {
    return (
      <View style={styles.foodRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.foodName}>{name}</Text>
          <Text style={styles.foodPrice}>{price} kr</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAdd}
        >
          <Text style={styles.addButtonText}>+ Lägg till</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderCart() {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        <Header
          onOwnerAccess={() => setShowOwnerLogin(true)}
        />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Din varukorg</Text>

          {!cart.length ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Varukorgen är tom.
              </Text>
            </View>
          ) : (
            <>
              {cart.map((item) => (
                <View
                  key={item.name}
                  style={styles.cartItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>
                      {item.name}
                    </Text>

                    <Text style={styles.foodPrice}>
                      {item.price} kr × {item.qty}
                    </Text>
                  </View>

                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        decreaseItem(item.name)
                      }
                    >
                      <Text style={styles.quantityText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantityNumber}>
                      {item.qty}
                    </Text>

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        increaseItem(item.name)
                      }
                    >
                      <Text style={styles.quantityText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      removeItem(item.name)
                    }
                  >
                    <Text style={styles.deleteText}>
                      Ta bort
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.totalBox}>
                <Text style={styles.totalText}>
                  Totalt: {cartTotal} kr
                </Text>
              </View>
            </>
          )}

          <Text style={styles.smallHeading}>
            Hur vill du ha maten?
          </Text>

          <View style={styles.wrapRow}>
            {ORDER_TYPES.map(([name, price]) => (
              <TouchableOpacity
                key={name}
                onPress={() => setOrderType(name)}
                style={[
                  styles.optionButton,
                  orderType === name &&
                    styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    orderType === name &&
                      styles.optionTextActive,
                  ]}
                >
                  {name} {price} kr
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.field}
            placeholder="Ditt namn"
            value={customerName}
            onChangeText={setCustomerName}
          />

          <TextInput
            style={styles.field}
            placeholder="Telefonnummer"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />

          <Text style={styles.smallHeading}>
            Välj datum
          </Text>

          <TouchableOpacity
            style={styles.pickerButtonWide}
            onPress={() =>
              setShowOrderDatePicker(true)
            }
          >
            <Text style={styles.pickerText}>
              {orderDate || 'Tryck för att välja datum'}
            </Text>
          </TouchableOpacity>

          {showOrderDatePicker && (
            <DateTimePicker
              value={
                orderDate
                  ? new Date(`${orderDate}T12:00:00`)
                  : new Date()
              }
              mode="date"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS !== 'ios') {
                  setShowOrderDatePicker(false);
                }

                if (selectedDate) {
                  setOrderDate(formatDate(selectedDate));
                }
              }}
            />
          )}

          <Text style={styles.smallHeading}>
            Välj tid
          </Text>

          <View style={styles.timeButtons}>
            {[
              '08:00',
              '08:30',
              '09:00',
              '09:30',
              '10:00',
              '10:30',
              '11:00',
              '11:30',
              '12:00',
              '12:30',
              '13:00',
              '13:30',
              '14:00',
            ].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeButton,
                  orderTime === time &&
                    styles.timeButtonActive,
                ]}
                onPress={() => setOrderTime(time)}
              >
                <Text
                  style={[
                    styles.timeButtonText,
                    orderTime === time &&
                      styles.timeButtonTextActive,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.field,
              styles.messageField,
            ]}
            placeholder="Meddelande till restaurangen"
            multiline
            value={message}
            onChangeText={setMessage}
          />

          <AppButton
            title="Skicka beställning"
            onPress={sendOrder}
          />

          <AppButton
            title="Tillbaka till menyn"
            outline
            onPress={() => setShowCart(false)}
          />

          {!!cart.length && (
            <AppButton
              title="Töm varukorgen"
              danger
              onPress={clearCart}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderBooking() {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Boka bord</Text>

        <Text style={styles.description}>
          Boka bord hos Husman Lunchrestaurang.
        </Text>

        <TextInput
          style={styles.field}
          placeholder="Namn"
          value={bookingName}
          onChangeText={setBookingName}
        />

        <TextInput
          style={styles.field}
          placeholder="Telefonnummer"
          keyboardType="phone-pad"
          value={bookingPhone}
          onChangeText={setBookingPhone}
        />

        <TouchableOpacity
          style={styles.pickerButtonWide}
          onPress={() =>
            setShowBookingDatePicker(true)
          }
        >
          <Text style={styles.pickerText}>
            {bookingDate || 'Välj datum'}
          </Text>
        </TouchableOpacity>

        {showBookingDatePicker && (
          <DateTimePicker
            value={
              bookingDate
                ? new Date(`${bookingDate}T12:00:00`)
                : new Date()
            }
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (Platform.OS !== 'ios') {
                setShowBookingDatePicker(false);
              }

              if (selectedDate) {
                setBookingDate(
                  formatDate(selectedDate)
                );
              }
            }}
          />
        )}

        <TouchableOpacity
          style={styles.pickerButtonWide}
          onPress={() =>
            setShowBookingTimePicker(true)
          }
        >
          <Text style={styles.pickerText}>
            {bookingTime || 'Välj tid'}
          </Text>
        </TouchableOpacity>

        {showBookingTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour
            onChange={(event, selectedTime) => {
              if (Platform.OS !== 'ios') {
                setShowBookingTimePicker(false);
              }

              if (selectedTime) {
                setBookingTime(
                  formatTime(selectedTime)
                );
              }
            }}
          />
        )}

        <TextInput
          style={styles.field}
          placeholder="Antal gäster"
          keyboardType="number-pad"
          value={bookingGuests}
          onChangeText={setBookingGuests}
        />

        <TextInput
          style={[
            styles.field,
            styles.messageField,
          ]}
          placeholder="Meddelande"
          multiline
          value={bookingMessage}
          onChangeText={setBookingMessage}
        />

        <AppButton
          title="Skicka bokning"
          onPress={sendBooking}
        />
      </View>
    );
  }

  function renderOwnerLogin() {
    if (!showOwnerLogin || admin) {
      return null;
    }

    return (
      <View style={styles.ownerOverlay}>
        <View style={styles.ownerLoginBox}>
          <Text style={styles.heading}>
            Ägarinloggning
          </Text>

          <Text style={styles.description}>
            Endast för restaurangens ägare.
          </Text>

          <TextInput
            style={styles.field}
            placeholder="Ägarkod"
            secureTextEntry
            value={ownerCode}
            onChangeText={setOwnerCode}
          />

          <TextInput
            style={styles.field}
            placeholder="E-post"
            keyboardType="email-address"
            autoCapitalize="none"
            value={adminEmail}
            onChangeText={setAdminEmail}
          />

          <AppButton
            title="Logga in"
            onPress={login}
          />

          <AppButton
            title="Stäng"
            outline
            onPress={() => {
              setShowOwnerLogin(false);
              setOwnerCode('');
            }}
          />
        </View>
      </View>
    );
  }

  function renderAdminMenuEditor() {
    const categories = CATEGORIES.filter(
      (category) =>
        category !== 'Lunch' &&
        category !== 'Boka bord'
    );

    const items =
      fullMenu[editingCategory] || [];

    return (
      <View style={styles.adminSection}>
        <Text style={styles.adminTitle}>
          Ändra alla maträtter
        </Text>

        <Text style={styles.description}>
          Välj kategori. Du kan ändra maträtt,
          pris, lägga till eller ta bort.
        </Text>

        <View style={styles.wrapRow}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() =>
                setEditingCategory(category)
              }
              style={[
                styles.adminCategoryButton,
                editingCategory === category &&
                  styles.adminCategoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.adminCategoryText,
                  editingCategory === category &&
                    styles.adminCategoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.adminSubTitle}>
          {editingCategory}
        </Text>

        {items.map(([name, price], index) => (
          <View
            key={`${editingCategory}-${index}`}
            style={styles.menuEditCard}
          >
            <Text style={styles.editLabel}>
              Maträtt {index + 1}
            </Text>

            <TextInput
              style={styles.field}
              value={String(name || '')}
              placeholder="Maträtt"
              onChangeText={(text) =>
                changeMenuItem(
                  editingCategory,
                  index,
                  'name',
                  text
                )
              }
            />

            <TextInput
              style={styles.field}
              value={String(price ?? '')}
              placeholder="Pris"
              keyboardType="number-pad"
              onChangeText={(text) =>
                changeMenuItem(
                  editingCategory,
                  index,
                  'price',
                  text
                )
              }
            />

            <AppButton
              title="Ta bort maträtt"
              danger
              onPress={() =>
                deleteMenuItem(
                  editingCategory,
                  index
                )
              }
            />
          </View>
        ))}

        <AppButton
          title="+ Lägg till maträtt"
          outline
          onPress={() =>
            addMenuItem(editingCategory)
          }
        />

        <AppButton
          title={`Spara ${editingCategory}`}
          onPress={() =>
            saveFullMenuCategory(
              editingCategory
            )
          }
        />
      </View>
    );
  }

  function renderAdminLunchEditor() {
    return (
      <View style={styles.adminSection}>
        <Text style={styles.adminTitle}>
          Ändra veckans lunch
        </Text>

        <View style={styles.wrapRow}>
          {Object.keys(DEFAULT_LUNCH).map(
            (dayName) => (
              <TouchableOpacity
                key={dayName}
                onPress={() =>
                  setEditDay(dayName)
                }
                style={[
                  styles.adminCategoryButton,
                  editDay === dayName &&
                    styles.adminCategoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.adminCategoryText,
                    editDay === dayName &&
                      styles.adminCategoryTextActive,
                  ]}
                >
                  {dayName}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <Text style={styles.adminSubTitle}>
          {editDay}
        </Text>

        <TextInput
          style={styles.field}
          placeholder="Maträtt 1"
          value={editDish1}
          onChangeText={setEditDish1}
        />

        <TextInput
          style={styles.field}
          placeholder="Maträtt 2"
          value={editDish2}
          onChangeText={setEditDish2}
        />

        <TextInput
          style={styles.field}
          placeholder="Maträtt 3"
          value={editDish3}
          onChangeText={setEditDish3}
        />

        <AppButton
          title={`Spara ${editDay}`}
          onPress={saveMenuChanges}
        />
      </View>
    );
  }
  function renderAdminOrders() {
    return (
      <View style={styles.adminSection}>
        <View style={styles.adminTitleRow}>
          <Text style={styles.adminTitle}>
            Beställningar
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadOrders}
          >
            <Text style={styles.refreshButtonText}>
              Uppdatera
            </Text>
          </TouchableOpacity>
        </View>

        {!orders.length ? (
          <Text style={styles.emptyText}>
            Inga beställningar just nu.
          </Text>
        ) : (
          orders.map((order) => (
            <View
              key={order.id}
              style={styles.orderAdminCard}
            >
              <Text style={styles.orderNumber}>
                Beställning #{order.id}
              </Text>

              <Text style={styles.adminInfo}>
                Namn: {order.customer_name || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Telefon: {order.customer_phone || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Datum: {order.pickup_date || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Tid: {order.pickup_time || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Typ: {order.order_type || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Status: {order.status || 'Ny'}
              </Text>

              <Text style={styles.adminInfo}>
                Totalt: {order.total || 0} kr
              </Text>

              {!!order.message && (
                <Text style={styles.adminMessage}>
                  Meddelande: {order.message}
                </Text>
              )}

              <Text style={styles.editLabel}>
                Maträtter:
              </Text>

              {Array.isArray(order.items) &&
                order.items.map((item, index) => (
                  <Text
                    key={`${order.id}-item-${index}`}
                    style={styles.orderItemText}
                  >
                    {item.qty || 1} × {item.name}
                  </Text>
                ))}

              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() =>
                    updateOrderStatus(
                      order.id,
                      'Ny'
                    )
                  }
                >
                  <Text style={styles.statusButtonText}>
                    Ny
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() =>
                    updateOrderStatus(
                      order.id,
                      'Tillagas'
                    )
                  }
                >
                  <Text style={styles.statusButtonText}>
                    Tillagas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    styles.readyButton,
                  ]}
                  onPress={() =>
                    updateOrderStatus(
                      order.id,
                      'Färdig'
                    )
                  }
                >
                  <Text style={styles.statusButtonText}>
                    Maten färdig
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  function renderAdminBookings() {
    return (
      <View style={styles.adminSection}>
        <View style={styles.adminTitleRow}>
          <Text style={styles.adminTitle}>
            Bordsbokningar
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadBookings}
          >
            <Text style={styles.refreshButtonText}>
              Uppdatera
            </Text>
          </TouchableOpacity>
        </View>

        {!bookings.length ? (
          <Text style={styles.emptyText}>
            Inga bokningar just nu.
          </Text>
        ) : (
          bookings.map((booking) => (
            <View
              key={booking.id}
              style={styles.orderAdminCard}
            >
              <Text style={styles.orderNumber}>
                Bokning #{booking.id}
              </Text>

              <Text style={styles.adminInfo}>
                Namn: {booking.customer_name || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Telefon: {booking.customer_phone || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Datum: {booking.booking_date || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Tid: {booking.booking_time || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Gäster: {booking.guests || '-'}
              </Text>

              <Text style={styles.adminInfo}>
                Status: {booking.status || 'Ny'}
              </Text>

              {!!booking.message && (
                <Text style={styles.adminMessage}>
                  Meddelande: {booking.message}
                </Text>
              )}

              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() =>
                    updateBookingStatus(
                      booking.id,
                      'Ny'
                    )
                  }
                >
                  <Text style={styles.statusButtonText}>
                    Ny
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    styles.readyButton,
                  ]}
                  onPress={() =>
                    updateBookingStatus(
                      booking.id,
                      'Bekräftad'
                    )
                  }
                >
                  <Text style={styles.statusButtonText}>
                    Bekräfta
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  function renderAdminScreen() {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        <View style={styles.adminHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminHeaderTitle}>
              Husman Admin
            </Text>

            <Text style={styles.adminHeaderText}>
              Ägarläge
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutButtonText}>
              Logga ut
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.adminContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.adminWelcome}>
            <Text style={styles.adminWelcomeTitle}>
              Restaurang / Admin
            </Text>

            <Text style={styles.description}>
              Här kan du ändra hela menyn,
              kontrollera beställningar och
              bordsbokningar.
            </Text>
          </View>

          {renderAdminLunchEditor()}

          {renderAdminMenuEditor()}

          {renderAdminOrders()}

          {renderAdminBookings()}

          <AppButton
            title="Logga ut"
            danger
            onPress={logout}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderLunch() {
    const lunchItems = weeklyLunch[day] || [];

    return (
      <>
        <Text style={styles.heading}>
          Veckans lunch
        </Text>

        <Image
          source={{ uri: FOOD_IMAGES.Lunch }}
          style={styles.sectionImage}
        />

        <View style={styles.dayButtons}>
          {Object.keys(DEFAULT_LUNCH).map(
            (dayName) => (
              <TouchableOpacity
                key={dayName}
                onPress={() => setDay(dayName)}
                style={[
                  styles.dayButton,
                  day === dayName &&
                    styles.dayButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    day === dayName &&
                      styles.dayButtonTextActive,
                  ]}
                >
                  {dayName}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <Text style={styles.dayTitle}>{day}</Text>

        {lunchItems.map((dish, index) => (
          <View
            key={`${day}-${index}`}
            style={styles.lunchCard}
          >
            <Text style={styles.foodName}>
              {dish}
            </Text>

            <View style={styles.lunchPrices}>
              {ORDER_TYPES.map(
                ([type, price]) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.lunchPriceButton}
                    onPress={() => {
                      setOrderType(type);
                      addToCart(dish, price);
                    }}
                  >
                    <Text
                      style={
                        styles.lunchPriceButtonText
                      }
                    >
                      {type}
                    </Text>

                    <Text
                      style={styles.lunchPrice}
                    >
                      {price} kr
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        ))}
      </>
    );
  }

  function renderCustomerMenu() {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        <Header
          onOwnerAccess={() =>
            setShowOwnerLogin(true)
          }
        />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Image
              source={{ uri: FOOD_IMAGES.Lunch }}
              style={styles.heroImage}
            />

            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>
                Välkommen till Husman
              </Text>

              <Text style={styles.heroText}>
                Husmanskost, pizza, hamburgare
                och mycket mer.
              </Text>
            </View>
          </View>

          <View style={styles.categoryWrap}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() =>
                  setSection(category)
                }
                style={[
                  styles.tab,
                  section === category &&
                    styles.tabActive,
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
          </View>

          {section === 'Lunch' &&
            renderLunch()}

          {section === 'Boka bord' &&
            renderBooking()}

          {section !== 'Lunch' &&
            section !== 'Boka bord' &&
            fullMenu[section] && (
              <>
                <Text style={styles.heading}>
                  {section}
                </Text>

                {!!FOOD_IMAGES[section] && (
                  <Image
                    source={{
                      uri: FOOD_IMAGES[section],
                    }}
                    style={styles.sectionImage}
                  />
                )}

                {fullMenu[section].map(
                  ([name, price], index) => (
                    <Food
                      key={`${section}-${index}-${name}`}
                      name={name}
                      price={price}
                      onAdd={() =>
                        addToCart(name, price)
                      }
                    />
                  )
                )}
              </>
            )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              Husman Lunchrestaurang
            </Text>

            <Text style={styles.infoText}>
              Öppettider
            </Text>

            <Text style={styles.infoText}>
              Måndag–fredag 08:00–14:00
            </Text>

            <Text style={styles.infoText}>
              Lördag–söndag stängt
            </Text>

            <Text style={styles.paymentText}>
              Betalning sker i restaurangen.
            </Text>
          </View>
        </ScrollView>

        {cartCount > 0 && (
          <TouchableOpacity
            style={styles.floatingCart}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.floatingCartText}>
              🛒 Varukorg ({cartCount}) • {cartTotal} kr
            </Text>
          </TouchableOpacity>
        )}

        {renderOwnerLogin()}
      </SafeAreaView>
    );
  }

  if (admin) {
    return renderAdminScreen();
  }

  if (showCart) {
    return renderCart();
  }

  return renderCustomerMenu();
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f8fc',
  },

  container: {
    padding: 16,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dce8f3',
  },

  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#075da8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },

  restaurantName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#073b66',
  },

  restaurantSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#61788c',
  },

  cartButton: {
    backgroundColor: '#075da8',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 18,
  },

  cartButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },

  heroImage: {
    width: '100%',
    height: 190,
  },

  heroTextBox: {
    padding: 16,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#073b66',
  },

  heroText: {
    fontSize: 14,
    color: '#5d7183',
    marginTop: 5,
    lineHeight: 20,
  },

  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  tab: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    marginRight: 7,
    marginBottom: 7,
  },

  tabActive: {
    backgroundColor: '#075da8',
    borderColor: '#075da8',
  },

  tabText: {
    color: '#174866',
    fontWeight: '700',
    fontSize: 13,
  },

  tabTextActive: {
    color: '#ffffff',
  },

  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#073b66',
    marginBottom: 12,
    marginTop: 5,
  },

  smallHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#073b66',
    marginTop: 16,
    marginBottom: 8,
  },

  sectionImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 14,
  },

  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0eaf2',
  },

  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18394f',
    lineHeight: 22,
  },

  foodPrice: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '800',
    color: '#075da8',
  },

  addButton: {
    backgroundColor: '#075da8',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 18,
  },

  addButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },

  dayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  dayButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginRight: 6,
    marginBottom: 6,
  },

  dayButtonActive: {
    backgroundColor: '#075da8',
    borderColor: '#075da8',
  },

  dayButtonText: {
    color: '#174866',
    fontWeight: '700',
  },

  dayButtonTextActive: {
    color: '#ffffff',
  },

  dayTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#073b66',
    marginVertical: 10,
  },

  lunchCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },

  lunchPrices: {
    marginTop: 12,
  },

  lunchPriceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#edf5fb',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },

  lunchPriceButtonText: {
    color: '#164b70',
    fontWeight: '700',
  },

  lunchPrice: {
    color: '#075da8',
    fontWeight: '900',
  },

  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },

  description: {
    color: '#61788c',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  field: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#17384e',
    marginBottom: 10,
  },

  messageField: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  button: {
    backgroundColor: '#075da8',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  buttonOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#075da8',
  },

  buttonOutlineText: {
    color: '#075da8',
  },

  buttonDanger: {
    backgroundColor: '#b42318',
  },

  pickerButtonWide: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },

  pickerText: {
    color: '#17384e',
    fontSize: 16,
  },

  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },

  optionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 18,
    marginRight: 7,
    marginBottom: 7,
  },

  optionButtonActive: {
    backgroundColor: '#075da8',
    borderColor: '#075da8',
  },

  optionText: {
    color: '#174866',
    fontWeight: '700',
  },

  optionTextActive: {
    color: '#ffffff',
  },

  timeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  timeButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbddec',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 7,
    marginBottom: 7,
  },

  timeButtonActive: {
    backgroundColor: '#075da8',
    borderColor: '#075da8',
  },

  timeButtonText: {
    color: '#17384e',
    fontWeight: '700',
  },

  timeButtonTextActive: {
    color: '#ffffff',
  },

  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#075da8',
  },

  quantityNumber: {
    marginHorizontal: 8,
    fontWeight: '800',
    color: '#17384e',
  },

  deleteText: {
    color: '#b42318',
    fontWeight: '700',
    fontSize: 12,
  },

  totalBox: {
    backgroundColor: '#e8f2fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  totalText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#073b66',
  },

  emptyText: {
    color: '#61788c',
    fontSize: 15,
    paddingVertical: 8,
  },

  infoBox: {
    backgroundColor: '#073b66',
    padding: 18,
    borderRadius: 16,
    marginTop: 18,
  },

  infoTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
  },

  infoText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },

  paymentText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },

  floatingCart: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
    backgroundColor: '#075da8',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignItems: 'center',
  },

  floatingCartText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },

  ownerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  ownerLoginBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
  },

  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#073b66',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  adminHeaderTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },

  adminHeaderText: {
    color: '#d7e8f5',
    marginTop: 2,
  },

  logoutButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 18,
  },

  logoutButtonText: {
    color: '#073b66',
    fontWeight: '800',
  },

  adminContainer: {
    padding: 14,
    paddingBottom: 80,
  },

  adminWelcome: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
  },

  adminWelcomeTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#073b66',
    marginBottom: 6,
  },

  adminSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },

  adminTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#073b66',
    marginBottom: 10,
  },

  adminSubTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#075da8',
    marginVertical: 10,
  },

  adminTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  adminCategoryButton: {
    backgroundColor: '#eef5fa',
    borderWidth: 1,
    borderColor: '#cbddec',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },

  adminCategoryButtonActive: {
    backgroundColor: '#075da8',
    borderColor: '#075da8',
  },

  adminCategoryText: {
    color: '#174866',
    fontSize: 12,
    fontWeight: '700',
  },

  adminCategoryTextActive: {
    color: '#ffffff',
  },

  menuEditCard: {
    backgroundColor: '#f5f9fc',
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },

  editLabel: {
    color: '#17384e',
    fontWeight: '800',
    marginBottom: 7,
  },

  orderAdminCard: {
    backgroundColor: '#f5f9fc',
    borderRadius: 13,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },

  orderNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#073b66',
    marginBottom: 7,
  },

  adminInfo: {
    color: '#17384e',
    fontSize: 14,
    marginBottom: 4,
  },

  adminMessage: {
    color: '#17384e',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },

  orderItemText: {
    color: '#17384e',
    marginBottom: 3,
  },

  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },

  statusButton: {
    backgroundColor: '#075da8',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 17,
    marginRight: 7,
    marginBottom: 7,
  },

  statusButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  readyButton: {
    backgroundColor: '#18864b',
  },

  refreshButton: {
    backgroundColor: '#e8f2fa',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 16,
  },

  refreshButtonText: {
    color: '#075da8',
    fontWeight: '800',
  },
});
