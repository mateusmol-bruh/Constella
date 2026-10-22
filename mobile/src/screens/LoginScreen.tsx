import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Constella
      </Text>

      <Text style={styles.subtitle}>
        Bem-vinda ao Constella!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6B4EA0",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    color: "#333333",
  },
});
