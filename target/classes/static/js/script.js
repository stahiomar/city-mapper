mapboxgl.accessToken = 'pk.eyJ1IjoiLS1vbWFyLS0iLCJhIjoiY201a3Q2aWlzMTl6bTJ2czZwcjlzejR4bCJ9.sAgoTh2ZjL8Q11hCvOF_AQ';

let map;
let currentPositionCoordinates = null;
let destinationCoordinates = null;
let searchHistory = [];
const MAX_HISTORY_ITEMS = 10;
const mapboxGeocoder = `
<link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" rel="stylesheet">
`;






let tramwayStops = [
    // L1
    { name: "Hay Karima", coordinates: ["-6.794246224945461", "34.05464631714516"] },
    { name: "Tabriquet", coordinates: ["-6.800993309186225", "34.04766614317356"] },
    { name: "La Poste", coordinates: ["-6.806649813841445", "34.04550597264528"] },
    { name: "Mohammed V - Opera", coordinates: ["-6.811097793614758", "34.043560564866304"] },
    { name: "Diar", coordinates: ["-6.815551369821723", "34.04091184221076"] },
    { name: "Gare de Salé", coordinates: ["-6.816379696592143", "34.037826890027794"] },
    // L1 and L2
    { name: "Bab Lamrissa", coordinates: ["-6.819288387795674", "34.03243655886321"] },
    { name: "Pont Hassan II", coordinates: ["-6.821624664398336", "34.02546173900698"] },
    { name: "Place du 16 Novembre", coordinates: ["-6.825320618825434", "34.02473203749335"] },
    { name: "Tour Hassan", coordinates: ["-6.826795850906636", "34.01950333666214"] },
    // L1
    { name: "Place Al Joulane L1", coordinates: ["-6.831501303140653", "34.01829105738103"] },
    { name: "Mohammed V Gare de Rabat-Ville", coordinates: ["-6.836279441009599", "34.016036978789515"] },
    { name: "Bab Rouah", coordinates: ["-6.838892619896942", "34.01219904995462"] },
    { name: "Bibliothèque Nationale", coordinates: ["-6.84288168964933", "34.00932574262255"] },
    { name: "Ibn Khaldoun", coordinates: ["-6.843039157107899", "34.00471008488984"] },
    { name: "Nations Unies", coordinates: ["-6.843903727336229", "33.999797426579185"] },
    { name: "Agdal Avenue de France", coordinates: ["-6.849085754994158", "33.99748484514149"] },
    { name: "Ibn Sina", coordinates: ["-6.852543483004251", "33.99534319546036"] },
    { name: "Ibn Rochd", coordinates: ["-6.858133194080482", "33.98915876329694"] },
    { name: "Cité Universitaire Souissi", coordinates: ["-6.8610418224530125", "33.98620190898654"] },
    { name: "Madinat Al Irfane", coordinates: ["-6.864295289263639", "33.982998717504664"] },

    // L2
    { name: "Hopital Moulay Youssef", coordinates: ["-6.859073101423991", "34.01098237789067"] },
    { name: "Sidi Mohamed Ben Abdellah", coordinates: ["-6.854665316973613", "34.01625811674855"] },
    { name: "Place de Russie", coordinates: ["-6.850326545468422", "34.01891299637765"] },
    { name: "Bab El Had", coordinates: ["-6.842757716632256", "34.02097059120332"] },
    { name: "Medina", coordinates: ["-6.838942261821657", "34.02193861307675"] },
    { name: "Bab Chellah", coordinates: ["-6.833697174304354", "34.023909554715615"] },
    { name: "Place Al Joulane L2", coordinates: ["-6.8313618282713024", "34.01909139591549"] },
    { name: "Arrazi", coordinates: ["-6.812477352570147", "34.0354903439645"] },
    { name: "Bettana", coordinates: ["-6.806606033681246", "34.03652700808385"] },
    { name: "Hassan", coordinates: ["-6.799659759188666", "34.035505006097566"] }
];

// Add this to your existing JavaScript
let isHistoryCollapsed = true; // Start collapsed

// Create a debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create the autocomplete functionality
function initializeAutocomplete() {
    const searchInput = document.getElementById('placeInput');
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggestions-container';
    searchInput.parentNode.insertBefore(suggestionsContainer, searchInput.nextSibling);

    // Style the suggestions container
    suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        margin-top: 4px;
        display: none;
    `;

    // Function to fetch suggestions from Mapbox
    const fetchSuggestions = debounce((query) => {
        if (!query) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5`;

        fetch(geocodingUrl)
            .then(response => response.json())
            .then(data => {
                suggestionsContainer.innerHTML = '';

                if (data.features && data.features.length > 0) {
                    data.features.forEach(feature => {
                        const suggestion = document.createElement('div');
                        suggestion.className = 'suggestion-item';
                        suggestion.innerHTML = `
                            <div class="place-name">${feature.place_name}</div>
                            <div class="place-type">${feature.place_type[0]}</div>
                        `;

                        // Style the suggestion item
                        suggestion.style.cssText = `
                            padding: 10px 15px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 1px solid #eee;
                        `;

                        suggestion.addEventListener('mouseover', () => {
                            suggestion.style.backgroundColor = '#f8fafc';
                        });

                        suggestion.addEventListener('mouseout', () => {
                            suggestion.style.backgroundColor = 'white';
                        });

                        suggestion.addEventListener('click', () => {
                            searchInput.value = feature.place_name;
                            destinationCoordinates = feature.center;
                            suggestionsContainer.style.display = 'none';

                            // Remove existing marker if any
                            const existingMarker = document.querySelector('.destination-marker');
                            if (existingMarker) {
                                existingMarker.remove();
                            }

                            // Add new marker
                            new mapboxgl.Marker({color: 'red', className: 'destination-marker'})
                                .setLngLat(feature.center)
                                .setPopup(new mapboxgl.Popup().setText("Destination"))
                                .addTo(map);

                            // Save to history
                            saveToHistory(feature.place_name, feature.center);

                            // Calculate route
                            calculateRoute();
                        });

                        suggestionsContainer.appendChild(suggestion);
                    });

                    suggestionsContainer.style.display = 'block';
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error fetching suggestions:', error);
                suggestionsContainer.style.display = 'none';
            });
    }, 300);

    // Add input event listener
    searchInput.addEventListener('input', (e) => {
        fetchSuggestions(e.target.value);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Add keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const suggestions = suggestionsContainer.getElementsByClassName('suggestion-item');
        let currentFocus = -1;

        // Arrow key navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            if (e.key === 'ArrowDown') {
                currentFocus = Math.min(currentFocus + 1, suggestions.length - 1);
            } else {
                currentFocus = Math.max(currentFocus - 1, 0);
            }

            // Update visual focus
            Array.from(suggestions).forEach((item, index) => {
                if (index === currentFocus) {
                    item.style.backgroundColor = '#f8fafc';
                } else {
                    item.style.backgroundColor = 'white';
                }
            });
        }

        // Enter key selection
        if (e.key === 'Enter' && currentFocus > -1) {
            if (suggestions[currentFocus]) {
                suggestions[currentFocus].click();
            }
        }
    });
}

function toggleHistory() {
    const historyList = document.getElementById('historyList');
    const collapseIcon = document.querySelector('.collapse-icon');
    isHistoryCollapsed = !isHistoryCollapsed;

    if (isHistoryCollapsed) {
        historyList.classList.add('collapsed');
        collapseIcon.classList.add('collapsed');
    } else {
        historyList.classList.remove('collapsed');
        collapseIcon.classList.remove('collapsed');
    }
}




// Add this function to handle saving to history
function saveToHistory(place, coordinates) {
    const historyItem = {
        place: place,
        coordinates: coordinates,
        timestamp: new Date().toLocaleString()
    };

    // Add to beginning of array
    searchHistory.unshift(historyItem);

    // Keep only the last MAX_HISTORY_ITEMS items
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));

    // Update display
    displayHistory();
}

// Add this function to display history
function displayHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    searchHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div>
                <strong>${item.place}</strong>
                <br>
                <small>${item.timestamp}</small>
            </div>
            <div class="history-actions">
                <button onclick="useHistoryItem(${index})">Use</button>
                <button onclick="deleteHistoryItem(${index})">Delete</button>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

// Add this function to use a history item
function useHistoryItem(index) {
    const item = searchHistory[index];
    document.getElementById('placeInput').value = item.place;
    destinationCoordinates = item.coordinates;

    // Remove existing marker if any
    const existingMarker = document.querySelector('.destination-marker');
    if (existingMarker) {
        existingMarker.remove();
    }

    // Add marker for the destination
    new mapboxgl.Marker({color: 'red', className: 'destination-marker'})
        .setLngLat(item.coordinates)
        .setPopup(new mapboxgl.Popup().setText("Destination"))
        .addTo(map);

    calculateRoute();
}

// Add this function to delete a history item
function deleteHistoryItem(index) {
    searchHistory.splice(index, 1);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    displayHistory();
}










function initializeMap() {
    // Initialize map centered on Rabat, Morocco
    map = new mapboxgl.Map({
        container: 'map_div',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-6.826874447320948, 34.02416856221844], // Coordinates for Rabat
        zoom: 12
    });

    // Set default current position to Rabat center
    currentPositionCoordinates = [-6.826874447320948, 34.02416856221844];

    // Add marker for current position
    new mapboxgl.Marker({color: 'blue'})
        .setLngLat(currentPositionCoordinates)
        .setPopup(new mapboxgl.Popup().setText("Your Current Location"))
        .addTo(map);

    // Add tramway stops
    tramwayStops.forEach(stop => {
        new mapboxgl.Marker({color: 'green'})
            .setLngLat(stop.coordinates)
            .setPopup(new mapboxgl.Popup().setText(stop.name))
            .addTo(map);
    });

    // Add click handler for destinations
    map.on('click', function(e) {
        destinationCoordinates = e.lngLat.toArray();

        const existingMarker = document.querySelector('.destination-marker');
        if (existingMarker) {
            existingMarker.remove();
        }

        new mapboxgl.Marker({color: 'red', className: 'destination-marker'})
            .setLngLat(destinationCoordinates)
            .setPopup(new mapboxgl.Popup().setText("Destination"))
            .addTo(map);

        getPlaceNameFromCoordinates(destinationCoordinates)
            .then(placeName => {
                saveToHistory(placeName, destinationCoordinates);
                calculateRoute();
            });
    });
}

function calculateRoute() {
    if (!currentPositionCoordinates || !destinationCoordinates) {
        alert("Please set both current position and destination.");
        return;
    }

    const transportMode = document.getElementById("transportMode").value;

    if (transportMode === "tramway") {
        calculateTramwayRoute();
        return;
    }

    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${currentPositionCoordinates.join(",")};${destinationCoordinates.join(",")}?alternatives=true&geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`;

    fetch(directionsUrl)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const routeGeoJson = data.routes[0].geometry;
                const distance = data.routes[0].distance / 1000;
                const estimatedTime = data.routes[0].duration;
                const estimatedTimeInMinutes = (estimatedTime / 60).toFixed(2);

                let price = 0;
                if (transportMode === "driving") {
                    const subMode = document.getElementById("drivingSubMode").value;
                    if (subMode === "taxi") {
                        price = 2 * distance;
                    } else if (subMode === "mycar") {
                        price = 0;
                    }
                } else if (transportMode === "walking" || transportMode === "cycling") {
                    price = 0;
                }

                // Display the step-by-step instructions
                const instructions = data.routes[0].legs[0].steps.map((step, index) => {
                    return `<li>Step ${index + 1}: ${step.maneuver.instruction} (${Math.round(step.distance / 1000)} km)</li>`;
                }).join('');

                document.getElementById("stepInstructions").innerHTML = `
                <h3>Route Instructions:</h3>
                <ul>${instructions}</ul>
              `;

                displayRoute(routeGeoJson, estimatedTimeInMinutes, distance, price);
            }
        })
        .catch(error => {
            console.error("Error fetching directions:", error);
        });
}

function setDestinationFromInput() {
    const placeInput = document.getElementById("placeInput").value;
    if (!placeInput) {
        alert("Please enter a place to search.");
        return;
    }

    // Geocoding API request URL
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeInput)}.json?access_token=${mapboxgl.accessToken}`;

    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                // Get the coordinates of the first result
                const coordinates = data.features[0].center;

                // Update the destination coordinates
                destinationCoordinates = coordinates;
// Save to history
                saveToHistory(placeInput, coordinates);
                // Remove the existing destination marker if any
                const existingMarker = document.querySelector('.destination-marker');
                if (existingMarker) {
                    existingMarker.remove();
                }

                // Add a new marker for the destination
                new mapboxgl.Marker({color: 'red', className: 'destination-marker'})
                    .setLngLat(destinationCoordinates)
                    .setPopup(new mapboxgl.Popup().setText("Destination"))
                    .addTo(map);

                // Calculate the route with the new destination
                calculateRoute();
            } else {
                alert("No location found. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error fetching location data:", error);
        });
}

function calculateTramwayRoute() {
    // 1. Find nearest stops to start and destination points
    const nearestInitialStop = findNearestTramwayStop(currentPositionCoordinates);
    const nearestFinalStop = findNearestTramwayStop(destinationCoordinates);

    if (!nearestInitialStop || !nearestFinalStop) {
        alert("Could not find suitable tramway stops nearby.");
        return;
    }

    // 2. Get walking routes to/from tram stops
    Promise.all([
        // Get walking route from current position to first tram stop
        fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${currentPositionCoordinates.join(",")};${nearestInitialStop.coordinates.join(",")}?geometries=geojson&access_token=${mapboxgl.accessToken}`),
        // Get walking route from last tram stop to destination
        fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${nearestFinalStop.coordinates.join(",")};${destinationCoordinates.join(",")}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
    ])
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(([initialWalkData, finalWalkData]) => {
            if (!initialWalkData.routes?.[0] || !finalWalkData.routes?.[0]) {
                throw new Error("Could not calculate walking routes");
            }

            // 3. Calculate tram route between stops
            const tramRoute = calculateTramStopsRoute(nearestInitialStop, nearestFinalStop);

            // 4. Combine all routes
            const combinedRoute = {
                type: "FeatureCollection",
                features: [
                    // Initial walking route
                    {
                        type: "Feature",
                        properties: { type: "walking", description: "Walk to tram stop" },
                        geometry: initialWalkData.routes[0].geometry
                    },
                    // Tram route
                    {
                        type: "Feature",
                        properties: { type: "tram", description: "Tram journey" },
                        geometry: tramRoute.geometry
                    },
                    // Final walking route
                    {
                        type: "Feature",
                        properties: { type: "walking", description: "Walk to destination" },
                        geometry: finalWalkData.routes[0].geometry
                    }
                ]
            };

            // 5. Calculate total metrics
            const initialWalkDistance = initialWalkData.routes[0].distance;
            const finalWalkDistance = finalWalkData.routes[0].distance;
            const initialWalkDuration = initialWalkData.routes[0].duration;
            const finalWalkDuration = finalWalkData.routes[0].duration;
            const tramDuration = tramRoute.duration;
            const tramDistance = tramRoute.distance;

            const totalDistance = (initialWalkDistance + tramDistance + finalWalkDistance) / 1000; // Convert to km
            const totalDuration = (initialWalkDuration + tramDuration + finalWalkDuration) / 60; // Convert to minutes

            // 6. Display the route with different colors for walking and tram segments
            displayMultiModalRoute(combinedRoute, totalDuration.toFixed(1), totalDistance.toFixed(1), 6);

            // 7. Display step-by-step instructions
            displayTramwayInstructions(
                nearestInitialStop,
                nearestFinalStop,
                initialWalkDistance,
                finalWalkDistance,
                initialWalkDuration,
                finalWalkDuration
            );
        })
        .catch(error => {
            console.error("Error calculating tramway route:", error);
            alert("Error calculating tramway route. Please try again.");
        });
}

function calculateTramStopsRoute(startStop, endStop) {
    // Find the sequence of stops between start and end
    const tramStopsPath = findTramStopsPath(startStop, endStop);

    // Create a LineString geometry connecting all the stops
    const coordinates = tramStopsPath.map(stop => stop.coordinates.map(Number));

    // Calculate approximate duration (assuming 3 minutes between stops)
    const duration = (tramStopsPath.length - 1) * 180; // 180 seconds per stop
    const distance = calculateTotalTramDistance(coordinates);

    return {
        geometry: {
            type: "LineString",
            coordinates: coordinates
        },
        duration: duration,
        distance: distance
    };
}

function findTramStopsPath(startStop, endStop) {
    // Helper function to determine if two stops are on the same line
    function areOnSameLine(stop1, stop2) {
        // This is a simplified implementation. You might need to adjust this
        // based on your actual tram line data structure
        const stop1Index = tramwayStops.findIndex(s => s.name === stop1.name);
        const stop2Index = tramwayStops.findIndex(s => s.name === stop2.name);
        return Math.abs(stop1Index - stop2Index) === Math.abs(stop2Index - stop1Index);
    }

    // Find all stops between start and end
    const path = [];
    let currentStop = startStop;
    path.push(currentStop);

    while (currentStop.name !== endStop.name) {
        // Find next stop in the direction of the destination
        const nextStop = tramwayStops.find(stop =>
            areOnSameLine(currentStop, stop) &&
            calculateDistance(stop.coordinates, endStop.coordinates) <
            calculateDistance(currentStop.coordinates, endStop.coordinates)
        );

        if (!nextStop) break; // No more stops found
        path.push(nextStop);
        currentStop = nextStop;
    }

    return path;
}

function displayMultiModalRoute(routeData, estimatedTime, distance, price) {
    document.getElementById("pricing").innerHTML = `
        <p>Estimated Time: ${estimatedTime} minutes</p>
        <p>Total Distance: ${distance} km</p>
        <p>Tram Ticket Price: ${price} MAD</p>
    `;

    // Remove existing route layers
    ['walking-route', 'tram-route'].forEach(layerId => {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(layerId)) map.removeSource(layerId);
    });

    // Add walking segments (blue)
    const walkingFeatures = routeData.features.filter(f => f.properties.type === "walking");
    map.addSource('walking-route', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: walkingFeatures
        }
    });

    map.addLayer({
        id: 'walking-route',
        type: 'line',
        source: 'walking-route',
        paint: {
            'line-color': '#3887be',
            'line-width': 4,
            'line-dasharray': [2, 2]
        }
    });



    // Fit map to show entire route
    const bounds = new mapboxgl.LngLatBounds();
    routeData.features.forEach(feature => {
        feature.geometry.coordinates.forEach(coord => {
            bounds.extend(coord);
        });
    });
    map.fitBounds(bounds, { padding: 50 });
}

function displayTramwayInstructions(startStop, endStop, initialWalkDistance, finalWalkDistance, initialWalkDuration, finalWalkDuration) {
    const instructions = `
        <h3>Route Instructions:</h3>
        <ul>
            <li>Walk ${(initialWalkDistance/1000).toFixed(2)} km (${(initialWalkDuration/60).toFixed(1)} min) to ${startStop.name} tram stop</li>
            <li>Take the tram from ${startStop.name} to ${endStop.name}</li>
            <li>Walk ${(finalWalkDistance/1000).toFixed(2)} km (${(finalWalkDuration/60).toFixed(1)} min) to your destination</li>
        </ul>
    `;
    document.getElementById("stepInstructions").innerHTML = instructions;
}

function calculateTotalTramDistance(coordinates) {
    let total = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        total += calculateDistance(coordinates[i], coordinates[i + 1]) * 1000; // Convert km to meters
    }
    return total;
}

function displayRoute(routeGeoJson, estimatedTime, distance, price) {
    document.getElementById("pricing").innerHTML = `
    <p>Estimated Time: ${estimatedTime} minutes</p>
    <p>Distance: ${distance} km</p>
    <p>Price: ${price} MAD</p>
  `;

    // Clear previous route if any
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }

    // Add the new route
    map.addSource('route', {
        type: 'geojson', data: routeGeoJson
    });

    map.addLayer({
        id: 'route', type: 'line', source: 'route', paint: {
            'line-color': '#3887be', 'line-width': 5
        }
    });

    // Adjust map bounds to fit the entire route
    const bounds = new mapboxgl.LngLatBounds();
    routeGeoJson.features.forEach(feature => {
        feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
    });

    map.fitBounds(bounds, {padding: 20});
}

function findNearestTramwayStop(coordinates) {
    let nearestStop = null;
    let shortestDistance = Infinity;

    tramwayStops.forEach(stop => {
        const distance = calculateDistance(coordinates, stop.coordinates);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestStop = stop;
        }
    });

    return nearestStop;
}

function calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}


function toggleDrivingOptions() {
    const transportMode = document.getElementById("transportMode").value;
    const drivingOptions = document.getElementById("drivingOptions");
    drivingOptions.style.display = transportMode === "driving" ? "block" : "none";
}

// Add this function to get place name from coordinates
function getPlaceNameFromCoordinates(coordinates) {
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}`;

    return fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                // Return the most relevant place name
                return data.features[0].place_name;
            }
            return "Unknown location";
        })
        .catch(error => {
            console.error("Error fetching place name:", error);
            return "Unknown location";
        });
}


function shareLocation() {
    // Use either the map center or destination coordinates
    const coordinates = destinationCoordinates || map.getCenter().toArray();

    // Generate a shareable URL
    const shareUrl = `${window.location.origin}?lat=${coordinates[1]}&lng=${coordinates[0]}`;

    // Copy the URL to the clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Shareable URL copied to clipboard:\n" + shareUrl);
    }).catch(err => {
        console.error("Failed to copy URL:", err);
    });
}

// Optionally handle loading shared location on page load
window.onload = () => {
    initializeMap();

    // Check if URL has lat and lng query parameters
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    if (lat && lng) {
        // Set map center to the shared location
        map.setCenter([lng, lat]);
        new mapboxgl.Marker({color: 'red'})
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup().setText("Shared Location"))
            .addTo(map);
    }
};
// Add this to your window.onload function to load history from localStorage
window.onload = function() {
    initializeMap();
    toggleDrivingOptions();
    initializeAutocomplete();

    // Load history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        displayHistory();
    }

    // Set initial collapse state
    const historyList = document.getElementById('historyList');
    const collapseIcon = document.querySelector('.collapse-icon');
    if (isHistoryCollapsed) {
        historyList.classList.add('collapsed');
        collapseIcon.classList.add('collapsed');
    }
};