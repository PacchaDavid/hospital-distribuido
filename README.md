# Sistema Distribuido de Gestión de Donación de Órganos

Implementación de un sistema distribuido con los algoritmos **Bully** (elección de coordinador), **Cristian** (sincronización de relojes) y **Exclusión Mutua Centralizada**, con visualización web en tiempo real.

---

## Requisitos

- Node.js LTS (v20+)
- npm
- Linux (para sincronización de reloj con `timedatectl`)

---

## Instalación

```bash
# Clonar el repositorio
git clone <repo> hospital3
cd hospital3

# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
cd client && npm install && cd ..
```

---

## Configuración de Red

Las IPs de los nodos están definidas en `src/config.ts`. Por defecto:

| ID | IP             | Hospital            |
| -- | -------------- | ------------------- |
| 1  | 192.168.1.10   | Hospital Loja       |
| 2  | 192.168.1.11   | Hospital Cuenca     |
| 3  | 192.168.1.12   | Hospital Esmeraldas |
| 4  | 192.168.1.13   | Hospital Guayaquil  |
| 5  | 192.168.1.14   | Hospital Quito      |

Si tus IPs son diferentes, edita la tabla en `src/config.ts` o usa la variable `NODE_ID` para sobrescribir la identidad.

---

## Ejecución

### Servidor (en cada máquina)

```bash
# El nodo detecta automáticamente su IP y se asigna ID y nombre
npx tsx src/index.ts

# O forzar un ID específico (útil para pruebas locales)
NODE_ID=1 npx tsx src/index.ts
```

Puertos usados:
- `9000` — Comunicación TCP entre nodos
- `8080` — API REST (Fastify)
- `8081` — WebSocket (Socket.IO)

Asegúrate de que estos puertos estén abiertos en el firewall de cada máquina.

### Frontend (desarrollo)

```bash
cd client
npm run dev
# Abrir http://localhost:5173
```

### Frontend (producción)

El servidor Fastify sirve automáticamente el frontend compilado.

```bash
cd client && npm run build && cd ..
# Luego iniciar el servidor normalmente
npx tsx src/index.ts
# Abrir http://[IP_DEL_NODO]:8080
```

---

## Sincronización de Relojes (Algoritmo Cristian)

El coordinador funciona como servidor de tiempo. Los seguidores pueden sincronizar sus relojes vía el panel web.

### Configurar `timedatectl` sin contraseña

En **cada máquina**, crear el archivo `/etc/sudoers.d/organ-cluster`:

```bash
sudo visudo -f /etc/sudoers.d/organ-cluster
```

Con el siguiente contenido (reemplaza `organcluster` por tu usuario real):

```
organcluster ALL=(ALL) NOPASSWD: /usr/bin/timedatectl
```

Verificar que funcione:

```bash
sudo timedatectl set-time "2026-06-21 12:00:00"
```

### Sincronizar manualmente

1. Abrir el panel web del coordinador
2. Hacer clic en **"Sincronizar Ahora"**

### Sincronización periódica

1. Desde el panel del coordinador, activar el switch **"Sincronización Periódica"**
2. Los seguidores sincronizarán cada 60 segundos automáticamente
3. La configuración se hereda si cambia el coordinador

---

## Escenarios de Demostración

### Caso 1: Arranque normal
Iniciar las 5 máquinas. El nodo de mayor ID (Quito) será elegido coordinador.

### Caso 2: Caída del coordinador
Desconectar el cable de red del coordinador. Los seguidores detectan la caída en ~3s, se inicia una nueva elección, y el siguiente de mayor ID asume.

### Caso 3: Reaparición del coordinador original
Reconectar el nodo de mayor ID. Al detectar que tiene mayor ID que el coordinador actual, inicia elección Bully y recupera el liderazgo.

### Caso 4: Exclusión mutua
Dos nodos solicitan acceso simultáneamente al recurso compartido. Solo uno obtiene acceso; el otro espera en cola FIFO.

---

## Estructura del Proyecto

```
hospital3/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── config.ts             # Configuración de nodos y constantes
│   ├── identity.ts           # Detección de identidad por IP
│   ├── logger.ts             # Logger (Pino)
│   ├── tcp/
│   │   ├── protocol.ts       # Protocolo JSON delimitado por línea
│   │   ├── server.ts         # Servidor TCP (puerto 9000)
│   │   └── connection.ts     # Conexiones persistentes con reconexión
│   ├── bully/
│   │   └── election.ts       # Algoritmo Bully + heartbeats
│   ├── cristian/
│   │   └── sync.ts           # Algoritmo Cristian
│   ├── mutex/
│   │   └── mutex.ts          # Exclusión mutua centralizada
│   ├── resource/
│   │   └── resource.ts       # Recurso compartido + replicación
│   ├── persistence/
│   │   └── store.ts          # SQLite (estado persistente)
│   └── web/
│       ├── api.ts            # API REST (Fastify, puerto 8080)
│       └── socket.ts         # WebSocket (Socket.IO, puerto 8081)
├── client/
│   └── src/
│       ├── App.tsx           # Componente principal
│       ├── store.ts          # Estado global (Zustand)
│       ├── socket.ts         # Cliente Socket.IO
│       └── components/
│           ├── Dashboard.tsx       # Panel de hospitales
│           ├── CoordinatorPanel.tsx # Panel de coordinación
│           ├── OrganPanel.tsx      # CRUD de órganos
│           └── EventLog.tsx        # Log de eventos
├── organos.json              # Datos iniciales del recurso
└── data/                     # Base de datos SQLite (runtime)
```
