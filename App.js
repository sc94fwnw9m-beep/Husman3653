import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const sections = {
  'Frukost': [
    ['Kaffe', 25], ['Fralla med ost', 25], ['Fralla med ost och skinka', 25], ['Kokt ägg', 10]
  ],
  'Lunch': [
    ['Dagens husmanskost', 139], ['Dagens fisk', 139], ['Dagens alternativ', 139]
  ],
  'Pasta': [['Penne Paradiso', 139], ['Con Pollo', 139], ['Spaghetti Carbonara', 139]],
  'Hamburgare': [['Hemlagad högrevsburgare', 139], ['Chili Cheese Burger', 139], ['Texas BBQ Burger', 139]],
  'Pizza': [['Kycklingpizza', 139], ['Calzone', 139]],
  'Kebab': [['Kebabtallrik', 139], ['Kebabrulle', 139]],
  'Sallader': [['Kycklingsallad', 139], ['Tonfisksallad', 139], ['Caesarsallad', 139]],
  'Veganskt': [['Krispig vegoburgare', 139], ['Vegoschnitzel', 139]],
};

const orderTypes = [
  ['Ta med', 129], ['Äta här', 139], ['Endast mat', 119]
];

export default function App() {
  const [section, setSection] = useState('Lunch');
  const [orderType, setOrderType] = useState('Äta här');
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [showCart, setShowCart] = useState(false);

  const isBreakfast = section === 'Frukost';
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  const add = (name, menuPrice) => {
    const selected = orderTypes.find(([label]) => label === orderType);
    const price = isBreakfast ? menuPrice : (selected?.[1] ?? menuPrice);
    setCart((old) => [...old, { id: Date.now() + Math.random(), name, price }]);
  };

  if (showCart) {
    return (
      <SafeAreaView style={s.page}>
        <StatusBar style="dark" />
        <View style={s.header}><Text style={s.logo}>HUSMAN3653</Text><Text style={s.sub}>Din beställning</Text></View>
        <ScrollView contentContainerStyle={s.content}>
          {cart.length === 0 ? <Text style={s.empty}>Kundkorgen är tom.</Text> : cart.map((item) => (
            <View key={item.id} style={s.cartRow}>
              <View style={{flex:1}}><Text style={s.itemTitle}>{item.name}</Text><Text style={s.muted}>{item.price} kr</Text></View>
              <TouchableOpacity onPress={() => setCart(c => c.filter(x => x.id !== item.id))}><Text style={s.remove}>Ta bort</Text></TouchableOpacity>
            </View>
          ))}
          <Text style={s.total}>Totalt: {total} kr</Text>
          <Text style={s.label}>Meddelande till restaurangen</Text>
          <TextInput value={message} onChangeText={setMessage} multiline placeholder="Skriv ditt meddelande här…" style={s.input} />
          <View style={s.info}><Text style={s.infoText}>Betalning sker på restaurangen. Ingen kortbetalning i appen.</Text></View>
          <TouchableOpacity style={s.primary} onPress={() => {}}><Text style={s.primaryText}>Godkänn beställning</Text></TouchableOpacity>
          <TouchableOpacity style={s.secondary} onPress={() => setShowCart(false)}><Text style={s.secondaryText}>Tillbaka till menyn</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.page}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}><Text style={s.logo}>HUSMAN3653</Text><Text style={s.sub}>Husman Lunchrestaurang</Text></View>
        <View style={s.info}><Text style={s.infoText}>Betalning sker på restaurangen. Ingen kortbetalning i appen.</Text></View>

        {!isBreakfast && <View style={s.types}>{orderTypes.map(([label, price]) => (
          <TouchableOpacity key={label} onPress={() => setOrderType(label)} style={[s.typeBtn, orderType === label && s.typeActive]}>
            <Text style={[s.typeText, orderType === label && s.typeTextActive]}>{label}\n{price} kr</Text>
          </TouchableOpacity>
        ))}</View>}

        <Text style={s.heading}>Meny</Text>
        <View style={s.tabs}>{Object.keys(sections).map((name) => (
          <TouchableOpacity key={name} onPress={() => setSection(name)} style={[s.tab, section === name && s.tabActive]}>
            <Text style={[s.tabText, section === name && s.tabTextActive]}>{name}</Text>
          </TouchableOpacity>
        ))}</View>

        <Text style={s.heading}>{section}</Text>
        {section === 'Lunch' && <Text style={s.date}>📅 Veckans lunchmeny</Text>}
        {sections[section].map(([name, price]) => (
          <View key={name} style={s.card}>
            <View style={{flex:1}}><Text style={s.itemTitle}>{name}</Text><Text style={s.muted}>{isBreakfast ? price : orderTypes.find(x => x[0] === orderType)?.[1]} kr</Text></View>
            <TouchableOpacity style={s.add} onPress={() => add(name, price)}><Text style={s.addText}>+ Lägg till</Text></TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.primary} onPress={() => setShowCart(true)}><Text style={s.primaryText}>Kundkorg ({cart.length}) • {total} kr</Text></TouchableOpacity>
        <TouchableOpacity style={s.secondary}><Text style={s.secondaryText}>Boka bord</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = '#0961b8';
const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#f5f9ff'}, content:{padding:18,paddingBottom:42}, header:{alignItems:'center',paddingVertical:18},
  logo:{fontSize:30,fontWeight:'900',color:BLUE,letterSpacing:1}, sub:{fontSize:16,color:'#38536f',marginTop:4},
  info:{backgroundColor:'#e6f1ff',borderRadius:14,padding:14,marginBottom:16}, infoText:{color:'#153d66',fontSize:15,fontWeight:'600',textAlign:'center'},
  types:{flexDirection:'row',gap:8,marginBottom:18}, typeBtn:{flex:1,borderWidth:1,borderColor:'#b9d3ef',borderRadius:12,paddingVertical:11,backgroundColor:'#fff'},
  typeActive:{backgroundColor:BLUE,borderColor:BLUE}, typeText:{textAlign:'center',fontWeight:'700',color:'#31516f'}, typeTextActive:{color:'#fff'},
  heading:{fontSize:22,fontWeight:'800',color:'#102847',marginTop:8,marginBottom:10}, tabs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},
  tab:{paddingVertical:9,paddingHorizontal:13,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#d5e3f2'}, tabActive:{backgroundColor:BLUE,borderColor:BLUE},
  tabText:{fontWeight:'700',color:'#31516f'},tabTextActive:{color:'#fff'}, date:{color:BLUE,fontWeight:'700',marginBottom:10},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',padding:15,borderRadius:15,marginBottom:10,borderWidth:1,borderColor:'#e0ebf6'},
  itemTitle:{fontSize:17,fontWeight:'750',color:'#102847'},muted:{color:'#64788e',marginTop:4},add:{backgroundColor:'#e6f1ff',paddingVertical:10,paddingHorizontal:12,borderRadius:10},addText:{color:BLUE,fontWeight:'800'},
  primary:{backgroundColor:BLUE,borderRadius:14,padding:16,marginTop:18},primaryText:{color:'#fff',fontSize:17,fontWeight:'800',textAlign:'center'},
  secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:BLUE,borderRadius:14,padding:15,marginTop:10},secondaryText:{color:BLUE,fontSize:16,fontWeight:'800',textAlign:'center'},
  cartRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',padding:15,borderRadius:14,marginBottom:9},remove:{color:'#a52a2a',fontWeight:'700'},
  total:{fontSize:22,fontWeight:'900',color:'#102847',textAlign:'right',marginVertical:14},label:{fontSize:16,fontWeight:'800',color:'#102847',marginBottom:8},
  input:{minHeight:110,textAlignVertical:'top',backgroundColor:'#fff',borderWidth:1,borderColor:'#cbdced',borderRadius:14,padding:14,fontSize:16,marginBottom:14},empty:{textAlign:'center',color:'#64788e',padding:30}
});
