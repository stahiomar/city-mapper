mapboxgl.accessToken = 'pk.eyJ1IjoiLS1vbWFyLS0iLCJhIjoiY201a3Q2aWlzMTl6bTJ2czZwcjlzejR4bCJ9.sAgoTh2ZjL8Q11hCvOF_AQ';

let map;
let currentPositionCoordinates = null;
let destinationCoordinates = null;

let tramwayStops = [// Rabat Line
    {name: "Hay Karima", coordinates: [-6.800798, 34.065678]}, {
        name: "Yacoub Al Mansour",
        coordinates: [-6.805784, 34.060896]
    }, {name: "Avenue Med V", coordinates: [-6.810325, 34.057225]}, {
        name: "Cité Universitaire",
        coordinates: [-6.812936, 34.054112]
    }, {name: "Place Nations Unies", coordinates: [-6.818456, 34.049842]}, {
        name: "Gare Rabat Ville",
        coordinates: [-6.827625, 34.030854]
    }, {name: "Medina", coordinates: [-6.834256, 34.026789]}, {
        name: "Hassan",
        coordinates: [-6.840057, 34.025500]
    }, {name: "Bab Chellah", coordinates: [-6.845321, 34.023472]}, {
        name: "Avenue Mohamed V",
        coordinates: [-6.851674, 34.021789]
    }, {name: "Rabat Agdal", coordinates: [-6.857123, 34.017456]}, {
        name: "Gare Agdal",
        coordinates: [-6.864217, 34.015891]
    },

    // Salé Line
    {name: "Sidi Moussa", coordinates: [-6.801921, 34.061247]}, {
        name: "Bab Lamrissa",
        coordinates: [-6.802821, 34.057032]
    }, {name: "Gare Salé Ville", coordinates: [-6.809721, 34.055162]}, {
        name: "Marina",
        coordinates: [-6.816178, 34.054011]
    }, {name: "Hay Salam", coordinates: [-6.812178, 34.050211]}, {
        name: "Gare Bouknadel",
        coordinates: [-6.794718, 34.046789]
    }, {name: "Al Qods", coordinates: [-6.790256, 34.045567]}, {
        name: "Avenue Hassan II",
        coordinates: [-6.786045, 34.043281]
    }, {name: "Zerktouni", coordinates: [-6.780178, 34.040789]}, {
        name: "Hay Riyad",
        coordinates: [-6.774512, 34.038212]
    }];


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

    map.on('click', function (e) {
        destinationCoordinates = e.lngLat.toArray();

        const existingMarker = document.querySelector('.destination-marker');
        if (existingMarker) {
            existingMarker.remove();
        }

        new mapboxgl.Marker({color: 'red', className: 'destination-marker'})
            .setLngLat(destinationCoordinates)
            .setPopup(new mapboxgl.Popup().setText("Destination"))
            .addTo(map);

        calculateRoute();
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
window.onload = function() {
    initializeMap();
    toggleDrivingOptions(); // Ensure driving options are hidden by default
};