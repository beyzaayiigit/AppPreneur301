import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { EditorScreen } from './src/screens/EditorScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { markLaunchStarted, recordAppLaunch } from './src/lib/kpi';
import { dark } from './src/theme/colors';
import { manropeFontMap } from './src/theme/typography';

export default function App() {
  const [uri, setUri] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    markLaunchStarted();
    void recordAppLaunch();
  }, []);

  useEffect(() => {
    void Font.loadAsync(manropeFontMap)
      .catch(() => {
        /* Yükleme başarısız olsa bile uygulama açılsın; metinler sistem fontuna düşer */
      })
      .finally(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.fontSplash}>
          <ActivityIndicator color={dark.primary} size="large" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {uri ? (
        <EditorScreen imageUri={uri} onBack={() => setUri(null)} />
      ) : (
        <WelcomeScreen onImageSelected={setUri} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  fontSplash: {
    flex: 1,
    backgroundColor: dark.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
