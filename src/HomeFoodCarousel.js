import React, { useEffect, useRef, useState } from 'react';
import { AppState, Image, PanResponder, View } from 'react-native';
import slides from './homeFoodSlides';

export default function HomeFoodCarousel({ style, active = true }) {
  const [index, setIndex] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [loaded, setLoaded] = useState({});
  const [failed, setFailed] = useState({});
  const available = slides.map((_, i) => i).filter(i => !failed[i]);
  const move = direction => setIndex(current => {
    const position = available.indexOf(current);
    return available.length ? available[(position + direction + available.length) % available.length] : current;
  });
  const moveRef = useRef(move);
  moveRef.current = move;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) > 30) moveRef.current(gesture.dx < 0 ? 1 : -1); },
  })).current;
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (failed[index] && available.length) setIndex(available[0]);
  }, [failed, index]);
  useEffect(() => {
    if (!active || !foreground || !loaded[index] || available.length < 2) return;
    const timer = setTimeout(() => moveRef.current(1), 5000);
    return () => clearTimeout(timer);
  }, [active, foreground, index, loaded, failed]);
  return (
    <View style={style} {...pan.panHandlers} accessible accessibilityRole="image"
      accessibilityLabel={slides[index].name + '. Bild ' + (index + 1) + ' av ' + slides.length}
      accessibilityHint="Bilden växlar var femte sekund. Svep för att byta bild.">
      {slides.map((slide, i) => (
        <Image key={slide.name} source={slide.source} accessible={false} resizeMode="cover"
          onLoad={() => setLoaded(previous => previous[i] ? previous : { ...previous, [i]: true })}
          onError={() => setFailed(previous => previous[i] ? previous : { ...previous, [i]: true })}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: i === index ? 1 : 0 }} />
      ))}
    </View>
  );
}
