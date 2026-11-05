
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// The OTP server runs on the laptop inside `npx expo start` (src/app/api/otp).
// In development, relative URLs like '/api/otp/send' go to that server.
async function callOtpServer(path, payload) {
  // Give up after 15 seconds instead of spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      'Cannot reach the OTP server. Keep "npx expo start" running on the laptop and keep the phone on the same Wi-Fi.'
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Server error (HTTP ${response.status}).`);
  }
  return data;
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState('');

  const sendOTP = async () => {
    // Accept "+92 300-1234567" by removing spaces and dashes.
    const normalizedPhoneNumber = phoneNumber.replace(/[\s-]/g, '');

    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Enter your number with country code, e.g. +923001234567'
      );
      return;
    }

    try {
      setLoading(true);

      await callOtpServer('/api/otp/send', { phone: normalizedPhoneNumber });

      setPhoneNumber(normalizedPhoneNumber);
      setOtp('');
      setOtpSent(true);

      Alert.alert(
        'OTP Sent',
        'A 6-digit OTP was generated. Read it from the server console on the laptop.'
      );
    } catch (error) {
      Alert.alert('Could Not Send OTP', error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpSent) {
      Alert.alert(
        'Request OTP First',
        'Please enter your phone number and request an OTP.'
      );
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    try {
      setLoading(true);

      const result = await callOtpServer('/api/otp/verify', {
        phone: phoneNumber,
        otp: otp.trim(),
      });

      setUserId(result.userId);
      setVerified(true);

      Alert.alert(
        'Success',
        result.newUser
          ? `Your phone number is verified and registered as ${result.userId}.`
          : `Your phone number is verified. Welcome back, ${result.userId}.`
      );
    } catch (error) {
      setOtp('');
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber('');
    setOtp('');
    setOtpSent(false);
    setVerified(false);
    setUserId('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>OTP VERIFY</Text>

        <Text style={styles.heading}>
          Phone Verification
        </Text>

        <Text style={styles.subtitle}>
          Verify your phone number using a one-time password.
        </Text>

        {verified ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>

            <Text style={styles.successTitle}>
              Verification Successful!
            </Text>

            <Text style={styles.successText}>
              Your phone number has been verified successfully.
            </Text>

            <Text style={styles.userIdText}>
              {phoneNumber} · User ID {userId}
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={resetForm}
            >
              <Text style={styles.buttonText}>
                Verify Another Number
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>
              Phone Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="+923001234567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!otpSent}
            />

            {!otpSent && (
              <TouchableOpacity
                style={styles.button}
                onPress={sendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {otpSent && (
              <>
                <Text style={styles.hintText}>
                  OTP generated for {phoneNumber}. Read it from the server
                  console on the laptop.
                </Text>

                <Text style={styles.label}>
                  Enter Verification Code
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={verifyOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Verify OTP
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={sendOTP} disabled={loading}>
                  <Text style={styles.resetText}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={resetForm}>
                  <Text style={styles.resetText}>
                    Change Phone Number
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          OTP generated by the app's own server (laptop console)
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 14,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172554',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
    elevation: 3,
  },
  label: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
  },
  button: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resetText: {
    textAlign: 'center',
    color: '#2563EB',
    fontWeight: '600',
    padding: 12,
  },
  successBox: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 3,
  },
  successIcon: {
    color: '#16A34A',
    fontSize: 55,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#166534',
    marginTop: 12,
  },
  successText: {
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 22,
  },
  hintText: {
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  userIdText: {
    color: '#172554',
    fontWeight: '700',
    marginBottom: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 30,
  },
});
