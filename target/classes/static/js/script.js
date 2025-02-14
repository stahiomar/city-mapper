mapboxgl.accessToken = 'pk.eyJ1IjoiLS1vbWFyLS0iLCJhIjoiY201a3Q2aWlzMTl6bTJ2czZwcjlzejR4bCJ9.sAgoTh2ZjL8Q11hCvOF_AQ';

let map;
let currentPositionCoordinates = null;
let destinationCoordinates = null;
let searchHistory = [];
const MAX_HISTORY_ITEMS = 10;
const mapboxGeocoder = `
<link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" rel="stylesheet">
`;
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


/*
******l1******
* hay karima
* tabriquet
* la poste
* mohammed V - Opera
* diar
* gare de salé
** bab lamrissa
** pont hassan ||
** place du 16 novembre
** tour hassan
** place al joulane
* mohammed V gare de rabat-ville
* bab rouah
* bibliotheque nationale
* ibn khaldoun
* nations unies
* agdal avenue de france
* ibn sina
* ibn rochd
* cité universitaire souissi
* madinat al irfane

******l2******
* hopital moulay youssef
* sidi mohamed ben abdellah 34.01625811674855, -6.854665316973613
* place de russie
* bab el had
* medina
* bab chellah
** place al joulane
** tour hassan
** place du 16 novembre 34.02473203749335, -6.825320618825434
** pont hassan ||
** bab lamrissa
* arrazi
* bettana
* hassan || 34.035505006097566, -6.799659759188666



*/

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







let tramwayStops = [
    // Rabat Line
    {name: "Hay Karima", coordinates: [-6.798, 34.046]},
    {name: "Yacoub Al Mansour", coordinates: [-6.857, 34.020]},
    {name: "Avenue Med V", coordinates: [-6.832, 34.022]},
    {name: "Cité Universitaire", coordinates: [-6.870, 34.017]},
    {name: "Place Nations Unies", coordinates: [-6.832, 34.022]},
    {name: "Gare Rabat Ville", coordinates: [-6.836, 34.020]},
    {name: "Medina", coordinates: [-6.840, 34.022]},
    {name: "Hassan", coordinates: [-6.841, 34.025]},
    {name: "Bab Chellah", coordinates: [-6.846, 34.023]},
    {name: "Avenue Mohamed V", coordinates: [-6.851, 34.021]},
    {name: "Rabat Agdal", coordinates: [-6.857, 34.017]},
    {name: "Gare Agdal", coordinates: [-6.864, 34.015]},

    // Salé Line
    {name: "Sidi Moussa", coordinates: [-6.801, 34.061]},
    {name: "Bab Lamrissa", coordinates: [-6.802, 34.057]},
    {name: "Gare Salé Ville", coordinates: [-6.809, 34.055]},
    {name: "Marina", coordinates: [-6.816, 34.054]},
    {name: "Hay Salam", coordinates: [-6.812, 34.050]},
    {name: "Gare Bouknadel", coordinates: [-6.794, 34.046]},
    {name: "Al Qods", coordinates: [-6.790, 34.045]},
    {name: "Avenue Hassan II", coordinates: [-6.786, 34.043]},
    {name: "Zerktouni", coordinates: [-6.780, 34.040]},
    {name: "Hay Riyad", coordinates: [-6.774, 34.038]},
    {name: "Tabriquet", coordinates: [-6.770, 34.035]},
    {name: "Aviation", coordinates: [-6.765, 34.032]},
    {name: "Salé Al Jadida", coordinates: [-6.760, 34.029]},
    {name: "Hassan ||", coordinates: [-6.799659759188666, 34.035505006097566]}
];


function initializeMap() {
    map = new mapboxgl.Map({
        container: 'map_div', style: 'mapbox://styles/mapbox/streets-v11', center: [-6.841, 34.020], // Rabat default center
        zoom: 13,
    });

    navigator.geolocation.getCurrentPosition(position => {
        currentPositionCoordinates = [position.coords.longitude, position.coords.latitude];
        map.setCenter(currentPositionCoordinates);
        new mapboxgl.Marker({color: 'blue'})
            .setLngLat(currentPositionCoordinates)
            .setPopup(new mapboxgl.Popup().setText("Your Current Location"))
            .addTo(map);
    }, error => console.error("Error getting location:", error));

    tramwayStops.forEach(stop => {
        new mapboxgl.Marker({color: 'green'})
            .setLngLat(stop.coordinates)
            .setPopup(new mapboxgl.Popup().setText(stop.name))
            .addTo(map);
    });

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

        // Get place name and save to history
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
    const nearestInitialStop = findNearestTramwayStop(currentPositionCoordinates);
    const nearestFinalStop = findNearestTramwayStop(destinationCoordinates);

    if (nearestInitialStop && nearestFinalStop) {
        // First, find the route from your location to the nearest initial stop
        const routeToInitialStop = {
            type: "LineString", coordinates: [currentPositionCoordinates, nearestInitialStop.coordinates]
        };

        // Second, find the tram route from the nearest initial stop to the final stop
        const tramwayRoute = {
            type: "LineString", coordinates: [nearestInitialStop.coordinates, nearestFinalStop.coordinates]
        };

        // Finally, find the route from the final stop to the destination
        const routeToDestination = {
            type: "LineString", coordinates: [nearestFinalStop.coordinates, destinationCoordinates]
        };

        // Combine all parts of the route
        const combinedRoute = {
            type: "FeatureCollection",
            features: [{type: "Feature", geometry: routeToInitialStop}, {
                type: "Feature",
                geometry: tramwayRoute
            }, {type: "Feature", geometry: routeToDestination}]
        };

        displayRoute(combinedRoute, "N/A", "N/A", 6);
    } else {
        alert("No tramway route found.");
    }
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