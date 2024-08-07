let map;
let markers = [];
const geocoder = new google.maps.Geocoder();
let longPressTimeout;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 37.0902, lng: -95.7129 }, // Centered on the United States
        zoom: 4 // Suitable zoom level for an overview of the United States
    });

    map.addListener('mousedown', (event) => {
        longPressTimeout = setTimeout(() => {
            geocodeLatLng(event.latLng, addMarker);
        }, 1000); // 1 second long press to create a pin
    });

    map.addListener('mouseup', () => {
        clearTimeout(longPressTimeout);
    });

    map.addListener('drag', () => {
        clearTimeout(longPressTimeout);
    });

    loadMarkers();
}

function geocodeLatLng(latLng, callback) {
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                callback(latLng, results[0].formatted_address);
            } else {
                window.alert("No results found");
            }
        } else {
            window.alert("Geocoder failed due to: " + status);
        }
    });
}

function addMarker(location, address) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true,
        icon: {
            url: `http://maps.google.com/mapfiles/ms/icons/red-dot.png`
        }
    });

    const infoWindow = new google.maps.InfoWindow({
        content: getInfoWindowContent(marker, address)
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    markers.push(marker);
    saveMarkers();
}

function getInfoWindowContent(marker, address) {
    return `
        <div class="info-window">
            <h3>Address: <span contenteditable="true">${address}</span></h3>
            <p>Status: 
                <select onchange="updateMarkerColor(this, marker)">
                    <option value="not home">Not Home</option>
                    <option value="not interested">Not Interested</option>
                    <option value="sold">Sold</option>
                    <option value="hot lead">Hot Lead</option>
                    <option value="revisit">Revisit</option>
                    <option value="already customer">Already Customer</option>
                    <option value="not qualified">Not Qualified</option>
                </select>
            </p>
            <p>Name: <span contenteditable="true"></span></p>
            <p>Phone: <span contenteditable="true"></span></p>
            <p>Email: <span contenteditable="true"></span></p>
            <p>Notes: <span contenteditable="true"></span></p>
        </div>
    `;
}

function updateMarkerColor(selectElement, marker) {
    const status = selectElement.value;
    let color;

    switch (status) {
        case 'not home': color = 'blue'; break;
        case 'not interested': color = 'red'; break;
        case 'sold': color = 'green'; break;
        case 'hot lead': color = 'orange'; break;
        case 'revisit': color = 'yellow'; break;
        case 'already customer': color = 'purple'; break;
        case 'not qualified': color = 'grey'; break;
    }

    marker.setIcon({
        url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
    });
    saveMarkers();
}

function saveMarkers() {
    const markersData = markers.map(marker => ({
        position: marker.getPosition().toJSON(),
        content: marker.content
    }));

    localStorage.setItem('markers', JSON.stringify(markersData));
}

function loadMarkers() {
    const markersData = JSON.parse(localStorage.getItem('markers')) || [];

    markersData.forEach(data => {
        const marker = new google.maps.Marker({
            position: data.position,
            map: map,
            draggable: true
        });

        const infoWindow = new google.maps.InfoWindow({
            content: data.content
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        markers.push(marker);
    });
}

function zoomToLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(userLocation);
            map.setZoom(15);
            new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'You are here'
            });
        }, () => {
            alert('Geolocation service failed.');
        });
    } else {
        alert('Your browser doesn\'t support geolocation.');
    }
}

function saveToSheet(data) {
    // Placeholder function for saving data to Google Sheets
    // Implement OAuth 2.0 authentication and authorization here
}

function loadFromSheet() {
    // Placeholder function for loading data from Google Sheets
    // Implement OAuth 2.0 authentication and authorization here
}
