import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { EditorScreen } from './src/screens/EditorScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { markLaunchStarted, recordAppLaunch } from './src/lib/kpi';
import { theme } from './src/theme/colors';

export default function App() {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    markLaunchStarted();
    void recordAppLaunch();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      {uri ? (
        <EditorScreen imageUri={uri} onBack={() => setUri(null)} />
      ) : (
        <WelcomeScreen onImageSelected={setUri} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.lilac },
});
