import { APIClient } from './services/api-client.js';

// Simple functional approach:
// import { sendPrompt } from './src/services/simple-api.js';

const client = new APIClient();
const apiKey = getApiKey();
const region = "us-east-1";
const style = "Standard";
const colorScheme = "Light";

// Declare map variable globally
let map = null;
// Array to store dynamically added markers
let dynamicMarkers = [];

function getApiKey() {
  const viteKey = import.meta.env.VITE_LOCATION_API_KEY;
  if (viteKey) {
      console.log('✅ API Key loaded from Vite');
      return viteKey;
  } else {
      console.error('❌ VITE_LOCATION_API_KEY not found in environment variables.');
      return null;
  }
}

if (!apiKey) {
  document.getElementById('map').innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8f9fa; color:rgb(22, 21, 21); font-family: Arial, sans-serif;">
            <div style="text-align: center; padding: 20px;">
                <h2>⚠️ Configuration Error</h2>
                <svg width="400" height="10">
                  <line x1="0" y1="1" x2="600" y2="1" stroke="black" stroke-width="0.5" />
                </svg>
                <h4>AWS Location Services API key not found</h4>
            </div>
        </div>
    `;
} else {
  // Initialize the map and assign to global variable
  map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`,
    center: [18.0686, 59.3293],
    zoom: 11
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), "top-left");

  // Initial points of interest (static)
  const initialPoints = [{
      lng: 18.0009,
      lat: 59.3728,
      title: 'Friends Arena',
      description: "Sweden's national football stadium in Solna",
      type: 'stadium'
    },
    {
      lng: 18.0649,
      lat: 59.3326,
      title: 'Stockholm City',
      description: 'Capital and largest city of Sweden',
      type: 'city'
    },
    {
      lng: 17.6389,
      lat: 59.8586,
      title: 'Uppsala',
      description: 'Historic university city north of Stockholm',
      type: 'university'
    }
  ];

  // Add initial markers when the map is loaded
  map.on('load', () => {
    addMarkersToMap(initialPoints);
  });
}

// Function to add markers to the map
function addMarkersToMap(points, isDynamic = false) {
  points.forEach((point, index) => {
    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    
    // For dynamic markers, use a different numbering or styling
    if (isDynamic) {
      markerElement.textContent = '★';
      markerElement.classList.add('dynamic-marker');
    } else {
      markerElement.textContent = (index + 1).toString();
    }

    // Add specific classes based on point type
    if (point.type) {
      markerElement.classList.add(point.type);
    }

    // Create popup
    const popup = new maplibregl.Popup({
        offset: 25
      })
      .setHTML(`<h3>${point.title}</h3><p>${point.description}</p>`);

    // Create marker
    const marker = new maplibregl.Marker({
        element: markerElement
      })
      .setLngLat([point.lng, point.lat])
      .setPopup(popup)
      .addTo(map);

    // Add click event to marker
    markerElement.addEventListener('click', () => {
      addBotMessage(`You clicked on ${point.title}! ${point.description}`);
    });

    // Store dynamic markers for potential cleanup
    if (isDynamic) {
      dynamicMarkers.push(marker);
    }
  });
}

// Function to add a single point dynamically
function addDynamicPoint(lng, lat, title, description, type = 'city') {
  // Fly to the new point
  map.flyTo({
    center: [lng, lat],
    zoom: 12
  });

  // Clear existing dynamic markers
  clearDynamicMarkers();

  const point = {
    lng: lng,
    lat: lat,
    title: title,
    description: description,
    type: type
  };
 
  addMarkersToMap([point], true);

}

// Function to clear all dynamic markers
function clearDynamicMarkers() {
  dynamicMarkers.forEach(marker => marker.remove());
  dynamicMarkers = [];
}

// Database of locations that can be added dynamically
const locationDatabase = {
  'rome': {
    lng: 12.4964,
    lat: 41.9028,
    title: 'Rome',
    description: 'Capital of Italy, famous for its history, art and culture',
    type: 'city'
  },
  'paris': {
    lng: 2.3522,
    lat: 48.8566,
    title: 'Paris',
    description: 'Capital of France, known as the City of Light',
    type: 'city'
  },
  'london': {
    lng: -0.1276,
    lat: 51.5074,
    title: 'London',
    description: 'Capital of the United Kingdom',
    type: 'city'
  },
  'berlin': {
    lng: 13.4050,
    lat: 52.5200,
    title: 'Berlin',
    description: 'Capital of Germany',
    type: 'city'
  },
  'madrid': {
    lng: -3.7038,
    lat: 40.4168,
    title: 'Madrid',
    description: 'Capital of Spain',
    type: 'city'
  },
  'barcelona': {
    lng: 2.1734,
    lat: 41.3851,
    title: 'Barcelona',
    description: 'Catalonian city famous for Gaudí architecture',
    type: 'city'
  },
  'amsterdam': {
    lng: 4.9041,
    lat: 52.3676,
    title: 'Amsterdam',
    description: 'Capital of the Netherlands, known for canals',
    type: 'city'
  },
  'vienna': {
    lng: 16.3738,
    lat: 48.2082,
    title: 'Vienna',
    description: 'Capital of Austria, famous for classical music',
    type: 'city'
  }
};

// Global variables for chat
const chatContainer = document.getElementById('chatContainer');
const chatHeader = document.getElementById('chatHeader');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const typingWrapper = document.getElementById('typingWrapper');
const typingIndicator = document.getElementById('typingIndicator');

clearHistoryBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
});

let chatMinimized = false;

// Chat minimize functionality
minimizeBtn.addEventListener('click', () => {
  chatMinimized = !chatMinimized;
  chatContainer.classList.toggle('minimized', chatMinimized);
  minimizeBtn.textContent = chatMinimized ? '+' : '−';
});

// Send message with Enter
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send message with button
sendBtn.addEventListener('click', sendMessage);

// Suggestion chips
suggestionChips.forEach(btn => {
  btn.addEventListener('click', () => sendSuggestion(btn.dataset.suggestion));
});

// Helper functions for chat
function addMessage(content, isUser = false) {
  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user' : 'bot'}`;
  div.innerHTML = `
        <div class="avatar ${isUser ? 'user-avatar' : 'bot-avatar'}">
            ${isUser ? '💬' : '🤖'}
        </div>
        <div class="message-content">${content}</div>
    `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  typingWrapper.style.display = 'flex';
  typingIndicator.style.display = 'block';
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  typingWrapper.style.display = 'none';
  typingIndicator.style.display = 'none';
}

function addBotMessage(text) {
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage(text, false);
  }, 1000 + Math.random() * 1500);
}

async function getBotResponse(msg) {
  const lc = msg.toLowerCase();

  // Check if map is available
  if (!apiKey || !map) {
    return "Sorry, the map is not available because the API key configuration is missing.";
  }

  // Check for clear command
  if (lc.includes('/clear')) {
    clearDynamicMarkers();
    return "All dynamic markers have been cleared from the map.";
  }

  // Check for locations in the database
  for (const [key, location] of Object.entries(locationDatabase)) {
    if (lc.includes(key)) {
      addDynamicPoint(location.lng, location.lat, location.title, location.description, location.type);
      return `${location.title} has been added to the map! ${location.description}`;
    }
  }

  if (lc.includes('usa')) {
    map.flyTo({
      center: [-123.13000, 49.2850],
      zoom: 10
    });
    // Add a data source containing GeoJSON data.
    map.addSource("amazon-lockers", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                -123.13271,
                49.2901,
              ],
            },
            properties: {
              title: "Amazon Hub Locker - Robson",
              address: "1675 Robson St, Vancouver, BC V6G 1C8, Canada",
            },
          },
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                -123.13428,
                49.2807,
              ],
            },
            properties: {
              title: "Amazon Hub Locker - Bobtail",
              address: "1176 Burnaby St, Vancouver, BC V6E 1P1, Canada",
            },
          },
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                -123.12419,
                49.28169,
              ],
            },
            properties: {
              title: "Amazon Hub Locker - Voltmeter",
              address: "900 Burrard St, Vancouver, BC V6Z 3G5, Canada",
            },
          },
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                -123.12858,
                49.27838,
              ],
            },
            properties: {
              title: "Amazon Hub Locker - Asif",
              address: "904 Davie St, Vancouver, BC V6Z 1B8, Canada",
            },
          },
        ],
      },
    });

    // Add a new layer to visualize the points.
    map.addLayer({
      id: "amazon-lockers",
      type: "circle",
      source: "amazon-lockers",
      paint: {
        "circle-radius": 8,
        "circle-color": "#0080ff",
      },
    });
    return "Go to usa.";
  }


  // Original static responses for existing points
  if (lc.includes('stockholm')) {
    map.flyTo({
      center: [18.0649, 59.3326],
      zoom: 10
    });
    return "Stockholm is the capital of Sweden, built on 14 islands connected by more than 50 bridges.";
  }

  if (lc.includes('friends arena')) {
    map.flyTo({
      center: [18.0009, 59.3728],
      zoom: 15
    });
    return "Friends Arena is Sweden's national football stadium, located in Solna, north of Stockholm.";
  }

  if (lc.includes('uppsala')) {
    map.flyTo({
      center: [17.6389, 59.8586],
      zoom: 12
    });
    return "Uppsala is a historic university city founded in 1477, famous for its cathedral.";
  }

  if (lc.includes('distance') || lc.includes('far') || lc.includes('distancia')) {
    map.flyTo({
      center: [-123.12500, 49.27700],
      zoom: 14
    });
    map.addSource("route", {
          type: "geojson",
          data: {
                type: "Feature",
                geometry: {
                      type: "LineString",
                      coordinates: [
                            [-123.12882, 49.27676],
                            [-123.11914, 49.28314],
                            [-123.1231, 49.2857],
                            [-123.12598, 49.28388],
                            [-123.12965, 49.28635],
                            [-123.13597, 49.28208],
                            [-123.14136, 49.28552],
                      ],
                },
          },
    });

    // Add a new layer to visualize the line.
    map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
                "line-join": "round",
                "line-cap": "round",
          },
          paint: {
                "line-color": "#00b0ff",
                "line-width": 8,
          },
    });
    return "Stockholm-Uppsala: ≈70 km; Stockholm-Friends Arena: ≈8 km; Uppsala-Friends Arena: ≈65 km.";
  }

  if (lc.includes('prompt')) {
    console.log('\n--- Single Prompt Example ---');
    const prompt = "Hi!";
    console.log('Sending prompt:', prompt);
    
    const result = await client.sendPrompt(prompt);
    return result;
  }

  if (lc.includes('hello') || lc.includes('hi') || lc.includes('hola')) {
    return "Hello! I can help you with information about cities and places. Try asking about Rome, Paris, London, Berlin, Madrid, Barcelona, Amsterdam, Vienna, or the original points Stockholm, Uppsala and Friends Arena. You can also type 'clear markers' to remove dynamic points.";
  }

  if (lc.includes('/help') || lc.includes('what can you do')) {
    const availableCities = Object.keys(locationDatabase).join(', ');
    return `I can show you information about these cities: ${availableCities}. Just mention any city name and I'll add it to the map! You can also ask about Stockholm, Uppsala, Friends Arena, or type 'clear markers' to remove added points.`;
  }

  return "I don't have that information, but try asking me about Rome, Paris, London, Berlin, Madrid, Barcelona, Amsterdam, Vienna, or the original locations on the map. Type 'help' to see all available commands.";
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, true);
  messageInput.value = '';

  const botReply = await getBotResponse(text);
  addBotMessage(botReply);
}

async function sendSuggestion(text) {
  addMessage(text, true);

  const botReply = await getBotResponse(text);
  addBotMessage(botReply);
}

// Initial scroll when page loads
window.addEventListener('DOMContentLoaded', () => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});