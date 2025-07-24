#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <BME280I2C.h>
#include <Wire.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

// Configuration
#define DEVICE_ID "ESP32_001"
#define MAX_ZONES 4
#define MAX_SENSORS 12
#define WIFI_TIMEOUT 30000
#define SERVER_URL "https://your-server.com/api"

// Pins
#define PUMP_PIN 2
#define VALVE_PINS {4, 5, 18, 19}
#define SOIL_SENSOR_PINS {32, 33, 34, 35}
#define SDA_PIN 21
#define SCL_PIN 22

// Structures
struct SensorData {
  float temperature;
  float humidity;
  float pressure;
  float soilMoisture[MAX_ZONES];
  unsigned long timestamp;
};

struct AICommand {
  String commandId;
  String action;
  int zoneId;
  int duration;
  bool executed;
};

// Variables globales
BME280I2C bme;
WiFiClient wifiClient;
HTTPClient http;
String jwtToken = "";
SensorData currentData;
QueueHandle_t commandQueue;
TaskHandle_t sensorTaskHandle;
TaskHandle_t commTaskHandle;
TaskHandle_t controlTaskHandle;

// Configuration WiFi
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apSSID = "ESP32_Irrigation_Setup";
const char* apPassword = "irrigation123";

// Prototypes
void setupWiFi();
void sensorTask(void* parameter);
void communicationTask(void* parameter);
void controlTask(void* parameter);
void wifiManagerTask(void* parameter);
bool authenticateDevice();
void sendSensorData();
void getAICommands();
void executeCommand(AICommand cmd);
void localFallback();

void setup() {
  Serial.begin(115200);
  
  // Initialiser les pins
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  
  int valvePins[] = VALVE_PINS;
  for(int i = 0; i < MAX_ZONES; i++) {
    pinMode(valvePins[i], OUTPUT);
    digitalWrite(valvePins[i], LOW);
  }
  
  // Initialiser I2C et BME280
  Wire.begin(SDA_PIN, SCL_PIN);
  if(!bme.begin()) {
    Serial.println("Erreur: BME280 non trouvé!");
  }
  
  // Créer la queue pour les commandes
  commandQueue = xQueueCreate(10, sizeof(AICommand));
  
  // Configurer WiFi
  setupWiFi();
  
  // Authentifier le device
  if(authenticateDevice()) {
    Serial.println("Device authentifié avec succès");
  } else {
    Serial.println("Erreur d'authentification - Mode local activé");
  }
  
  // Créer les tâches FreeRTOS
  xTaskCreatePinnedToCore(
    sensorTask,
    "SensorTask",
    4096,
    NULL,
    2,
    &sensorTaskHandle,
    0
  );
  
  xTaskCreatePinnedToCore(
    communicationTask,
    "CommTask", 
    8192,
    NULL,
    1,
    &commTaskHandle,
    1
  );
  
  xTaskCreatePinnedToCore(
    controlTask,
    "ControlTask",
    4096,
    NULL,
    3,
    &controlTaskHandle,
    0
  );
  
  Serial.println("Système d'irrigation démarré");
}

void loop() {
  // Le loop principal est vide car tout est géré par les tâches FreeRTOS
  vTaskDelay(pdMS_TO_TICKS(1000));
}

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  unsigned long startTime = millis();
  while(WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi connecté. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Échec connexion WiFi - Démarrage du point d'accès");
    
    WiFi.mode(WIFI_AP);
    WiFi.softAP(apSSID, apPassword);
    Serial.print("Point d'accès démarré. IP: ");
    Serial.println(WiFi.softAPIP());
  }
}

bool authenticateDevice() {
  if(WiFi.status() != WL_CONNECTED) return false;
  
  http.begin(String(SERVER_URL) + "/auth/device");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["firmwareVersion"] = "1.0.0";
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if(httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    jwtToken = responseDoc["token"].as<String>();
    http.end();
    return true;
  }
  
  http.end();
  return false;
}

void sensorTask(void* parameter) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(30000); // 30 secondes
  
  while(true) {
    // Lire BME280
    float temp, hum, pres;
    bme.read(pres, temp, hum, BME280::TempUnit_Celsius, BME280::PresUnit_Pa);
    
    currentData.temperature = temp;
    currentData.humidity = hum;
    currentData.pressure = pres;
    currentData.timestamp = millis();
    
    // Lire capteurs d'humidité du sol
    int soilPins[] = SOIL_SENSOR_PINS;
    for(int i = 0; i < MAX_ZONES; i++) {
      int rawValue = analogRead(soilPins[i]);
      // Convertir en pourcentage (calibration nécessaire)
      currentData.soilMoisture[i] = map(rawValue, 0, 4095, 0, 100);
    }
    
    Serial.printf("Capteurs - Temp: %.1f°C, Hum: %.1f%%, Sol: %.1f%%\n", 
                  temp, hum, currentData.soilMoisture[0]);
    
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

void communicationTask(void* parameter) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(3600000); // 1 heure
  
  while(true) {
    if(WiFi.status() == WL_CONNECTED && jwtToken.length() > 0) {
      // Envoyer les données des capteurs
      sendSensorData();
      
      // Récupérer les commandes IA
      getAICommands();
    } else {
      Serial.println("Pas de connexion - Mode local activé");
      localFallback();
    }
    
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

void controlTask(void* parameter) {
  AICommand command;
  
  while(true) {
    // Vérifier s'il y a des commandes en attente
    if(xQueueReceive(commandQueue, &command, pdMS_TO_TICKS(1000)) == pdTRUE) {
      executeCommand(command);
    }
    
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void sendSensorData() {
  http.begin(String(SERVER_URL) + "/data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + jwtToken);
  
  DynamicJsonDocument doc(2048);
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = currentData.timestamp;
  
  JsonObject global = doc.createNestedObject("global");
  global["temp"] = currentData.temperature;
  global["pressure"] = currentData.pressure;
  
  JsonArray locals = doc.createNestedArray("locals");
  for(int i = 0; i < MAX_ZONES; i++) {
    JsonObject sensor = locals.createNestedObject();
    sensor["sensorId"] = i;
    sensor["soilMoisture"] = currentData.soilMoisture[i];
    sensor["temp"] = currentData.temperature;
    sensor["humidity"] = currentData.humidity;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if(httpCode == 200) {
    Serial.println("Données envoyées avec succès");
  } else {
    Serial.printf("Erreur envoi données: %d\n", httpCode);
  }
  
  http.end();
}

void getAICommands() {
  http.begin(String(SERVER_URL) + "/ai/commands/" + DEVICE_ID);
  http.addHeader("Authorization", "Bearer " + jwtToken);
  
  int httpCode = http.GET();
  
  if(httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, response);
    
    JsonArray commands = doc["commands"];
    for(JsonObject cmd : commands) {
      AICommand aiCmd;
      aiCmd.commandId = cmd["commandId"].as<String>();
      aiCmd.action = cmd["action"].as<String>();
      aiCmd.zoneId = cmd["zoneId"];
      aiCmd.duration = cmd["params"]["duration"] | 0;
      aiCmd.executed = false;
      
      xQueueSend(commandQueue, &aiCmd, 0);
    }
  }
  
  http.end();
}

void executeCommand(AICommand cmd) {
  Serial.printf("Exécution commande: %s pour zone %d\n", 
                cmd.action.c_str(), cmd.zoneId);
  
  int valvePins[] = VALVE_PINS;
  
  if(cmd.action == "START_IRRIGATION") {
    digitalWrite(PUMP_PIN, HIGH);
    digitalWrite(valvePins[cmd.zoneId], HIGH);
    
    if(cmd.duration > 0) {
      vTaskDelay(pdMS_TO_TICKS(cmd.duration * 1000));
      digitalWrite(valvePins[cmd.zoneId], LOW);
      digitalWrite(PUMP_PIN, LOW);
    }
  } 
  else if(cmd.action == "STOP_IRRIGATION") {
    digitalWrite(valvePins[cmd.zoneId], LOW);
    digitalWrite(PUMP_PIN, LOW);
  }
  
  // Confirmer l'exécution au serveur
  http.begin(String(SERVER_URL) + "/ai/commands/" + cmd.commandId + "/executed");
  http.addHeader("Authorization", "Bearer " + jwtToken);
  http.POST("");
  http.end();
}

void localFallback() {
  // Mode autonome basé sur les seuils locaux
  for(int i = 0; i < MAX_ZONES; i++) {
    if(currentData.soilMoisture[i] < 20.0) { // Seuil critique
      Serial.printf("Mode local: Arrosage zone %d (humidité: %.1f%%)\n", 
                    i, currentData.soilMoisture[i]);
      
      int valvePins[] = VALVE_PINS;
      digitalWrite(PUMP_PIN, HIGH);
      digitalWrite(valvePins[i], HIGH);
      
      vTaskDelay(pdMS_TO_TICKS(30000)); // 30 secondes
      
      digitalWrite(valvePins[i], LOW);
      digitalWrite(PUMP_PIN, LOW);
    }
  }
}
