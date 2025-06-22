import { APIClient } from './services/api-client.js';

// Simple functional approach:
// import { sendPrompt } from './src/services/simple-api.js';

const client = new APIClient();
const apiKey = getApiKey();
const region = "us-east-1";
const style = "Standard";
const colorScheme = "Light";
// Set initial view
const homeView = {
  center: [25, 40],
  zoom: 2,
  pitch: 0,
  bearing: 0
};

class HomeControl {
  constructor(homeView) {
    this.homeView = homeView;
  }

  onAdd(map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    
    this.homeButton = document.createElement('button');
    this.homeButton.className = 'maplibregl-ctrl-icon';
    this.homeButton.type = 'button';
    this.homeButton.title = 'Reset to home view';
    this.homeButton.innerHTML = '↩'; // or use an icon
    
    this.homeButton.addEventListener('click', () => {
      this.map.flyTo(this.homeView);
    });
    
    this.container.appendChild(this.homeButton);
    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}

// Declare map variable globally
let map = null;
// Array to store dynamically added markers
let dynamicMarkers = [];

function getApiKey() {
  const viteKey = import.meta.env.VITE_LOCATION_API_KEY;
  if (viteKey) {
      console.log('✅ Start ok');
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
    // Europe
    center: [25, 40], // longitude, latitude
    zoom: 2,
    maxZoom: 18, // Maximum zoom in level
    minZoom: 1   // Maximum zoom out level (lower number = more zoomed out)
  });

  map.addControl(new maplibregl.NavigationControl({
    showZoom: true,
    visualizePitch: true
  }), 'top-left');

  // Function to initialize the map
  initializeMap();

  // Add custom home control
  map.addControl(new HomeControl(homeView), 'top-left');

}

// Function to load points from JSON file
async function loadInitialPoints() {
  try {
    const response = await fetch('../public/aws-regions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const initialPoints = await response.json();
    return initialPoints;
  } catch (error) {
    console.error('Error loading points data:', error);
    // Return fallback data or empty array
    return [];
  }
}

async function initializeMap() {
  const initialPoints = await loadInitialPoints();
  
  // Add initial markers when the map is loaded
  map.on('load', () => {
    addMarkersToMap(initialPoints);
  });
}

// Create bouncing dots wait message
function createBouncingDotsMessage() {
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'bouncing-dots';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dotsContainer.appendChild(dot);
  }
  
  return dotsContainer;
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

    // For hover popup
    markerElement.addEventListener('mouseenter', () => {
      popup.setLngLat([point.lng, point.lat])
            .addTo(map);
    });

    markerElement.addEventListener('mouseleave', () => {
      popup.remove();
    });

    // Add click event to marker
    markerElement.addEventListener('click', () => {
      // addBotMessage(`${point.long_description}`);
      map.flyTo({
        center: [point.lng, point.lat],
        zoom: 12
      });
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
  
  // Create avatar
  const avatar = document.createElement('div');
  avatar.className = `avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`;
  avatar.textContent = isUser ? '💬' : '🤖';
  
  // Create message content container
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  // Handle different content types
  if (typeof content === 'string') {
    // Parse markdown to HTML
    const htmlContent = marked.parse(content);
    messageContent.innerHTML = htmlContent;
  } else if (content instanceof HTMLElement) {
    messageContent.appendChild(content);
  }
  
  // Append avatar and content to message div
  div.appendChild(avatar);
  div.appendChild(messageContent);
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return div;
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

function addBotMessage(content, isWaitMessage = false) {
  if (isWaitMessage) {
    return addMessage(content, false);
  } else {
    showTyping();
    hideTyping();
    return addMessage(content, false);
  }
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
  // for (const [key, location] of Object.entries(locationDatabase)) {
  //   if (lc.includes(key)) {
  //     addDynamicPoint(location.lng, location.lat, location.title, location.description, location.type);
  //     return `${location.title} has been added to the map! ${location.description}`;
  //   }
  // }

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
    // Send system message and store reference
    const waitMsg = await waitMessage();
    
    try {
      const result = await client.sendPrompt(lc);
      console.log('Response:', result);
      return result.response;
    } catch (error) {
      console.error('Error sending prompt:', error.message);
      return "Error occurred while processing prompt";
    } finally {
      // Remove wait message in both success and error cases
      if (waitMsg && waitMsg.remove) {
        waitMsg.remove();
      }
    }
  }

  if (lc.includes('hello') || lc.includes('hi') || lc.includes('hola')) {
    return "Hello! I can help you with information about cities and places. Try asking about Rome, Paris, London, Berlin, Madrid, Barcelona, Amsterdam, Vienna, or the original points Stockholm, Uppsala and Friends Arena. You can also type 'clear markers' to remove dynamic points.";
  }

  if (lc.includes('/help') || lc.includes('what can you do')) {
    return `Help info.`;
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

async function waitMessage() {
  const waitMsgElement = createBouncingDotsMessage();
  return addBotMessage(waitMsgElement, true);
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