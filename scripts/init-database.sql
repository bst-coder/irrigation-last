-- Script d'initialisation pour MongoDB (JavaScript)
-- Ce fichier sera exécuté au démarrage de MongoDB

// Créer les collections avec validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "passwordHash", "role"],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^.+@.+$" },
        passwordHash: { bsonType: "string" },
        role: { enum: ["user", "technician", "developer"] },
        devices: { bsonType: "array" },
        zones: { bsonType: "array" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("devices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["deviceId", "ownerUserId", "maxZones", "maxSensors"],
      properties: {
        deviceId: { bsonType: "string" },
        ownerUserId: { bsonType: "objectId" },
        maxZones: { bsonType: "int", minimum: 1, maximum: 4 },
        maxSensors: { bsonType: "int", minimum: 1, maximum: 12 },
        configuredZones: { bsonType: "int" },
        status: { enum: ["online", "offline"] },
        lastSeen: { bsonType: "date" },
        firmwareVersion: { bsonType: "string" },
        zones: { bsonType: "array" }
      }
    }
  }
});

db.createCollection("zones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "plantType", "soilType", "deviceId", "ownerUserId"],
      properties: {
        name: { bsonType: "string" },
        plantType: { bsonType: "string" },
        soilType: { bsonType: "string" },
        location: {
          bsonType: "object",
          properties: {
            lat: { bsonType: "double" },
            lng: { bsonType: "double" }
          }
        },
        area: { bsonType: "double", minimum: 0 },
        plantCount: { bsonType: "int", minimum: 0 },
        aiEnabled: { bsonType: "bool" },
        deviceId: { bsonType: "string" },
        ownerUserId: { bsonType: "objectId" }
      }
    }
  }
});

db.createCollection("sensorsData", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["zoneId", "deviceId", "timestamp"],
      properties: {
        zoneId: { bsonType: "objectId" },
        deviceId: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        global: {
          bsonType: "object",
          properties: {
            temp: { bsonType: "double" },
            pressure: { bsonType: "double" }
          }
        },
        locals: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              sensorId: { bsonType: "int" },
              soilMoisture: { bsonType: "double" },
              temp: { bsonType: "double" },
              humidity: { bsonType: "double" }
            }
          }
        }
      }
    }
  }
});

db.createCollection("aiCommands", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["zoneId", "deviceId", "action", "status"],
      properties: {
        zoneId: { bsonType: "objectId" },
        deviceId: { bsonType: "string" },
        action: { enum: ["STOP_IRRIGATION", "START_IRRIGATION", "ADJUST_DURATION"] },
        params: { bsonType: "object" },
        status: { enum: ["pending", "sent", "executed", "failed"] },
        createdAt: { bsonType: "date" },
        executedAt: { bsonType: "date" }
      }
    }
  }
});

// Créer les index pour optimiser les performances
db.users.createIndex({ "email": 1 }, { unique: true });
db.devices.createIndex({ "deviceId": 1 }, { unique: true });
db.devices.createIndex({ "ownerUserId": 1 });
db.zones.createIndex({ "ownerUserId": 1 });
db.zones.createIndex({ "deviceId": 1 });
db.sensorsData.createIndex({ "zoneId": 1, "timestamp": -1 });
db.sensorsData.createIndex({ "deviceId": 1, "timestamp": -1 });
db.aiCommands.createIndex({ "status": 1, "createdAt": -1 });

// Insérer des données de test
db.users.insertOne({
  name: "Utilisateur Test",
  email: "test@example.com",
  passwordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm", // password123
  role: "user",
  devices: [],
  zones: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Base de données initialisée avec succès!");
