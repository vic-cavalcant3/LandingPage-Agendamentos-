import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import * as Animatable from "react-native-animatable";
import { StatusBar } from "expo-status-bar";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons, FontAwesome, Feather } from "@expo/vector-icons";
import { MaskedTextInput } from "react-native-mask-text";

export default function Agendamento() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [profissional, setProfissional] = useState("");
  const [loading, setLoading] = useState(false);

  const profissionais = [
    { label: "Selecione um profissional", value: "" },
    { label: "Dr. João Silva - Psicólogo", value: "Dr. João Silva" },
    { label: "Dra. Maria Santos - Psiquiatra", value: "Dra. Maria Santos" },
    { label: "Dr. Pedro Costa - Terapeuta", value: "Dr. Pedro Costa" },
    { label: "Dra. Ana Oliveira - Psicóloga", value: "Dra. Ana Oliveira" },
    { label: "Dr. Carlos Lima - Psiquiatra", value: "Dr. Carlos Lima" },
  ];

  const formatarCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, "");
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return cpf;
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  const dismissKeyboard = () => {
    try {
      if (Keyboard && typeof Keyboard.dismiss === "function") {
        Keyboard.dismiss();
      }
    } catch (error) {
      console.log("Erro ao dismissar teclado:", error);
    }
  };

  const agendar = async () => {
    console.log("Função agendar chamada");

    // Validações
    if (!nome.trim() || !cpf.trim() || !telefone.trim() || !email.trim()) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios");
      return;
    }

    if (!validarCPF(cpf)) {
      Alert.alert("Erro", "CPF inválido");
      return;
    }

    if (!profissional) {
      Alert.alert("Erro", "Selecione um profissional");
      return;
    }

    if (!data || !hora) {
      Alert.alert("Erro", "Preencha a data e horário da consulta");
      return;
    }

    // Validação de data
    const [dia, mes, ano] = data.split("/");
    if (
      !dia ||
      !mes ||
      !ano ||
      dia.length !== 2 ||
      mes.length !== 2 ||
      ano.length !== 4
    ) {
      Alert.alert("Erro", "Data deve estar no formato DD/MM/AAAA");
      return;
    }

    const dataFormatada = `${ano}-${mes}-${dia}`;
    const dataCompleta = new Date(`${dataFormatada}T${hora}:00`);

    if (isNaN(dataCompleta.getTime()) || dataCompleta <= new Date()) {
      Alert.alert("Erro", "Informe uma data e horário válidos no futuro");
      return;
    }

    setLoading(true);

    try {
      console.log("Enviando dados para o servidor...");

      const [dia, mes, ano] = data.split("/");
      const dataMySQL = `${ano}-${mes}-${dia}`;

      const dadosAgendamento = {
        nome: nome.trim(),
        cpf: cpf.replace(/[^\d]+/g, ""),
        telefone: telefone.trim(),
        email: email.trim(),
        data: dataMySQL, // Envia já no formato correto
        horario: hora.trim(),
        profissional: profissional.trim(),
      };

      const response = await fetch("http://192.168.0.169:4000/agendamentos", { // ADICIONAR IP DA MAQUINA(SE FOR USAR --TUNNEL ESTAR NA MESMA INERNET QUE A MAQUINA)
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(dadosAgendamento),
      });

      console.log("Dados a serem enviados:", dadosAgendamento);
      console.log("Teste de conexão - Status:", response.status);
      console.log(
        "Teste de conexão - Content-Type:",
        response.headers.get("content-type")
      );

      if (!response.ok) {
        throw new Error(
          `Servidor não está respondendo corretamente. Status: ${response.status}`
        );
      }

      const responseText = await response.text();
      console.log("Resposta do teste:", responseText);

      try {
        JSON.parse(responseText);
        console.log("Servidor respondendo com JSON válido");
      } catch (e) {
        console.error("Servidor não está retornando JSON:", testText);
        Alert.alert(
          "Erro",
          "Servidor não está configurado corretamente. Verifique se o servidor Node.js está rodando."
        );
        return;
      }

      console.log("Response status:", response.status);
      console.log(
        "Response Content-Type:",
        response.headers.get("content-type")
      );

      // Verificar se a resposta tem content-type correto
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Resposta não é JSON. Content-Type:", contentType);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert("Erro", "Resposta do servidor inválida.");
        return;
      }

      console.log("Response data:", result);

      if (response.ok && result.success) {
        Alert.alert("Sucesso!", "Agendamento realizado com sucesso!");
        // Limpar campos
        setNome("");
        setCpf("");
        setTelefone("");
        setEmail("");
        setData("");
        setHora("");
        setProfissional("");
      } else {
        Alert.alert(
          "Erro",
          result.message || `Erro ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Erro na requisição:", error);

      if (error.message.includes("Network request failed")) {
        Alert.alert(
          "Erro de Conexão",
          "Não foi possível conectar ao servidor. Verifique:\n\n1. Se o servidor Node.js está rodando\n2. Se o IP 10.136.23.37 está correto\n3. Se você está na mesma rede\n4. Se não há firewall bloqueando"
        );
      } else if (error.message.includes("fetch")) {
        Alert.alert(
          "Erro",
          "Erro de rede. Verifique sua conexão e se o servidor está rodando."
        );
      } else {
        Alert.alert("Erro", `Erro inesperado: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <Animatable.View
          animation="fadeInLeft"
          delay={500}
          style={styles.containerHeader}
        >
          <View style={styles.headerContent}>
            <Text style={styles.message}>Agendar Sessão</Text>
            <Text style={styles.subMessage}>
              Preencha os dados para marcar sua consulta
            </Text>
          </View>
          <View style={styles.decorativeCircle}></View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" style={styles.containerForm}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Dados Pessoais</Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Nome completo"
                    style={styles.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <FontAwesome
                    name="id-card-o"
                    size={18}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="000.000.000-00"
                    style={styles.input}
                    value={cpf}
                    onChangeText={(text) => setCpf(formatarCPF(text))}
                    keyboardType="numeric"
                    maxLength={14}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Feather
                    name="phone"
                    size={18}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Telefone"
                    style={styles.input}
                    value={telefone}
                    onChangeText={setTelefone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="email"
                    size={18}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Email"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Detalhes da Consulta</Text>

              <View style={styles.inputContainer}>
                <Feather
                  name="calendar"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <MaskedTextInput
                  mask="99/99/9999"
                  placeholder="Data (DD-MM-YYYY.)"
                  keyboardType="numeric"
                  style={styles.input}
                  value={data}
                  onChangeText={(text, rawText) => setData(text)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Feather
                  name="clock"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <MaskedTextInput
                  mask="99:99"
                  placeholder="Horário (HH:MM)"
                  keyboardType="numeric"
                  style={styles.input}
                  value={hora}
                  onChangeText={setHora}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="medical-services"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={profissional}
                    style={styles.picker}
                    onValueChange={(itemValue) => setProfissional(itemValue)}
                  >
                    {profissionais.map((prof) => (
                      <Picker.Item
                        key={prof.value}
                        label={prof.label}
                        value={prof.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={agendar}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Agendando..." : "Confirmar Agendamento"}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        </Animatable.View>
        <StatusBar style="light" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  containerHeader: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 25,
    backgroundColor: "#6C63FF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    zIndex: 2,
  },

  message: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 5,
  },
  subMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  containerForm: {
    backgroundColor: "#F8F9FA",
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#6C63FF",
    paddingLeft: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 20,
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  dateInput: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    height: 50,
    color: "#333",
  },
  button: {
    backgroundColor: "#6C63FF",
    marginBottom: 30,
    width: "100%",
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#6C63FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    shadowColor: "transparent",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
  },
});
