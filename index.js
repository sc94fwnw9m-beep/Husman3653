// Temporary diagnostic entry for TestFlight runtime 1.0.9 / build 90.
// No remote error reporting and no database writes are added.
const registerRootComponent = require('expo/src/launch/registerRootComponent').default;
const React = require('react');
const { SafeAreaView, ScrollView, Text } = require('react-native');
let failure = null;
let showFailure = null;
function captureFailure(error, stage) {
  failure = {
    stage,
    message: String(error?.message || error || 'Okänt startfel'),
    stack: String(error?.stack || ''),
  };
  if (showFailure) showFailure(failure);
}
const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
if (global.ErrorUtils?.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) captureFailure(error, 'JavaScript');
    else if (previousHandler) previousHandler(error, isFatal);
  });
}
let RestaurantApp;
try {
  RestaurantApp = require('./App').default;
} catch (error) {
  captureFailure(error, 'Appimport');
}
function FailureScreen({ error }) {
  return React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: '#fff' } },
    React.createElement(ScrollView, { contentContainerStyle: { padding: 24 } },
      React.createElement(Text, { style: { fontSize: 22, fontWeight: '700', color: '#0755ad' } }, 'Husman – startfelsökning'),
      React.createElement(Text, { selectable: true, style: { marginTop: 16, color: '#111' } },
        `Bygge 90 / runtime 1.0.9\nSteg: ${error.stage}\n\n${error.message}\n\n${error.stack}`)));
}
class StartupBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failure }; }
  static getDerivedStateFromError(error) {
    return { failure: { stage: 'React', message: String(error?.message || error), stack: String(error?.stack || '') } };
  }
  componentDidCatch(error) { captureFailure(error, 'React'); }
  componentDidMount() {
    showFailure = error => this.setState({ failure: error });
    if (failure) showFailure(failure);
  }
  componentWillUnmount() { showFailure = null; }
  render() {
    return this.state.failure
      ? React.createElement(FailureScreen, { error: this.state.failure })
      : React.createElement(RestaurantApp);
  }
}
registerRootComponent(StartupBoundary);
