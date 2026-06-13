import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>On Tap</Text>
        <Text style={styles.subtitle}>
          React Native (TypeScript) frontend template
        </Text>
        <Text style={styles.subtitle}>Backend API: http://localhost:5000</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "#1e293b",
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 16,
    color: "#cbd5e1",
  },
});
